/**
 * onboarding.service.ts
 * 
 * MIGRADO COMPLETO: Supabase direct → REST API
 * 
 * ANTES: 134 líneas manejando Supabase Storage, upserts directos,
 *        activity logs manuales y updates de perfil manualmente.
 * 
 * AHORA: El backend maneja todo el flujo KYC/KYB incluyendo:
 *        - Upload de documentos a storage propio
 *        - Transiciones de estado (draft → submitted → under_review)
 *        - Activity logs automáticos
 *        - Update de perfil (onboarding_status)
 *        - Integración con Bridge para ToS y aplicación
 * 
 * KYC (Individual):
 *   GET    /onboarding/kyc/application
 *   POST   /onboarding/kyc/person
 *   POST   /onboarding/documents/upload  (multipart/form-data)
 *   GET    /onboarding/documents
 *   GET    /onboarding/kyc/tos-link
 *   POST   /onboarding/kyc/tos-accept
 *   PATCH  /onboarding/kyc/application/submit
 * 
 * KYB (Empresa):
 *   POST   /onboarding/kyb/business
 *   GET    /onboarding/kyb/business
 *   POST   /onboarding/kyb/business/directors
 *   DELETE /onboarding/kyb/business/directors/:id
 *   POST   /onboarding/kyb/business/ubos
 *   DELETE /onboarding/kyb/business/ubos/:id
 *   POST   /onboarding/kyb/application
 *   PATCH  /onboarding/kyb/application/submit
 *   GET    /onboarding/kyb/tos-link
 *   POST   /onboarding/kyb/tos-accept
 */
import { apiGet, apiPost, apiPatch, apiDelete, apiUpload } from '@/lib/api/client'
import type { Onboarding } from '@/types/onboarding'

// ── DTOs KYC ─────────────────────────────────────────────────────

export interface KycPersonalInfoDto {
  first_name: string
  last_name: string
  date_of_birth: string      // YYYY-MM-DD
  nationality: string        // ISO Alpha-2
  tax_id_number?: string
  address?: {
    street: string
    city: string
    state?: string
    postal_code: string
    country: string
  }
}

export interface KycDocumentDto {
  document_type: 'government_id' | 'passport' | 'proof_of_address' | 'selfie'
  storage_path: string       // Retornado por el upload-url endpoint
}

export interface KycStatus {
  status: 'not_started' | 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected'
  rejection_reason?: string
  submitted_at?: string
  approved_at?: string
}

// ── DTOs KYB ─────────────────────────────────────────────────────

export interface KybBusinessDto {
  business_name: string
  legal_name: string
  registration_number: string
  country_of_incorporation: string
  business_type: string
  industry: string
  website?: string
  address: {
    street: string
    city: string
    state?: string
    postal_code: string
    country: string
  }
}

export interface KybDirectorDto {
  first_name: string
  last_name: string
  date_of_birth: string
  nationality: string
  email: string
  title: string
}

export interface KybUboDto {
  first_name: string
  last_name: string
  date_of_birth: string
  nationality: string
  ownership_percentage: number    // 0-100, suma total ≤ 100%
}

export interface UploadUrlResponse {
  upload_url: string
  storage_path: string
  expires_at: string
}

// ── Servicio ─────────────────────────────────────────────────────

export const OnboardingService = {

  // ── Estado general ───────────────────────────────────────────

  /**
   * Estado actual del onboarding KYC del usuario.
   */
  async getKycStatus(): Promise<KycStatus> {
    return apiGet<KycStatus>('/onboarding/kyc/application')
  },

  // ── KYC (Individual) ─────────────────────────────────────────

  /**
   * Guarda los datos personales del usuario para KYC.
   */
  async saveKycPersonalInfo(dto: KycPersonalInfoDto): Promise<Onboarding> {
    return apiPost<Onboarding>('/onboarding/kyc/person', dto)
  },

  /**
   * Obtiene una URL firmada para subir un documento de forma segura.
   * Reemplaza: supabase.storage.from('onboarding_docs').upload()
   */
  /**
   * Sube un documento directamente como multipart/form-data.
   * Reemplaza el flujo de upload-url + registro separado.
   */
  async uploadDocument(file: File, document_type: string, subject_type: string, subject_id?: string): Promise<void> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('document_type', document_type)
    formData.append('subject_type', subject_type)
    if (subject_id) formData.append('subject_id', subject_id)
    return apiUpload<void>('/onboarding/documents/upload', formData)
  },

  /**
   * Registra un documento ya subido en la base de datos.
   */
  /**
   * Lista documentos subidos por el usuario.
   */
  async listDocuments(subject_type?: string): Promise<unknown[]> {
    return apiGet<unknown[]>('/onboarding/documents', { params: subject_type ? { subject_type } : undefined })
  },

  /**
   * Obtiene el link de Terms of Service de Bridge para KYC.
   */
  async getKycTosLink(): Promise<{ tos_link: string }> {
    return apiGet<{ tos_link: string }>('/onboarding/kyc/tos-link')
  },

  /**
   * Registra la aceptación de ToS Bridge del usuario.
   */
  async acceptKycTos(params: { ip_address: string; signed_at: string }): Promise<void> {
    return apiPost<void>('/onboarding/kyc/tos-accept', params)
  },

  /**
   * Envía el KYC completo para revisión.
   */
  async submitKyc(): Promise<Onboarding> {
    return apiPatch<Onboarding>('/onboarding/kyc/application/submit')
  },

  // ── KYB (Empresa) ────────────────────────────────────────────

  /**
   * Guarda los datos de la empresa para KYB.
   */
  async saveKybBusiness(dto: KybBusinessDto): Promise<void> {
    return apiPost<void>('/onboarding/kyb/business', dto)
  },

  /**
   * Agrega un director a la empresa.
   */
  async addKybDirector(dto: KybDirectorDto): Promise<{ id: string }> {
    return apiPost<{ id: string }>('/onboarding/kyb/business/directors', dto)
  },

  /**
   * Elimina un director por ID.
   */
  async removeKybDirector(directorId: string): Promise<void> {
    return apiDelete<void>(`/onboarding/kyb/business/directors/${directorId}`)
  },

  /**
   * Agrega un UBO (Ultimate Beneficial Owner).
   */
  async addKybUbo(dto: KybUboDto): Promise<{ id: string }> {
    return apiPost<{ id: string }>('/onboarding/kyb/business/ubos', dto)
  },

  /**
   * Elimina un UBO por ID.
   */
  async removeKybUbo(uboId: string): Promise<void> {
    return apiDelete<void>(`/onboarding/kyb/business/ubos/${uboId}`)
  },

  /**
   * Crea la aplicación KYB final (consolida empresa + directores + UBOs).
   */
  async createKybApplication(): Promise<void> {
    return apiPost<void>('/onboarding/kyb/application')
  },

  /**
   * Obtiene el link de Terms of Service de Bridge para KYB (empresa).
   */
  async getKybTosLink(): Promise<{ tos_link: string }> {
    return apiGet<{ tos_link: string }>('/onboarding/kyb/tos-link')
  },

  /**
   * Registra la aceptación de ToS Bridge (empresa).
   */
  async acceptKybTos(params: { ip_address: string; signed_at: string }): Promise<void> {
    return apiPost<void>('/onboarding/kyb/tos-accept', params)
  },

  /**
   * Envía el KYB para revisión final.
   */
  async submitKyb(): Promise<void> {
    return apiPatch<void>('/onboarding/kyb/application/submit')
  },
}
