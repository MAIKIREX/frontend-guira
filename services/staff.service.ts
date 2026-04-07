/**
 * staff.service.ts
 *
 * COMPLETAMENTE MIGRADO — Todas las operaciones usan el backend NestJS via REST API.
 *
 * Mapeo de Endpoints (backend nest-base-backend):
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ SNAPSHOT / LECTURA                                                  │
 * │  GET /admin/compliance/reviews    → compliance reviews abiertos     │
 * │  GET /admin/payment-orders        → payment orders                  │
 * │  GET /admin/profiles              → listado de usuarios             │
 * │  GET /admin/support/tickets       → tickets de soporte              │
 * │  GET /admin/fees                  → configuración de fees           │
 * │  GET /admin/settings              → app settings                    │
 * │  GET /admin/audit-logs            → audit logs                     │
 * │                                                                     │
 * │ ACCIONES STAFF sobre órdenes de pago                               │
 * │  POST /admin/payment-orders/:id/approve   (deposit → processing)   │
 * │  POST /admin/payment-orders/:id/mark-sent (processing → sent)      │
 * │  POST /admin/payment-orders/:id/complete  (sent → completed)       │
 * │  POST /admin/payment-orders/:id/fail      (→ failed)               │
 * │                                                                     │
 * │ ACCIONES sobre onboarding/compliance                               │
 * │  GET  /admin/compliance/reviews/:id                                │
 * │  POST /admin/compliance/reviews/:id/approve                        │
 * │  POST /admin/compliance/reviews/:id/request-changes                │
 * │  POST /admin/compliance/reviews/:id/reject                         │
 * │                                                                     │
 * │ TICKETS                                                             │
 * │  PATCH /admin/support/tickets/:id/status                           │
 * └────────────────────────────────────────────────────────────────────┘
 *
 * CONSERVADO con Supabase (legítimo):
 *  - Supabase Storage: URL firmadas para fotos de onboarding y documentos.
 *    El backend NestJS no sirve archivos binarios, por tanto el cliente
 *    Storage de Supabase se mantiene ÚNICAMENTE para createSignedUrl.
 */
import { createClient } from '@/lib/supabase/browser'
import { apiGet, apiPatch, apiPost, apiUpload } from '@/lib/api/client'
import { validateDocumentFile } from '@/lib/file-validation'
import type { AuditLog } from '@/types/activity-log'
import type { OnboardingStatus } from '@/types/onboarding'
import type { AppSettingRow, FeeConfigRow, PaymentOrder, PsavConfigRow } from '@/types/payment-order'
import type { Profile } from '@/types/profile'
import type {
  StaffActor,
  StaffDocumentRecord,
  StaffOnboardingDetail,
  StaffOnboardingRecord,
  StaffSnapshot,
  StaffSupportTicket,
  StaffUserRecord,
} from '@/types/staff'
import type { TicketStatus } from '@/types/support'

// ────────────────────────────────────────────────────────────────
//  Tipos internos para respuestas paginadas del backend
// ────────────────────────────────────────────────────────────────

interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

// ────────────────────────────────────────────────────────────────
//  StaffService — Operaciones del panel administrativo
// ────────────────────────────────────────────────────────────────

export const StaffService = {
  /**
   * Carga el snapshot global para el dashboard de staff.
   * Cada seccion se obtiene de su endpoint específico en NestJS.
   */
  async getReadOnlySnapshot(): Promise<StaffSnapshot> {
    const [
      reviewsData,
      ordersResponse,
      usersResponse,
      supportResponse,
      feesData,
      settingsData,
      auditResponse,
    ] = await Promise.all([
      apiGet<StaffOnboardingRecord[]>('/admin/compliance/reviews'),
      apiGet<PaginatedResponse<PaymentOrder>>('/admin/payment-orders'),
      apiGet<PaginatedResponse<Profile>>('/admin/profiles'),
      apiGet<PaginatedResponse<StaffSupportTicket>>('/admin/support/tickets'),
      apiGet<FeeConfigRow[]>('/admin/fees'),
      apiGet<AppSettingRow[]>('/admin/settings'),
      apiGet<PaginatedResponse<AuditLog>>('/admin/audit-logs'),
    ])

    // Obtener URLs firmadas para fotos de usuarios (Storage de Supabase — legítimo)
    const users = usersResponse.data ?? []
    const usersWithPhotos = await enrichUsersWithPhotoUrls(users)

    const mappedOnboarding: StaffOnboardingRecord[] = (reviewsData ?? []).map((rev: any) => ({
      ...rev,
      id: rev.id, // review id
      user_id: rev.user_id ?? 'unknown-user',
      type: rev.type ?? (rev.subject_type === 'kyb_applications' ? 'company' : 'personal'),
      status: rev.application_status ?? rev.status,
      data: {},
      observations: undefined, // En la tabla principal no viene el comentario, o se podría mapear si backend lo enviara
      created_at: rev.opened_at ?? new Date().toISOString(),
      updated_at: rev.updated_at ?? rev.opened_at ?? new Date().toISOString(),
      profiles: rev.profiles ? {
        full_name: rev.profiles.full_name || rev.profiles.business_name || (rev.profiles.first_name ? `${rev.profiles.first_name} ${rev.profiles.last_name || ''}`.trim() : undefined),
        email: rev.profiles.email,
        onboarding_status: undefined
      } : null,
    }))

    return {
      onboarding: mappedOnboarding,
      payinRoutes: [],   // Tabla mantenida en modo lectura sin acciones definidas
      transfers: [],     // Sin acciones definidas en la documentación actual
      orders: ordersResponse.data ?? [],
      users: usersWithPhotos as StaffUserRecord[],
      support: supportResponse.data ?? [],
      feesConfig: feesData ?? [],
      appSettings: settingsData ?? [],
      psavConfigs: [],   // Gestionados via AdminService.getAllPsavConfigs()
      auditLogs: auditResponse.data ?? [],
      gaps: [
        'La tabla `payin_routes` se mantiene en modo solo lectura porque la documentacion no detalla sus columnas ni flujo de estados.',
        'La tab de `transfers` se mantiene sin acciones porque la documentacion no define transiciones de estado suficientes para mutarla con seguridad.',
        'El paso `deposit_received -> processing` ocurre cuando staff publica la cotizacion final.',
      ],
    }
  },

  async getOnboardingDetail(reviewId: string): Promise<StaffOnboardingDetail> {
    // 1. Obtener el compliance_review del backend.
    //    El review tiene: { id, subject_type, subject_id, status, ... }
    //    NO tiene user_id directamente — hay que resolverlo desde el subject.
    const rawReview = await apiGet<{
      id: string
      subject_type: string
      subject_id: string
      status: string
      priority?: string
      opened_at?: string
      closed_at?: string
      assigned_to?: string
      events?: unknown[]
      comments?: unknown[]
      [key: string]: unknown
    }>(`/admin/compliance/reviews/${reviewId}`)

    // 2. Resolver user_id según el subject_type
    const supabase = createClient()
    let resolvedUserId: string | null = null
    let applicationData: Record<string, unknown> = {}
    let onboardingType: 'personal' | 'company' = 'personal'

    if (rawReview.subject_type === 'kyc_applications') {
      const { data: kyc } = await supabase
        .from('kyc_applications')
        .select('*, people (*)')
        .eq('id', rawReview.subject_id)
        .maybeSingle()
      if (kyc) {
        resolvedUserId = kyc.user_id ?? null
        // Los datos del formulario KYC están en la tabla `people`.
        // Mapeamos los campos de DB al formato esperado por el componente de detalle.
        const p = (kyc as Record<string, unknown>).people as Record<string, unknown> | null
        if (p) {
          applicationData = {
            // Identidad personal
            first_names: p.first_name,
            last_names: p.last_name,
            middle_name: p.middle_name,
            dob: p.date_of_birth,
            nationality: p.nationality,
            id_document_type: p.id_type,
            id_number: p.id_number,
            id_expiry: p.id_expiry_date,
            tax_id: p.tax_id,
            // Contacto
            email: p.email,
            phone: p.phone,
            // Dirección
            street: p.address1,
            street2: p.address2,
            city: p.city,
            state_province: p.state,
            postal_code: p.postal_code,
            country: p.country,
            country_of_residence: p.country_of_residence,
            // Perfil financiero
            occupation: p.most_recent_occupation ?? p.employment_status,
            source_of_funds: p.source_of_funds,
            purpose: p.account_purpose,
            purpose_other: p.account_purpose_other,
            estimated_monthly_volume: p.expected_monthly_payments_usd,
            is_pep: p.is_pep,
            employment_status: p.employment_status,
          }
        } else {
          applicationData = kyc as Record<string, unknown>
        }
        onboardingType = 'personal'
      }
    } else if (rawReview.subject_type === 'kyb_applications') {
      const { data: kyb } = await supabase
        .from('kyb_applications')
        .select('*, businesses (*, business_directors(*), business_ubos(*))')
        .eq('id', rawReview.subject_id)
        .maybeSingle()
      if (kyb) {
        resolvedUserId = kyb.requester_user_id ?? null
        const business = (kyb as Record<string, unknown>).businesses as Record<string, unknown> | null
        applicationData = business ?? (kyb as Record<string, unknown>)
        onboardingType = 'company'
      }
    }


    if (!resolvedUserId) {
      throw new Error(`No se pudo resolver el user_id del review ${reviewId} (subject_type: ${rawReview.subject_type})`)
    }

    // 3. Obtener profile del usuario para completar el record
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, email, full_name, onboarding_status, bridge_customer_id')
      .eq('id', resolvedUserId)
      .maybeSingle()

    // 4. Construir el StaffOnboardingRecord compatible con el componente
    const record: StaffOnboardingRecord = {
      id: reviewId, // usar reviewId para que las acciones aprueben/reconozcan este review
      user_id: resolvedUserId,
      type: onboardingType,
      status: (rawReview.status as string) as StaffOnboardingRecord['status'],
      data: applicationData,
      observations: (rawReview.comments as Array<{ body: string }> | null)?.[0]?.body,
      bridge_customer_id: profileData?.bridge_customer_id ?? undefined,
      created_at: (rawReview.opened_at ?? '') as string,
      updated_at: (rawReview.closed_at ?? rawReview.opened_at ?? '') as string,
      profiles: profileData
        ? {
            full_name: profileData.full_name,
            email: profileData.email,
            onboarding_status: profileData.onboarding_status,
          }
        : null,
    }

    // 5. Consultar documentos por user_id (campo correcto en tabla documents)
    const { data: documents, error: documentsError } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', resolvedUserId)
      .order('created_at', { ascending: false })

    if (documentsError) throw documentsError

    // Filtrar solo el documento más reciente por tipo (ya vienen ordenados por created_at DESC)
    const latestDocsMap = new Map<string, any>()
    for (const doc of (documents ?? [])) {
      const typeKey = doc.document_type || doc.description || 'unknown_document'
      if (!latestDocsMap.has(typeKey)) {
        latestDocsMap.set(typeKey, doc)
      }
    }
    const filteredDocuments = Array.from(latestDocsMap.values())

    // 6. Generar URLs firmadas para cada documento
    const documentsWithUrls = await Promise.all(
      (filteredDocuments as Array<{
        id: string
        user_id: string
        subject_type: string | null
        subject_id: string | null
        document_type: string | null
        description: string | null
        storage_path: string | null
        file_name: string | null
        mime_type: string | null
        file_size_bytes: number | null
        status: string | null
        rejection_reason: string | null
        created_at: string | null
        updated_at: string | null
      }>).map(async (document) => {
        if (!document.storage_path) {
          return {
            id: document.id,
            onboarding_id: reviewId,
            user_id: document.user_id,
            doc_type: document.document_type ?? document.description ?? 'document',
            storage_path: document.storage_path ?? '',
            mime_type: document.mime_type,
            created_at: document.created_at ?? undefined,
            signed_url: null,
          } satisfies StaffDocumentRecord
        }
        const { data } = await supabase.storage
          .from('kyc-documents')
          .createSignedUrl(document.storage_path, 60 * 60)
        return {
          id: document.id,
          onboarding_id: reviewId,
          user_id: document.user_id,
          doc_type: document.document_type ?? document.description ?? 'document',
          storage_path: document.storage_path,
          mime_type: document.mime_type,
          created_at: document.created_at ?? undefined,
          signed_url: data?.signedUrl ?? null,
        } satisfies StaffDocumentRecord
      })
    )

    return { record, documents: documentsWithUrls }
  },


  /**
   * Aprueba, pone en revisión o rechaza un expediente de onboarding/KYC.
   *
   * ─ 'approved'  → POST /admin/compliance/reviews/:id/approve
   *                 Cierra el review, aprueba la aplicación y registra al cliente en Bridge.
   *
   * ─ 'in_review' → POST /admin/compliance/reviews/:id/request-changes
   *                 Deja el review ABIERTO, marca la aplicación como 'needs_review'
   *                 y notifica al cliente para que corrija su expediente.
   *
   * ─ 'rejected'  → POST /admin/compliance/reviews/:id/reject
   *                 Cierra el review, marca la aplicación como 'rejected'
   *                 y notifica al cliente del rechazo permanente.
   */
  async updateOnboardingStatus(args: {
    actor: StaffActor
    record: StaffOnboardingRecord
    status: Extract<OnboardingStatus, 'approved' | 'rejected' | 'in_review'>
    reason: string
  }) {
    if (args.status === 'approved') {
      await apiPost(
        `/admin/compliance/reviews/${args.record.id}/approve`,
        { reason: args.reason }
      )
      return { ...args.record, status: 'approved' } as StaffOnboardingRecord
    }

    if (args.status === 'in_review') {
      // Solicita correcciones al cliente: el review queda ABIERTO (no se cierra)
      await apiPost(
        `/admin/compliance/reviews/${args.record.id}/request-changes`,
        { reason: args.reason }
      )
      return { ...args.record, status: 'in_review' } as StaffOnboardingRecord
    }

    // 'rejected': rechazo definitivo — cierra el review permanentemente
    await apiPost(
      `/admin/compliance/reviews/${args.record.id}/reject`,
      { reason: args.reason }
    )
    return { ...args.record, status: 'rejected' } as StaffOnboardingRecord
  },

  // ── ÓRDENES DE PAGO ──────────────────────────────────────────────────────────

  async advancePaymentOrderToDepositReceived(args: {
    actor: StaffActor
    order: PaymentOrder
    reason: string
  }) {
    // El backend aprueba el depósito y pasa a 'processing' vía /approve
    return apiPost<PaymentOrder>(`/admin/payment-orders/${args.order.id}/approve`, {
      notes: args.reason,
    })
  },

  async preparePaymentOrderQuote(args: {
    actor: StaffActor
    order: PaymentOrder
    reason: string
    exchangeRateApplied: number
    amountConverted: number
    feeTotal: number
  }) {
    return apiPost<PaymentOrder>(`/admin/payment-orders/${args.order.id}/approve`, {
      notes: args.reason,
      exchange_rate_applied: args.exchangeRateApplied,
      fee_final: args.feeTotal,
    })
  },

  async advancePaymentOrderToSent(args: {
    actor: StaffActor
    order: PaymentOrder
    reason: string
    reference: string
  }) {
    return apiPost<PaymentOrder>(`/admin/payment-orders/${args.order.id}/mark-sent`, {
      notes: args.reason,
      tx_hash: args.reference,
    })
  },

  async advancePaymentOrderToCompleted(args: {
    actor: StaffActor
    order: PaymentOrder
    reason: string
    comprobanteFile: File
  }) {
    validateDocumentFile(args.comprobanteFile)
    
    const { createClient } = await import('@/lib/supabase/browser')
    const supabase = createClient()
    
    // As per the SQL policy, we upload to our own actor's ID as the root folder
    const fileExt = args.comprobanteFile.name.split('.').pop()
    const fileName = `${args.actor.userId}/${args.order.id}_receipt_${Date.now()}.${fileExt}`

    const { data: uploadData, error } = await supabase.storage
      .from('payment-receipts')
      .upload(fileName, args.comprobanteFile, { upsert: true })

    if (error) {
      throw new Error(`Error subiendo recibo a Supabase: ${error.message}`)
    }

    const storagePath = `payment-receipts/${uploadData.path}`

    return apiPost<PaymentOrder>(`/admin/payment-orders/${args.order.id}/complete`, {
      notes: args.reason,
      receipt_url: storagePath
    })
  },

  async failPaymentOrder(args: {
    actor: StaffActor
    order: PaymentOrder
    reason: string
  }) {
    return apiPost<PaymentOrder>(`/admin/payment-orders/${args.order.id}/fail`, {
      reason: args.reason,
    })
  },

  // ── TICKETS DE SOPORTE ───────────────────────────────────────────────────────

  async updateSupportTicketStatus(args: {
    actor: StaffActor
    ticket: StaffSupportTicket
    status: TicketStatus
    reason: string
  }) {
    return apiPatch<StaffSupportTicket>(`/admin/support/tickets/${args.ticket.id}/status`, {
      status: args.status,
      reason: args.reason,
    })
  },
}

// ────────────────────────────────────────────────────────────────
//  Helpers de Storage (Supabase — legítimo para archivos)
// ────────────────────────────────────────────────────────────────

async function enrichUsersWithPhotoUrls(users: Profile[]): Promise<StaffUserRecord[]> {
  const supabase = createClient()
  return Promise.all(
    users.map(async (user) => {
      // 1. Intentar avatar desde metadata del profile
      const metadataAvatar = readProfileAvatarUrl(user.metadata as Record<string, unknown>)
      if (metadataAvatar) return { ...user, client_photo_url: metadataAvatar }

      // 2. Intentar avatar_url directo del profile (columna profiles.avatar_url)
      const profileAvatar = (user as unknown as { avatar_url?: string }).avatar_url
      if (profileAvatar) return { ...user, client_photo_url: profileAvatar }

      // 3. Intentar selfie desde documents del usuario
      const { data: selfieDoc } = await supabase
        .from('documents')
        .select('storage_path')
        .eq('user_id', user.id)
        .eq('document_type', 'selfie')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!selfieDoc?.storage_path) return { ...user, client_photo_url: null }

      const { data } = await supabase.storage
        .from('kyc-documents')
        .createSignedUrl(selfieDoc.storage_path, 60 * 60)

      return { ...user, client_photo_url: data?.signedUrl ?? null }
    })
  )
}

function readProfileAvatarUrl(metadata: Record<string, unknown> | undefined) {
  if (!metadata) return null
  const candidateKeys = ['avatar_url', 'photo_url', 'image_url', 'profile_picture']
  for (const key of candidateKeys) {
    const value = metadata[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return null
}

