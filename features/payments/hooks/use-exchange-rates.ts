'use client'

/**
 * use-exchange-rates.ts
 *
 * Obtiene las tasas de cambio del backend desde exchange_rates_config.
 * Las tasas se sincronizan automáticamente desde el cron o manualmente desde admin.
 *
 * Pares soportados: BOB_USD, USD_BOB, BOB_USDC, USDC_BOB
 */
import { useCallback, useEffect, useState } from 'react'
import { PaymentsService } from '@/services/payments.service'

export interface ExchangeRatePair {
  id?: string
  pair: string
  rate: number
  spread_percent?: number
  updated_at?: string
  updated_by?: string
}

export interface PlatformRates {
  buyRate: number | null    // Tasa de compra USD (enviar Bs → USD) → par BOB_USD
  sellRate: number | null   // Tasa de venta USD (depositar USD → Bs) → par USD_BOB
  rawRates: ExchangeRatePair[]
}

export function useExchangeRates() {
  const [rates, setRates] = useState<PlatformRates>({
    buyRate: null,
    sellRate: null,
    rawRates: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const rawRates = await PaymentsService.getExchangeRates() as ExchangeRatePair[]

      // Extrae las tasas clave del array de pares (exchange_rates_config)
      const buyPair = rawRates.find(
        (r) => r.pair?.toUpperCase() === 'BOB_USD'
      )
      const sellPair = rawRates.find(
        (r) => r.pair?.toUpperCase() === 'USD_BOB'
      )

      setRates({
        buyRate: buyPair?.rate ?? null,
        sellRate: sellPair?.rate ?? null,
        rawRates,
      })
    } catch (err) {
      console.error('Failed to load exchange rates', err)
      setError('No se pudieron cargar las tasas.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { rates, loading, error, reload: load }
}
