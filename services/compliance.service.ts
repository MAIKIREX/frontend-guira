/**
 * compliance.service.ts — NUEVO SERVICIO
 * 
 * Servicio para que el usuario vea el estado de su cumplimiento regulatorio.
 * Reemplaza la vista básica de estado de onboarding con un dashboard completo.
 * 
 * Endpoints del usuario:
 *   GET /compliance/kyc        → estado KYC personal
 *   GET /compliance/kyb        → estado KYB empresa
 *   GET /compliance/reviews    → historial de revisiones
 *   GET /compliance/documents  → documentos subidos y su estado
 *   POST /compliance/documents/upload-url → URL firmada para subir doc
 *   POST /compliance/documents → registrar documento
 */
import { apiGet, apiPost } from '@/lib/api/client'

// ── Tipos ─────────────────────────────────────────────────────────

export type ComplianceStatus =
  | 'not_started'
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'more_info_required'

export interface ComplianceKycState {
  status: ComplianceStatus
  bridge_kyc_id?: string
  rejection_reason?: string
  submitted_at?: string
  approved_at?: string
  expires_at?: string
}

export interface ComplianceKybState {
  status: ComplianceStatus
  business_name?: string
  bridge_kyb_id?: string
  directors_count: number
  ubos_count: number
  rejection_reason?: string
  submitted_at?: string
  approved_at?: string
}

export interface ComplianceReview {
  id: string
  type: 'kyc' | 'kyb'
  status: ComplianceStatus
  reviewer_id?: string
  notes?: string
  created_at: string
  resolved_at?: string
}

export interface ComplianceDocument {
  id: string
  document_type: string
  subject_type: 'individual' | 'business' | 'director' | 'ubo'
  subject_id?: string
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason?: string
  file_name?: string
  uploaded_at: string
}

export interface UploadUrlRequest {
  document_type: string
  content_type: string
  subject_type: 'individual' | 'business' | 'director' | 'ubo'
  subject_id?: string
}

export interface UploadUrlResponse {
  upload_url: string
  storage_path: string
  expires_at: string
}

// ── Servicio ─────────────────────────────────────────────────────

export const ComplianceService = {
  /**
   * Estado KYC del usuario (para mostrar en el Compliance Dashboard).
   */
  async getKycState(): Promise<ComplianceKycState> {
    return apiGet<ComplianceKycState>('/compliance/kyc')
  },

  /**
   * Estado KYB de la empresa del usuario.
   */
  async getKybState(): Promise<ComplianceKybState> {
    return apiGet<ComplianceKybState>('/compliance/kyb')
  },

  /**
   * Historial de revisiones de compliance del usuario.
   */
  async getReviews(): Promise<ComplianceReview[]> {
    return apiGet<ComplianceReview[]>('/compliance/reviews')
  },

  /**
   * Documentos subidos por el usuario y su estado de revisión.
   */
  async getDocuments(): Promise<ComplianceDocument[]> {
    return apiGet<ComplianceDocument[]>('/compliance/documents')
  },

  /**
   * Obtiene una URL firmada para subir un documento nuevo.
   */
  async getUploadUrl(dto: UploadUrlRequest): Promise<UploadUrlResponse> {
    return apiPost<UploadUrlResponse>('/compliance/documents/upload-url', dto)
  },

  /**
   * Registra en el sistema un documento ya subido.
   */
  async registerDocument(dto: {
    document_type: string
    storage_path: string
    subject_type: string
    subject_id?: string
  }): Promise<ComplianceDocument> {
    return apiPost<ComplianceDocument>('/compliance/documents', dto)
  },
}
