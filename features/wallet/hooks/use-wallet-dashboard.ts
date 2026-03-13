'use client'

import { useCallback, useEffect, useState } from 'react'
import { WalletService } from '@/services/wallet.service'
import type { WalletDashboardSnapshot } from '@/types/wallet'

export function useWalletDashboard(userId?: string) {
  const [snapshot, setSnapshot] = useState<WalletDashboardSnapshot | null>(null)
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
      const data = await WalletService.getDashboardSnapshot(userId)
      setSnapshot(data)
    } catch (err) {
      console.error('Failed to load wallet dashboard', err)
      setError('No se pudo cargar el dashboard del cliente.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  return {
    snapshot,
    loading,
    error,
    reload: load,
  }
}
