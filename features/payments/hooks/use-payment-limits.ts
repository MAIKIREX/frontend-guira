'use client'

import { useCallback, useEffect, useState } from 'react'
import { PaymentsService } from '@/services/payments.service'

export interface PaymentLimits {
  flow_type: string
  min_usd: number
  max_usd: number
}

export function usePaymentLimits(flowType: string | null) {
  const [limits, setLimits] = useState<PaymentLimits | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (ft: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await PaymentsService.getPaymentLimits(ft)
      setLimits(data)
    } catch {
      setError('No se pudieron cargar los límites.')
      setLimits(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!flowType) {
      setLimits(null)
      return
    }
    load(flowType)
  }, [flowType, load])

  return { limits, loading, error }
}
