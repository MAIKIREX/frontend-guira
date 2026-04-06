/**
 * onboarding.service.ts
 *
 * Servicio frontend para el flujo KYC/KYB.
 * Los DTOs y nombres de campo coinciden 1:1 con los DTOs del backend NestJS.
 *
 * Flujo KYC (Persona Natural):
 *   POST   /onboarding/kyc/person
 *   POST   /onboarding/kyc/application
 *   GET    /onboarding/kyc/tos-link
 *   POST   /onboarding/kyc/tos-accept
 *   POST   /onboarding/documents/upload  (multipart/form-data)
 *   GET    /onboarding/documents
 *   PATCH  /onboarding/kyc/application/submit
 *   GET    /onboarding/kyc/application
 *
 * Flujo KYB (Empresa):
 *   POST   /onboarding/kyb/business
 *   GET    /onboarding/kyb/business
 *   POST   /onboarding/kyb/business/directors
 *   DELETE /onboarding/kyb/business/directors/:id
 *   POST   /onboarding/kyb/business/ubos
 *   DELETE /onboarding/kyb/business/ubos/:id
 *   POST   /onboarding/kyb/application
 *   GET    /onboarding/kyb/tos-link
 *   POST   /onboarding/kyb/tos-accept
 *   PATCH  /onboarding/kyb/application/submit
 *   GET    /onboarding/kyb/application
 *
 *   GET    /onboarding/documents
 *   GET    /onboarding/documents/:id/signed-url
 */
import { apiGet, apiPost, apiPatch, apiDelete, apiUpload } from '@/lib/api/client'
import type { Onboarding } from '@/types/onboarding'

// ─────────────────────────────────────────────────────────────────
//  DTOs KYC — coinciden exactamente con CreatePersonDto del backend
// ─────────────────────────────────────────────────────────────────

export interface CreatePersonDto {
  first_name: string
  middle_name?: string
  last_name: string
  date_of_birth: string          // YYYY-MM-DD
  nationality?: string           // ISO alpha-2 or alpha-3 — H09: backend converts to alpha-3
  country_of_residence?: string  // ISO alpha-2 or alpha-3
  id_type: 'passport' | 'drivers_license' | 'national_id'
  id_number: string
  id_expiry_date?: string        // YYYY-MM-DD
  email: string
  phone: string
  address1: string
  address2?: string
  city: string
  state?: string
  postal_code?: string
  country: string                // ISO alpha-2 or alpha-3 — H05: backend converts to alpha-3
  tax_id?: string
  /** Bridge enum (OpenAPI spec): salary | savings | company_funds | investments_loans | government_benefits | pension_retirement | inheritance | gifts | sale_of_assets_real_estate | ecommerce_reseller | someone_elses_funds | gambling_proceeds */
  source_of_funds?: string
  /** Bridge enum (OpenAPI spec): payments_to_friends_or_family_abroad | personal_or_living_expenses | receive_salary | purchase_goods_and_services | receive_payment_for_freelancing | investment_purposes | operating_a_company | ecommerce_retail_payments | charitable_donations | protect_wealth | other */
  account_purpose?: string
  /** P1-A: required when account_purpose = 'other' */
  account_purpose_other?: string
  is_pep: boolean
  /** Bridge enum (OpenAPI spec): employed | self_employed | unemployed | student | retired | homemaker */
  employment_status?: 'employed' | 'self_employed' | 'unemployed' | 'student' | 'retired' | 'homemaker'
  /** Bridge enum (OpenAPI spec) — expected monthly volume ranges */
  expected_monthly_payments_usd?: '0_4999' | '5000_9999' | '10000_49999' | '50000_plus'
  /** Bridge field — alphanumeric occupation code from Bridge occupation list */
  most_recent_occupation?: string
}


// ─────────────────────────────────────────────────────────────────
//  DTOs KYB — coinciden exactamente con CreateBusinessDto del backend
// ─────────────────────────────────────────────────────────────────

export interface CreateBusinessDto {
  legal_name: string
  trade_name?: string
  registration_number?: string
  tax_id: string
  /** H11 — Bridge enum: llc | corporation | partnership | sole_prop | trust | cooperative | other */
  entity_type: 'llc' | 'corporation' | 'partnership' | 'sole_prop' | 'trust' | 'cooperative' | 'other'
  incorporation_date?: string
  country_of_incorporation: string
  state_of_incorporation?: string
  operating_countries?: string[]
  website?: string
  /** P2-D: primary_website mejora aprobación KYB en Bridge */
  primary_website?: string
  email: string
  phone?: string
  address1: string
  address2?: string
  city: string
  state?: string
  postal_code?: string
  country: string
  business_description?: string
  /** P1-B: array de códigos NAICS 2022 (ej. ['522320', '541511']) */
  business_industry?: string[]
  /** H10 — Bridge enum */
  account_purpose?: 'international_payments' | 'business_payments' | 'personal_payments' | 'savings' | 'investment' | 'payroll' | 'remittances' | 'other'
  /** P1-A: required when account_purpose = 'other' */
  account_purpose_other?: string
  /** H10 — Bridge enum */
  source_of_funds?: 'salary' | 'business_revenue' | 'investment_income' | 'retirement_income' | 'gift' | 'inheritance' | 'loan' | 'other'
  conducts_money_services?: boolean
  uses_bridge_for_money_services?: boolean
  compliance_explanation?: string
  // P0-C: Bridge enum exact values
  /** P0-C — Bridge enum: 0_99999 | 100000_999999 | 1000000_9999999 | 10000000_49999999 | 50000000_249999999 | 250000000_plus */
  estimated_annual_revenue_usd?: '0_99999' | '100000_999999' | '1000000_9999999' | '10000000_49999999' | '50000000_249999999' | '250000000_plus'
  /** P0-D — Array of Bridge high-risk activity codes from the official enum */
  high_risk_activities?: string[]
  /** F3 — Expected monthly payment volume (same enum as individuals) */
  expected_monthly_payments_usd?: 'less_than_1000' | '1000_to_10000' | '10000_to_50000' | '50000_to_100000' | 'greater_than_100000'
  // P2: Physical / Operational Address (different from registered legal address)
  physical_address1?: string
  physical_address2?: string
  physical_city?: string
  physical_state?: string
  physical_postal_code?: string
  /** P2 — ISO alpha-3 preferred. Bridge field: physical_address.country */
  physical_country?: string
}

export interface CreateDirectorDto {
  first_name: string
  last_name: string
  position: string
  is_signer: boolean
  date_of_birth?: string
  nationality?: string
  country_of_residence?: string
  id_type?: string
  id_number?: string
  id_expiry_date?: string
  email?: string
  phone?: string
  address1?: string
  city?: string
  country?: string
  /** Fuga B — PEP status requerido por Bridge para todos los associated_persons */
  is_pep: boolean
}

export interface CreateUboDto {
  first_name: string
  last_name: string
  ownership_percent: number      // número 0-100
  date_of_birth?: string
  nationality?: string
  country_of_residence?: string
  id_type?: string
  id_number?: string
  id_expiry_date?: string
  tax_id?: string
  email?: string
  phone?: string
  address1?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  is_pep: boolean
  /** Fuga A — Control prong: UBO con control operacional (FinCEN Control Prong) */
  has_control?: boolean
}

// ─────────────────────────────────────────────────────────────────
//  Tipos de estado
// ─────────────────────────────────────────────────────────────────

/**
 * H13 FIX — KycStatus now matches the DB CHECK constraint for
 * kyc_applications.status and kyb_applications.status exactly.
 * Removed: 'needs_changes', 'manual_review', 'in_review' (use 'in_progress').
 */
export type KycStatus =
  | 'pending'
  | 'in_progress'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'needs_review'

export interface KycApplicationResponse {
  id: string
  user_id: string
  person_id?: string
  status: KycStatus
  provider?: string
  tos_accepted_at?: string
  tos_contract_id?: string
  submitted_at?: string
  approved_at?: string
  observations?: string
  created_at: string
  updated_at: string
}

export interface KybApplicationResponse {
  id: string
  business_id: string
  requester_user_id: string
  status: KycStatus
  tos_accepted_at?: string
  submitted_at?: string
  created_at: string
  updated_at: string
}

export interface TosLinkResponse {
  url: string
}

export interface DocumentRecord {
  id: string
  document_type: string
  subject_type: string
  file_name: string
  mime_type: string
  file_size_bytes: number
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

// ─────────────────────────────────────────────────────────────────
//  Servicio
// ─────────────────────────────────────────────────────────────────

export const OnboardingService = {

  // ── Estado general ──────────────────────────────────────────────

  /** Estado actual de la aplicación KYC del usuario. */
  async getKycStatus(): Promise<KycApplicationResponse | null> {
    return apiGet<KycApplicationResponse | null>('/onboarding/kyc/application')
  },

  /** Obtiene datos biográficos guardados del usuario. */
  async getPerson(): Promise<CreatePersonDto | null> {
    return apiGet<CreatePersonDto | null>('/onboarding/kyc/person')
  },

  // ── KYC (Persona Natural) ───────────────────────────────────────

  /**
   * Paso 1: Guarda o actualiza los datos personales (UPSERT por user_id).
   * Equivale a POST /onboarding/kyc/person con CreatePersonDto.
   */
  async savePersonalInfo(dto: CreatePersonDto): Promise<unknown> {
    return apiPost<unknown>('/onboarding/kyc/person', dto)
  },

  /**
   * Paso 2: Crea el expediente KYC formal (idempotente).
   * Debe llamarse después de savePersonalInfo y antes de aceptar ToS.
   */
  async createKycApplication(): Promise<KycApplicationResponse> {
    return apiPost<KycApplicationResponse>('/onboarding/kyc/application', {})
  },

  /**
   * Paso 3a: Obtiene la URL de Terms of Service de Bridge.
   * El usuario debe navegar a esa URL y aceptar los términos.
   */
  async getKycTosLink(redirectUri?: string): Promise<TosLinkResponse> {
    const params = redirectUri ? `?redirect_uri=${encodeURIComponent(redirectUri)}` : ''
    return apiGet<TosLinkResponse>(`/onboarding/kyc/tos-link${params}`)
  },

  /**
   * Paso 3b: Registra que el usuario aceptó los ToS de Bridge.
   */
  async acceptKycTos(tosContractId?: string): Promise<KycApplicationResponse> {
    return apiPost<KycApplicationResponse>('/onboarding/kyc/tos-accept', {
      tos_contract_id: tosContractId,
    })
  },

  /**
   * Paso 4: Envía el expediente KYC completo para revisión.
   * Requiere: datos personales + aplicación creada + ToS aceptado + al menos 1 documento.
   */
  async submitKyc(): Promise<KycApplicationResponse> {
    return apiPatch<KycApplicationResponse>('/onboarding/kyc/application/submit')
  },

  // ── KYB (Empresa) ───────────────────────────────────────────────

  /** Guarda o actualiza los datos de la empresa. */
  async saveBusinessInfo(dto: CreateBusinessDto): Promise<unknown> {
    return apiPost<unknown>('/onboarding/kyb/business', dto)
  },

  /** Obtiene los datos de la empresa con directores y UBOs. */
  async getBusiness(): Promise<unknown> {
    return apiGet<unknown>('/onboarding/kyb/business')
  },

  /** Agrega un director a la empresa. */
  async addDirector(dto: CreateDirectorDto): Promise<{ id: string }> {
    return apiPost<{ id: string }>('/onboarding/kyb/business/directors', dto)
  },

  /** Elimina un director. */
  async removeDirector(directorId: string): Promise<void> {
    return apiDelete<void>(`/onboarding/kyb/business/directors/${directorId}`)
  },

  /** Agrega un UBO (beneficiario final). */
  async addUbo(dto: CreateUboDto): Promise<{ id: string }> {
    return apiPost<{ id: string }>('/onboarding/kyb/business/ubos', dto)
  },

  /** Elimina un UBO. */
  async removeUbo(uboId: string): Promise<void> {
    return apiDelete<void>(`/onboarding/kyb/business/ubos/${uboId}`)
  },

  /**
   * Crea el expediente KYB formal (idempotente).
   * Debe existir un business antes.
   */
  async createKybApplication(): Promise<KybApplicationResponse> {
    return apiPost<KybApplicationResponse>('/onboarding/kyb/application', {})
  },

  /** Estado actual de la aplicación KYB. */
  async getKybStatus(): Promise<KybApplicationResponse | null> {
    return apiGet<KybApplicationResponse | null>('/onboarding/kyb/application')
  },

  /**
   * Obtiene la URL de Terms of Service de Bridge para KYB.
   */
  async getKybTosLink(redirectUri?: string): Promise<TosLinkResponse> {
    const params = redirectUri ? `?redirect_uri=${encodeURIComponent(redirectUri)}` : ''
    return apiGet<TosLinkResponse>(`/onboarding/kyb/tos-link${params}`)
  },

  /**
   * Registra que el representante de la empresa aceptó los ToS de Bridge.
   */
  async acceptKybTos(tosContractId?: string): Promise<KybApplicationResponse> {
    return apiPost<KybApplicationResponse>('/onboarding/kyb/tos-accept', {
      tos_contract_id: tosContractId,
    })
  },

  /**
   * Envía el expediente KYB completo para revisión.
   * Requiere: empresa + ≥1 director + documentos de empresa + ToS aceptado.
   */
  async submitKyb(): Promise<KybApplicationResponse> {
    return apiPatch<KybApplicationResponse>('/onboarding/kyb/application/submit')
  },

  // ── Documentos ──────────────────────────────────────────────────

  /**
   * Sube un documento vía multipart/form-data al backend.
   * El backend lo guarda en Supabase Storage Y registra en tabla `documents`.
   *
   * @param file         El archivo a subir
   * @param documentType Tipo de documento: passport | national_id_front | national_id_back | drivers_license_front | drivers_license_back | selfie | proof_of_address | incorporation_certificate | tax_registration | bank_statement | other
   * @param subjectType  'person' | 'business' | 'director' | 'ubo'
   * @param subjectId    UUID opcional del director/ubo
   */
  async uploadDocument(
    file: File,
    documentType: string,
    subjectType: 'person' | 'business' | 'director' | 'ubo',
    subjectId?: string,
  ): Promise<DocumentRecord> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('document_type', documentType)
    formData.append('subject_type', subjectType)
    if (subjectId) formData.append('subject_id', subjectId)
    return apiUpload<DocumentRecord>('/onboarding/documents/upload', formData)
  },

  /** Lista documentos del usuario. Filtra por subject_type si se pasa. */
  async listDocuments(subjectType?: string): Promise<DocumentRecord[]> {
    const params = subjectType ? `?subject_type=${subjectType}` : ''
    return apiGet<DocumentRecord[]>(`/onboarding/documents${params}`)
  },

  /** Obtiene URL firmada para descargar un documento (válida 1 hora). */
  async getDocumentSignedUrl(documentId: string): Promise<{ signed_url: string; expires_in: number }> {
    return apiGet<{ signed_url: string; expires_in: number }>(`/onboarding/documents/${documentId}/signed-url`)
  },

  // ── Helpers de compatibilidad ────────────────────────────────────

  /**
   * Obtiene la solicitud de onboarding más reciente.
   * Compatible con el onboarding-wizard.tsx.
   */
  async getLatestOnboarding(userId: string) {
    try {
      const kyc = await OnboardingService.getKycStatus()
      if (kyc && kyc.status && kyc.status !== 'pending') {
        return {
          id: kyc.id,
          type: 'personal' as const,
          status: kyc.status,
          observations: (kyc as any).observations ?? null,
          data: null,
        }
      }
    } catch (_e) {
      // 404 u otro error — no hay KYC todavía
    }

    try {
      const kyb = await OnboardingService.getKybStatus()
      if (kyb && kyb.status && kyb.status !== 'pending') {
        return {
          id: kyb.id,
          type: 'company' as const,
          status: kyb.status,
          observations: null,
          data: null,
        }
      }
    } catch (_e) {
      // sin KYB
    }

    return null
  },

  /** No-op: el localStorage mantiene borradores automáticamente. */
  async saveDraft(_payload: unknown) {
    return _payload
  },
}
