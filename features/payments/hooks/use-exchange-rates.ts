'use client'

/**
 * use-exchange-rates.ts — NUEVO HOOK
 *
 * Obtiene las tasas de cambio y configuración de la plataforma del backend.
 * Sustituye: getNumericSetting(snapshot.appSettings, 'parallel_buy_rate')
 *
 * El panel (client-dashboard.tsx) ya no depende de PaymentsSnapshot
 * para mostrar tasas — las tasas vienen directamente del backend.
 */
import { useCallback, useEffect, useState } from 'react'
import { PaymentsService } from '@/services/payments.service'
import { ProfileService } from '@/services/profile.service'

export interface ExchangeRatePair {
  from_currency: string
  to_currency: string
  rate: number
  label?: string
}

export interface PlatformRates {
  buyRate: number | null    // Tasa de compra USD (enviar Bs → USD)
  sellRate: number | null   // Tasa de venta USD (depositar USD → Bs)
  rawRates: ExchangeRatePair[]
  publicSettings: Record<string, string>
}

export function useExchangeRates() {
  const [rates, setRates] = useState<PlatformRates>({
    buyRate: null,
    sellRate: null,
    rawRates: [],
    publicSettings: {},
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [rawRates, publicSettings] = await Promise.all([
        PaymentsService.getExchangeRates() as Promise<ExchangeRatePair[]>,
        ProfileService.getPublicSettings(),
      ])

      // Extrae las tasas clave del array de pares
      const buyPair = rawRates.find(
        (r: any) => r.pair === 'BOB_USD'
      )
      const sellPair = rawRates.find(
        (r: any) => r.pair === 'USD_BOB'
      )

      // Fallback: leer de publicSettings si el módulo exchange-rates no está disponible
      const buyFromSettings = publicSettings['parallel_buy_rate']
        ? parseFloat(publicSettings['parallel_buy_rate'])
        : null

      const sellFromSettings = publicSettings['parallel_sell_rate']
        ? parseFloat(publicSettings['parallel_sell_rate'])
        : null

      setRates({
        buyRate: (buyPair?.rate ?? buyFromSettings) || null,
        sellRate: (sellPair?.rate ?? sellFromSettings) || null,
        rawRates,
        publicSettings,
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
