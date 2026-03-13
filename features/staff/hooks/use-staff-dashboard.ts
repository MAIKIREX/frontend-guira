'use client'

import { useCallback, useEffect, useState } from 'react'
import { StaffService } from '@/services/staff.service'
import type { StaffSnapshot } from '@/types/staff'

export function useStaffDashboard() {
  const [snapshot, setSnapshot] = useState<StaffSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await StaffService.getReadOnlySnapshot()
      setSnapshot(data)
    } catch (err) {
      console.error('Failed to load staff dashboard', err)
      setError('No se pudo cargar el panel staff de solo lectura.')
    } finally {
      setLoading(false)
    }
  }, [])

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
