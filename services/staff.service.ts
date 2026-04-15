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
import type { PaymentOrder } from '@/types/payment-order'
import type { Profile } from '@/types/profile'
import type {
  StaffActor,
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
  // ═══════════════════════════════════════════════════════════════════
  // C8 FIX: Las funciones de onboarding/compliance fueron migradas a
  // ComplianceAdminService (services/admin/compliance.admin.service.ts).
  //
  // Funciones eliminadas de aquí:
  //   - getReadOnlySnapshot()      → useStaffDashboard hook
  //   - getOnboardingDetail()      → ComplianceAdminService.getOnboardingDetail()
  //   - updateOnboardingStatus()   → ComplianceAdminService.updateOnboardingStatus()
  // ═══════════════════════════════════════════════════════════════════



  // ── ÓRDENES DE PAGO ──────────────────────────────────────────────────────────



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
    providerReference?: string
  }) {
    return apiPost<PaymentOrder>(`/admin/payment-orders/${args.order.id}/mark-sent`, {
      notes: args.reason,
      tx_hash: args.reference,
      provider_reference: args.providerReference,
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
    const fileName = `${args.order.user_id}/${args.order.id}_receipt_${Date.now()}.${fileExt}`

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
    notifyUser: boolean
  }) {
    return apiPost<PaymentOrder>(`/admin/payment-orders/${args.order.id}/fail`, {
      reason: args.reason,
      notify_user: args.notifyUser,
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

