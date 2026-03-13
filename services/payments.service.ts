import { createClient } from '@/lib/supabase/browser'
import { safeFileExtension, validateDocumentFile } from '@/lib/file-validation'
import type { ActivityLog } from '@/types/activity-log'
import type {
  AppSettingRow,
  CreatePaymentOrderInput,
  FeeConfigRow,
  OrderFileField,
  OrderFileUploadResult,
  PaymentOrder,
  PaymentSnapshot,
  PsavConfigRow,
  SupplierUpsertInput,
} from '@/types/payment-order'
import type { Supplier } from '@/types/supplier'

const ORDER_EVIDENCE_BUCKET = 'order-evidences'
const CLIENT_MUTABLE_ORDER_STATUSES = new Set<PaymentOrder['status']>(['created', 'waiting_deposit'])

export const PaymentsService = {
  async getSnapshot(userId: string): Promise<PaymentSnapshot> {
    const supabase = createClient()

    const [suppliersResult, ordersResult, activityResult, feesResult, settingsResult, psavResult] = await Promise.all([
      supabase.from('suppliers').select('*').eq('user_id', userId).order('name', { ascending: true }),
      supabase.from('payment_orders').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('activity_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
      supabase.from('fees_config').select('*').order('type', { ascending: true }),
      supabase.from('app_settings').select('*'),
      supabase.from('psav_configs').select('*').eq('is_active', true).order('id', { ascending: true }),
    ])

    if (suppliersResult.error) throw suppliersResult.error
    if (ordersResult.error) throw ordersResult.error
    if (activityResult.error) throw activityResult.error
    if (feesResult.error) throw feesResult.error
    if (settingsResult.error) throw settingsResult.error
    if (psavResult.error) throw psavResult.error

    return {
      suppliers: (suppliersResult.data ?? []) as Supplier[],
      paymentOrders: (ordersResult.data ?? []) as PaymentOrder[],
      activityLogs: (activityResult.data ?? []) as ActivityLog[],
      feesConfig: (feesResult.data ?? []) as FeeConfigRow[],
      appSettings: (settingsResult.data ?? []) as AppSettingRow[],
      psavConfigs: (psavResult.data ?? []) as PsavConfigRow[],
      gaps: [
        'No se implemento `payin_routes` porque su contrato no aparece documentado en `informacion/06-contratos-backend-supabase.md`.',
      ],
    }
  },

  async createSupplier(input: SupplierUpsertInput): Promise<Supplier> {
    const supabase = createClient()
    const { data, error } = await supabase.from('suppliers').insert(input).select('*').single()

    if (error) throw error
    return data as Supplier
  },

  async updateSupplier(id: string, input: Partial<SupplierUpsertInput>): Promise<Supplier> {
    const supabase = createClient()
    const { data, error } = await supabase.from('suppliers').update(input).eq('id', id).select('*').single()

    if (error) throw error
    return data as Supplier
  },

  async deleteSupplier(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.from('suppliers').delete().eq('id', id)

    if (error) throw error
  },

  async createPaymentOrder(input: CreatePaymentOrderInput): Promise<PaymentOrder> {
    const supabase = createClient()
    const payload = {
      ...input,
      status: 'created' as const,
    }

    const { data, error } = await supabase.from('payment_orders').insert(payload).select('*').single()

    if (error) throw error

    const order = data as PaymentOrder
    await logActivitySafely(order.user_id, 'payment_order_created', {
      order_id: order.id,
      order_type: order.order_type,
      processing_rail: order.processing_rail,
      status: order.status,
    })

    return order
  },

  async updateOrderFile(order: PaymentOrder, field: OrderFileField, file: File, userId: string): Promise<OrderFileUploadResult> {
    if (!CLIENT_MUTABLE_ORDER_STATUSES.has(order.status)) {
      throw new Error('La orden ya no admite cargas del cliente en este estado.')
    }

    validateDocumentFile(file)

    const supabase = createClient()
    const path = buildOrderFilePath({
      userId,
      orderId: order.id,
      field,
      fileName: file.name,
    })

    const { error: uploadError } = await supabase.storage.from(ORDER_EVIDENCE_BUCKET).upload(path, file, { upsert: true })
    if (uploadError) throw uploadError

    try {
      const { data } = supabase.storage.from(ORDER_EVIDENCE_BUCKET).getPublicUrl(path)
      const updates: Record<string, string> & { status?: PaymentOrder['status'] } = {
        [field]: data.publicUrl,
      }

      if (field === 'evidence_url' && order.status === 'created') {
        updates.status = 'waiting_deposit'
      }

      const { data: updatedOrder, error: updateError } = await supabase
        .from('payment_orders')
        .update(updates)
        .eq('id', order.id)
        .eq('updated_at', order.updated_at)
        .select('*')
        .single()

      if (updateError) throw updateError

      const nextOrder = updatedOrder as PaymentOrder
      await logActivitySafely(userId, 'payment_order_file_uploaded', {
        order_id: nextOrder.id,
        field,
        status: nextOrder.status,
      })

      return {
        publicUrl: data.publicUrl,
        order: nextOrder,
      }
    } catch (error) {
      await removeStorageObject(ORDER_EVIDENCE_BUCKET, path)
      throw error
    }
  },

  async confirmOrderQuote(order: PaymentOrder): Promise<PaymentOrder> {
    if (order.status !== 'deposit_received') {
      throw new Error('La orden todavia no esta lista para aceptar la cotizacion final.')
    }

    if (!hasReadyQuote(order)) {
      throw new Error('El staff aun no publico una cotizacion final completa para esta orden.')
    }

    const supabase = createClient()
    const metadata = {
      ...(order.metadata ?? {}),
      client_quote_accepted_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('payment_orders')
      .update({
        status: 'processing',
        metadata,
      })
      .eq('id', order.id)
      .eq('updated_at', order.updated_at)
      .select('*')
      .single()

    if (error) throw error

    const updatedOrder = data as PaymentOrder
    await logActivitySafely(updatedOrder.user_id, 'payment_order_quote_accepted', {
      order_id: updatedOrder.id,
      status: updatedOrder.status,
      exchange_rate_applied: updatedOrder.exchange_rate_applied,
      amount_converted: updatedOrder.amount_converted,
      fee_total: updatedOrder.fee_total,
    })

    return updatedOrder
  },

  async cancelOrder(order: PaymentOrder): Promise<PaymentOrder> {
    if (!CLIENT_MUTABLE_ORDER_STATUSES.has(order.status)) {
      throw new Error('Solo puedes cancelar ordenes en estado created o waiting_deposit.')
    }

    const supabase = createClient()
    const metadata = {
      ...(order.metadata ?? {}),
      rejection_reason: 'Cancelado por el usuario',
    }

    const { data, error } = await supabase
      .from('payment_orders')
      .update({
        status: 'failed',
        metadata,
      })
      .eq('id', order.id)
      .eq('updated_at', order.updated_at)
      .select('*')
      .single()

    if (error) throw error

    const updatedOrder = data as PaymentOrder
    await logActivitySafely(updatedOrder.user_id, 'payment_order_cancelled', {
      order_id: updatedOrder.id,
      status: updatedOrder.status,
    })

    return updatedOrder
  },
}

function hasReadyQuote(order: PaymentOrder) {
  return Number(order.exchange_rate_applied) > 0 && Number(order.amount_converted) >= 0 && Number(order.fee_total) >= 0
}

function buildOrderFilePath({
  userId,
  orderId,
  field,
  fileName,
}: {
  userId: string
  orderId: string
  field: OrderFileField
  fileName: string
}) {
  const extension = safeFileExtension(fileName)
  return `${userId}/${orderId}/${field}_${Date.now()}.${extension}`
}

async function removeStorageObject(bucket: string, path: string) {
  const supabase = createClient()
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) {
    console.error('Failed to cleanup storage object', { bucket, path, error })
  }
}

async function logActivitySafely(userId: string, action: string, metadata: Record<string, unknown>) {
  const supabase = createClient()
  const { error } = await supabase.from('activity_logs').insert({
    user_id: userId,
    action,
    metadata,
  })

  if (error) {
    console.error('Failed to write activity log', { userId, action, error })
  }
}
