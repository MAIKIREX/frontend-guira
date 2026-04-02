# Fase 4 — Panel Admin Evolucionado

> **Duración estimada:** 2 semanas  
> **Riesgo:** Medio  
> **Prerrequisito:** Fases 1, 2 y 3 completadas  
> **Objetivo:** Descomponer `staff.service.ts` (542 líneas), eliminar `admin.service.ts` (388 líneas), y crear servicios admin especializados que consuman los endpoints del backend

---

## 1. Problema Actual

El frontend tiene dos servicios admin monolíticos:

| Servicio | Líneas | Problema |
|---|---|---|
| `staff.service.ts` | 542 | Consulta 8+ tablas Supabase directamente, implementa transiciones de estado de órdenes en el cliente, gestiona onboarding + pagos + soporte desde un único archivo |
| `admin.service.ts` | 388 | Usa `supabase.functions.invoke()` para llamar Edge Functions, accede a tablas admin directamente |

**Ambos serán eliminados** y reemplazados por **7 servicios admin** especializados que consumen endpoints REST del backend.

---

## 2. Descomposición de `staff.service.ts`

### Mapeo de Funciones Existentes → Nuevos Servicios

| Función en staff.service.ts | Servicio Nuevo | Endpoint Backend |
|---|---|---|
| `getStaffDashboard()` | `admin/orders.admin.service.ts` | `GET /admin/payment-orders/stats` |
| `getStaffOrders(filters)` | `admin/orders.admin.service.ts` | `GET /admin/payment-orders` |
| `getOrderDetail(id)` | `admin/orders.admin.service.ts` | `GET /admin/payment-orders/:id` |
| `approveOrder(id)` | `admin/orders.admin.service.ts` | `POST /admin/payment-orders/:id/approve` |
| `markSent(id, data)` | `admin/orders.admin.service.ts` | `POST /admin/payment-orders/:id/mark-sent` |
| `completeOrder(id)` | `admin/orders.admin.service.ts` | `POST /admin/payment-orders/:id/complete` |
| `failOrder(id, reason)` | `admin/orders.admin.service.ts` | `POST /admin/payment-orders/:id/fail` |
| `cancelOrder(id, reason)` | `admin/orders.admin.service.ts` | `POST /admin/payment-orders/:id/cancel` |
| `getAllUsers(filters)` | `admin/users.admin.service.ts` | `GET /admin/profiles` |
| `getUserDetail(id)` | `admin/users.admin.service.ts` | `GET /admin/profiles/:id` |
| `freezeUser(id, reason)` | `admin/users.admin.service.ts` | `PATCH /admin/profiles/:id/freeze` |
| `unfreezeUser(id)` | `admin/users.admin.service.ts` | `PATCH /admin/profiles/:id/freeze` (freeze=false) |
| `activateUser(id)` | `admin/users.admin.service.ts` | `PATCH /admin/profiles/:id/activate` |
| `deactivateUser(id)` | `admin/users.admin.service.ts` | `PATCH /admin/profiles/:id/activate` (is_active=false) |
| `getOnboardingReviews()` | `admin/compliance.admin.service.ts` | `GET /admin/compliance/reviews` |
| `approveKyc(id)` | `admin/compliance.admin.service.ts` | `POST /admin/compliance/:id/approve` |
| `rejectKyc(id, reason)` | `admin/compliance.admin.service.ts` | `POST /admin/compliance/:id/reject` |
| `getAllTickets()` | `admin/support.admin.service.ts` | `GET /admin/support/tickets` |
| `assignTicket(id, staffId)` | `admin/support.admin.service.ts` | `POST /admin/support/tickets/:id/assign` |
| `resolveTicket(id, notes)` | `admin/support.admin.service.ts` | `POST /admin/support/tickets/:id/resolve` |

### Mapeo de Funciones de admin.service.ts → Nuevos Servicios

| Función en admin.service.ts | Servicio Nuevo | Endpoint Backend |
|---|---|---|
| `getAppSettings()` | `admin/config.admin.service.ts` | `GET /admin/settings` |
| `updateAppSetting(key, value)` | `admin/config.admin.service.ts` | `PATCH /admin/settings/:key` |
| `getFeesConfig()` | `admin/config.admin.service.ts` | `GET /admin/fees` |
| `updateFeeConfig(id, data)` | `admin/config.admin.service.ts` | `PATCH /admin/fees/:id` |
| `createFeeConfig(data)` | `admin/config.admin.service.ts` | `POST /admin/fees` |
| `getPsavAccounts()` | `admin/config.admin.service.ts` | `GET /admin/payment-orders/psav-accounts` |
| `getAuditLogs(filters)` | `admin/config.admin.service.ts` | `GET /admin/audit-logs` |
| `getActivityLogs(userId)` | `admin/config.admin.service.ts` | `GET /admin/activity/:userId` |
| *(nuevo)* — Bridge admin | `admin/bridge.admin.service.ts` | `POST /admin/bridge/payouts/:id/approve│reject` |
| *(nuevo)* — Reconciliación | `admin/reconciliation.admin.service.ts` | `GET/POST /admin/reconciliation/*` |
| *(nuevo)* — Transaction Limits | `admin/users.admin.service.ts` | `POST /admin/users/:id/limits` |

---

## 3. Nuevos Servicios Admin

### 3.1 `services/admin/orders.admin.service.ts`

```typescript
import { apiGet, apiPost, apiUpload } from '@/lib/api'
import type { PaginatedResponse } from '@/lib/api'
import type { PaymentOrder } from '@/types/payment-order'
import type { 
  AdminOrderStats,
  AdminOrderFilter,
  ApproveOrderInput,
  MarkSentInput,
  FailOrderInput,
} from '@/types/admin'

export const OrdersAdminService = {
  // ── Dashboard ─────────────────────────────────────

  /**
   * Estadísticas del dashboard de órdenes.
   * Retorna: totales por status, montos agregados, órdenes recientes.
   */
  async getStats(): Promise<AdminOrderStats> {
    return apiGet<AdminOrderStats>('/admin/payment-orders/stats')
  },

  // ── Listado ───────────────────────────────────────

  /**
   * Listar todas las órdenes (todos los usuarios) con filtros y paginación.
   * Incluye datos del perfil del usuario (email, nombre).
   */
  async getOrders(filters?: AdminOrderFilter): Promise<PaginatedResponse<PaymentOrder>> {
    const params = new URLSearchParams()
    if (filters?.page) params.set('page', String(filters.page))
    if (filters?.limit) params.set('limit', String(filters.limit))
    if (filters?.status) params.set('status', filters.status)
    if (filters?.flow_type) params.set('flow_type', filters.flow_type)
    if (filters?.flow_category) params.set('flow_category', filters.flow_category)
    if (filters?.user_id) params.set('user_id', filters.user_id)
    if (filters?.from) params.set('from', filters.from)
    if (filters?.to) params.set('to', filters.to)

    return apiGet<PaginatedResponse<PaymentOrder>>(`/admin/payment-orders?${params.toString()}`)
  },

  /**
   * Detalle completo de una orden (incluye datos de usuario, supplier, bridge).
   */
  async getOrderDetail(orderId: string): Promise<PaymentOrder> {
    return apiGet<PaymentOrder>(`/admin/payment-orders/${orderId}`)
  },

  // ── Acciones de Estado ─────────────────────────────

  /**
   * Aprobar una orden.
   * Transición: deposit_received → processing
   * Backend registra: approved_by, approved_at, audit_log
   */
  async approveOrder(orderId: string, input?: ApproveOrderInput): Promise<PaymentOrder> {
    return apiPost<PaymentOrder>(`/admin/payment-orders/${orderId}/approve`, input)
  },

  /**
   * Marcar orden como enviada (fondos transferidos al destino).
   * Transición: processing → sent
   * Opcionalmente adjuntar comprobante de envío.
   */
  async markSent(orderId: string, input?: MarkSentInput): Promise<PaymentOrder> {
    if (input?.receipt) {
      const formData = new FormData()
      formData.append('receipt', input.receipt)
      if (input.reference_number) formData.append('reference_number', input.reference_number)
      return apiUpload<PaymentOrder>(`/admin/payment-orders/${orderId}/mark-sent`, formData)
    }
    return apiPost<PaymentOrder>(`/admin/payment-orders/${orderId}/mark-sent`, {
      reference_number: input?.reference_number,
    })
  },

  /**
   * Completar una orden.
   * Transición: sent → completed
   * Backend registra: completed_at, settle_ledger_entry, audit_log
   */
  async completeOrder(orderId: string): Promise<PaymentOrder> {
    return apiPost<PaymentOrder>(`/admin/payment-orders/${orderId}/complete`)
  },

  /**
   * Marcar orden como fallida.
   * Transición: * → failed
   * Backend libera balance reservado, registra failure_reason.
   */
  async failOrder(orderId: string, input: FailOrderInput): Promise<PaymentOrder> {
    return apiPost<PaymentOrder>(`/admin/payment-orders/${orderId}/fail`, input)
  },

  /**
   * Cancelar orden (admin override).
   * Backend libera balance reservado.
   */
  async cancelOrder(orderId: string, reason: string): Promise<PaymentOrder> {
    return apiPost<PaymentOrder>(`/admin/payment-orders/${orderId}/cancel`, { reason })
  },
}
```

---

### 3.2 `services/admin/compliance.admin.service.ts`

```typescript
import { apiGet, apiPost } from '@/lib/api'
import type { PaginatedResponse } from '@/lib/api'
import type { 
  ComplianceReview, 
  ComplianceComment,
  ReviewStatus,
} from '@/types/compliance'

export const ComplianceAdminService = {
  // ── Listado de Reviews ────────────────────────────

  /**
   * Listar compliance reviews con filtros.
   */
  async getReviews(filters?: {
    page?: number
    limit?: number
    status?: ReviewStatus
    priority?: string
    assigned_to?: string
    type?: 'kyc' | 'kyb'
  }): Promise<PaginatedResponse<ComplianceReview>> {
    const params = new URLSearchParams()
    if (filters?.page) params.set('page', String(filters.page))
    if (filters?.limit) params.set('limit', String(filters.limit))
    if (filters?.status) params.set('status', filters.status)
    if (filters?.priority) params.set('priority', filters.priority)
    if (filters?.assigned_to) params.set('assigned_to', filters.assigned_to)
    if (filters?.type) params.set('type', filters.type)

    return apiGet<PaginatedResponse<ComplianceReview>>(`/admin/compliance/reviews?${params.toString()}`)
  },

  /**
   * Detalle de un compliance review.
   */
  async getReviewDetail(reviewId: string): Promise<ComplianceReview> {
    return apiGet<ComplianceReview>(`/admin/compliance/reviews/${reviewId}`)
  },

  // ── Acciones ──────────────────────────────────────

  /**
   * Aprobar un review de compliance.
   * Actualiza onboarding_status del perfil a 'approved'.
   * Si aplica, registra customer en Bridge automáticamente.
   * ⚠️ Path correcto: /admin/compliance/reviews/:id/approve (incluye /reviews/)
   */
  async approveReview(reviewId: string, notes?: string): Promise<ComplianceReview> {
    return apiPost<ComplianceReview>(`/admin/compliance/reviews/${reviewId}/approve`, { notes })
  },

  /**
   * Rechazar un review de compliance.
   * Actualiza onboarding_status del perfil a 'rejected'.
   * ⚠️ Path correcto: /admin/compliance/reviews/:id/reject
   */
  async rejectReview(reviewId: string, reason: string): Promise<ComplianceReview> {
    return apiPost<ComplianceReview>(`/admin/compliance/reviews/${reviewId}/reject`, { reason })
  },

  /**
   * Escalar un review a un nivel superior.
   * ⚠️ Verbo correcto: PATCH (no POST)
   * ⚠️ Path correcto: /admin/compliance/reviews/:id/escalate
   */
  async escalateReview(reviewId: string, reason: string): Promise<ComplianceReview> {
    return apiPatch<ComplianceReview>(`/admin/compliance/reviews/${reviewId}/escalate`, { reason })
  },

  /**
   * 🆕 Asignar review a un analista.
   * ⚠️ Verbo: PATCH. Path: /admin/compliance/reviews/:id/assign
   */
  async assignReview(reviewId: string, assignTo: string): Promise<ComplianceReview> {
    return apiPatch<ComplianceReview>(`/admin/compliance/reviews/${reviewId}/assign`, {
      assigned_to: assignTo,
    })
  },

  /**
   * Solicitar cambios al usuario.
   * ⚠️ Path correcto: /admin/compliance/reviews/:id/request-changes
   */
  async requestChanges(reviewId: string, reason: string, requiredActions?: string[]): Promise<ComplianceReview> {
    return apiPost<ComplianceReview>(`/admin/compliance/reviews/${reviewId}/request-changes`, {
      reason,
      required_actions: requiredActions,
    })
  },

  /**
   * Agregar comentario a un review (interno o público).
   * ⚠️ Path correcto: /admin/compliance/reviews/:id/comments (no /comment)
   */
  async addComment(reviewId: string, content: string, isInternal: boolean = true): Promise<ComplianceComment> {
    return apiPost<ComplianceComment>(`/admin/compliance/reviews/${reviewId}/comments`, {
      content,
      is_internal: isInternal,
    })
  },

  // ❌ ELIMINADO: sendToBridge() no existe como endpoint separado.
  // El envío a Bridge se ejecuta automáticamente dentro de approveReview()
  // cuando la aprobación es exitosa.
}
```

---

### 3.3 `services/admin/users.admin.service.ts`

```typescript
import { apiGet, apiPatch } from '@/lib/api'
import type { PaginatedResponse } from '@/lib/api'
import type { Profile } from '@/types/profile'
import type { CustomerFeeOverride } from '@/types/fees'

export const UsersAdminService = {
  /**
   * Listar perfiles con filtros y paginación.
   */
  async getProfiles(filters?: {
    page?: number
    limit?: number
    role?: string
    onboarding_status?: string
    is_frozen?: boolean
  }): Promise<PaginatedResponse<Profile>> {
    const params = new URLSearchParams()
    if (filters?.page) params.set('page', String(filters.page))
    if (filters?.limit) params.set('limit', String(filters.limit))
    if (filters?.role) params.set('role', filters.role)
    if (filters?.onboarding_status) params.set('onboarding_status', filters.onboarding_status)
    if (filters?.is_frozen !== undefined) params.set('is_frozen', String(filters.is_frozen))

    return apiGet<PaginatedResponse<Profile>>(`/admin/profiles?${params.toString()}`)
  },

  /**
   * Detalle de perfil completo.
   */
  async getProfileDetail(userId: string): Promise<Profile> {
    return apiGet<Profile>(`/admin/profiles/${userId}`)
  },

  /**
   * Congelar cuenta de usuario.
   * Impide que el usuario realice operaciones financieras.
   */
  async freezeAccount(userId: string, reason: string): Promise<Profile> {
    return apiPatch<Profile>(`/admin/profiles/${userId}/freeze`, {
      freeze: true,
      reason,
    })
  },

  /**
   * Descongelar cuenta de usuario.
   */
  async unfreezeAccount(userId: string): Promise<Profile> {
    return apiPatch<Profile>(`/admin/profiles/${userId}/freeze`, {
      freeze: false,
    })
  },

  /**
   * Activar cuenta de usuario.
   */
  async activateAccount(userId: string): Promise<Profile> {
    return apiPatch<Profile>(`/admin/profiles/${userId}/activate`, {
      is_active: true,
    })
  },

  /**
   * Desactivar cuenta de usuario.
   */
  async deactivateAccount(userId: string): Promise<Profile> {
    return apiPatch<Profile>(`/admin/profiles/${userId}/activate`, {
      is_active: false,
    })
  },

  /**
   * Obtener fee overrides de un usuario específico.
   */
  async getFeeOverrides(userId: string): Promise<CustomerFeeOverride[]> {
    return apiGet<CustomerFeeOverride[]>(`/admin/fees/overrides/${userId}`)
  },

  /**
   * Ajustar balance de wallet de un usuario.
   * ⚠️ Path correcto: /admin/wallets/balances/adjust (no /adjust-balance)
   * Requiere razón obligatoria.
   */
  async adjustBalance(userId: string, input: {
    currency: string
    amount: number
    reason: string
    type: 'credit' | 'debit'
  }): Promise<void> {
    const { apiPost } = await import('@/lib/api')
    await apiPost(`/admin/wallets/balances/adjust`, {
      user_id: userId,
      ...input,
    })
  },

  /**
   * 🆕 Establecer límites de transacción personalizados para un usuario.
   */
  async setTransactionLimits(userId: string, limits: {
    daily_limit?: number
    monthly_limit?: number
    per_transaction_limit?: number
    currency?: string
  }): Promise<void> {
    const { apiPost } = await import('@/lib/api')
    await apiPost(`/admin/users/${userId}/limits`, limits)
  },
}
```

---

### 3.4 `services/admin/config.admin.service.ts`

```typescript
import { apiGet, apiPost, apiPatch } from '@/lib/api'
import type { PaginatedResponse } from '@/lib/api'
import type { FeeConfig, CustomerFeeOverride } from '@/types/fees'
import type { ExchangeRate } from '@/types/exchange-rate'
import type { PsavAccount } from '@/types/psav'
import type { AppSetting, AuditLogEntry, ActivityLogEntry } from '@/types/admin'

export const ConfigAdminService = {
  // ── App Settings ──────────────────────────────────

  async getSettings(): Promise<AppSetting[]> {
    return apiGet<AppSetting[]>('/admin/settings')
  },

  async updateSetting(key: string, value: unknown): Promise<AppSetting> {
    return apiPatch<AppSetting>(`/admin/settings/${key}`, { value })
  },

  async createSetting(input: { key: string; value: unknown; description?: string }): Promise<AppSetting> {
    return apiPost<AppSetting>('/admin/settings', input)
  },

  // ── Fees ──────────────────────────────────────────

  async getFees(): Promise<FeeConfig[]> {
    return apiGet<FeeConfig[]>('/admin/fees')
  },

  async createFee(input: Omit<FeeConfig, 'id' | 'is_active'>): Promise<FeeConfig> {
    return apiPost<FeeConfig>('/admin/fees', input)
  },

  async updateFee(feeId: string, input: Partial<FeeConfig>): Promise<FeeConfig> {
    return apiPatch<FeeConfig>(`/admin/fees/${feeId}`, input)
  },

  async createFeeOverride(input: {
    user_id: string
    fee_config_id: string
    custom_value: number
    reason?: string
  }): Promise<CustomerFeeOverride> {
    return apiPost<CustomerFeeOverride>('/admin/fees/overrides', input)
  },

  // ── Exchange Rates ⚠️ Paths reales dentro de /admin/payment-orders/ ──────

  async getExchangeRates(): Promise<ExchangeRate[]> {
    return apiGet<ExchangeRate[]>('/admin/payment-orders/exchange-rates')
  },

  /**
   * ⚠️ Verbo: POST (no PATCH). Body: { rate, spread_percent? }
   */
  async updateRate(pair: string, rate: number, spreadPercent?: number): Promise<ExchangeRate> {
    return apiPost<ExchangeRate>(`/admin/payment-orders/exchange-rates/${pair}`, { rate, spread_percent: spreadPercent })
  },

  async syncExchangeRates(): Promise<{ synced: number }> {
    return apiPost<{ synced: number }>('/admin/payment-orders/exchange-rates/sync')
  },

  // ── PSAV Accounts ⚠️ Path: /admin/payment-orders/psav-accounts ──

  async getPsavAccounts(): Promise<PsavAccount[]> {
    return apiGet<PsavAccount[]>('/admin/payment-orders/psav-accounts')
  },

  async createPsavAccount(input: Omit<PsavAccount, 'id' | 'created_at'>): Promise<PsavAccount> {
    return apiPost<PsavAccount>('/admin/payment-orders/psav-accounts', input)
  },

  // ── Audit Logs ────────────────────────────────────

  async getAuditLogs(filters?: {
    page?: number
    limit?: number
    action?: string
    performed_by?: string
    table_name?: string
    from?: string
    to?: string
  }): Promise<PaginatedResponse<AuditLogEntry>> {
    const params = new URLSearchParams()
    if (filters?.page) params.set('page', String(filters.page))
    if (filters?.limit) params.set('limit', String(filters.limit))
    if (filters?.action) params.set('action', filters.action)
    if (filters?.performed_by) params.set('performed_by', filters.performed_by)
    if (filters?.table_name) params.set('table_name', filters.table_name)
    if (filters?.from) params.set('from', filters.from)
    if (filters?.to) params.set('to', filters.to)

    return apiGet<PaginatedResponse<AuditLogEntry>>(`/admin/audit-logs?${params.toString()}`)
  },

  // ── Activity ⚠️ Path: /admin/activity/:userId (no /admin/activity-logs) ──

  /**
   * Obtener actividad de un usuario específico.
   * ⚠️ userId como path param, no query param.
   */
  async getActivityForUser(userId: string): Promise<ActivityLogEntry[]> {
    return apiGet<ActivityLogEntry[]>(`/admin/activity/${userId}`)
  },

  // ── Ledger Adjustment ──────────────────────────────

  async createLedgerAdjustment(input: {
    wallet_id: string
    amount: number
    type: 'credit' | 'debit'
    reason: string
    description?: string
  }): Promise<void> {
    await apiPost('/admin/ledger/adjustment', input)
  },
}
```

---

### 3.5 `services/admin/support.admin.service.ts`

```typescript
import { apiGet, apiPatch } from '@/lib/api'
import type { PaginatedResponse } from '@/lib/api'
import type { SupportTicket } from '@/types/support'

export const SupportAdminService = {
  /**
   * Listar todos los tickets de soporte con filtros.
   */
  async getTickets(filters?: {
    page?: number
    status?: string
    assigned_to?: string
  }): Promise<PaginatedResponse<SupportTicket>> {
    const params = new URLSearchParams()
    if (filters?.page) params.set('page', String(filters.page))
    if (filters?.status) params.set('status', filters.status)
    if (filters?.assigned_to) params.set('assigned_to', filters.assigned_to)

    return apiGet<PaginatedResponse<SupportTicket>>(`/admin/support/tickets?${params.toString()}`)
  },

  /**
   * Asignar ticket a un miembro del staff.
   * ⚠️ Verbo correcto: PATCH (no POST)
   */
  async assignTicket(ticketId: string, staffUserId: string): Promise<SupportTicket> {
    return apiPatch<SupportTicket>(`/admin/support/tickets/${ticketId}/assign`, {
      staff_user_id: staffUserId,
    })
  },

  /**
   * Actualizar estado de ticket.
   * ⚠️ Verbo correcto: PATCH (no POST)
   */
  async updateTicketStatus(ticketId: string, status: string): Promise<SupportTicket> {
    return apiPatch<SupportTicket>(`/admin/support/tickets/${ticketId}/status`, { status })
  },

  /**
   * Resolver un ticket con notas de resolución.
   * ⚠️ Verbo correcto: PATCH (no POST)
   */
  async resolveTicket(ticketId: string, resolutionNotes: string): Promise<SupportTicket> {
    return apiPatch<SupportTicket>(`/admin/support/tickets/${ticketId}/resolve`, {
      resolution_notes: resolutionNotes,
    })
  },
}
```

---

## 4. Tipos Admin (`types/admin.ts` — NUEVO)

```typescript
// ── Dashboard Stats ─────────────────────────────────

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

// ── App Settings ────────────────────────────────────

export interface AppSetting {
  id: string
  key: string
  value: unknown
  description?: string
  category?: string
  updated_at: string
  updated_by?: string
}

// ── Audit Logs ──────────────────────────────────────

export interface AuditLogEntry {
  id: string
  performed_by: string
  role: string
  action: string
  table_name: string
  record_id: string
  old_values?: Record<string, unknown>
  new_values?: Record<string, unknown>
  source: string  // 'admin_panel' | 'api' | 'system'
  ip_address?: string
  created_at: string
  // JOIN data
  profiles?: {
    email: string
    full_name: string
  }
}

// ── Activity Logs ───────────────────────────────────

export interface ActivityLogEntry {
  id: string
  user_id: string
  action: string
  metadata?: Record<string, unknown>
  created_at: string
  // JOIN data
  profiles?: {
    email: string
    full_name: string
  }
}
```

---

## 5. Barrel Export para Admin Services

**Archivo:** `services/admin/index.ts`

```typescript
export { OrdersAdminService } from './orders.admin.service'
export { ComplianceAdminService } from './compliance.admin.service'
export { UsersAdminService } from './users.admin.service'
export { ConfigAdminService } from './config.admin.service'
export { SupportAdminService } from './support.admin.service'
export { BridgeAdminService } from './bridge.admin.service'
export { ReconciliationAdminService } from './reconciliation.admin.service'
```

---

### 3.6 `services/admin/bridge.admin.service.ts` 🆕

```typescript
import { apiPost } from '@/lib/api'

export const BridgeAdminService = {
  /**
   * Aprobar un payout pendiente de revisión.
   * Ejecuta el payout en Bridge API y actualiza el estado.
   */
  async approvePayout(payoutId: string): Promise<void> {
    await apiPost(`/admin/bridge/payouts/${payoutId}/approve`)
  },

  /**
   * Rechazar un payout pendiente.
   * Libera el saldo reservado y notifica al usuario.
   */
  async rejectPayout(payoutId: string, reason: string): Promise<void> {
    await apiPost(`/admin/bridge/payouts/${payoutId}/reject`, { reason })
  },
}
```

---

### 3.7 `services/admin/reconciliation.admin.service.ts` 🆕

```typescript
import { apiGet, apiPost } from '@/lib/api'
import type { PaginatedResponse } from '@/lib/api'

export interface ReconciliationReport {
  id: string
  status: 'completed' | 'running' | 'failed'
  started_at: string
  completed_at?: string
  total_checked: number
  discrepancies_found: number
  details?: Record<string, unknown>
}

export const ReconciliationAdminService = {
  /**
   * Ejecutar reconciliación financiera manual.
   * Compara balances internos vs Bridge API.
   */
  async runReconciliation(): Promise<ReconciliationReport> {
    return apiPost<ReconciliationReport>('/admin/reconciliation/run')
  },

  /**
   * Listar historial de reconciliaciones ejecutadas.
   */
  async getHistory(page: number = 1): Promise<PaginatedResponse<ReconciliationReport>> {
    return apiGet<PaginatedResponse<ReconciliationReport>>(`/admin/reconciliation?page=${page}`)
  },

  /**
   * Obtener detalle de una reconciliación con informe de discrepancias.
   */
  async getDetail(reconciliationId: string): Promise<ReconciliationReport> {
    return apiGet<ReconciliationReport>(`/admin/reconciliation/${reconciliationId}`)
  },
}
```

---

## 6. Archivos a Eliminar Post-Migración

| Archivo | Líneas | Razón |
|---|---|---|
| `services/staff.service.ts` | 542 | Reemplazado por 5 servicios admin especializados |
| `services/admin.service.ts` | 388 | Reemplazado por `config.admin.service.ts` + otros |

**Total eliminado:** 930 líneas de código legacy.

---

## 7. Guía de Actualización de Componentes Admin

### 7.1 Patrón de Migración en Componentes

```diff
- import { StaffService } from '@/services/staff.service'
+ import { OrdersAdminService } from '@/services/admin'

  // Dashboard de órdenes
- const orders = await StaffService.getStaffOrders({ status: 'deposit_received' })
+ const { data: orders } = await OrdersAdminService.getOrders({ status: 'deposit_received' })

  // Aprobar orden
- await StaffService.approveOrder(orderId)
+ await OrdersAdminService.approveOrder(orderId)

  // Completar orden
- await StaffService.completeOrder(orderId)
+ await OrdersAdminService.completeOrder(orderId)
```

### 7.2 Patrón para Compliance (Nuevo)

```typescript
import { ComplianceAdminService } from '@/services/admin'

// Listar reviews pendientes
const { data: reviews } = await ComplianceAdminService.getReviews({
  status: 'pending_review',
  page: 1,
  limit: 20,
})

// Aprobar y enviar a Bridge
// Aprobar — Bridge se envía automáticamente si corresponde
await ComplianceAdminService.approveReview(reviewId, 'Documentación completa')
// ❌ ANTES: await ComplianceAdminService.sendToBridge(reviewId)  ← NO EXISTE
// ✅ El envío a Bridge es automático dentro de approveReview()
```

---

## 8. Checklist de Validación — Fase 4

| # | Servicio | Test | Criterio |
|---|---|---|---|
| 1 | OrdersAdmin | Listar órdenes paginadas | Datos con perfil de usuario incluido |
| 2 | OrdersAdmin | Aprobar orden en `deposit_received` | Status → `processing`, audit_log creado |
| 3 | OrdersAdmin | Marcar como enviada con comprobante | Archivo subido, status → `sent` |
| 4 | OrdersAdmin | Completar orden | Status → `completed`, ledger settled |
| 5 | OrdersAdmin | Fallar orden | Status → `failed`, balance liberado |
| 6 | OrdersAdmin | Dashboard stats | Totales correctos por status y flujo |
| 7 | ComplianceAdmin | Listar reviews con filtros | Paginación funcional |
| 8 | ComplianceAdmin | Aprobar review | Status → `approved`, perfil actualizado |
| 9 | ComplianceAdmin | Rechazar review | Status → `rejected`, notificación enviada |
| 10 | ComplianceAdmin | Escalar review | Priority → `urgent`, notificación a admins |
| 11 | ComplianceAdmin | Enviar a Bridge | `bridge_customer_id` retornado |
| 12 | UsersAdmin | Listar usuarios | Paginación con filtros |
| 13 | UsersAdmin | Congelar cuenta | `is_frozen: true`, audit_log |
| 14 | UsersAdmin | Ajustar balance | Ledger entry creada, razón registrada |
| 15 | ConfigAdmin | CRUD app settings | Crear, leer, actualizar funcional |
| 16 | ConfigAdmin | CRUD fee configs | Crear, actualizar fee configs |
| 17 | ConfigAdmin | Sync exchange rates | Tasas actualizadas |
| 18 | ConfigAdmin | CRUD PSAV accounts | Crear, actualizar cuentas PSAV |
| 19 | ConfigAdmin | Audit logs viewer | Filtros por acción, actor, tabla |
| 20 | SupportAdmin | Asignar ticket | `assigned_to` actualizado |
| 21 | SupportAdmin | Resolver ticket | Status → `resolved`, notas guardadas |
| 22 | General | 0 imports de `staff.service.ts` | Archivo eliminado |
| 23 | General | 0 imports de `admin.service.ts` | Archivo eliminado |
| 24 | General | 0 queries Supabase en panel admin | Solo Auth/Realtime |
