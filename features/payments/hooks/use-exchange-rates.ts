'use client'

/**
 * use-exchange-rates.ts
 *
 * Obtiene las tasas de cambio del backend desde exchange_rates_config.
 * Las tasas se sincronizan automáticamente desde el cron o manualmente desde admin.
 *
 * Pares soportados: BOB_USD, USD_BOB
 */
import { useCallback, useEffect, useState } from 'react'
import { PaymentsService } from '@/services/payments.service'

export interface ExchangeRatePair {
  id?: string
  pair: string
  rate: number
  spread_percent?: number
  effective_rate?: number
  base_rate?: number
  updated_at?: string
  updated_by?: string
}

export interface PlatformRates {
  buyRate: number | null     // effective_rate
  sellRate: number | null    // effective_rate
  buyBaseRate: number | null
  sellBaseRate: number | null
  buySpread: number | null
  sellSpread: number | null
  rawRates: ExchangeRatePair[]
}

export function useExchangeRates() {
  const [rates, setRates] = useState<PlatformRates>({
    buyRate: null,
    sellRate: null,
    buyBaseRate: null,
    sellBaseRate: null,
    buySpread: null,
    sellSpread: null,
    rawRates: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const rawRates = await PaymentsService.getExchangeRates() as ExchangeRatePair[]

      const buyPair = rawRates.find(
        (r) => r.pair?.toUpperCase() === 'BOB_USD'
      )
      const sellPair = rawRates.find(
        (r) => r.pair?.toUpperCase() === 'USD_BOB'
      )

      setRates({
        buyRate: buyPair?.effective_rate ?? buyPair?.rate ?? null,
        sellRate: sellPair?.effective_rate ?? sellPair?.rate ?? null,
        buyBaseRate: buyPair?.base_rate ?? buyPair?.rate ?? null,
        sellBaseRate: sellPair?.base_rate ?? sellPair?.rate ?? null,
        buySpread: buyPair?.spread_percent ?? 0,
        sellSpread: sellPair?.spread_percent ?? 0,
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
