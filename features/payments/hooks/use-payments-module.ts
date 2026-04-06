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

// ── Tipo local que reemplaza PaymentSnapshot ─────────────────────
// (PaymentSnapshot era un antipatrón: acoplaba 6 entidades en un solo blob)
export interface PaymentsModuleState {
  orders: PaymentOrder[]
  suppliers: Supplier[]
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
      // Carga paralela — reemplaza el getSnapshot() con 6 queries en 1
      const [rawOrders, suppliers, feesConfig, exchangeRates] = await Promise.all([
        PaymentsService.getOrders(),
        PaymentsService.getSuppliers(),
        PaymentsService.getFeesConfig(),
        PaymentsService.getExchangeRates(),
      ])

      // Normalize: backend may return a wrapped object { data: [...] } or { items: [...] }
      const orders: PaymentOrder[] = Array.isArray(rawOrders)
        ? rawOrders
        : Array.isArray((rawOrders as any)?.data)
          ? (rawOrders as any).data
          : Array.isArray((rawOrders as any)?.items)
            ? (rawOrders as any).items
            : []

      setState({
        orders,
        suppliers,
        feesConfig: feesConfig as FeeConfigRow[],
        psavConfigs: [] as PsavConfigRow[],
        appSettings: [] as AppSettingRow[],
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
    supportFile?: File | null,
    evidenceFile?: File | null
  ) => {
    let order: PaymentOrder;
    const rampFlows = ['fiat_bo_to_bridge_wallet', 'crypto_to_bridge_wallet', 'fiat_us_to_bridge_wallet', 'bridge_wallet_to_fiat_bo', 'bridge_wallet_to_crypto', 'bridge_wallet_to_fiat_us']
    
    if (rampFlows.includes(input.flow_type)) {
      order = await PaymentsService.createWalletRampOrder(input as any)
    } else {
      order = await PaymentsService.createInterbankOrder(input as any)
    }

    if (supportFile) {
      order = await PaymentsService.uploadOrderEvidence(order.id, supportFile, 'receipt_url')
    }

    if (evidenceFile) {
      order = await PaymentsService.uploadOrderEvidence(order.id, evidenceFile, 'evidence_url')
    }

    mergeOrder(order)
    return order
  }, [mergeOrder])

  /**
   * Sube un archivo a una orden existente.
   * Reemplaza: PaymentsService.updateOrderFile(order, field, file, userId)
   */
  const uploadOrderFile = useCallback(async (orderId: string, field: OrderFileField, file: File) => {
    const backendField = field === 'support_document_url' ? 'receipt_url' : 'evidence_url'
    const order = await PaymentsService.uploadOrderEvidence(orderId, file, backendField)
    mergeOrder(order)
    return order
  }, [mergeOrder])

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
      activityLogs: [],
      feesConfig: state.feesConfig,
      appSettings: state.appSettings,
      psavConfigs: state.psavConfigs,
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
