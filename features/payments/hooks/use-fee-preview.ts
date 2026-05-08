'use client'

import { useEffect, useRef, useState } from 'react'
import { PaymentsService } from '@/services/payments.service'

export interface FeePreviewResult {
  fee_amount: number
  net_amount: number
  fee_type: string
  fee_percent: number
  fee_fixed: number
  min_fee: number
  max_fee: number
  is_override: boolean
}

/** Mapeo de route/flow_type del frontend → operation_type + payment_rail del backend. */
const ROUTE_FEE_PARAMS: Record<string, { operation_type: string; payment_rail: string }> = {
  // Rutas interbank
  bolivia_to_exterior:      { operation_type: 'interbank_bo_out',   payment_rail: 'psav'   },
  world_to_bolivia:         { operation_type: 'interbank_bo_in',    payment_rail: 'psav'   },
  crypto_to_crypto:         { operation_type: 'interbank_w2w',      payment_rail: 'bridge' },
  us_to_wallet:             { operation_type: 'ramp_off_bo',        payment_rail: 'psav'   },
  wallet_to_fiat:           { operation_type: 'wallet_to_fiat_off', payment_rail: 'bridge' },
  // Wallet ramp — on-ramp
  fiat_bo_to_bridge_wallet: { operation_type: 'ramp_on_bo',         payment_rail: 'psav'   },
  crypto_to_bridge_wallet:  { operation_type: 'ramp_on_crypto',     payment_rail: 'bridge' },
  fiat_us_to_bridge_wallet: { operation_type: 'ramp_on_fiat_us',    payment_rail: 'bridge' },
  // Wallet ramp — off-ramp
  bridge_wallet_to_fiat_bo: { operation_type: 'ramp_off_bo',        payment_rail: 'psav'   },
  bridge_wallet_to_crypto:  { operation_type: 'ramp_off_crypto',    payment_rail: 'bridge' },
  bridge_wallet_to_fiat_us: { operation_type: 'ramp_off_fiat_us',   payment_rail: 'bridge' },
}

/**
 * Consulta al backend el fee real que se aplicaría al usuario autenticado para
 * una operación dada (considerando overrides personales).
 *
 * - `routeOrFlowType`: SupportedPaymentRoute o flow_type (ej. "fiat_bo_to_bridge_wallet").
 * - `amount`: monto bruto en la moneda de origen.
 * - `debounceMs`: milisegundos de espera tras el último cambio de `amount` (default 400ms).
 *
 * Devuelve `null` mientras el resultado no está disponible.
 */
export function useFeePreview(
  routeOrFlowType: string | null | undefined,
  amount: number,
  debounceMs = 400,
) {
  const [preview, setPreview] = useState<FeePreviewResult | null>(null)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const feeParams = routeOrFlowType ? ROUTE_FEE_PARAMS[routeOrFlowType] : undefined

    if (!feeParams || !amount || amount <= 0) {
      setPreview(null)
      setLoading(false)
      return
    }

    setLoading(true)

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      try {
        const result = await PaymentsService.getFeePreview({
          operation_type: feeParams.operation_type,
          payment_rail: feeParams.payment_rail,
          amount,
        })
        setPreview(result)
      } catch {
        setPreview(null)
      } finally {
        setLoading(false)
      }
    }, debounceMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [routeOrFlowType, amount, debounceMs])

  return { preview, loading }
}
