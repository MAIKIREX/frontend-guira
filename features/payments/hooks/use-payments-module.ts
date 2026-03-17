'use client'

import { useCallback, useEffect, useState } from 'react'
import { PaymentsService } from '@/services/payments.service'
import type {
  CreatePaymentOrderInput,
  OrderFileField,
  PaymentOrder,
  PaymentSnapshot,
  SupplierUpsertInput,
} from '@/types/payment-order'

export function usePaymentsModule(userId?: string) {
  const [snapshot, setSnapshot] = useState<PaymentSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!userId) {
      setSnapshot(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await PaymentsService.getSnapshot(userId)
      setSnapshot(data)
    } catch (err) {
      console.error('Failed to load payments module', err)
      setError('No se pudo cargar el modulo de pagos.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  const mergeOrder = useCallback((updatedOrder: PaymentOrder) => {
    setSnapshot((current) => {
      if (!current) return current
      const exists = current.paymentOrders.some((entry) => entry.id === updatedOrder.id)
      return {
        ...current,
        paymentOrders: exists
          ? current.paymentOrders.map((entry) => (entry.id === updatedOrder.id ? updatedOrder : entry))
          : [updatedOrder, ...current.paymentOrders],
      }
    })
  }, [])

  const createSupplier = useCallback(async (input: SupplierUpsertInput) => {
    const supplier = await PaymentsService.createSupplier(input)
    setSnapshot((current) => {
      if (!current) return current
      return {
        ...current,
        suppliers: [...current.suppliers, supplier].sort((a, b) => a.name.localeCompare(b.name)),
      }
    })
    return supplier
  }, [])

  const updateSupplier = useCallback(async (supplierId: string, input: Partial<SupplierUpsertInput>) => {
    const supplier = await PaymentsService.updateSupplier(supplierId, input)
    setSnapshot((current) => {
      if (!current) return current
      return {
        ...current,
        suppliers: current.suppliers.map((entry) => (entry.id === supplier.id ? supplier : entry)).sort((a, b) => a.name.localeCompare(b.name)),
      }
    })
    return supplier
  }, [])

  const deleteSupplier = useCallback(async (supplierId: string) => {
    await PaymentsService.deleteSupplier(supplierId)
    setSnapshot((current) => {
      if (!current) return current
      return {
        ...current,
        suppliers: current.suppliers.filter((supplier) => supplier.id !== supplierId),
      }
    })
  }, [])

  const createOrder = useCallback(async (
    input: CreatePaymentOrderInput,
    supportFile?: File | null,
    evidenceFile?: File | null
  ) => {
    if (!userId) {
      throw new Error('Missing user id')
    }

    let order = await PaymentsService.createPaymentOrder(input)

    if (supportFile) {
      const upload = await PaymentsService.updateOrderFile(order, 'support_document_url', supportFile, userId)
      order = upload.order
    }

    if (evidenceFile) {
      const upload = await PaymentsService.updateOrderFile(order, 'evidence_url', evidenceFile, userId)
      order = upload.order
    }

    mergeOrder(order)
    return order
  }, [mergeOrder, userId])

  const uploadOrderFile = useCallback(async (orderId: string, field: OrderFileField, file: File) => {
    if (!userId) {
      throw new Error('Missing user id')
    }

    const order = snapshot?.paymentOrders.find((entry) => entry.id === orderId)
    if (!order) {
      throw new Error('No se encontro la orden seleccionada.')
    }

    const result = await PaymentsService.updateOrderFile(order, field, file, userId)
    mergeOrder(result.order)
    return result.order
  }, [mergeOrder, snapshot?.paymentOrders, userId])

  const confirmOrderQuote = useCallback(async (order: PaymentOrder) => {
    const updatedOrder = await PaymentsService.confirmOrderQuote(order)
    mergeOrder(updatedOrder)
    return updatedOrder
  }, [mergeOrder])

  const cancelOrder = useCallback(async (order: PaymentOrder) => {
    const updatedOrder = await PaymentsService.cancelOrder(order)
    mergeOrder(updatedOrder)
    return updatedOrder
  }, [mergeOrder])

  return {
    snapshot,
    loading,
    error,
    reload: load,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    createOrder,
    uploadOrderFile,
    confirmOrderQuote,
    cancelOrder,
  }
}
