/**
 * admin/compliance.admin.service.ts — NUEVO
 * 
 * Reemplaza la parte de compliance de staff.service.ts (542 líneas).
 * Permite a admins revisar, aprobar, rechazar y escalar casos KYC/KYB.
 * 
 * Todos los endpoints requieren rol: admin | super_admin
 */
import { apiGet, apiPost } from '@/lib/api/client'
import type { PaginationParams } from '@/lib/api/types'

export interface AdminComplianceReview {
  id: string
  user_id: string
  type: 'kyc' | 'kyb'
  status: string
  user_email?: string
  user_full_name?: string
  submitted_at: string
  resolved_at?: string
  notes?: string
}

export interface ComplianceAction {
  notes?: string
  rejection_reason?: string
}

export interface ComplianceListParams extends PaginationParams {
  status?: string
  type?: 'kyc' | 'kyb'
}

export const ComplianceAdminService = {
  /**
   * Lista todos los casos de compliance pendientes o en revisión.
   */
  async getReviews(params?: ComplianceListParams): Promise<AdminComplianceReview[]> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { limit, page, status, type, ...allowedParams } = params || {}
    return apiGet<AdminComplianceReview[]>('/admin/compliance/reviews', { params: allowedParams })
  },

  /**
   * Detalle de un caso de compliance.
   */
  async getReview(reviewId: string): Promise<AdminComplianceReview> {
    return apiGet<AdminComplianceReview>(`/admin/compliance/reviews/${reviewId}`)
  },

  /**
   * Aprueba un caso de compliance.
   */
  async approveReview(reviewId: string, dto?: ComplianceAction): Promise<void> {
    return apiPost<void>(`/admin/compliance/reviews/${reviewId}/approve`, dto)
  },

  /**
   * Rechaza un caso de compliance.
   */
  async rejectReview(reviewId: string, dto: Required<Pick<ComplianceAction, 'rejection_reason'>>): Promise<void> {
    return apiPost<void>(`/admin/compliance/reviews/${reviewId}/reject`, dto)
  },

  /**
   * Escala un caso para revisión adicional.
   */
  async escalateReview(reviewId: string, dto?: ComplianceAction): Promise<void> {
    return apiPost<void>(`/admin/compliance/reviews/${reviewId}/escalate`, dto)
  },
}
