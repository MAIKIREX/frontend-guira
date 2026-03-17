import { createClient } from '@/lib/supabase/browser'
import { safeFileExtension, validateDocumentFile } from '@/lib/file-validation'
import type { BridgeTransfer } from '@/types/bridge-transfer'
import type { AuditLog } from '@/types/activity-log'
import type { NotificationType } from '@/types/notification'
import type { OnboardingStatus, Onboarding } from '@/types/onboarding'
import type { AppSettingRow, FeeConfigRow, PaymentOrder, PsavConfigRow } from '@/types/payment-order'
import type { Profile } from '@/types/profile'
import type { StaffActor, StaffDocumentRecord, StaffOnboardingDetail, StaffOnboardingRecord, StaffSnapshot, StaffSupportTicket } from '@/types/staff'
import type { TicketStatus } from '@/types/support'
import type { Wallet } from '@/types/wallet'

const STAFF_ORDER_BUCKET = 'order-evidences'
const ORDER_TRANSITIONS: Record<PaymentOrder['status'], Array<PaymentOrder['status']>> = {
  created: ['deposit_received', 'failed'],
  waiting_deposit: ['deposit_received', 'failed'],
  deposit_received: ['processing', 'failed'],
  processing: ['sent', 'failed'],
  sent: ['completed', 'failed'],
  completed: [],
  failed: [],
}

export const StaffService = {
  async getReadOnlySnapshot(): Promise<StaffSnapshot> {
    const supabase = createClient()

    const [onboardingResult, payinsResult, transfersResult, ordersResult, usersResult, supportResult, feesResult, settingsResult, psavResult, auditResult] = await Promise.all([
      supabase.from('onboarding').select('*, profiles(full_name, email, onboarding_status)').order('updated_at', { ascending: false }).limit(50),
      supabase.from('payin_routes').select('*').limit(50),
      supabase.from('bridge_transfers').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('payment_orders').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('support_tickets').select('*, profiles(full_name, email)').order('created_at', { ascending: false }).limit(50),
      supabase.from('fees_config').select('*').order('type', { ascending: true }),
      supabase.from('app_settings').select('*'),
      supabase.from('psav_configs').select('*').order('id', { ascending: true }),
      supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ])

    if (onboardingResult.error) throw onboardingResult.error
    if (payinsResult.error) throw payinsResult.error
    if (transfersResult.error) throw transfersResult.error
    if (ordersResult.error) throw ordersResult.error
    if (usersResult.error) throw usersResult.error
    if (supportResult.error) throw supportResult.error
    if (feesResult.error) throw feesResult.error
    if (settingsResult.error) throw settingsResult.error
    if (psavResult.error) throw psavResult.error
    if (auditResult.error) throw auditResult.error

    return {
      onboarding: (onboardingResult.data ?? []) as StaffOnboardingRecord[],
      payinRoutes: (payinsResult.data ?? []) as Array<Record<string, unknown>>,
      transfers: (transfersResult.data ?? []) as BridgeTransfer[],
      orders: (ordersResult.data ?? []) as PaymentOrder[],
      users: (usersResult.data ?? []) as Profile[],
      support: (supportResult.data ?? []) as StaffSupportTicket[],
      feesConfig: (feesResult.data ?? []) as FeeConfigRow[],
      appSettings: (settingsResult.data ?? []) as AppSettingRow[],
      psavConfigs: (psavResult.data ?? []) as PsavConfigRow[],
      auditLogs: (auditResult.data ?? []) as AuditLog[],
      gaps: [
        'La tabla `payin_routes` se mantiene en modo solo lectura porque la documentacion no detalla sus columnas ni flujo de estados.',
        'La tab de `transfers` se mantiene sin acciones porque la documentacion no define transiciones de estado suficientes para mutarla con seguridad.',
        'El paso `deposit_received -> processing` ahora requiere aceptacion explicita del cliente, alineado a `FLUJO_Y_VALOR.md`.',
      ],
    }
  },

  async getOnboardingDetail(onboardingId: string): Promise<StaffOnboardingDetail> {
    const supabase = createClient()
    const { data: record, error: recordError } = await supabase
      .from('onboarding')
      .select('*, profiles(full_name, email, onboarding_status)')
      .eq('id', onboardingId)
      .single()

    if (recordError) throw recordError

    const { data: documents, error: documentsError } = await supabase
      .from('documents')
      .select('*')
      .eq('onboarding_id', onboardingId)
      .order('created_at', { ascending: false })

    if (documentsError) throw documentsError

    const documentsWithUrls = await Promise.all(
      ((documents ?? []) as StaffDocumentRecord[]).map(async (document) => {
        if (!document.storage_path) {
          return { ...document, signed_url: null }
        }

        const { data } = await supabase.storage
          .from('onboarding_docs')
          .createSignedUrl(document.storage_path, 60 * 60)

        return {
          ...document,
          signed_url: data?.signedUrl ?? null,
        }
      })
    )

    return {
      record: record as StaffOnboardingRecord,
      documents: documentsWithUrls,
    }
  },

  async updateOnboardingStatus(args: { actor: StaffActor; record: StaffOnboardingRecord; status: Extract<OnboardingStatus, 'verified' | 'rejected' | 'needs_changes'>; reason: string }) {
    const supabase = createClient()
    const metadata = normalizeRecordObject(args.record.data)
    const updatePayload: Partial<Onboarding> = { status: args.status, updated_at: new Date().toISOString() }

    if (args.status === 'rejected' || args.status === 'needs_changes') {
      updatePayload.observations = args.reason
    }

    const { data: updatedRecord, error } = await supabase.from('onboarding').update(updatePayload).eq('id', args.record.id).eq('updated_at', args.record.updated_at).select('*').single()
    if (error) throw error

    const previousProfile = {
      onboarding_status: args.record.profiles?.onboarding_status ?? null,
      full_name: args.record.profiles?.full_name ?? null,
    }

    const profileUpdates: Record<string, unknown> = { onboarding_status: args.status }
    const inferredName = inferFullNameFromOnboarding(metadata)
    if (inferredName) profileUpdates.full_name = inferredName

    let createdWallet: Wallet | null = null

    try {
      const { error: profileError } = await supabase.from('profiles').update(profileUpdates).eq('id', args.record.user_id)
      if (profileError) throw profileError

      if (args.status === 'verified') {
        const walletResult = await ensureWalletExists(args.record.user_id)
        if (walletResult.created) createdWallet = walletResult.wallet
      }

      await insertAuditLog({ actor: args.actor, tableName: 'onboarding', recordId: args.record.id, previousValues: pickRecordFields(args.record), newValues: pickRecordFields(updatedRecord), reason: args.reason, action: 'change_status' })
      await insertNotification({ userId: args.record.user_id, type: 'onboarding_update', title: 'Actualizacion de onboarding', message: `Tu onboarding cambio a ${args.status}.`, link: '/onboarding' })

      return updatedRecord as StaffOnboardingRecord
    } catch (error) {
      await rollbackOnboardingStatusChange({
        record: updatedRecord as StaffOnboardingRecord,
        previousRecord: args.record,
        previousProfile,
        userId: args.record.user_id,
        createdWalletId: createdWallet?.id,
      })
      throw error
    }
  },

  async advancePaymentOrderToDepositReceived(args: { actor: StaffActor; order: PaymentOrder; reason: string }) {
    return updatePaymentOrderWithAuditAndNotification({ actor: args.actor, order: args.order, nextStatus: 'deposit_received', updates: { status: 'deposit_received' }, reason: args.reason, notificationMessage: 'Staff valido tu deposito y el expediente continua a conciliacion.' })
  },

  async preparePaymentOrderQuote(args: { actor: StaffActor; order: PaymentOrder; reason: string; exchangeRateApplied: number; amountConverted: number; feeTotal: number }) {
    if (args.order.status !== 'deposit_received') {
      throw new Error('La cotizacion final solo se prepara cuando la orden esta en deposit_received.')
    }

    const supabase = createClient()
    const metadata = {
      ...(args.order.metadata ?? {}),
      quote_previous: {
        exchange_rate_applied: args.order.exchange_rate_applied,
        amount_converted: args.order.amount_converted,
        fee_total: args.order.fee_total,
      },
      quote_prepared_at: new Date().toISOString(),
      quote_prepared_by: args.actor.userId,
    }

    const payload = {
      exchange_rate_applied: args.exchangeRateApplied,
      amount_converted: args.amountConverted,
      fee_total: args.feeTotal,
      metadata,
      updated_at: new Date().toISOString(),
    }

    const { data: updatedOrder, error } = await supabase
      .from('payment_orders')
      .update(payload)
      .eq('id', args.order.id)
      .eq('updated_at', args.order.updated_at)
      .select('*')
      .single()

    if (error) throw error

    try {
      await insertAuditLog({ actor: args.actor, tableName: 'payment_orders', recordId: args.order.id, previousValues: pickRecordFields(args.order), newValues: pickRecordFields(updatedOrder), reason: args.reason, action: 'update' })
      await insertNotification({ userId: args.order.user_id, type: 'status_change', title: 'Cotizacion final lista', message: 'Tu orden ya tiene tasa y comision final. Revisa y acepta para continuar.', link: '/pagos' })
      return updatedOrder as PaymentOrder
    } catch (error) {
      await rollbackPaymentOrderChange(updatedOrder as PaymentOrder, args.order)
      throw error
    }
  },

  async advancePaymentOrderToSent(args: { actor: StaffActor; order: PaymentOrder; reason: string; reference: string }) {
    return updatePaymentOrderWithAuditAndNotification({
      actor: args.actor,
      order: args.order,
      nextStatus: 'sent',
      updates: { status: 'sent', metadata: { ...(args.order.metadata ?? {}), reference: args.reference } },
      reason: args.reason,
      notificationMessage: 'Tu orden fue enviada.',
    })
  },

  async advancePaymentOrderToCompleted(args: { actor: StaffActor; order: PaymentOrder; reason: string; comprobanteFile: File }) {
    validateDocumentFile(args.comprobanteFile)

    const supabase = createClient()
    const uploadPath = buildStaffOrderFilePath(args.order.user_id, args.order.id, args.comprobanteFile.name)
    const { error: uploadError } = await supabase.storage.from(STAFF_ORDER_BUCKET).upload(uploadPath, args.comprobanteFile, { upsert: true })
    if (uploadError) throw uploadError

    try {
      const { data } = supabase.storage.from(STAFF_ORDER_BUCKET).getPublicUrl(uploadPath)

      return await updatePaymentOrderWithAuditAndNotification({
        actor: args.actor,
        order: args.order,
        nextStatus: 'completed',
        updates: { status: 'completed', staff_comprobante_url: data.publicUrl, metadata: { ...(args.order.metadata ?? {}), completed_at: new Date().toISOString() } },
        reason: args.reason,
        notificationMessage: 'Tu orden fue completada.',
      })
    } catch (error) {
      await removeStorageObject(STAFF_ORDER_BUCKET, uploadPath)
      throw error
    }
  },

  async failPaymentOrder(args: { actor: StaffActor; order: PaymentOrder; reason: string }) {
    return updatePaymentOrderWithAuditAndNotification({
      actor: args.actor,
      order: args.order,
      nextStatus: 'failed',
      updates: { status: 'failed', metadata: { ...(args.order.metadata ?? {}), rejection_reason: args.reason } },
      reason: args.reason,
      notificationMessage: 'Tu orden fue marcada como failed.',
    })
  },

  async updateSupportTicketStatus(args: { actor: StaffActor; ticket: StaffSupportTicket; status: TicketStatus; reason: string }) {
    const supabase = createClient()
    const { data: updatedTicket, error } = await supabase.from('support_tickets').update({ status: args.status, updated_at: new Date().toISOString() }).eq('id', args.ticket.id).eq('updated_at', args.ticket.updated_at).select('*').single()
    if (error) throw error

    try {
      await insertAuditLog({ actor: args.actor, tableName: 'support_tickets', recordId: String(args.ticket.id), previousValues: pickRecordFields(args.ticket), newValues: pickRecordFields(updatedTicket), reason: args.reason, action: 'change_status' })
      await insertNotification({ userId: args.ticket.user_id, type: 'support_update', title: 'Actualizacion de ticket', message: `Tu ticket ahora esta ${args.status}.`, link: '/soporte' })
      return updatedTicket as StaffSupportTicket
    } catch (error) {
      await rollbackSupportTicketStatusChange(updatedTicket as StaffSupportTicket, args.ticket)
      throw error
    }
  },
}

async function updatePaymentOrderWithAuditAndNotification(args: { actor: StaffActor; order: PaymentOrder; nextStatus: PaymentOrder['status']; updates: Partial<PaymentOrder>; reason: string; notificationMessage: string }) {
  assertOrderTransition(args.order.status, args.nextStatus)

  const supabase = createClient()
  const payload = { ...args.updates, updated_at: new Date().toISOString() }
  const { data: updatedOrder, error } = await supabase.from('payment_orders').update(payload).eq('id', args.order.id).eq('updated_at', args.order.updated_at).select('*').single()
  if (error) throw error

  try {
    await insertAuditLog({ actor: args.actor, tableName: 'payment_orders', recordId: args.order.id, previousValues: pickRecordFields(args.order), newValues: pickRecordFields(updatedOrder), reason: args.reason, action: 'change_status' })
    await insertNotification({ userId: args.order.user_id, type: 'status_change', title: 'Actualizacion de orden', message: args.notificationMessage, link: '/pagos' })
    return updatedOrder as PaymentOrder
  } catch (error) {
    await rollbackPaymentOrderChange(updatedOrder as PaymentOrder, args.order)
    throw error
  }
}

function assertOrderTransition(currentStatus: PaymentOrder['status'], nextStatus: PaymentOrder['status']) {
  if (!ORDER_TRANSITIONS[currentStatus].includes(nextStatus)) {
    throw new Error(`Transicion invalida de ${currentStatus} a ${nextStatus}.`)
  }
}

async function insertAuditLog(args: { actor: StaffActor; tableName: string; recordId: string; previousValues: Record<string, unknown>; newValues: Record<string, unknown>; reason: string; action: 'create' | 'update' | 'change_status' | 'logical_cancel' }) {
  const supabase = createClient()
  const affectedFields = Object.keys(args.newValues).filter((key) => JSON.stringify(args.previousValues[key]) !== JSON.stringify(args.newValues[key]))
  const { error } = await supabase.from('audit_logs').insert({ performed_by: args.actor.userId, role: args.actor.role, action: args.action, table_name: args.tableName, record_id: args.recordId, affected_fields: affectedFields, previous_values: args.previousValues, new_values: args.newValues, reason: args.reason, source: 'ui' })
  if (error) throw error
}

async function insertNotification(args: { userId: string; type: NotificationType; title: string; message: string; link: string }) {
  const supabase = createClient()
  const { error } = await supabase.from('notifications').insert({ user_id: args.userId, type: args.type, title: args.title, message: args.message, link: args.link, is_read: false })
  if (error) throw error
}

async function ensureWalletExists(userId: string): Promise<{ wallet: Wallet; created: boolean }> {
  const supabase = createClient()
  const { data: wallet, error } = await supabase.from('wallets').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (wallet) return { wallet: wallet as Wallet, created: false }

  const { data: createdWallet, error: createError } = await supabase.from('wallets').insert({ user_id: userId, currency: 'USD' }).select('*').single()
  if (createError) throw createError
  return { wallet: createdWallet as Wallet, created: true }
}

async function rollbackOnboardingStatusChange(args: {
  record: StaffOnboardingRecord
  previousRecord: StaffOnboardingRecord
  previousProfile: { onboarding_status: string | null; full_name: string | null }
  userId: string
  createdWalletId?: string
}) {
  const supabase = createClient()

  await supabase
    .from('onboarding')
    .update({
      status: args.previousRecord.status,
      observations: args.previousRecord.observations ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', args.record.id)
    .eq('updated_at', args.record.updated_at)

  await supabase
    .from('profiles')
    .update({
      onboarding_status: args.previousProfile.onboarding_status,
      full_name: args.previousProfile.full_name,
    })
    .eq('id', args.userId)

  if (args.createdWalletId) {
    await supabase.from('wallets').delete().eq('id', args.createdWalletId)
  }
}

async function rollbackPaymentOrderChange(updatedOrder: PaymentOrder, previousOrder: PaymentOrder) {
  const supabase = createClient()
  await supabase
    .from('payment_orders')
    .update({
      status: previousOrder.status,
      exchange_rate_applied: previousOrder.exchange_rate_applied,
      amount_converted: previousOrder.amount_converted,
      fee_total: previousOrder.fee_total,
      metadata: previousOrder.metadata ?? null,
      staff_comprobante_url: previousOrder.staff_comprobante_url ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', updatedOrder.id)
    .eq('updated_at', updatedOrder.updated_at)
}

async function rollbackSupportTicketStatusChange(updatedTicket: StaffSupportTicket, previousTicket: StaffSupportTicket) {
  const supabase = createClient()
  await supabase
    .from('support_tickets')
    .update({
      status: previousTicket.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', updatedTicket.id)
    .eq('updated_at', updatedTicket.updated_at)
}

function buildStaffOrderFilePath(userId: string, orderId: string, fileName: string) {
  const extension = safeFileExtension(fileName)
  return `${userId}/${orderId}/staff_comprobante_${Date.now()}.${extension}`
}

async function removeStorageObject(bucket: string, path: string) {
  const supabase = createClient()
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) {
    console.error('Failed to cleanup storage object', { bucket, path, error })
  }
}

function normalizeRecordObject(value: unknown) {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function inferFullNameFromOnboarding(data: Record<string, unknown>) {
  const directCandidates = ['full_name', 'company_name', 'legal_name']
  for (const key of directCandidates) {
    const value = data[key]
    if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  }

  const firstNames = data.first_names
  const lastNames = data.last_names
  if (typeof firstNames === 'string' && typeof lastNames === 'string') return `${firstNames} ${lastNames}`.trim()

  return null
}

function pickRecordFields(record: unknown) {
  return normalizeRecordObject(record)
}
