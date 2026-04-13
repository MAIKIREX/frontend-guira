'use client'

import { useCallback, useEffect, useState } from 'react'
import { BridgeTransfersAdminService } from '@/services/admin/bridge-transfers.admin.service'
import type { AdminBridgeTransfer } from '@/types/bridge-transfer'

export function useAdminBridgeTransfers(filters?: { status?: string }) {
  const [transfers, setTransfers] = useState<AdminBridgeTransfer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await BridgeTransfersAdminService.getTransfers(filters)
      setTransfers(data)
    } catch (err) {
      console.error('Failed to load admin bridge transfers', err)
      setError('No se pudo cargar el registro de transferencias Bridge.')
    } finally {
      setLoading(false)
    }
  }, [filters?.status])

  useEffect(() => {
    load()
  }, [load])

  return {
    transfers,
    loading,
    error,
    reload: load,
  }
}
