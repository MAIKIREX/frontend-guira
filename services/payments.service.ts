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
import { apiGet, apiPost, apiPatch, apiDelete, apiUpload } from '@/lib/api/client'
import type { PaymentOrder } from '@/types/payment-order'
import type { Supplier } from '@/types/supplier'
import type { PaginationParams } from '@/lib/api/types'

// ── DTOs de entrada ───────────────────────────────────────────────

export interface CreateInterbankOrderDto {
  amount_origin: number
  origin_currency: string
  destination_currency: string
  processing_rail: string
  supplier_id?: string
  notes?: string
}

export type WalletRampFlowType =
  | 'fiat_bo_to_bridge_wallet'
  | 'crypto_to_bridge_wallet'
  | 'fiat_us_to_bridge_wallet'
  | 'bridge_wallet_to_fiat_bo'
  | 'bridge_wallet_to_crypto'
  | 'bridge_wallet_to_fiat_us'

export interface CreateWalletRampOrderDto {
  flow_type: WalletRampFlowType
  amount: number
  currency: string
  external_account_id?: string        // Para ramps con destino banco externo
  liquidation_address_id?: string     // Para ramps con destino crypto
  destination_currency?: string
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

export const PaymentsService = {

  // ── Órdenes de pago ──────────────────────────────────────────

  /**
   * Lista órdenes de pago del usuario autenticado.
   */
  async getOrders(params?: OrderFilter): Promise<PaymentOrder[]> {
    return apiGet<PaymentOrder[]>('/payment-orders', { params })
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
   * Sube un comprobante/evidencia a una orden (reemplaza upload a Supabase Storage).
   * El backend guarda el archivo y actualiza el estado de la orden automáticamente.
   */
  async uploadOrderEvidence(orderId: string, file: File, field: 'evidence_url' | 'receipt_url'): Promise<PaymentOrder> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('field', field)
    return apiUpload<PaymentOrder>(`/payment-orders/${orderId}/upload`, formData)
  },

  /**
   * Cancela una orden (solo en estados 'created' o 'waiting_deposit').
   * El backend valida el estado y registra el audit log.
   */
  async cancelOrder(orderId: string): Promise<PaymentOrder> {
    return apiPost<PaymentOrder>(`/payment-orders/${orderId}/cancel`)
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
   * Para proveedores internacionales, el frontend también llamará
   * a BridgeService.createExternalAccount() antes de guardar.
   */
  async createSupplier(dto: SupplierUpsertDto): Promise<Supplier> {
    return apiPost<Supplier>('/suppliers', dto)
  },

  /**
   * Actualiza un proveedor existente.
   */
  async updateSupplier(supplierId: string, dto: Partial<SupplierUpsertDto>): Promise<Supplier> {
    return apiPatch<Supplier>(`/suppliers/${supplierId}`, dto)
  },

  /**
   * Elimina un proveedor.
   */
  async deleteSupplier(supplierId: string): Promise<void> {
    return apiDelete<void>(`/suppliers/${supplierId}`)
  },

  // ── Fees / Tasas / Exchange Rates (para UI informativa) ─────────────────

  /**
   * Tarifas públicas activas (endpoint: GET /fees).
   */
  async getFeesConfig(): Promise<unknown[]> {
    return apiGet<unknown[]>('/fees')
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
}
