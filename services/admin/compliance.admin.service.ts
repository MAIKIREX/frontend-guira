/**
 * admin/compliance.admin.service.ts
 *
 * Servicio canónico para todas las operaciones de compliance/onboarding del staff.
 * Reemplaza las funciones de compliance que antes vivían en staff.service.ts.
 *
 * ─ Listar reviews (Dashboard)
 * ─ Detalle de un review con application data, profile y documents
 * ─ Acciones: approve, reject, request-changes, escalate
 *
 * Todos los endpoints requieren rol: staff | admin | super_admin
 */
import { apiGet, apiPatch, apiPost } from '@/lib/api/client'
import type { OnboardingStatus } from '@/types/onboarding'
import type {
  StaffActor,
  StaffDocumentRecord,
  StaffOnboardingDetail,
  StaffOnboardingRecord,
} from '@/types/staff'

// ── Tipos del servicio ──────────────────────────────────────────────

export interface AdminComplianceReview {
  id: string
  subject_type: string
  subject_id: string
  status: string
  priority?: string
  assigned_to?: string
  opened_at?: string
  closed_at?: string
  // Campos enriquecidos por listOpenReviews del backend
  user_id?: string
  type?: 'personal' | 'company'
  application_status?: string
  updated_at?: string
  profiles?: {
    email?: string
    first_name?: string
    last_name?: string
    full_name?: string
    business_name?: string
  } | null
}

export interface ComplianceListParams {
  priority?: string
  assigned_to?: string
}

export interface AdminComplianceActivityEvent {
  id?: string
  decision?: string
  reason?: string
  actor_id?: string
  created_at?: string
  metadata?: Record<string, unknown>
}

export interface AdminComplianceActivityComment {
  id?: string
  author_id?: string
  body?: string
  is_internal?: boolean
  created_at?: string
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

// ── Servicio ────────────────────────────────────────────────────────

export const ComplianceAdminService = {
  // ── Listado (Dashboard) ─────────────────────────────────────────

  /**
   * Lista todos los reviews abiertos.
   * C6 FIX: Solo enviamos los filtros que el backend acepta (priority, assigned_to).
   * El backend filtra status='open' server-side.
   */
  async getReviews(params?: ComplianceListParams): Promise<AdminComplianceReview[]> {
    const queryParams: Record<string, string> = {}
    if (params?.priority) queryParams.priority = params.priority
    if (params?.assigned_to) queryParams.assigned_to = params.assigned_to
    return apiGet<AdminComplianceReview[]>('/admin/compliance/reviews', { params: queryParams })
  },

  /**
   * Obtiene los events y comments de un review para el tab de Actividad.
   * Reutiliza el endpoint de detalle.
   */
  async getReviewActivity(reviewId: string): Promise<{ events: AdminComplianceActivityEvent[]; comments: AdminComplianceActivityComment[] }> {
    const raw = await apiGet<{ events?: AdminComplianceActivityEvent[]; comments?: AdminComplianceActivityComment[] }>(`/admin/compliance/reviews/${reviewId}`)
    return {
      events: raw.events ?? [],
      comments: raw.comments ?? [],
    }
  },

  // ── Detalle (OnboardingDetailPage) ──────────────────────────────

  /**
   * Obtiene el detalle completo de un review: application data, profile,
   * documents con signed URLs, events y comments.
   * C3 FIX: 1 sola llamada REST en lugar de 1 REST + 5 Supabase directas.
   */
  async getOnboardingDetail(reviewId: string): Promise<StaffOnboardingDetail> {
    const raw = await apiGet<Record<string, unknown>>(`/admin/compliance/reviews/${reviewId}`)
    const profile = asRecord(raw.profile)

    // C10 FIX: Usamos profile.onboarding_status (valor BD correcto)
    // en lugar de review.status ('open'/'closed').
    const record: StaffOnboardingRecord = {
      id: reviewId,
      user_id: asString(raw.user_id, 'unknown-user'),
      type: asString(raw.onboarding_type, 'personal') as StaffOnboardingRecord['type'],
      status: (profile.onboarding_status ?? raw.application_status ?? 'in_review') as StaffOnboardingRecord['status'],
      data: asRecord(raw.application_data),
      previous_data: raw.previous_data ? asRecord(raw.previous_data) : null,
      observations: (raw.comments as Array<{ body: string }> | null)?.[0]?.body,
      bridge_customer_id: asString(profile.bridge_customer_id) || undefined,
      created_at: asString(raw.opened_at),
      updated_at: asString(raw.closed_at, asString(raw.opened_at)),
      profiles: raw.profile
        ? {
            full_name: asString(profile.full_name) || undefined,
            email: asString(profile.email) || undefined,
            onboarding_status: asString(profile.onboarding_status) || undefined,
          }
        : null,
    }

    const documents: StaffDocumentRecord[] = ((raw.documents as Record<string, unknown>[] | undefined) ?? []).map((doc) => ({
      id: asString(doc.id) || undefined,
      onboarding_id: reviewId,
      user_id: asString(doc.user_id, asString(raw.user_id, 'unknown-user')),
      doc_type: asString(doc.document_type, asString(doc.description, 'document')),
      storage_path: asString(doc.storage_path),
      mime_type: asString(doc.mime_type) || null,
      created_at: asString(doc.created_at) || undefined,
      signed_url: asString(doc.signed_url) || null,
    }))

    return { record, documents }
  },

  // ── Acciones (OnboardingDetailPage → Decisión) ─────────────────

  /**
   * Aprueba, solicita cambios o rechaza un expediente de onboarding.
   *
   * ─ 'approved'  → POST .../approve → cierra review + aprueba + Bridge
   * ─ 'in_review' → POST .../request-changes → review abierto, needs_review
   * ─ 'rejected'  → POST .../reject → cierra review permanentemente
   */
  async updateOnboardingStatus(args: {
    actor: StaffActor
    record: StaffOnboardingRecord
    status: Extract<OnboardingStatus, 'approved' | 'rejected' | 'in_review'>
    reason: string
    fieldObservations?: Record<string, string>
  }) {
    if (args.status === 'approved') {
      await apiPost(
        `/admin/compliance/reviews/${args.record.id}/approve`,
        { reason: args.reason },
      )
      return { ...args.record, status: 'approved' } as StaffOnboardingRecord
    }

    if (args.status === 'in_review') {
      await apiPost(
        `/admin/compliance/reviews/${args.record.id}/request-changes`,
        {
          reason: args.reason,
          ...(args.fieldObservations && Object.keys(args.fieldObservations).length > 0
            ? { field_observations: args.fieldObservations }
            : {}),
        },
      )
      return { ...args.record, status: 'in_review' } as StaffOnboardingRecord
    }

    // C5 FIX: Enviamos { reason } correctamente (no { rejection_reason }).
    await apiPost(
      `/admin/compliance/reviews/${args.record.id}/reject`,
      { reason: args.reason },
    )
    return { ...args.record, status: 'rejected' } as StaffOnboardingRecord
  },

  // ── Escalate ──────────────────────────────────────────────────────

  /**
   * Escala un review a prioridad urgente.
   * C4 FIX: Usa PATCH (no POST) para coincidir con el backend.
   */
  async escalateReview(reviewId: string): Promise<void> {
    return apiPatch<void>(`/admin/compliance/reviews/${reviewId}/escalate`)
  },

  // ── Assign ────────────────────────────────────────────────────────

  /**
   * Asigna un review a un analista staff.
   */
  async assignReview(reviewId: string, staffUserId: string): Promise<void> {
    return apiPatch<void>(`/admin/compliance/reviews/${reviewId}/assign`, {
      staff_user_id: staffUserId,
    })
  },

  // ── Comments ──────────────────────────────────────────────────────

  /**
   * Agrega un comentario interno a un review.
   */
  async addComment(reviewId: string, body: string, isInternal = true): Promise<unknown> {
    return apiPost(`/admin/compliance/reviews/${reviewId}/comments`, {
      body,
      is_internal: isInternal,
    })
  },
}
