'use client'

/**
 * use-payments-module.ts
 * 
 * MIGRADO: usePaymentsModule ya no pasa userId a PaymentsService.
 * El backend determina el usuario autenticado por JWT.
 * 
 * Cambios clave:
 * - getSnapshot(userId) eliminado → reemplazado por 4 llamadas paralelas
 * - PaymentSnapshot reconstruido desde respuestas API individuales
 * - createOrder llama a createInterbankOrder o createWalletRampOrder según route
 * - uploadOrderFile → uploadOrderEvidence (REST multipart)
 * - cancelOrder → cancelOrder(orderId) sin objeto completo
 */

import { useCallback, useEffect, useState } from 'react'
import { PaymentsService } from '@/services/payments.service'
import type { PaymentOrder, AppSettingRow, FeeConfigRow, PsavConfigRow, CreatePaymentOrderInput, SupplierUpsertInput, OrderFileField } from '@/types/payment-order'
import type { Supplier } from '@/types/supplier'
import type { ActivityLog } from '@/types/activity-log'

// ── Tipo local que reemplaza PaymentSnapshot ─────────────────────
// (PaymentSnapshot era un antipatrón: acoplaba 6 entidades en un solo blob)
export interface PaymentsModuleState {
  orders: PaymentOrder[]
  suppliers: Supplier[]
  activityLogs: ActivityLog[]
  /** Configuración de fees, tasas PSAV y app settings cargados del backend */
  feesConfig: FeeConfigRow[]
  psavConfigs: PsavConfigRow[]
  appSettings: AppSettingRow[]
  exchangeRates: unknown[]
  /** Siempre vacío en la nueva arquitectura (el backend ya no retorna gaps) */
  gaps: string[]
}

export function usePaymentsModule() {
  const [state, setState] = useState<PaymentsModuleState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Carga paralela — queries principales
      const [ordersResult, suppliersResult, feesResult, ratesResult] = await Promise.allSettled([
        PaymentsService.getOrders(),
        PaymentsService.getSuppliers(),
        PaymentsService.getFeesConfig(),
        PaymentsService.getExchangeRates(),
      ])

      if (ordersResult.status === 'rejected') throw ordersResult.reason
      if (suppliersResult.status === 'rejected') throw suppliersResult.reason

      const rawOrders = ordersResult.value
      const suppliers = suppliersResult.value
      const feesConfig = feesResult.status === 'fulfilled' ? feesResult.value : []
      const exchangeRates = ratesResult.status === 'fulfilled' ? ratesResult.value : []

      // Carga paralela — queries secundarias (opcionales, no bloquean la vista)
      const [activityResult, psavResult, settingsResult] = await Promise.allSettled([
        PaymentsService.getActivityLogs(),
        PaymentsService.getPsavConfigs(),
        PaymentsService.getAppSettings(),
      ])

      // Normalize: backend may return a wrapped object { data: [...] } or { items: [...] }
      const orders: PaymentOrder[] = Array.isArray(rawOrders)
        ? rawOrders
        : Array.isArray((rawOrders as any)?.data)
          ? (rawOrders as any).data
          : Array.isArray((rawOrders as any)?.items)
            ? (rawOrders as any).items
            : []

      const activityLogs = activityResult.status === 'fulfilled' ? activityResult.value : []
      const psavConfigs = psavResult.status === 'fulfilled' ? psavResult.value : []
      const appSettings = settingsResult.status === 'fulfilled' ? settingsResult.value : []

      setState({
        orders,
        suppliers,
        activityLogs,
        feesConfig: feesConfig as FeeConfigRow[],
        psavConfigs,
        appSettings,
        exchangeRates,
        gaps: [],
      })
    } catch (err) {
      console.error('Failed to load payments module', err)
      setError('No se pudo cargar el módulo de pagos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // ── Optimistic updates (sin snapshot monolítico) ──────────────

  const mergeOrder = useCallback((updatedOrder: PaymentOrder) => {
    setState((current) => {
      if (!current) return current
      const exists = current.orders.some((entry) => entry.id === updatedOrder.id)
      return {
        ...current,
        orders: exists
          ? current.orders.map((entry) => (entry.id === updatedOrder.id ? updatedOrder : entry))
          : [updatedOrder, ...current.orders],
      }
    })
  }, [])

  // ── Suppliers ─────────────────────────────────────────────────

  const createSupplier = useCallback(async (dto: SupplierUpsertInput) => {
    const supplier = await PaymentsService.createSupplier(dto as any)
    setState((current) => {
      if (!current) return current
      return {
        ...current,
        suppliers: [...current.suppliers, supplier].sort((a, b) => a.name.localeCompare(b.name)),
      }
    })
    return supplier
  }, [])

  const updateSupplier = useCallback(async (supplierId: string, dto: Partial<SupplierUpsertInput>) => {
    const supplier = await PaymentsService.updateSupplier(supplierId, dto as any)
    setState((current) => {
      if (!current) return current
      return {
        ...current,
        suppliers: current.suppliers
          .map((entry) => (entry.id === supplier.id ? supplier : entry))
          .sort((a, b) => a.name.localeCompare(b.name)),
      }
    })
    return supplier
  }, [])

  const deleteSupplier = useCallback(async (supplierId: string) => {
    await PaymentsService.deleteSupplier(supplierId)
    setState((current) => {
      if (!current) return current
      return {
        ...current,
        suppliers: current.suppliers.filter((supplier) => supplier.id !== supplierId),
      }
    })
  }, [])

  // ── Órdenes ───────────────────────────────────────────────────

  /**
   * Crea una orden de pago.
   * Determina internamente si es interbank o wallet-ramp según los params.
   * 
   * NOTA: Los uploads de evidencia/soporte ahora se hacen en el BACKEND
   * como parte del mismo flujo — el frontend solo envía el archivo.
   */
  const createOrder = useCallback(async (
    input: any,
    qrFile?: File | null,
    supportFile?: File | null
  ) => {
    // Subir QR bancario (solo world_to_bolivia) → destination_qr_url
    let qrUrl: string | undefined = undefined
    if (qrFile && input.flow_type === 'world_to_bolivia') {
      qrUrl = await PaymentsService.uploadFileToStorage(qrFile, 'payment-receipts')
    }

    // Subir documento de respaldo → supporting_document_url
    let supportUrl = input.supporting_document_url
    if (supportFile) {
      supportUrl = await PaymentsService.uploadFileToStorage(supportFile, 'payment-receipts')
    }

    const finalInput = {
      ...input,
      supporting_document_url: supportUrl,
      ...(qrUrl ? { destination_qr_url: qrUrl } : {}),
    }

    let order: PaymentOrder;
    const rampFlows = ['fiat_bo_to_bridge_wallet', 'crypto_to_bridge_wallet', 'fiat_us_to_bridge_wallet', 'bridge_wallet_to_fiat_bo', 'bridge_wallet_to_crypto', 'bridge_wallet_to_fiat_us', 'wallet_to_fiat']
    
    if (rampFlows.includes(finalInput.flow_type)) {
      order = await PaymentsService.createWalletRampOrder(finalInput as any)
    } else {
      order = await PaymentsService.createInterbankOrder(finalInput as any)
    }

    mergeOrder(order)
    return order
  }, [mergeOrder])


  /**
   * Sube un archivo a una orden existente.
   * - evidence_url: sube a storage y notifica al backend via confirm-deposit.
   * - support_document_url / supporting_document_url: sube a storage y actualiza
   *   el estado local de la orden (el backend no tiene endpoint standalone para esto
   *   post-creación, pero el archivo sí queda persistido en Storage).
   */
  const uploadOrderFile = useCallback(async (orderId: string, field: OrderFileField, file: File) => {
    if (field === 'support_document_url' || field === 'supporting_document_url') {
      // Upload to Supabase Storage
      const storagePath = await PaymentsService.uploadFileToStorage(file, 'payment-receipts')
      // Intentar persistir la URL en el backend vía PATCH
      try {
        const updatedOrder = await PaymentsService.updateOrder(orderId, { supporting_document_url: storagePath })
        mergeOrder(updatedOrder)
        return updatedOrder
      } catch {
        // Fallback: si el backend no soporta PATCH aún, actualizar solo localmente
        console.warn(`[usePaymentsModule] No se pudo persistir supporting_document_url en backend para order ${orderId}. Actualización solo local.`)
        const currentOrder = state?.orders.find(o => o.id === orderId)
        if (currentOrder) {
          const updatedOrder = { ...currentOrder, supporting_document_url: storagePath }
          mergeOrder(updatedOrder)
          return updatedOrder
        }
        throw new Error(`Order ${orderId} not found in local state`)
      }
    }
    const order = await PaymentsService.uploadOrderEvidence(orderId, file)
    mergeOrder(order)
    return order
  }, [mergeOrder, state])

  /**
   * Cancela una orden.
   * Ya no necesita el objeto PaymentOrder completo — solo el ID.
   */
  const cancelOrder = useCallback(async (orderOrId: PaymentOrder | string) => {
    const orderId = typeof orderOrId === 'string' ? orderOrId : orderOrId.id
    const updatedOrder = await PaymentsService.cancelOrder(orderId)
    mergeOrder(updatedOrder)
    return updatedOrder
  }, [mergeOrder])

  return {
    /** @deprecated Usar state directamente. snapshot se mantiene para compatibilidad temporal. */
    snapshot: state ? {
      suppliers: state.suppliers,
      paymentOrders: state.orders,
      activityLogs: state.activityLogs,
      feesConfig: state.feesConfig,
      appSettings: state.appSettings,
      psavConfigs: state.psavConfigs,
      exchangeRates: state.exchangeRates,
      gaps: state.gaps,
    } : null,
    state,
    loading,
    error,
    reload: load,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    createOrder,
    uploadOrderFile,
    cancelOrder,
  }
}
