'use client'

import { useCallback, useEffect, useState } from 'react'
import { ComplianceAdminService, type AdminComplianceReview } from '@/services/admin/compliance.admin.service'

export interface AdminComplianceState {
  reviews: AdminComplianceReview[]
  stats: {
    pendingKybs: number
    pendingKycs: number
  }
}

export function useAdminCompliance() {
  const [state, setState] = useState<AdminComplianceState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Pedimos todas (status=all no existe en param, pero asumiendo no filter trae todo)
      const reviews = await ComplianceAdminService.getReviews({})
      
      const pendingKybs = reviews.filter(r => r.type === 'kyb' && r.status === 'under_review').length
      const pendingKycs = reviews.filter(r => r.type === 'kyc' && r.status === 'under_review').length

      setState({
        reviews,
        stats: {
          pendingKybs,
          pendingKycs,
        }
      })
    } catch (err) {
      console.error('Failed to load admin compliance', err)
      setError('No se pudo cargar las revisiones de compliance.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const approveReview = useCallback(async (id: string, notes?: string) => {
    try {
      await ComplianceAdminService.approveReview(id, { notes })
      setState(current => current ? {
        ...current,
        reviews: current.reviews.map(r => r.id === id ? { ...r, status: 'approved' } : r)
      } : null)
    } catch (err) {
      console.error(err)
      throw err
    }
  }, [])

  const rejectReview = useCallback(async (id: string, reason: string) => {
    try {
      await ComplianceAdminService.rejectReview(id, { rejection_reason: reason })
      setState(current => current ? {
        ...current,
        reviews: current.reviews.map(r => r.id === id ? { ...r, status: 'rejected' } : r)
      } : null)
    } catch (err) {
      console.error(err)
      throw err
    }
  }, [])

  return {
    state,
    loading,
    error,
    reload: load,
    approveReview,
    rejectReview,
  }
}
