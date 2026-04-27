'use client'

/**
 * use-wallet-dashboard.ts
 * 
 * MIGRADO: WalletService.getDashboardSnapshot(userId) eliminado.
 * Ahora carga wallets, balances y rutas de payin de forma independiente.
 * El userId ya NO se pasa — el backend lo obtiene del JWT.
 */
import { useCallback, useEffect, useState } from 'react'
import { WalletService } from '@/services/wallet.service'
import type { WalletBalance, PayinRoute, LedgerEntry } from '@/services/wallet.service'

export interface WalletDashboardState {
  wallets: WalletBalance[]
  balances: WalletBalance[]
  payinRoutes: PayinRoute[]
  recentLedger: LedgerEntry[]
  /** Balance principal en USD (primer wallet USD activo) */
  primaryBalance: WalletBalance | null
}

export function useWalletDashboard() {
  const [state, setState] = useState<WalletDashboardState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [wallets, balances, payinRoutes, recentLedger] = await Promise.all([
        WalletService.getWallets(),
        WalletService.getBalances(),
        WalletService.getPayinRoutes(),
        WalletService.getLedger({ limit: 20 }),
      ])

      // getBalances() retorna filas de la tabla balances que no tienen is_active.
      // Seleccionar USDC directamente; si no existe, tomar el primero disponible.
      const primaryBalance = balances.find((b) => b.currency === 'USDC') ?? balances[0] ?? null

      setState({ wallets, balances, payinRoutes, recentLedger, primaryBalance })
    } catch (err) {
      console.error('Failed to load wallet dashboard', err)
      setError('No se pudo cargar el dashboard del cliente.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return {
    state,
    loading,
    error,
    reload: load,
  }
}
