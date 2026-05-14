/**
 * payments.service.ts
 * 
 * MIGRADO COMPLETO: Supabase direct → REST API
 * 
 * ANTES: 222 líneas insertando directamente en Supabase con lógica de
 *        negocio client-side (cálculo de status, activity logs manuales,
 *        upload a Supabase Storage, logica de snapshot con 6 queries)
 * 
 * AHORA: El backend es el motor de todos los flujos financieros.
 *        El frontend solo envía DTOs tipados y renderiza respuestas.
 *        Activity logs, state transitions y storage → todos en el backend.
 * 
 * Flujos soportados (11 tipos por el backend):
 *   Interbank:   POST /payment-orders/interbank
 *   Wallet Ramp: POST /payment-orders/wallet-ramp
 * 
 * Suppliers (Proveedores):
 *   GET    /suppliers
 *   POST   /suppliers
 *   PATCH  /suppliers/:id
 *   DELETE /suppliers/:id
 * 
 * Fees / PSAV / Exchange Rates (consulta para UI):
 *   GET /fees/config
 *   GET /fees/preview
 *   GET /psav
 *   GET /exchange-rates
 */
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api/client'
import type { PaymentOrder, PsavConfigRow, AppSettingRow, OrderReviewRequest } from '@/types/payment-order'
import type { Supplier, CreateSupplierPayload } from '@/types/supplier'
import type { ActivityLog } from '@/types/activity-log'
import type { PaginationParams, PaginatedResponse } from '@/lib/api/types'

// ── DTOs de entrada ───────────────────────────────────────────────

export type InterbankFlowType =
  | 'bolivia_to_world'
  | 'wallet_to_wallet'
  | 'bolivia_to_wallet'
  | 'world_to_bolivia'
  | 'world_to_wallet'

export interface CreateInterbankOrderDto {
  flow_type: InterbankFlowType
  amount: number
  business_purpose: string
  external_account_id?: string
  payin_route_id?: string
  supplier_id?: string
  destination_type?: string
  destination_currency?: string
  destination_bank_name?: string
  destination_account_number?: string
  destination_account_holder?: string
  notes?: string
}

export type WalletRampFlowType =
  | 'fiat_bo_to_bridge_wallet'
  | 'crypto_to_bridge_wallet'
  | 'bridge_wallet_to_fiat_bo'
  | 'bridge_wallet_to_crypto'
  | 'bridge_wallet_to_fiat_us'
  | 'wallet_to_fiat'

export interface CreateWalletRampOrderDto {
  flow_type: WalletRampFlowType
  amount: number
  business_purpose?: string
  currency?: string // fallback
  external_account_id?: string
  liquidation_address_id?: string
  destination_currency?: string
  
  // Newly typed fields from payload mapping
  wallet_id?: string
  source_network?: string
  source_address?: string
  source_currency?: string

  // Off-ramp crypto (bridge_wallet_to_crypto)
  destination_address?: string
  destination_network?: string

  // Off-ramp fiat BO
  destination_qr_url?: string

  // wallet_to_fiat
  supplier_id?: string

  // Comunes
  notes?: string
  supporting_document_url?: string
}

export interface SupplierUpsertDto {
  name: string
  alias?: string
  payment_rail: string
  bank_name?: string
  account_number?: string
  routing_number?: string
  iban?: string
  clabe?: string
  email?: string
  notes?: string
}

export interface OrderFilter extends PaginationParams {
  status?: string
  order_type?: string
  from?: string
  to?: string
}

// ── Servicio ─────────────────────────────────────────────────────

// ── Tipos del catálogo de rutas ───────────────────────────────────────────

export interface BridgeRouteCatalog {
  ramp_on: Record<string, Record<string, { destinations: string[]; min: number }>>
  ramp_off: Record<string, Record<string, Record<string, number>>>
  fiat_bo_off_ramp: Record<string, Record<string, Record<string, number>>>
  fiat_bo_allowed_destinations: readonly string[]
  fiat_bo_excluded_sources: readonly string[]
}

export const PaymentsService = {

  // ── Catálogo de rutas Bridge ──────────────────────────────────

  /**
   * Obtiene el catálogo de rutas Bridge soportadas desde el backend.
   * Usar en lugar del catálogo estático local para mantener una sola fuente de verdad.
   */
  async getRouteCatalog(): Promise<BridgeRouteCatalog> {
    return apiGet<BridgeRouteCatalog>('/payment-orders/route-catalog')
  },

  async getPaymentLimits(flowType: string): Promise<{ flow_type: string; min_usd: number; max_usd: number }> {
    return apiGet<{ flow_type: string; min_usd: number; max_usd: number }>(
      `/payment-orders/limits/${flowType}`,
    )
  },

  // ── Órdenes de pago ──────────────────────────────────────────

  /**
   * Lista órdenes de pago del usuario autenticado.
   */
  async getOrders(params?: OrderFilter): Promise<PaginatedResponse<PaymentOrder>> {
    return apiGet<PaginatedResponse<PaymentOrder>>('/payment-orders', { params })
  },

  /**
   * Detalle de una orden.
   */
  async getOrder(orderId: string): Promise<PaymentOrder> {
    return apiGet<PaymentOrder>(`/payment-orders/${orderId}`)
  },

  /**
   * Crea una orden de pago interbancaria (el flujo "Enviar" estándar).
   * El backend valida balances, calcula fees, y registra el activity log.
   */
  async createInterbankOrder(dto: CreateInterbankOrderDto): Promise<PaymentOrder> {
    return apiPost<PaymentOrder>('/payment-orders/interbank', dto)
  },

  /**
   * Crea una orden de tipo Wallet Ramp (Fiat ↔ Crypto ↔ Bridge Wallet).
   * Requiere que el usuario tenga Bridge wallet activa.
   */
  async createWalletRampOrder(dto: CreateWalletRampOrderDto): Promise<PaymentOrder> {
    return apiPost<PaymentOrder>('/payment-orders/wallet-ramp', dto)
  },

  /**
   * Sube un archivo a storage y retorna su URL relativa (bucket/path).
   * Útil para subir documentos antes de crear la orden.
   */
  async uploadFileToStorage(file: File, bucket: string = 'payment-receipts'): Promise<string> {
    const { createClient } = await import('@/lib/supabase/browser')
    const supabase = createClient()
    
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id
    if (!userId) throw new Error("No hay sesión activa para subir archivo")

    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/upload_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`

    const { data, error } = await supabase.storage.from(bucket).upload(fileName, file, { upsert: true })

    if (error) {
      throw new Error(`Error uploading to Supabase: ${error.message}`)
    }

    return `${bucket}/${data.path}`
  },

  /**
   * Sube un comprobante/evidencia a una orden y notifica al backend.
   * El backend guarda el archivo y actualiza el estado de la orden (confirm-deposit).
   */
  async uploadOrderEvidence(orderId: string, file: File): Promise<PaymentOrder> {
    const { createClient } = await import('@/lib/supabase/browser')
    const supabase = createClient()
    
    // Auto-fetch userId from session for RLS compliance
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id

    if (!userId) {
      throw new Error("No hay sesión activa para subir el recibo")
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${orderId}_${Date.now()}.${fileExt}`

    const { data: uploadData, error } = await supabase.storage
      .from('payment-receipts')
      .upload(fileName, file, { upsert: true })

    if (error) {
      throw new Error(`Error uploading to Supabase: ${error.message}`)
    }

    // Backend needs the relative path or full url.
    const storagePath = `payment-receipts/${uploadData.path}`

    return apiPost<PaymentOrder>(`/payment-orders/${orderId}/confirm-deposit`, {
      deposit_proof_url: storagePath
    })
  },

  /**
   * Cancela una orden (solo en estados 'created' o 'waiting_deposit').
   * El backend valida el estado y registra el audit log.
   */
  async cancelOrder(orderId: string): Promise<PaymentOrder> {
    return apiPost<PaymentOrder>(`/payment-orders/${orderId}/cancel`)
  },

  /**
   * Actualiza campos de una orden existente.
   * Usado para persistir URLs de documentos adjuntos post-creación
   * (e.g. supporting_document_url).
   */
  async updateOrder(orderId: string, data: Partial<PaymentOrder>): Promise<PaymentOrder> {
    return apiPatch<PaymentOrder>(`/payment-orders/${orderId}`, data)
  },

  // ── Proveedores (Suppliers) ───────────────────────────────────

  /**
   * Lista proveedores del usuario autenticado.
   * Corresponde a la sección "Proveedores" del aside.
   */
  async getSuppliers(): Promise<Supplier[]> {
    return apiGet<Supplier[]>('/suppliers')
  },

  /**
   * Crea un nuevo proveedor.
   * El backend se encargará automáticamente de registrar en Bridge 
   * si el proveedor es un tipo de cuenta fiat.
   */
  async createSupplier(dto: CreateSupplierPayload): Promise<Supplier> {
    return apiPost<Supplier>('/suppliers', dto)
  },

  /**
   * Actualiza un proveedor existente.
   */
  async updateSupplier(supplierId: string, dto: Partial<CreateSupplierPayload>): Promise<Supplier> {
    return apiPatch<Supplier>(`/suppliers/${supplierId}`, dto)
  },

  /**
   * Elimina un proveedor.
   */
  async deleteSupplier(supplierId: string): Promise<void> {
    return apiDelete<void>(`/suppliers/${supplierId}`)
  },

  /**
   * Consulta los rails ya registrados para un email dado.
   * Usado para validación en tiempo real en el formulario de nuevo proveedor.
   */
  async checkDuplicateRails(email: string): Promise<{
    exists: boolean
    supplierName?: string
    usedRails: string[]
    usedNetworks: string[]
  }> {
    return apiGet(`/suppliers/check-duplicate?email=${encodeURIComponent(email)}`)
  },

  // ── Fees / Tasas / Exchange Rates (para UI informativa) ─────────────────

  /**
   * Tarifas públicas activas (endpoint: GET /fees).
   */
  async getFeesConfig(): Promise<unknown[]> {
    return apiGet<unknown[]>('/fees')
  },

  /**
   * Preview del fee que se aplicaría al usuario autenticado para una operación concreta.
   * Considera overrides personales — usar en el step de monto del formulario.
   */
  async getFeePreview(params: {
    operation_type: string
    payment_rail: string
    amount: number
  }): Promise<{
    fee_amount: number
    net_amount: number
    fee_type: string
    fee_percent: number
    fee_fixed: number
    min_fee: number
    max_fee: number
    is_override: boolean
  }> {
    const qs = new URLSearchParams({
      operation_type: params.operation_type,
      payment_rail: params.payment_rail,
      amount: String(params.amount),
    })
    return apiGet(`/fees/preview?${qs.toString()}`)
  },

  /**
   * Tasas de cambio actuales (disponibles en el controlador de payment-orders).
   */
  async getExchangeRates(): Promise<unknown[]> {
    return apiGet<unknown[]>('/payment-orders/exchange-rates')
  },

  /**
   * Tasa de cambio de un par específico.
   */
  async getExchangeRate(pair: string): Promise<unknown> {
    return apiGet<unknown>(`/payment-orders/exchange-rates/${pair}`)
  },

  // ── PSAV Configs (cuentas receptoras para instrucciones de depósito) ────

  /**
   * Cuentas PSAV activas (visibles para el cliente para instrucciones de depósito).
   * Usa el endpoint público de payment-orders/psav-accounts.
   * Si falla (endpoint no disponible para clientes), retorna array vacío silenciosamente.
   */
  async getPsavConfigs(): Promise<PsavConfigRow[]> {
    return apiGet<PsavConfigRow[]>('/payment-orders/psav-configs')
  },

  // ── App Settings (tasas de cambio y configuración pública) ──────────────

  /**
   * Settings públicos del sistema (tasas paralelas, etc).
   * Usa /settings/public que no requiere rol admin.
   */
  async getAppSettings(): Promise<AppSettingRow[]> {
    try {
      const raw = await apiGet<Record<string, string> | AppSettingRow[]>('/settings/public')
      // /settings/public puede retornar un objeto {key: value} o un array
      if (Array.isArray(raw)) return raw
      // Convertir objeto plano a formato AppSettingRow
      return Object.entries(raw).map(([key, value]) => ({
        id: key,
        key,
        name: key,
        value,
      }))
    } catch {
      console.warn('[PaymentsService] Public settings endpoint not available')
      return []
    }
  },

  // ── Activity Logs ──────────────────────────────────────────────────────

  /**
   * Activity logs del usuario autenticado.
   * El backend determina el userId por JWT.
   */
  async getActivityLogs(): Promise<ActivityLog[]> {
    try {
      const raw = await apiGet<ActivityLog[] | { data: ActivityLog[] }>('/activity')
      return Array.isArray(raw) ? raw : Array.isArray((raw as { data: ActivityLog[] })?.data) ? (raw as { data: ActivityLog[] }).data : []
    } catch {
      console.warn('[PaymentsService] Activity logs endpoint not available')
      return []
    }
  },

  // ── Solicitudes de revisión por exceso de límite (cliente) ─────

  async getMyReviewRequests(): Promise<OrderReviewRequest[]> {
    return apiGet<OrderReviewRequest[]>('/payment-orders/review-requests')
  },

  async getMyReviewRequest(reviewId: string): Promise<OrderReviewRequest> {
    return apiGet<OrderReviewRequest>(`/payment-orders/review-requests/${reviewId}`)
  },

  async cancelReviewRequest(reviewId: string): Promise<void> {
    return apiDelete<void>(`/payment-orders/review-requests/${reviewId}`)
  },
}
