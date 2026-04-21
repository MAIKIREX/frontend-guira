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
  /** Bridge field: primary_website improves KYB approval */
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
  /** Array of NAICS 2022 codes (e.g. ['522320', '541511']) */
  business_industry?: string[]
  /**
   * FIX D-02/N-02 — Bridge BUSINESS account_purpose enum (DIFFERENT from individual).
   * Bridge spec: UpdateBusinessCustomerPayload.account_purpose
   * Excludes: operating_a_company, receive_salary, receive_payment_for_freelancing
   * Adds: payroll, receive_payments_for_goods_and_services, tax_optimization,
   *       third_party_money_transmission, treasury_management
   */
  account_purpose?:
    | 'charitable_donations'
    | 'ecommerce_retail_payments'
    | 'investment_purposes'
    | 'other'
    | 'payments_to_friends_or_family_abroad'
    | 'payroll'
    | 'personal_or_living_expenses'
    | 'protect_wealth'
    | 'purchase_goods_and_services'
    | 'receive_payments_for_goods_and_services'
    | 'tax_optimization'
    | 'third_party_money_transmission'
    | 'treasury_management'
  /** Required when account_purpose = 'other' */
  account_purpose_other?: string
  /**
   * FIX D-01 — Bridge BUSINESS source_of_funds enum (DIFFERENT from individual).
   * Bridge spec: UpdateBusinessCustomerPayload.source_of_funds
   */
  source_of_funds?:
    | 'business_loans'
    | 'grants'
    | 'inter_company_funds'
    | 'investment_proceeds'
    | 'legal_settlement'
    | 'owners_capital'
    | 'pension_retirement'
    | 'sale_of_assets'
    | 'sales_of_goods_and_services'
    | 'third_party_funds'
    | 'treasury_reserves'
  /** Required for high-risk customers when source_of_funds is provided */
  source_of_funds_description?: string
  conducts_money_services?: boolean
  uses_bridge_for_money_services?: boolean
  compliance_explanation?: string
  /** Estimated annual revenue (string enum for business) */
  estimated_annual_revenue_usd?: '0_99999' | '100000_999999' | '1000000_9999999' | '10000000_49999999' | '50000000_249999999' | '250000000_plus'
  /**
   * FIX N-03 — Bridge spec defines expected_monthly_payments_usd for BUSINESS as `integer`,
   * NOT a string enum (unlike the individual version which uses string ranges).
   */
  expected_monthly_payments_usd?: number
  /** FIX N-04 — Required for high-risk customers. Bridge spec field. */
  acting_as_intermediary?: boolean
  /** Does the business operate in any Bridge-prohibited countries? */
  operates_in_prohibited_countries?: boolean
  /** Array of Bridge high-risk activity codes */
  high_risk_activities?: string[]
  /**
   * FIX N-06 — Required when high_risk_activities contains entries other than none_of_the_above.
   * Bridge spec: UpdateBusinessCustomerPayload.high_risk_activities_explanation
   */
  high_risk_activities_explanation?: string
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
  /** FIX N-05 — Bridge AssociatedPerson requires birth_date */
  date_of_birth: string
  nationality?: string
  country_of_residence?: string
  id_type?: string
  id_number?: string
  id_expiry_date?: string
  /** FIX N-05 — Bridge AssociatedPerson requires email */
  email: string
  phone?: string
  address1: string
  city: string
  country: string
  /** PEP status required by Bridge for all associated_persons */
  is_pep: boolean
}

export interface CreateUboDto {
  first_name: string
  last_name: string
  ownership_percent: number      // número 0-100
  /** FIX N-05 — Bridge AssociatedPerson requires birth_date */
  date_of_birth: string
  nationality?: string
  country_of_residence?: string
  id_type?: string
  id_number?: string
  id_expiry_date?: string
  tax_id?: string
  /** FIX N-05 — Bridge AssociatedPerson requires email */
  email: string
  phone?: string
  address1: string
  city: string
  state?: string
  postal_code?: string
  country: string
  is_pep: boolean
  /** Fuga A — Control prong: UBO with operational control (FinCEN Control Prong) */
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
  status: 'pending' | 'approved' | 'rejected' | 'superseded'
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
   *
   * H2 FIX: Ahora extrae los datos del formulario desde el backend
   * (people join para KYC, business endpoint para KYB) para que
   * el wizard pueda restaurar progreso sin depender de localStorage.
   */
  async getLatestOnboarding(_userId: string): Promise<{
    id: string
    type: 'personal' | 'company'
    status: KycStatus
    observations: string | null
    data: Record<string, unknown> | null
  } | null> {
    try {
      const kyc = await OnboardingService.getKycStatus()
      if (kyc && kyc.status && kyc.status !== 'pending') {
        // El backend devuelve `*, people(*)` — extraemos los datos del formulario
        let formData: Record<string, unknown> | null = null
        const people = (kyc as unknown as Record<string, unknown>).people as Record<string, unknown> | undefined
        if (people) {
          formData = {
            first_name: people.first_name,
            middle_name: people.middle_name,
            last_name: people.last_name,
            date_of_birth: people.date_of_birth,
            nationality: people.nationality,
            country_of_residence: people.country_of_residence,
            id_type: people.id_type,
            id_number: people.id_number,
            id_expiry_date: people.id_expiry_date,
            email: people.email,
            phone: people.phone,
            address1: people.address1,
            address2: people.address2,
            city: people.city,
            state: people.state,
            postal_code: people.postal_code,
            country: people.country,
            tax_id: people.tax_id,
            source_of_funds: people.source_of_funds,
            account_purpose: people.account_purpose,
            account_purpose_other: people.account_purpose_other,
            expected_monthly_payments_usd: people.expected_monthly_payments_usd,
            employment_status: people.employment_status,
            most_recent_occupation: people.most_recent_occupation,
            is_pep: people.is_pep,
          }
        }

        return {
          id: kyc.id,
          type: 'personal' as const,
          status: kyc.status,
          observations: kyc.observations ?? null,
          data: formData,
        }
      }
    } catch (_e) {
      // 404 u otro error — no hay KYC todavía
    }

    try {
      const kyb = await OnboardingService.getKybStatus()
      if (kyb && kyb.status && kyb.status !== 'pending') {
        // Intentar cargar datos del negocio asociado
        let formData: Record<string, unknown> | null = null
        try {
          const business = await OnboardingService.getBusiness()
          if (business) {
            formData = business as Record<string, unknown>
          }
        } catch (_bizErr) {
          // Sin datos de negocio aún
        }

        return {
          id: kyb.id,
          type: 'company' as const,
          status: kyb.status,
          observations: null,
          data: formData,
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
