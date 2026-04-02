'use client'

import { useCallback, useEffect, useState } from 'react'
import { BridgeAdminService, type AdminBridgePayout } from '@/services/admin/bridge.admin.service'

export interface AdminBridgePayoutsState {
  payouts: AdminBridgePayout[]
}

export function useAdminBridgePayouts() {
  const [state, setState] = useState<AdminBridgePayoutsState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const payouts = await BridgeAdminService.getPayouts()

      setState({
        payouts,
      })
    } catch (err) {
      console.error('Failed to load admin bridge payouts', err)
      setError('No se pudo cargar el registro de payouts.')
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
