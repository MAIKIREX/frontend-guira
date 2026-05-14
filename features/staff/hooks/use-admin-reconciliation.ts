'use client'

import { useCallback, useEffect, useState } from 'react'
import { ReconciliationAdminService } from '@/services/admin/reconciliation.admin.service'

export interface AdminReconciliationState {
  reports: unknown[]
}

export function useAdminReconciliation() {
  const [state, setState] = useState<AdminReconciliationState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const reports = await ReconciliationAdminService.getHistory()

      setState({
        reports,
      })
    } catch (err) {
      console.error('Failed to load admin reconciliation', err)
      setError('No se pudo cargar la reconciliación.')
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
