# Fase 3 — Migración de Escritura + Nuevos Módulos

> **Duración estimada:** 3 semanas  
> **Riesgo:** Alto — Involucra operaciones financieras y módulos nuevos sin precedente  
> **Prerrequisito:** Fases 1 y 2 completadas  
> **Objetivo:** Migrar operaciones de creación/actualización a REST, y construir interfaces para Bridge, Compliance, KYB, Exchange Rates, Fees, PSAV y Ledger

---

## 1. División de Trabajo

Esta fase se divide en dos tracks paralelos:

| Track | Descripción | Semanas |
|---|---|---|
| **3.A** — Migración de Escritura | Reescribir servicios existentes que hacen INSERT/UPDATE contra Supabase | 1-2 |
| **3.B** — Nuevos Módulos | Crear servicios y tipos para módulos que no existen en el frontend | 2-3 |

---

## TRACK 3.A — Migración de Servicios de Escritura

### 3.A.1 `payments.service.ts` — Reescritura Mayor

**Archivo actual:** `services/payments.service.ts` (222 líneas)  
**Criticidad:** 🔴 Máxima — Maneja operaciones financieras  
**Cambio fundamental:** De 3 flujos genéricos a 11 flujos especializados con endpoints dedicados

#### Estado Actual vs Backend

**Frontend actual (ELIMINAR):**
```typescript
// Crea orden genérica — no distingue flow_type
const { data, error } = await supabase
  .from('payment_orders')
  .insert({
    user_id,
    order_type,
    processing_rail,
    amount_origin,
    // ... campos genéricos
  })
```

**Backend disponible (ADOPTAR):**
```
POST /payment-orders/interbank    → 5 flow_types
POST /payment-orders/wallet-ramp  → 6 flow_types
POST /payment-orders/:id/confirm-deposit
POST /payment-orders/:id/cancel
GET  /payment-orders
GET  /payment-orders/:id
```

#### Endpoints por Flow Type

| # | Endpoint | flow_type | Payload Clave |
|---|---|---|---|
| 1 | `POST /payment-orders/interbank` | `bolivia_to_world` | `supplier_id`, `amount_origin_bob`, `destination_currency` |
| 2 | `POST /payment-orders/interbank` | `wallet_to_wallet` | `destination_address`, `amount_usd` |
| 3 | `POST /payment-orders/interbank` | `bolivia_to_wallet` | `amount_origin_bob`, `destination_currency: 'usdc'` |
| 4 | `POST /payment-orders/interbank` | `world_to_bolivia` | `amount_usd`, `destination_bank_details` |
| 5 | `POST /payment-orders/interbank` | `world_to_wallet` | `amount_usd`, `virtual_account_id` |
| 6 | `POST /payment-orders/wallet-ramp` | `fiat_bo_to_bridge_wallet` | `amount_bob`, PSAV instructions |
| 7 | `POST /payment-orders/wallet-ramp` | `crypto_to_bridge_wallet` | `amount_crypto`, liquidation address |
| 8 | `POST /payment-orders/wallet-ramp` | `fiat_us_to_bridge_wallet` | `amount_usd`, VA deposit |
| 9 | `POST /payment-orders/wallet-ramp` | `bridge_wallet_to_fiat_bo` | `amount_usd`, cuenta bancaria BO |
| 10 | `POST /payment-orders/wallet-ramp` | `bridge_wallet_to_crypto` | `amount_usd`, dirección crypto |
| 11 | `POST /payment-orders/wallet-ramp` | `bridge_wallet_to_fiat_us` | `amount_usd`, external_account_id |

#### Código Migrado

```typescript
import { apiGet, apiPost, apiUpload } from '@/lib/api'
import type { PaginatedResponse } from '@/lib/api'
import type { 
  PaymentOrder,
  CreateInterbankOrderInput,
  CreateWalletRampOrderInput,
  ConfirmDepositInput,
  PaymentOrderFilter,
} from '@/types/payment-order'

export const PaymentsService = {
  // ── LECTURA ──────────────────────────────────────────

  /**
   * Listar órdenes del usuario con filtros y paginación.
   */
  async getOrders(filters?: PaymentOrderFilter): Promise<PaginatedResponse<PaymentOrder>> {
    const params = new URLSearchParams()
    if (filters?.page) params.set('page', String(filters.page))
    if (filters?.limit) params.set('limit', String(filters.limit))
    if (filters?.status) params.set('status', filters.status)
    if (filters?.flow_category) params.set('flow_category', filters.flow_category)
    // ⚠️ Backend user endpoint NO acepta flow_type como query param, solo flow_category

    return apiGet<PaginatedResponse<PaymentOrder>>(`/payment-orders?${params.toString()}`)
  },

  /**
   * Detalle de una orden específica.
   */
  async getOrder(orderId: string): Promise<PaymentOrder> {
    return apiGet<PaymentOrder>(`/payment-orders/${orderId}`)
  },

  // ── CREACIÓN DE ÓRDENES ───────────────────────────────

  /**
   * Crear orden INTERBANK (5 flow_types).
   * 
   * VALIDACIONES SERVER-SIDE (ya no se hacen en frontend):
   * - Rate limit: MAX_PAYMENT_ORDERS_PER_HOUR
   * - Monto mín/máx: MIN_INTERBANK_USD / MAX_INTERBANK_USD
   * - Fee calculation automática
   * - Exchange rate lookup automático
   * - Instrucciones PSAV (si aplica)
   */
  async createInterbankOrder(input: CreateInterbankOrderInput): Promise<PaymentOrder> {
    return apiPost<PaymentOrder>('/payment-orders/interbank', input)
  },

  /**
   * Crear orden WALLET RAMP (6 flow_types).
   * 
   * VALIDACIONES SERVER-SIDE:
   * - Verificación de balance disponible (off-ramp)
   * - Reserva de balance atómica via RPC
   * - Bridge API integration automática
   * - Exchange rate aplicado automáticamente
   */
  async createWalletRampOrder(input: CreateWalletRampOrderInput): Promise<PaymentOrder> {
    return apiPost<PaymentOrder>('/payment-orders/wallet-ramp', input)
  },

  // ── ACCIONES DEL USUARIO ──────────────────────────────

  /**
   * Confirmar depósito realizado (upload de comprobante).
   * Transiciona orden: waiting_deposit → deposit_received
   */
  async confirmDeposit(orderId: string, input: ConfirmDepositInput): Promise<PaymentOrder> {
    if (input.deposit_proof) {
      // Upload del comprobante como FormData
      const formData = new FormData()
      formData.append('deposit_proof', input.deposit_proof)
      if (input.reference_number) formData.append('reference_number', input.reference_number)
      return apiUpload<PaymentOrder>(`/payment-orders/${orderId}/confirm-deposit`, formData)
    }
    return apiPost<PaymentOrder>(`/payment-orders/${orderId}/confirm-deposit`, {
      reference_number: input.reference_number,
    })
  },

  /**
   * Cancelar una orden por el usuario.
   * Solo posible en estados: created, waiting_deposit
   * Libera balance reservado automáticamente.
   */
  async cancelOrder(orderId: string): Promise<PaymentOrder> {
    return apiPost<PaymentOrder>(`/payment-orders/${orderId}/cancel`)
  },
}
```

#### Tipos Actualizados (`types/payment-order.ts`)

```typescript
// ── Flow Types (NUEVOS — antes no existían) ──────────

export type FlowCategory = 'interbank' | 'wallet_ramp'

export type InterbankFlowType =
  | 'bolivia_to_world'
  | 'wallet_to_wallet'
  | 'bolivia_to_wallet'
  | 'world_to_bolivia'
  | 'world_to_wallet'

export type WalletRampFlowType =
  | 'fiat_bo_to_bridge_wallet'
  | 'crypto_to_bridge_wallet'
  | 'fiat_us_to_bridge_wallet'
  | 'bridge_wallet_to_fiat_bo'
  | 'bridge_wallet_to_crypto'
  | 'bridge_wallet_to_fiat_us'

export type FlowType = InterbankFlowType | WalletRampFlowType

// ── Status (ACTUALIZADO — agregar swept_external) ────

export type OrderStatus =
  | 'created'
  | 'waiting_deposit'
  | 'deposit_received'
  | 'processing'
  | 'sent'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'swept_external'

// ── PaymentOrder (ACTUALIZADO) ───────────────────────

export interface PaymentOrder {
  id: string
  user_id: string
  flow_type: FlowType              // NUEVO
  flow_category: FlowCategory      // NUEVO
  
  // Montos
  amount_origin: number
  origin_currency: string
  amount_destination?: number        // NUEVO
  destination_currency: string
  exchange_rate_applied?: number
  fee_total: number
  
  // Estado
  status: OrderStatus
  requires_psav?: boolean            // NUEVO
  
  // Destino
  supplier_id?: string | null
  destination_address?: string       // NUEVO (crypto)
  destination_bank_details?: Record<string, unknown>  // NUEVO
  
  // Bridge integration
  bridge_transfer_id?: string        // NUEVO
  
  // PSAV
  psav_deposit_instructions?: Record<string, unknown>  // NUEVO
  
  // Comprobantes
  deposit_proof_url?: string         // NUEVO
  evidence_url?: string
  support_document_url?: string
  receipt_url?: string               // NUEVO
  staff_comprobante_url?: string
  
  // Admin actions
  approved_by?: string               // NUEVO
  approved_at?: string               // NUEVO
  completed_at?: string              // NUEVO
  failure_reason?: string            // NUEVO
  
  // Metadata y timestamps
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ── DTOs de Creación ─────────────────────────────────

export interface CreateInterbankOrderInput {
  flow_type: InterbankFlowType
  amount_origin: number
  origin_currency: string
  destination_currency: string
  supplier_id?: string
  destination_address?: string       // Para wallet_to_wallet
  metadata?: Record<string, unknown>
}

export interface CreateWalletRampOrderInput {
  flow_type: WalletRampFlowType
  amount: number
  currency: string
  external_account_id?: string       // Para bridge_wallet_to_fiat_us
  destination_address?: string       // Para bridge_wallet_to_crypto
  metadata?: Record<string, unknown>
}

export interface ConfirmDepositInput {
  deposit_proof?: File
  reference_number?: string
}

export interface PaymentOrderFilter {
  page?: number
  limit?: number
  status?: OrderStatus
  flow_type?: FlowType
  flow_category?: FlowCategory
}
```

---

### 3.A.2 `onboarding.service.ts` — Expansión KYC + KYB Nuevo

**Archivo actual:** `services/onboarding.service.ts` (134 líneas)  
**Expansión:** KYC refactorizado + KYB completo (directores, UBOs, ToS Bridge, documents)

```typescript
import { apiGet, apiPost, apiUpload, apiDelete } from '@/lib/api'
import type {
  KycPersonInput,
  KybBusinessInput,
  KybDirectorInput,
  KybUboInput,
  OnboardingDocument,
  TosLinkResponse,
  TosAcceptInput,
} from '@/types/onboarding'

export const OnboardingService = {
  // ── KYC (Personal) ────────────────────────────────────

  /**
   * Crear o actualizar datos personales KYC.
   * Backend valida: edad ≥18, campos obligatorios, formato de fecha.
   */
  async upsertKycPerson(data: KycPersonInput): Promise<void> {
    await apiPost('/onboarding/kyc/person', data)
  },

  /**
   * 🆕 Obtener datos biográficos del usuario.
   */
  async getKycPerson(): Promise<KycPersonInput & { id: string }> {
    return apiGet('/onboarding/kyc/person')
  },

  /**
   * Crear aplicación KYC.
   * Vincula persona + documentos en una aplicación Bridge.
   */
  async createKycApplication(): Promise<{ application_id: string }> {
    return apiPost('/onboarding/kyc/application')
  },

  /**
   * 🆕 Obtener estado de aplicación KYC.
   */
  async getKycApplication(): Promise<{ status: string; bridge_kyc_id?: string }> {
    return apiGet('/onboarding/kyc/application')
  },

  /**
   * Enviar KYC para revisión.
   * ⚠️ Verbo correcto: PATCH (no POST)
   * ⚠️ Path correcto: /onboarding/kyc/application/submit
   * Backend automáticamente crea un compliance_review para staff.
   */
  async submitKyc(): Promise<void> {
    await apiPatch('/onboarding/kyc/application/submit')
  },

  /**
   * Obtener link de Terms of Service de Bridge para KYC.
   */
  async getKycTosLink(): Promise<TosLinkResponse> {
    return apiGet<TosLinkResponse>('/onboarding/kyc/tos-link')
  },

  /**
   * Registrar aceptación de ToS Bridge (KYC).
   * ⚠️ Path correcto: /onboarding/kyc/tos-accept (no /tos)
   */
  async acceptKycTos(data: TosAcceptInput): Promise<void> {
    await apiPost('/onboarding/kyc/tos-accept', data)
  },

  // ── KYB (Empresa) — NUEVO ──────────────────────────────

  /**
   * 🆕 Obtener datos de la empresa con directores y UBOs.
   */
  async getKybBusiness(): Promise<KybBusinessInput & { id: string; directors: any[]; ubos: any[] }> {
    return apiGet('/onboarding/kyb/business')
  },

  /**
   * Agregar director a la empresa.
   * ⚠️ Path correcto: /onboarding/kyb/business/directors (incluye /business/)
   */
  async addKybDirector(data: KybDirectorInput): Promise<{ id: string }> {
    return apiPost('/onboarding/kyb/business/directors', data)
  },

  /**
   * Eliminar director de la empresa.
   * ⚠️ Path correcto: /onboarding/kyb/business/directors/:id
   */
  async removeKybDirector(directorId: string): Promise<void> {
    await apiDelete(`/onboarding/kyb/business/directors/${directorId}`)
  },

  /**
   * Agregar UBO (Ultimate Beneficial Owner).
   * ⚠️ Path correcto: /onboarding/kyb/business/ubos (incluye /business/)
   */
  async addKybUbo(data: KybUboInput): Promise<{ id: string }> {
    return apiPost('/onboarding/kyb/business/ubos', data)
  },

  /**
   * Eliminar UBO.
   * ⚠️ Path correcto: /onboarding/kyb/business/ubos/:id
   */
  async removeKybUbo(uboId: string): Promise<void> {
    await apiDelete(`/onboarding/kyb/business/ubos/${uboId}`)
  },

  /**
   * Crear aplicación KYB.
   */
  async createKybApplication(): Promise<{ application_id: string }> {
    return apiPost('/onboarding/kyb/application')
  },

  /**
   * 🆕 Obtener estado de aplicación KYB.
   */
  async getKybApplication(): Promise<{ status: string; bridge_kyb_id?: string }> {
    return apiGet('/onboarding/kyb/application')
  },

  /**
   * Enviar KYB para revisión.
   * ⚠️ Verbo correcto: PATCH (no POST)
   * ⚠️ Path correcto: /onboarding/kyb/application/submit
   */
  async submitKyb(): Promise<void> {
    await apiPatch('/onboarding/kyb/application/submit')
  },

  /**
   * 🆕 Obtener link de Terms of Service de Bridge para KYB.
   */
  async getKybTosLink(redirectUri?: string): Promise<TosLinkResponse> {
    const params = redirectUri ? `?redirect_uri=${encodeURIComponent(redirectUri)}` : ''
    return apiGet<TosLinkResponse>(`/onboarding/kyb/tos-link${params}`)
  },

  /**
   * Registrar aceptación de ToS Bridge (KYB).
   * ⚠️ Path correcto: /onboarding/kyb/tos-accept (no /tos)
   */
  async acceptKybTos(data: TosAcceptInput): Promise<void> {
    await apiPost('/onboarding/kyb/tos-accept', data)
  },

  // ── Documentos (Compartido KYC/KYB) ─────────────────

  /**
   * Subir documento de identidad o compliance.
   * Backend valida: MIME type (pdf/jpg/png), tamaño (≤10MB).
   * ⚠️ Requiere subject_type y opcionalmente subject_id
   */
  async uploadDocument(
    file: File, 
    documentType: string,
    subjectType: 'person' | 'business' | 'director' | 'ubo',
    subjectId?: string
  ): Promise<OnboardingDocument> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('document_type', documentType)
    formData.append('subject_type', subjectType)
    if (subjectId) formData.append('subject_id', subjectId)
    return apiUpload<OnboardingDocument>('/onboarding/documents/upload', formData)
  },

  /**
   * Listar documentos subidos por el usuario.
   */
  async getDocuments(): Promise<OnboardingDocument[]> {
    return apiGet<OnboardingDocument[]>('/onboarding/documents')
  },

  /**
   * Obtener URL firmada para descargar/ver un documento (expira en 1 hora).
   */
  async getDocumentSignedUrl(documentId: string): Promise<{ signed_url: string }> {
    return apiGet<{ signed_url: string }>(`/onboarding/documents/${documentId}/signed-url`)
  },
}
```

**Tipos (`types/onboarding.ts` actualizado):**

```typescript
export type OnboardingType = 'personal' | 'company'
export type OnboardingStatus = 
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'waiting_ubo_kyc'
  | 'verified'
  | 'rejected'
  | 'needs_changes'

// ── KYC Inputs ─────────────────────────────────────

export interface KycPersonInput {
  first_name: string
  last_name: string
  date_of_birth: string  // YYYY-MM-DD (backend valida ≥18)
  nationality: string    // ISO 3166-1 alpha-2
  email: string
  phone?: string
  address?: {
    street: string
    city: string
    state?: string
    postal_code: string
    country: string       // ISO 3166-1 alpha-2
  }
}

// ── KYB Inputs (NUEVOS) ────────────────────────────

export interface KybBusinessInput {
  business_name: string
  legal_name: string
  registration_number: string
  country_of_incorporation: string
  business_type: string  // 'llc' | 'corporation' | 'sole_proprietorship' | etc
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

export interface KybDirectorInput {
  first_name: string
  last_name: string
  date_of_birth: string
  nationality: string
  email: string
  title: string  // 'CEO' | 'CFO' | 'Director' | etc
}

export interface KybUboInput {
  first_name: string
  last_name: string
  date_of_birth: string
  nationality: string
  ownership_percentage: number  // 0-100
  email?: string
}

// ── Documentos ─────────────────────────────────────

export type DocumentType = 
  | 'government_id'
  | 'passport'
  | 'proof_of_address'
  | 'articles_of_incorporation'
  | 'certificate_of_good_standing'
  | 'bank_statement'
  | 'other'

export type DocumentStatus = 'pending' | 'approved' | 'rejected'

export interface OnboardingDocument {
  id: string
  user_id: string
  document_type: DocumentType
  file_name: string
  file_size: number
  mime_type: string
  status: DocumentStatus
  rejection_reason?: string
  created_at: string
}

// ── ToS ────────────────────────────────────────────

export interface TosLinkResponse {
  tos_link: string
  expires_at: string
}

export interface TosAcceptInput {
  tos_link: string
  accepted_at: string  // ISO timestamp
}
```

---

### 3.A.3 `suppliers.service.ts` — Extraer a Servicio Dedicado

Actualmente los proveedores se gestionan inline en `payments.service.ts`. El backend tiene un módulo dedicado.

```typescript
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api'
import type { Supplier, CreateSupplierInput, UpdateSupplierInput } from '@/types/supplier'

export const SuppliersService = {
  async getAll(): Promise<Supplier[]> {
    return apiGet<Supplier[]>('/suppliers')
  },

  async getById(supplierId: string): Promise<Supplier> {
    return apiGet<Supplier>(`/suppliers/${supplierId}`)
  },

  async create(input: CreateSupplierInput): Promise<Supplier> {
    return apiPost<Supplier>('/suppliers', input)
  },

  async update(supplierId: string, input: UpdateSupplierInput): Promise<Supplier> {
    return apiPatch<Supplier>(`/suppliers/${supplierId}`, input)
  },

  /**
   * Soft delete — desactiva el proveedor.
   */
  async remove(supplierId: string): Promise<void> {
    await apiDelete(`/suppliers/${supplierId}`)
  },
}
```

**Tipo `Supplier` actualizado (`types/supplier.ts`):**

```typescript
export interface Supplier {
  id: string
  user_id: string
  name: string
  country: string
  currency: string
  payment_rail: string       // 'ach' | 'wire' | 'sepa' | 'spei' | 'pix'
  bank_details: Record<string, unknown>
  contact_email?: string
  notes?: string
  is_active: boolean
  is_verified: boolean
  created_at: string
  updated_at: string
}

export interface CreateSupplierInput {
  name: string
  country: string
  currency: string
  payment_rail: string
  bank_details: Record<string, unknown>
  contact_email?: string
  notes?: string
}

export type UpdateSupplierInput = Partial<CreateSupplierInput>
```

---

## TRACK 3.B — Nuevos Servicios y Módulos

### 3.B.1 `bridge.service.ts` — NUEVO (Gap Total → Completo)

**Módulo backend:** `BridgeModule` (977 líneas)  
**Este servicio es completamente nuevo — no existe precedente en el frontend.**

```typescript
import { apiGet, apiPost, apiDelete } from '@/lib/api'
import type {
  BridgeVirtualAccount,
  BridgeExternalAccount,
  CreateExternalAccountInput,
  BridgePayout,
  CreatePayoutInput,
  BridgeTransfer,
  LiquidationAddress,
  CreateLiquidationAddressInput,
} from '@/types/bridge'

export const BridgeService = {
  // ── Virtual Accounts (Cuentas de Depósito) ────────

  /**
   * Crear una Virtual Account para recibir depósitos.
   * El backend crea la VA en Bridge API y la registra localmente.
   */
  async createVirtualAccount(currency: string): Promise<BridgeVirtualAccount> {
    return apiPost<BridgeVirtualAccount>('/bridge/virtual-accounts', { currency })
  },

  /**
   * Listar Virtual Accounts del usuario.
   */
  async getVirtualAccounts(): Promise<BridgeVirtualAccount[]> {
    return apiGet<BridgeVirtualAccount[]>('/bridge/virtual-accounts')
  },

  // ── External Accounts (Destinos de Payout) ────────

  /**
   * Registrar una cuenta externa para retiros.
   * Soporta: ACH, Wire, SEPA, SPEI, PIX, BRE_B
   * 
   * El formulario frontend debe ser dinámico según payment_rail:
   * - ACH: routing_number, account_number
   * - Wire: routing_number, account_number, bank_name, swift_code
   * - SEPA: iban, bic
   * - SPEI: clabe
   * - PIX: tax_id, pix_key
   * - BRE_B: tax_id, bank_code, branch_code, account_number
   */
  async createExternalAccount(input: CreateExternalAccountInput): Promise<BridgeExternalAccount> {
    return apiPost<BridgeExternalAccount>('/bridge/external-accounts', input)
  },

  /**
   * Listar cuentas externas del usuario.
   */
  async getExternalAccounts(): Promise<BridgeExternalAccount[]> {
    return apiGet<BridgeExternalAccount[]>('/bridge/external-accounts')
  },

  /**
   * Eliminar una cuenta externa.
   */
  async deleteExternalAccount(accountId: string): Promise<void> {
    await apiDelete(`/bridge/external-accounts/${accountId}`)
  },

  // ── Payouts (Retiros) ─────────────────────────────

  /**
   * Crear un payout (retiro a cuenta externa).
   * 
   * Backend valida:
   * - Balance disponible suficiente
   * - Límite por transacción (single_txn_limit)
   * - Threshold de review (PAYOUT_REVIEW_THRESHOLD)
   * - Fee calculation automática
   */
  async createPayout(input: CreatePayoutInput): Promise<BridgePayout> {
    return apiPost<BridgePayout>('/bridge/payouts', input)
  },

  /**
   * Listar payouts del usuario.
   */
  async getPayouts(): Promise<BridgePayout[]> {
    return apiGet<BridgePayout[]>('/bridge/payouts')
  },

  // ── Transfers ─────────────────────────────────────

  /**
   * Listar transferencias Bridge del usuario.
   */
  async getTransfers(): Promise<BridgeTransfer[]> {
    return apiGet<BridgeTransfer[]>('/bridge/transfers')
  },

  // ── Liquidation Addresses (Crypto On-Ramp) ────────

  /**
   * Crear una dirección de liquidación para recibir crypto.
   */
  async createLiquidationAddress(input: CreateLiquidationAddressInput): Promise<LiquidationAddress> {
    return apiPost<LiquidationAddress>('/bridge/liquidation-addresses', input)
  },

  /**
   * Listar direcciones de liquidación del usuario.
   */
  async getLiquidationAddresses(): Promise<LiquidationAddress[]> {
    return apiGet<LiquidationAddress[]>('/bridge/liquidation-addresses')
  },
}
```

**Tipos (`types/bridge.ts` — NUEVO):**

```typescript
// ── Virtual Accounts ────────────────────────────────

export interface BridgeVirtualAccount {
  id: string
  user_id: string
  bridge_va_id: string
  currency: string
  status: 'active' | 'inactive'
  deposit_instructions: {
    bank_name: string
    account_number: string
    routing_number?: string
    swift_code?: string
    iban?: string
    reference?: string
    bank_address?: string
  }
  created_at: string
}

// ── External Accounts ───────────────────────────────

export type PaymentRail = 'ach' | 'wire' | 'sepa' | 'spei' | 'pix' | 'bre_b'

export interface BridgeExternalAccount {
  id: string
  user_id: string
  bridge_external_account_id: string
  payment_rail: PaymentRail
  currency: string
  bank_name?: string
  last_4?: string
  label?: string
  is_active: boolean
  created_at: string
}

export interface CreateExternalAccountInput {
  payment_rail: PaymentRail
  currency: string
  
  // Campos dinámicos según payment_rail
  // ACH / Wire
  routing_number?: string
  account_number?: string
  account_type?: 'checking' | 'savings'
  bank_name?: string
  
  // Wire adicional
  swift_code?: string
  
  // SEPA
  iban?: string
  bic?: string
  
  // SPEI
  clabe?: string
  
  // PIX / BRE_B
  tax_id?: string
  pix_key?: string
  bank_code?: string
  branch_code?: string
  
  // Dirección del titular
  first_name: string
  last_name: string
  address?: {
    street: string
    city: string
    state?: string
    postal_code: string
    country: string
  }
}

// ── Payouts ─────────────────────────────────────────

export type PayoutStatus = 
  | 'pending'
  | 'pending_review'
  | 'in_review'
  | 'payment_submitted'
  | 'payment_processed'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface BridgePayout {
  id: string
  user_id: string
  bridge_payout_id?: string
  external_account_id: string
  amount: number
  currency: string
  fee: number
  status: PayoutStatus
  failure_reason?: string
  receipt_url?: string
  created_at: string
  updated_at: string
}

export interface CreatePayoutInput {
  external_account_id: string
  amount: number
  currency: string
}

// ── Transfers ───────────────────────────────────────

export type TransferStatus = 
  | 'pending'
  | 'in_review'
  | 'funds_received'
  | 'payment_submitted'
  | 'payment_processed'
  | 'completed'
  | 'failed'
  | 'refunded'

export interface BridgeTransfer {
  id: string
  user_id: string
  bridge_transfer_id: string
  type: 'deposit' | 'withdrawal'
  amount: number
  currency: string
  source_currency?: string
  status: TransferStatus
  receipt?: {
    source: string
    destination: string
    amount: number
    fee: number
  }
  created_at: string
  updated_at: string
}

// ── Liquidation Addresses ───────────────────────────

export interface LiquidationAddress {
  id: string
  user_id: string
  bridge_address_id: string
  chain: string         // 'ethereum' | 'polygon' | 'solana' | etc
  address: string       // Dirección crypto
  currency: string      // 'usdc' | 'usdt'
  is_active: boolean
  created_at: string
}

export interface CreateLiquidationAddressInput {
  chain: string
  currency: string
}
```

---

### 3.B.2 `compliance.service.ts` — NUEVO (User-Facing)

```typescript
import { apiGet } from '@/lib/api'
import type { ComplianceStatus, ComplianceDocument } from '@/types/compliance'

export const ComplianceService = {
  /**
   * Obtener estado de KYC del usuario.
   * ⚠️ Path correcto: /compliance/kyc (NO /compliance/status)
   * No existe un endpoint /compliance/status agregado.
   */
  async getKycStatus(): Promise<any> {
    return apiGet('/compliance/kyc')
  },

  /**
   * 🆕 Obtener estado de KYB del usuario.
   */
  async getKybStatus(): Promise<any> {
    return apiGet('/compliance/kyb')
  },

  /**
   * 🆕 Obtener historial de revisiones del usuario.
   */
  async getReviews(): Promise<any[]> {
    return apiGet('/compliance/reviews')
  },

  /**
   * 🆕 Obtener URL firmada para subir documento de compliance.
   */
  async getDocumentUploadUrl(dto: { file_name: string; document_type: string }): Promise<{ signed_url: string; path: string }> {
    return apiPost('/compliance/documents/upload-url', dto)
  },

  /**
   * 🆕 Registrar documento tras subirlo a Storage.
   */
  async registerDocument(dto: { document_type: string; file_path: string; subject_type?: string }): Promise<ComplianceDocument> {
    return apiPost('/compliance/documents', dto)
  },

  /**
   * Listar documentos de compliance del usuario.
   */
  async getDocuments(subjectType?: string): Promise<ComplianceDocument[]> {
    const param = subjectType ? `?subject_type=${subjectType}` : ''
    return apiGet<ComplianceDocument[]>(`/compliance/documents${param}`)
  },
}
```

**Tipos (`types/compliance.ts` — NUEVO):**

```typescript
export type ReviewStatus = 
  | 'pending_review'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'escalated'
  | 'changes_requested'

export type ReviewPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface ComplianceStatus {
  overall_status: ReviewStatus
  kyc_status: ReviewStatus | null
  kyb_status: ReviewStatus | null
  pending_documents: number
  last_review_at?: string
  reviewer_comments?: string
}

export interface ComplianceReview {
  id: string
  user_id: string
  type: 'kyc' | 'kyb'
  status: ReviewStatus
  priority: ReviewPriority
  assigned_to?: string
  reviewer_notes?: string
  comments: ComplianceComment[]
  created_at: string
  updated_at: string
  // JOIN data (admin context)
  profiles?: {
    email: string
    full_name: string
    business_name?: string
  }
}

export interface ComplianceComment {
  id: string
  review_id: string
  author_id: string
  content: string
  is_internal: boolean  // Solo visibles para staff
  created_at: string
}

export interface ComplianceDocument {
  id: string
  user_id: string
  document_type: string
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason?: string
  file_name: string
  created_at: string
}
```

---

### 3.B.3 `exchange-rates.service.ts` — NUEVO

```typescript
import { apiGet } from '@/lib/api'
import type { ExchangeRate } from '@/types/exchange-rate'

export const ExchangeRatesService = {
  /**
   * Obtener tasa de cambio para un par específico.
   * Pares soportados: USD_BOB, BOB_USD, USD_USDC, USDC_USD, BOB_USDC, USDC_BOB
   */
  async getRate(pair: string): Promise<ExchangeRate> {
    return apiGet<ExchangeRate>(`/exchange-rates/${pair}`)
  },

  /**
   * Obtener todas las tasas de cambio vigentes.
   */
  async getAllRates(): Promise<ExchangeRate[]> {
    return apiGet<ExchangeRate[]>('/exchange-rates')
  },
}
```

**Tipos (`types/exchange-rate.ts` — NUEVO):**

```typescript
export interface ExchangeRate {
  id: string
  pair: string               // 'USD_BOB', 'BOB_USD', etc
  base_currency: string      // 'USD'
  quote_currency: string     // 'BOB'
  base_rate: number          // Tasa base sin spread
  spread: number             // Spread aplicado (porcentaje)
  effective_rate: number     // Tasa final: base_rate * (1 + spread)
  source: string             // 'bcb' | 'binance' | 'manual'
  last_synced_at: string
  updated_at: string
}
```

---

### 3.B.4 `fees.service.ts` — NUEVO

```typescript
import { apiGet } from '@/lib/api'
import type { FeeConfig } from '@/types/fees'

export const FeesService = {
  /**
   * Obtener tarifas públicas vigentes.
   * ⚠️ Path correcto: /fees (NO /fees/public). Requiere auth.
   */
  async getPublicFees(): Promise<FeeConfig[]> {
    return apiGet<FeeConfig[]>('/fees')
  },
}
```

**Tipos (`types/fees.ts` — NUEVO):**

```typescript
export type FeeType = 'percent' | 'fixed' | 'mixed'

export interface FeeConfig {
  id: string
  flow_type: string
  fee_type: FeeType
  percent_value?: number    // Para percent/mixed
  fixed_value?: number      // Para fixed/mixed
  min_fee?: number
  max_fee?: number
  currency: string
  is_active: boolean
}

export interface CustomerFeeOverride {
  id: string
  user_id: string
  flow_type: string
  fee_type: FeeType
  percent_value?: number
  fixed_value?: number
  min_fee?: number
  max_fee?: number
  reason: string
  created_by: string
  created_at: string
}
```

---

### 3.B.5 `psav.service.ts` — NUEVO

```typescript
import { apiGet } from '@/lib/api'
import type { PsavDepositInstructions } from '@/types/psav'

export const PsavService = {
  /**
   * Obtener instrucciones de depósito PSAV.
   * Se usa en flujos de on-ramp bolivianos.
   * 
   * @param type - 'bank_transfer' | 'qr'
   * @param currency - 'bob'
   */
  async getDepositInstructions(type: string, currency: string): Promise<PsavDepositInstructions> {
    return apiGet<PsavDepositInstructions>(`/psav/deposit-instructions/${type}/${currency}`)
  },
}
```

**Tipos (`types/psav.ts` — NUEVO):**

```typescript
export interface PsavAccount {
  id: string
  name: string
  bank_name: string
  account_number: string
  account_type: 'savings' | 'checking'
  currency: string
  is_active: boolean
  qr_url?: string
  metadata?: Record<string, unknown>
  created_at: string
}

export interface PsavDepositInstructions {
  account: PsavAccount
  instructions: string
  reference: string
  amount_format: string
  warning?: string
}
```

---

## 3. Checklist de Validación — Fase 3

| # | Servicio | Test | Criterio |
|---|---|---|---|
| 1 | PaymentsService | Crear orden interbank `bolivia_to_world` | Orden creada con fee calculado, PSAV instructions |
| 2 | PaymentsService | Crear orden wallet_ramp `bridge_wallet_to_fiat_us` | Balance reservado, payout Bridge creado |
| 3 | PaymentsService | Confirmar depósito con comprobante | Status → `deposit_received`, archivo subido |
| 4 | PaymentsService | Cancelar orden en `waiting_deposit` | Status → `cancelled`, balance liberado |
| 5 | PaymentsService | Intentar crear sin balance suficiente | Error 400 con mensaje claro |
| 6 | PaymentsService | Rate limit (>5 órdenes/hora) | Error 429 |
| 7 | OnboardingService | Submit KYC completo | Compliance review creada para staff |
| 8 | OnboardingService | Upload documento PDF de 5MB | Éxito |
| 9 | OnboardingService | Upload documento .exe | Error 422 (MIME inválido) |
| 10 | OnboardingService | Upload documento 15MB | Error 422 (tamaño excedido) |
| 11 | BridgeService | Crear Virtual Account | VA creada con instrucciones bancarias |
| 12 | BridgeService | Crear External Account ACH | Cuenta registrada en Bridge |
| 13 | BridgeService | Crear Payout | Fondos debitados, payout pendiente |
| 14 | BridgeService | Listar transfers | Historial con estados sincronizados |
| 15 | ExchangeRatesService | Obtener tasa USD_BOB | Tasa con spread aplicado |
| 16 | FeesService | Obtener tarifas públicas | Lista de fee configs |
| 17 | ComplianceService | Obtener status | Estado general con KYC/KYB detallado |
| 18 | SuppliersService | CRUD completo | Crear, listar, actualizar, soft delete |
