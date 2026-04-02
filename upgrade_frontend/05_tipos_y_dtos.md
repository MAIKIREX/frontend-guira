# Referencia: Tipos y DTOs Completos

> **Propósito:** Definiciones TypeScript completas para todos los tipos nuevos y actualizados que se necesitan a lo largo de las 4 fases.  
> **Uso:** Copiar las definiciones a los archivos correspondientes en `m-guira/types/` en la fase indicada.

---

## 1. Mapa de Archivos de Tipos

| Archivo | Estado | Fase | Contenido |
|---|---|---|---|
| `types/api.ts` | **NUEVO** | 1 | ApiError, PaginatedResponse, PaginationParams |
| `types/profile.ts` | ACTUALIZAR | 2 | Profile, OnboardingStatus (extendidos) |
| `types/wallet.ts` | ACTUALIZAR | 2 | Wallet, WalletBalance, PayinRoute |
| `types/ledger.ts` | **NUEVO** | 2 | LedgerEntry, LedgerFilter |
| `types/support.ts` | ACTUALIZAR | 2 | SupportTicket, CreateTicketInput |
| `types/notification.ts` | ACTUALIZAR | 2 | Notification (sin cambios significativos) |
| `types/payment-order.ts` | ACTUALIZAR | 3 | FlowType, FlowCategory, PaymentOrder (extendido) |
| `types/onboarding.ts` | ACTUALIZAR | 3 | KYC/KYB inputs, Documents, ToS |
| `types/supplier.ts` | ACTUALIZAR | 3 | Supplier (alineado con backend) |
| `types/bridge.ts` | **NUEVO** | 3 | VirtualAccount, ExternalAccount, Payout, Transfer, LiquidationAddress |
| `types/compliance.ts` | **NUEVO** | 3 | ComplianceReview, ComplianceComment, ComplianceStatus |
| `types/fees.ts` | **NUEVO** | 3 | FeeConfig, CustomerFeeOverride |
| `types/exchange-rate.ts` | **NUEVO** | 3 | ExchangeRate |
| `types/psav.ts` | **NUEVO** | 3 | PsavAccount, PsavDepositInstructions |
| `types/admin.ts` | **NUEVO** | 4 | AdminOrderStats, AuditLogEntry, ActivityLogEntry, AppSetting |

---

## 2. Tipos NUEVOS — Definiciones Completas

### 2.1 `types/api.ts` (Fase 1)

```typescript
/**
 * Error estandarizado producido por los interceptores de la capa API.
 */
export interface ApiError {
  status: number
  code: string
  message: string
  details?: Record<string, string[]>
  timestamp: string
}

/**
 * Respuesta paginada estándar del backend.
 */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface SuccessResponse {
  message: string
}

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    'code' in error &&
    'message' in error
  )
}
```

### 2.2 `types/ledger.ts` (Fase 2)

```typescript
export type LedgerEntryType =
  | 'deposit'
  | 'payout'
  | 'transfer_in'
  | 'transfer_out'
  | 'fee'
  | 'adjustment'
  | 'settlement'
  | 'reserve'
  | 'release'

export type LedgerEntryStatus =
  | 'pending'
  | 'confirmed'
  | 'settled'
  | 'reversed'
  | 'failed'

export interface LedgerEntry {
  id: string
  wallet_id: string
  type: LedgerEntryType
  status: LedgerEntryStatus
  amount: number
  currency: string
  description?: string
  reference_type?: string
  reference_id?: string
  bridge_transfer_id?: string | null
  metadata?: Record<string, unknown>
  created_at: string
  updated_at?: string
}

export interface LedgerFilter {
  page?: number
  limit?: number
  /**
   * ⚠️ Backend acepta 'credit' | 'debit' (no los valores granulares de LedgerEntryType)
   */
  type?: 'credit' | 'debit'
  status?: LedgerEntryStatus
  currency?: string
  from?: string
  to?: string
}
```

### 2.3 `types/bridge.ts` (Fase 3)

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
  first_name: string
  last_name: string
  // Dinámicos según payment_rail
  routing_number?: string
  account_number?: string
  account_type?: 'checking' | 'savings'
  bank_name?: string
  swift_code?: string
  iban?: string
  bic?: string
  clabe?: string
  tax_id?: string
  pix_key?: string
  bank_code?: string
  branch_code?: string
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
  chain: string
  address: string
  currency: string
  is_active: boolean
  created_at: string
}

export interface CreateLiquidationAddressInput {
  chain: string
  currency: string
}
```

### 2.4 `types/compliance.ts` (Fase 3)

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
  is_internal: boolean
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

### 2.5 `types/fees.ts` (Fase 3)

```typescript
export type FeeType = 'percent' | 'fixed' | 'mixed'

export interface FeeConfig {
  id: string
  flow_type: string
  fee_type: FeeType
  percent_value?: number
  fixed_value?: number
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

### 2.6 `types/exchange-rate.ts` (Fase 3)

```typescript
export interface ExchangeRate {
  id: string
  pair: string
  base_currency: string
  quote_currency: string
  base_rate: number
  spread: number
  effective_rate: number
  source: string
  last_synced_at: string
  updated_at: string
}
```

### 2.7 `types/psav.ts` (Fase 3)

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

### 2.8 `types/admin.ts` (Fase 4)

```typescript
export interface AdminOrderStats {
  total_orders: number
  orders_by_status: Record<string, number>
  orders_by_flow_type: Record<string, number>
  total_volume_usd: number
  total_fees_collected: number
  recent_orders: import('@/types/payment-order').PaymentOrder[]
  pending_approval_count: number
}

export interface AdminOrderFilter {
  page?: number
  limit?: number
  status?: string
  flow_type?: string
  flow_category?: string
  user_id?: string
  from?: string
  to?: string
}

export interface ApproveOrderInput {
  notes?: string
}

export interface MarkSentInput {
  receipt?: File
  reference_number?: string
}

export interface FailOrderInput {
  failure_reason: string
}

export interface AppSetting {
  id: string
  key: string
  value: unknown
  description?: string
  category?: string
  updated_at: string
  updated_by?: string
}

export interface AuditLogEntry {
  id: string
  performed_by: string
  role: string
  action: string
  table_name: string
  record_id: string
  old_values?: Record<string, unknown>
  new_values?: Record<string, unknown>
  source: string
  ip_address?: string
  created_at: string
  profiles?: {
    email: string
    full_name: string
  }
}

export interface ActivityLogEntry {
  id: string
  user_id: string
  action: string
  metadata?: Record<string, unknown>
  created_at: string
  profiles?: {
    email: string
    full_name: string
  }
}

// ── Transaction Limits 🆕 ───────────────────────────

export interface TransactionLimits {
  id: string
  user_id: string
  daily_limit: number
  monthly_limit: number
  per_transaction_limit: number
  currency: string
  updated_at: string
}

// ── Reconciliation 🆕 ──────────────────────────────

export interface ReconciliationReport {
  id: string
  status: 'completed' | 'running' | 'failed'
  started_at: string
  completed_at?: string
  total_checked: number
  discrepancies_found: number
  details?: Record<string, unknown>
}

// ── Bridge Admin 🆕 ────────────────────────────────

export interface BridgePayoutForReview {
  id: string
  user_id: string
  amount: number
  currency: string
  external_account_id: string
  status: 'pending_review' | 'approved' | 'rejected'
  created_at: string
}
```

---

## 3. Tipos ACTUALIZADOS — Diff de Cambios

### 3.1 `types/profile.ts` (Fase 2)

```diff
- export type Role = 'client' | 'staff' | 'admin'
+ export type Role = 'client' | 'staff' | 'admin' | 'super_admin'
+
+ export type OnboardingStatusValue =
+   | 'pending'
+   | 'in_review'
+   | 'approved'
+   | 'rejected'

  export interface Profile {
    id: string
    email: string
    role: Role
    full_name: string
-   onboarding_status: string
+   first_name?: string
+   last_name?: string
+   phone?: string
+   avatar_url?: string
+   business_name?: string
+   business_type?: string
+   country?: string
+   onboarding_status: OnboardingStatusValue
    bridge_customer_id?: string
+   is_active: boolean
+   is_frozen: boolean
+   freeze_reason?: string | null
+   frozen_at?: string | null
    created_at: string
-   is_archived: boolean
+   updated_at?: string
    metadata?: Record<string, unknown>
  }
+
+ export interface UpdateProfileInput {
+   full_name?: string
+   first_name?: string
+   last_name?: string
+   phone?: string
+   avatar_url?: string
+ }
+
+ export interface OnboardingStatus {
+   onboarding_status: OnboardingStatusValue
+   bridge_customer_id: string | null
+   has_kyc: boolean
+   has_kyb: boolean
+ }
+
+ export interface AvatarUploadUrl {
+   signed_url: string
+   path: string
+   expires_at: string
+ }
```

### 3.2 `types/wallet.ts` (Fase 2)

```diff
  export interface Wallet {
    id: string
    user_id: string
    currency: string
+   provider_key?: string
+   provider_wallet_id?: string
+   network?: string
+   label?: string
+   created_at: string
  }

- export interface LedgerEntry { ... }
- // MOVIDO a types/ledger.ts (nuevo archivo)

+ export interface WalletBalance {
+   currency: string
+   amount: number
+   available: number
+   pending: number
+   reserved: number
+ }
+
+ export interface PayinRoute {
+   id: string
+   wallet_id: string
+   currency: string
+   type: 'virtual_account' | 'liquidation_address' | 'psav'
+   details: Record<string, unknown>
+   is_active: boolean
+ }

- // ELIMINAR (ya no se calcula client-side):
- export interface WalletMovement { ... }
- export interface WalletDashboardSnapshot { ... }
```

### 3.3 `types/payment-order.ts` (Fase 3)

```diff
+ // ── NUEVOS Flow Types ────────────────────────────
+ export type FlowCategory = 'interbank' | 'wallet_ramp'
+ export type InterbankFlowType =
+   | 'bolivia_to_world'
+   | 'wallet_to_wallet'
+   | 'bolivia_to_wallet'
+   | 'world_to_bolivia'
+   | 'world_to_wallet'
+ export type WalletRampFlowType =
+   | 'fiat_bo_to_bridge_wallet'
+   | 'crypto_to_bridge_wallet'
+   | 'fiat_us_to_bridge_wallet'
+   | 'bridge_wallet_to_fiat_bo'
+   | 'bridge_wallet_to_crypto'
+   | 'bridge_wallet_to_fiat_us'
+ export type FlowType = InterbankFlowType | WalletRampFlowType

  export type OrderStatus =
    | 'created'
    | 'waiting_deposit'
    | 'deposit_received'
    | 'processing'
    | 'sent'
    | 'completed'
    | 'failed'
+   | 'cancelled'
+   | 'swept_external'

  export interface PaymentOrder {
    id: string
    user_id: string
+   flow_type: FlowType
+   flow_category: FlowCategory
-   order_type: OrderType
-   processing_rail: ProcessingRail
    amount_origin: number
    origin_currency: string
-   amount_converted: number
+   amount_destination?: number
    destination_currency: string
    exchange_rate_applied: number
    fee_total: number
    status: OrderStatus
+   requires_psav?: boolean
+   supplier_id?: string | null
+   destination_address?: string
+   destination_bank_details?: Record<string, unknown>
+   bridge_transfer_id?: string
+   psav_deposit_instructions?: Record<string, unknown>
+   deposit_proof_url?: string
+   receipt_url?: string
+   approved_by?: string
+   approved_at?: string
+   completed_at?: string
+   failure_reason?: string
    // ... existentes se mantienen
  }
```

### 3.4 `types/onboarding.ts` (Fase 3)

```diff
  // Mantener tipos existentes y agregar:

+ // ── KYC Inputs ────────────────────────────────────
+ export interface KycPersonInput {
+   first_name: string
+   last_name: string
+   date_of_birth: string
+   nationality: string
+   email: string
+   phone?: string
+   address?: {
+     street: string
+     city: string
+     state?: string
+     postal_code: string
+     country: string
+   }
+ }
+
+ // ── KYB Inputs (COMPLETAMENTE NUEVO) ──────────────
+ export interface KybBusinessInput { ... }
+ export interface KybDirectorInput { ... }
+ export interface KybUboInput { ... }
+
+ // ── Documentos ────────────────────────────────────
+ export type DocumentType = 'government_id' | 'passport' | 'proof_of_address' | ...
+ export interface OnboardingDocument { ... }
+
+ // ── ToS ────────────────────────────────────────────
+ export interface TosLinkResponse { ... }
+ export interface TosAcceptInput { ... }
```

---

## 4. Tipos a ELIMINAR

| Tipo | Archivo Actual | Razón |
|---|---|---|
| `WalletDashboardSnapshot` | `types/wallet.ts` | Cálculos client-side eliminados |
| `WalletMovement` | `types/wallet.ts` | Backend consolida movimientos |
| `OrderType` | `types/payment-order.ts` | Reemplazado por `FlowType` |
| `ProcessingRail` | `types/payment-order.ts` | Integrado en `FlowType` |
| `FeeConfigRow` | `types/payment-order.ts` | Reemplazado por `FeeConfig` en `types/fees.ts` |
| `AppSettingRow` | `types/payment-order.ts` | Reemplazado por `AppSetting` en `types/admin.ts` |
| `PsavConfigRow` | `types/payment-order.ts` | Reemplazado por `PsavAccount` en `types/psav.ts` |
| `PaymentSnapshot` | `types/payment-order.ts` | Reemplazado por endpoints individuales |
| `SupplierUpsertInput` | `types/payment-order.ts` | Movido a `types/supplier.ts` como `CreateSupplierInput` |
