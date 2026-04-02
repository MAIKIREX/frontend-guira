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
 * │  PATCH /admin/compliance/reviews/:id/approve                       │
 * │  PATCH /admin/compliance/reviews/:id/reject                        │
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

    return {
      onboarding: reviewsData ?? [],
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

  /**
   * Obtiene el detalle de un registro de revisión de compliance/onboarding.
   * Incluye documentos con URLs firmadas desde Supabase Storage.
   */
  async getOnboardingDetail(reviewId: string): Promise<StaffOnboardingDetail> {
    const record = await apiGet<StaffOnboardingRecord>(`/admin/compliance/reviews/${reviewId}`)

    // Obtener documentos firmados desde Supabase Storage (legítimo)
    const supabase = createClient()
    const { data: documents, error: documentsError } = await supabase
      .from('documents')
      .select('*')
      .eq('onboarding_id', reviewId)
      .order('created_at', { ascending: false })

    if (documentsError) throw documentsError

    const documentsWithUrls = await Promise.all(
      ((documents ?? []) as StaffDocumentRecord[]).map(async (document) => {
        if (!document.storage_path) {
          return { ...document, signed_url: null }
        }
        const { data } = await supabase.storage
          .from('onboarding_docs')
          .createSignedUrl(document.storage_path, 60 * 60)
        return { ...document, signed_url: data?.signedUrl ?? null }
      })
    )

    return { record, documents: documentsWithUrls }
  },

  /**
   * Aprueba o rechaza un expediente de onboarding/KYC via endpoint de compliance.
   */
  async updateOnboardingStatus(args: {
    actor: StaffActor
    record: StaffOnboardingRecord
    status: Extract<OnboardingStatus, 'verified' | 'rejected' | 'needs_changes'>
    reason: string
  }) {
    if (args.status === 'verified') {
      return apiPatch<StaffOnboardingRecord>(
        `/admin/compliance/reviews/${args.record.id}/approve`,
        { reason: args.reason }
      )
    }
    return apiPatch<StaffOnboardingRecord>(
      `/admin/compliance/reviews/${args.record.id}/reject`,
      { reason: args.reason, new_status: args.status }
    )
  },

  // ── ÓRDENES DE PAGO ──────────────────────────────────────────────────────────

  async advancePaymentOrderToDepositReceived(args: {
    actor: StaffActor
    order: PaymentOrder
    reason: string
  }) {
    // El backend aprueba el depósito y pasa a 'processing' vía /approve
    return apiPost<PaymentOrder>(`/admin/payment-orders/${args.order.id}/approve`, {
      reason: args.reason,
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
      reason: args.reason,
      exchange_rate_applied: args.exchangeRateApplied,
      amount_converted: args.amountConverted,
      fee_total: args.feeTotal,
    })
  },

  async advancePaymentOrderToSent(args: {
    actor: StaffActor
    order: PaymentOrder
    reason: string
    reference: string
  }) {
    return apiPost<PaymentOrder>(`/admin/payment-orders/${args.order.id}/mark-sent`, {
      reason: args.reason,
      reference: args.reference,
    })
  },

  async advancePaymentOrderToCompleted(args: {
    actor: StaffActor
    order: PaymentOrder
    reason: string
    comprobanteFile: File
  }) {
    validateDocumentFile(args.comprobanteFile)
    const formData = new FormData()
    formData.append('file', args.comprobanteFile)
    formData.append('reason', args.reason)
    return apiUpload<PaymentOrder>(`/admin/payment-orders/${args.order.id}/complete`, formData)
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
      const metadataAvatar = readProfileAvatarUrl(user.metadata as Record<string, unknown>)
      if (metadataAvatar) return { ...user, client_photo_url: metadataAvatar }

      // Intentar foto desde storage de onboarding
      const { data: onboardingData } = await supabase
        .from('onboarding')
        .select('data')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const selfiePath = readOnboardingSelfiePath(
        onboardingData?.data as Record<string, unknown> | undefined
      )
      if (!selfiePath) return { ...user, client_photo_url: null }

      const { data } = await supabase.storage
        .from('onboarding_docs')
        .createSignedUrl(selfiePath, 60 * 60)

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

function readOnboardingSelfiePath(data: Record<string, unknown> | undefined) {
  if (!data) return null
  const value = data.selfie
  return typeof value === 'string' && value.trim() ? value : null
}
