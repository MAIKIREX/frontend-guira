'use client'

/**
 * use-compliance.ts — NUEVO HOOK
 *
 * Estado de compliance del usuario: KYC + KYB + documentos.
 * Usado por el nuevo Compliance Dashboard y el banner de onboarding.
 */
import { useCallback, useEffect, useState } from 'react'
import { ComplianceService } from '@/services/compliance.service'
import type {
  ComplianceKycState,
  ComplianceKybState,
  ComplianceDocument,
  ComplianceReview,
} from '@/services/compliance.service'

export interface ComplianceState {
  kyc: ComplianceKycState | null
  kyb: ComplianceKybState | null
  documents: ComplianceDocument[]
  reviews: ComplianceReview[]
}

export function useCompliance() {
  const [state, setState] = useState<ComplianceState>({
    kyc: null,
    kyb: null,
    documents: [],
    reviews: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [kyc, kyb, documents, reviews] = await Promise.all([
        ComplianceService.getKycState().catch(() => null),
        ComplianceService.getKybState().catch(() => null),
        ComplianceService.getDocuments().catch(() => []),
        ComplianceService.getReviews().catch(() => []),
      ])

      setState({ kyc, kyb, documents, reviews })
    } catch (err) {
      console.error('Failed to load compliance state', err)
      setError('No se pudo cargar el estado de compliance.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  /** True si el usuario puede operar (KYC aprobado) */
  const isApproved = state.kyc?.status === 'approved'

  /** True si hay una revisión en curso */
  const isPending =
    state.kyc?.status === 'submitted' || state.kyc?.status === 'in_progress'

  return { state, loading, error, reload: load, isApproved, isPending }
}
