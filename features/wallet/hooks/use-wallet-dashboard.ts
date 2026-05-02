'use client'

/**
 * use-wallet-dashboard.ts
 *
 * Carga wallets, balances y rutas de payin desde el backend REST.
 * Suscribe a Supabase Realtime para refrescar automáticamente
 * cuando el balance del usuario cambia (e.g. depósito VA confirmado).
 *
 * El userId ya NO se pasa — el backend lo obtiene del JWT.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { WalletService } from '@/services/wallet.service'
import type { WalletBalance, PayinRoute, LedgerEntry } from '@/services/wallet.service'
import { createClient } from '@/lib/supabase/browser'
import { useProfileStore } from '@/stores/profile-store'

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
  const { profile } = useProfileStore()
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

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

  // ── Supabase Realtime: escuchar cambios en balances y ledger_entries ──
  useEffect(() => {
    const userId = profile?.id
    if (!userId) return

    const supabase = createClient()

    // Canal único para este usuario — escucha 2 tablas
    const channel = supabase
      .channel(`wallet-live:${userId}`)
      // Cuando cambia la tabla balances para este usuario → refrescar datos
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'balances',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Refrescar todo el dashboard para mantener consistencia
          load()
        }
      )
      // Cuando se inserta un nuevo ledger_entry → refrescar para mostrar movimiento
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Al recibir una notificación financiera, también refrescar
          load()
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [profile?.id, load])

  // ── Carga inicial ──
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
