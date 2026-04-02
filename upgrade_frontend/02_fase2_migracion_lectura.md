# Fase 2 — Migración de Servicios de Lectura

> **Duración estimada:** 2 semanas  
> **Riesgo:** Bajo  
> **Prerrequisito:** Fase 1 completada (cliente API, interceptores, tipos)  
> **Objetivo:** Reemplazar todas las queries Supabase de lectura (SELECT) por llamadas REST al backend

---

## 1. Principio de Migración

Cada servicio se migra siguiendo este patrón:

```diff
- import { createClient } from '@/lib/supabase/browser'
+ import { apiGet, apiPatch } from '@/lib/api'
+ import type { PaginatedResponse } from '@/lib/api'

  export const ServiceName = {
    async getData(userId: string) {
-     const supabase = createClient()
-     const { data, error } = await supabase
-       .from('table')
-       .select('*')
-       .eq('user_id', userId)
-     if (error) throw error
-     return data
+     return apiGet<DataType[]>('/endpoint')
+     // userId se extrae del JWT en el backend — no necesita enviarse
    }
  }
```

**Regla clave:** El backend identifica al usuario autenticado via el JWT. No es necesario pasar `userId` como parámetro para consultas del propio usuario.

---

## 2. Servicios a Migrar

### 2.1 `profile.service.ts` — Migración Completa

**Archivo actual:** `services/profile.service.ts` (41 líneas)  
**Estado actual:** Lee perfil directamente de `profiles` table con timeout client-side  
**Endpoints backend correspondientes:**

| Operación | Antes | Después |
|---|---|---|
| Obtener perfil propio | `supabase.from('profiles').select('*').eq('id', userId).maybeSingle()` | `GET /profiles/me` |
| Actualizar perfil | No existe | `PATCH /profiles/me` |
| Estado de onboarding | No existe | `GET /profiles/me/onboarding-status` |
| URL para avatar | No existe | `GET /profiles/me/avatar-upload-url?fileName=xxx` |

**Código migrado propuesto:**

```typescript
import { apiGet, apiPatch } from '@/lib/api'
import type { Profile, OnboardingStatus, AvatarUploadUrl } from '@/types/profile'

export const ProfileService = {
  /**
   * Obtener perfil del usuario autenticado.
   * El backend identifica al usuario por el JWT.
   */
  async getProfile(): Promise<Profile> {
    return apiGet<Profile>('/profiles/me')
  },

  /**
   * Actualizar perfil (nombre, teléfono, avatar_url).
   */
  async updateProfile(data: UpdateProfileInput): Promise<Profile> {
    return apiPatch<Profile>('/profiles/me', data)
  },

  /**
   * Obtener estado resumido de onboarding y Bridge.
   * Retorna: { onboarding_status, bridge_customer_id, has_kyc, has_kyb }
   */
  async getOnboardingStatus(): Promise<OnboardingStatus> {
    return apiGet<OnboardingStatus>('/profiles/me/onboarding-status')
  },

  /**
   * Obtener URL firmada para subir avatar.
   * El backend genera una signed URL en Supabase Storage.
   */
  async getAvatarUploadUrl(fileName: string): Promise<AvatarUploadUrl> {
    return apiGet<AvatarUploadUrl>(`/profiles/me/avatar-upload-url?fileName=${encodeURIComponent(fileName)}`)
  },
}
```

**Tipo `Profile` actualizado (`types/profile.ts`):**

```typescript
export type Role = 'client' | 'staff' | 'admin' | 'super_admin'

export type OnboardingStatusValue = 
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'rejected'

export interface Profile {
  id: string
  email: string
  role: Role
  full_name: string
  first_name?: string
  last_name?: string
  phone?: string
  avatar_url?: string
  business_name?: string
  business_type?: string
  country?: string
  onboarding_status: OnboardingStatusValue
  bridge_customer_id?: string | null
  is_active: boolean
  is_frozen: boolean
  freeze_reason?: string | null
  frozen_at?: string | null
  metadata?: Record<string, unknown>
  created_at: string
  updated_at?: string
}

export interface UpdateProfileInput {
  full_name?: string
  first_name?: string
  last_name?: string
  phone?: string
  avatar_url?: string
}

export interface OnboardingStatus {
  onboarding_status: OnboardingStatusValue
  bridge_customer_id: string | null
  has_kyc: boolean
  has_kyb: boolean
}

export interface AvatarUploadUrl {
  signed_url: string
  path: string
  expires_at: string
}
```

**Cambios en componentes que usan `ProfileService`:**

```diff
  // Ejemplo: componente que carga perfil
  useEffect(() => {
-   ProfileService.getProfile(user.id).then(setProfile)
+   ProfileService.getProfile().then(setProfile)
+   // Ya no necesita userId — el backend lo extrae del JWT
  }, [])
```

---

### 2.2 `activity.service.ts` — Migración Completa

**Archivo actual:** `services/activity.service.ts` (30 líneas)  
**Estado actual:** Lee `activity_logs` y `audit_logs` directamente

| Operación | Antes | Después |
|---|---|---|
| Activity logs del usuario logueado | `supabase.from('activity_logs').select('*').eq('user_id', userId)` | `GET /activity?limit=50` |
| Activity de un user (admin) | N/A | `GET /admin/activity/:userId` |
| Audit logs (admin) | `supabase.from('audit_logs').select('*, profiles(full_name, email)')` | `GET /admin/audit-logs` |
| Audit logs por user (admin) | N/A | `GET /admin/audit-logs/user/:userId` |

**Código migrado:**

```typescript
import { apiGet } from '@/lib/api'
import type { PaginatedResponse } from '@/lib/api'
import type { ActivityLog, AuditLog } from '@/types/activity-log'

export const ActivityService = {
  /**
   * Obtener actividad del usuario autenticado.
   * ⚠️ Path correcto: GET /activity (NO /admin/activity-logs)
   * El backend filtra por JWT user automáticamente.
   */
  async getUserActivity(limit: number = 50): Promise<ActivityLog[]> {
    return apiGet<ActivityLog[]>(`/activity?limit=${limit}`)
  },

  /**
   * Obtener actividad de un usuario específico (solo staff/admin).
   * ⚠️ Path: /admin/activity/:userId (userId como path param, NO query param)
   */
  async getActivityForUser(userId: string): Promise<ActivityLog[]> {
    return apiGet<ActivityLog[]>(`/admin/activity/${userId}`)
  },

  /**
   * Obtener audit logs (solo staff/admin).
   * Soporta paginación y filtros.
   */
  async getAuditLogs(params?: {
    page?: number
    performed_by?: string
    action?: string
    table_name?: string
  }): Promise<PaginatedResponse<AuditLog>> {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.performed_by) searchParams.set('performed_by', params.performed_by)
    if (params?.action) searchParams.set('action', params.action)
    if (params?.table_name) searchParams.set('table_name', params.table_name)
    
    return apiGet<PaginatedResponse<AuditLog>>(`/admin/audit-logs?${searchParams.toString()}`)
  },

  /**
   * Obtener audit logs de un usuario específico (solo staff/admin).
   * 🆕 Endpoint no contemplado anteriormente.
   */
  async getAuditLogsByUser(userId: string): Promise<AuditLog[]> {
    return apiGet<AuditLog[]>(`/admin/audit-logs/user/${userId}`)
  },
}
```

---

### 2.3 `notifications.service.ts` — Migración Parcial (Mantener Realtime)

**Archivo actual:** `services/notifications.service.ts` (100 líneas)  
**Estrategia:** Migrar CRUD a REST. **Mantener** `subscribe()` con Supabase Realtime (el backend no ofrece WebSocket).

| Operación | Antes | Después |
|---|---|---|
| Listar notificaciones | `supabase.from('notifications').select('*')` | `GET /notifications?page=1&limit=20` |
| Marcar como leída | `supabase.from('notifications').update({ is_read: true })` | `PATCH /notifications/{id}/read` |
| Marcar todas como leídas | `supabase.from('notifications').update({ is_read: true }).eq('is_read', false)` | `PATCH /notifications/read-all` |
| Contar no leídas | No existe | `GET /notifications/unread-count` |
| **Suscripción realtime** | **`supabase.channel().on('postgres_changes')`** | **MANTENER SIN CAMBIOS** |

**Código migrado:**

```typescript
import { apiGet, apiPatch } from '@/lib/api'
import type { PaginatedResponse } from '@/lib/api'
import { createClient } from '@/lib/supabase/browser'
import type { Notification } from '@/types/notification'

const NOTIFICATIONS_LIMIT = 20

export const NotificationsService = {
  /**
   * Obtener notificaciones paginadas del usuario.
   * MIGRADO: Antes → supabase.from('notifications').select()
   * AHORA  → GET /notifications
   */
  async getLatest(page: number = 1): Promise<PaginatedResponse<Notification>> {
    return apiGet<PaginatedResponse<Notification>>(
      `/notifications?page=${page}&limit=${NOTIFICATIONS_LIMIT}`
    )
  },

  /**
   * Obtener conteo de notificaciones no leídas.
   * NUEVO: No existía en el frontend anterior.
   */
  async getUnreadCount(): Promise<{ unread_count: number }> {
    return apiGet<{ unread_count: number }>('/notifications/unread-count')
  },

  /**
   * Marcar una notificación como leída.
   * MIGRADO: Antes → supabase.from('notifications').update()
   * AHORA  → PATCH /notifications/:id/read
   */
  async markAsRead(notificationId: string): Promise<void> {
    await apiPatch(`/notifications/${notificationId}/read`)
  },

  /**
   * Marcar todas las notificaciones como leídas.
   * MIGRADO: Antes → supabase query con filtro
   * AHORA  → PATCH /notifications/read-all
   */
  async markAllAsRead(): Promise<void> {
    await apiPatch('/notifications/read-all')
  },

  /**
   * ┌─────────────────────────────────────────────────────────────┐
   * │  SUPABASE REALTIME — MANTENER SIN CAMBIOS                  │
   * │  El backend no ofrece WebSocket/SSE equivalente.            │
   * │  Esta función sigue usando Supabase Channels directamente.  │
   * └─────────────────────────────────────────────────────────────┘
   */
  subscribe(
    userId: string,
    onInsert: (payload: Notification) => void,
    options?: { onDisconnect?: () => void }
  ) {
    const supabase = createClient()
    const channelName = `notifications:${userId}`
    const channel = supabase.channel(channelName)
    let disconnected = false

    void supabase.auth.getSession().then(({ data }) => {
      const accessToken = data.session?.access_token
      if (accessToken) {
        void supabase.realtime.setAuth(accessToken)
      }
    })

    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          onInsert(payload.new as Notification)
        }
      )
      .subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          disconnected = false
          return
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          if (!disconnected) {
            disconnected = true
            options?.onDisconnect?.()
          }
        }
      })

    return () => {
      void channel.unsubscribe().catch((error) => {
        console.error('Failed to unsubscribe notifications channel', error)
      })
    }
  },
}
```

---

### 2.4 `support.service.ts` — Migración Completa

**Archivo actual:** `services/support.service.ts` (50 líneas)  
**Estado actual:** CRUD directo contra `support_tickets` + log de actividad manual

| Operación | Antes | Después |
|---|---|---|
| Listar tickets del usuario | `supabase.from('support_tickets').select('*').eq('user_id', userId)` | `GET /support/tickets` |
| Crear ticket | `supabase.from('support_tickets').insert()` + `supabase.from('activity_logs').insert()` | `POST /support/tickets` |
| Obtener ticket por ID | No existe como método separado | `GET /support/tickets/:id` |

> **Nota:** El backend automáticamente:
> - Registra activity logs al crear tickets
> - Notifica al equipo de staff
> - Valida pertenencia del ticket al usuario

**Código migrado:**

```typescript
import { apiGet, apiPost } from '@/lib/api'
import type { SupportTicket, CreateTicketInput } from '@/types/support'

export const SupportService = {
  /**
   * Obtener tickets del usuario autenticado.
   * El backend filtra por JWT user.
   * ELIMINADO: Ya no se necesita pasar userId.
   * ELIMINADO: Ya no se registra activity_logs manualmente.
   */
  async getTickets(): Promise<SupportTicket[]> {
    return apiGet<SupportTicket[]>('/support/tickets')
  },

  /**
   * Obtener detalle de un ticket.
   * El backend valida que el ticket pertenece al usuario.
   */
  async getTicket(ticketId: string): Promise<SupportTicket> {
    return apiGet<SupportTicket>(`/support/tickets/${ticketId}`)
  },

  /**
   * Crear un nuevo ticket de soporte.
   * El backend automáticamente:
   * - Asigna user_id del JWT
   * - Status = 'open', priority = 'normal'
   * - Notifica al equipo de staff
   * 
   * ELIMINADO: Ya no se inserta activity_log manualmente.
   */
  async createTicket(input: CreateTicketInput): Promise<SupportTicket> {
    return apiPost<SupportTicket>('/support/tickets', input)
  },
}
```

**Tipo `SupportTicket` actualizado (`types/support.ts`):**

```typescript
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface SupportTicket {
  id: string
  user_id: string
  subject: string
  description: string
  category?: string
  status: TicketStatus
  priority: TicketPriority
  assigned_to?: string | null
  resolution_notes?: string | null
  resolved_at?: string | null
  created_at: string
  updated_at: string
  // JOIN data (solo en contexto admin)
  profiles?: {
    email: string
    first_name: string
    last_name: string
    business_name?: string
  }
}

export interface CreateTicketInput {
  subject: string
  description: string
  category?: string
}
```

---

### 2.5 `wallet.service.ts` — Migración Mayor (Eliminación de Lógica de Negocio)

**Archivo actual:** `services/wallet.service.ts` (208 líneas)  
**Estado actual:** Ejecuta 3+ queries paralelas, calcula balances client-side, genera movimientos  
**Impacto:** Esta es la migración más significativa de la Fase 2 porque **elimina ~150 líneas de lógica de negocio** del frontend.

| Operación | Antes (Frontend calcula) | Después (Backend retorna) |
|---|---|---|
| Balance total | `SUM(ledger_entries.amount)` en JS | `GET /wallets/balances` → `{ amount, available, pending, reserved }` |
| Balance por moneda | Filtro client-side | `GET /wallets/balances/:currency` |
| Movimientos recientes | Unión client-side de 3 tablas | `GET /ledger?limit=20` |
| Wallets del usuario | `supabase.from('wallets').select()` | `GET /wallets` |
| Wallet específica | No existe | `GET /wallets/:id` 🆕 |
| Rutas de depósito | No existe | `GET /wallets/payin-routes` |

**Qué se elimina del frontend:**

```typescript
// ❌ ELIMINAR — Cálculo de balances client-side
const ledgerBalance = ledgerEntries.reduce((sum, e) => sum + e.amount, 0)
const reservedInOrders = activePaymentOrders.reduce(...)
const pendingBridgeTotal = pendingBridgeTransfers.reduce(...)
const availableBalance = ledgerBalance - reservedInOrders + pendingBridgeTotal

// ❌ ELIMINAR — Unión de movimientos de 3 fuentes
const movements: WalletMovement[] = [
  ...ledgerEntries.map(e => ({ source: 'ledger_entry', ... })),
  ...bridgeTransfers.map(t => ({ source: 'bridge_transfer', ... })),
  ...paymentOrders.map(o => ({ source: 'payment_order', ... })),
].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

// ❌ ELIMINAR — 3 queries paralelas
const [ledgerResult, bridgeResult, ordersResult] = await Promise.all([
  supabase.from('ledger_entries').select('*'),
  supabase.from('bridge_transfers').select('*'),
  supabase.from('payment_orders').select('*'),
])
```

**Código migrado:**

```typescript
import { apiGet } from '@/lib/api'
import type { PaginatedResponse } from '@/lib/api'
import type { 
  Wallet, 
  WalletBalance, 
  PayinRoute 
} from '@/types/wallet'
import type { LedgerEntry, LedgerFilter } from '@/types/ledger'

export const WalletService = {
  /**
   * Obtener todos los wallets del usuario.
   */
  async getWallets(): Promise<Wallet[]> {
    return apiGet<Wallet[]>('/wallets')
  },

  /**
   * Obtener balances pre-calculados de todas las monedas.
   * Retorna: { currency, amount, available, pending, reserved }[]
   * 
   * ELIMINA: Cálculo de balances client-side (3 queries + reduce)
   */
  async getBalances(): Promise<WalletBalance[]> {
    return apiGet<WalletBalance[]>('/wallets/balances')
  },

  /**
   * Obtener balance de una moneda específica.
   */
  async getBalanceByCurrency(currency: string): Promise<WalletBalance> {
    return apiGet<WalletBalance>(`/wallets/balances/${currency.toLowerCase()}`)
  },

  /**
   * Obtener una wallet específica por ID.
   * 🆕 Endpoint no contemplado anteriormente.
   */
  async getWallet(walletId: string): Promise<Wallet> {
    return apiGet<Wallet>(`/wallets/${walletId}`)
  },

  /**
   * Obtener rutas de depósito (Virtual Accounts vinculadas).
   * NUEVO: No existía en el frontend anterior.
   */
  async getPayinRoutes(): Promise<PayinRoute[]> {
    return apiGet<PayinRoute[]>('/wallets/payin-routes')
  },

  /**
   * Obtener historial de movimientos con filtros y paginación.
   * ELIMINA: Unión client-side de ledger + bridge_transfers + payment_orders
   * 
   * ⚠️ Path correcto: GET /ledger (NO /ledger/history)
   * ⚠️ El filtro 'type' acepta: 'credit' | 'debit' (no los 9 tipos granulares)
   * 
   * El backend ya consolida y ordena los movimientos.
   */
  async getHistory(filters?: LedgerFilter): Promise<PaginatedResponse<LedgerEntry>> {
    const params = new URLSearchParams()
    if (filters?.page) params.set('page', String(filters.page))
    if (filters?.limit) params.set('limit', String(filters.limit))
    if (filters?.type) params.set('type', filters.type)
    if (filters?.currency) params.set('currency', filters.currency)
    if (filters?.status) params.set('status', filters.status)
    if (filters?.from) params.set('from', filters.from)
    if (filters?.to) params.set('to', filters.to)

    return apiGet<PaginatedResponse<LedgerEntry>>(`/ledger?${params.toString()}`)
  },

  /**
   * Obtener detalle de una entrada de ledger.
   */
  async getLedgerEntry(ledgerId: string): Promise<LedgerEntry> {
    return apiGet<LedgerEntry>(`/ledger/${ledgerId}`)
  },
}
```

**Tipos nuevos (`types/wallet.ts` actualizado + `types/ledger.ts` nuevo):**

```typescript
// ── types/wallet.ts (ACTUALIZADO) ──────────────────────

export interface Wallet {
  id: string
  user_id: string
  currency: string
  provider_key?: string       // NUEVO: 'bridge' | 'internal'
  provider_wallet_id?: string // NUEVO: ID en Bridge
  network?: string            // NUEVO: 'ethereum' | 'polygon' | etc
  label?: string              // NUEVO: Nombre descriptivo
  created_at: string
}

export interface WalletBalance {
  currency: string
  /** Balance total contable */
  amount: number
  /** Balance disponible para operaciones */
  available: number
  /** Balance pendiente de confirmación */
  pending: number
  /** Balance reservado en órdenes activas */
  reserved: number
}

export interface PayinRoute {
  id: string
  wallet_id: string
  currency: string
  type: 'virtual_account' | 'liquidation_address' | 'psav'
  details: Record<string, unknown> // Instrucciones bancarias o dirección crypto
  is_active: boolean
}

// ELIMINAR estos tipos (ya no se calculan client-side):
// - WalletDashboardSnapshot
// - WalletMovement  
// - Propiedades calculadas: ledgerBalance, reservedInOrders, pendingBridgeTotal, availableBalance
```

```typescript
// ── types/ledger.ts (NUEVO) ─────────────────────────────

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
  reference_type?: string  // 'payment_order' | 'bridge_transfer' | 'manual'
  reference_id?: string    // ID del recurso relacionado
  bridge_transfer_id?: string | null
  metadata?: Record<string, unknown>
  created_at: string
  updated_at?: string
}

export interface LedgerFilter {
  page?: number
  limit?: number
  /** ⚠️ Backend filter acepta 'credit' | 'debit', no los tipos granulares */
  type?: 'credit' | 'debit'
  status?: LedgerEntryStatus
  currency?: string
  from?: string  // ISO date
  to?: string    // ISO date
}
```

---

### 2.6 `auth.service.ts` — Migración Mínima

**Archivo actual:** `services/auth.service.ts` (77 líneas)  
**Estrategia:** Mantener Supabase Auth SDK para login/register/OAuth. Opcionalmente llamar al backend para registro extendido.

| Operación | Cambio | Razón |
|---|---|---|
| `signIn()` | MANTENER | Supabase Auth SDK directo |
| `signUp()` | MANTENER + agregar POST al backend | El backend crea el perfil y wallet initial |
| `signOut()` | MANTENER | Limpia sesión local |
| `resetPassword()` | MANTENER o MIGRAR | Backend tiene endpoint equivalente |
| `getSession()` | MANTENER | Usado por interceptores |

**Cambio mínimo en `signUp()`:**

```typescript
import { apiPost } from '@/lib/api'

// Después del signUp con Supabase:
async signUp(email: string, password: string, metadata?: Record<string, unknown>) {
  const supabase = createClient()
  
  // 1. Crear usuario en Supabase Auth
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error

  // 2. Notificar al backend para crear perfil + wallet inicial
  // Esto es OPCIONAL si el backend tiene un trigger on auth.users INSERT
  try {
    await apiPost('/auth/register', {
      supabase_user_id: data.user?.id,
      email,
      ...metadata,
    })
  } catch (err) {
    console.warn('Backend register sync failed (may be handled by trigger):', err)
  }

  return data
}
```

---

## 3. Impacto en Componentes — Guía de Actualización

### 3.1 Cambios Comunes en Todos los Componentes

```diff
  // ❌ ANTES: Pasar userId como parámetro
- const profile = await ProfileService.getProfile(user.id)
- const tickets = await SupportService.getTickets(user.id)
- const activity = await ActivityService.getUserActivity(user.id)

  // ✅ DESPUÉS: El backend extrae userId del JWT
+ const profile = await ProfileService.getProfile()
+ const tickets = await SupportService.getTickets()
+ const activity = await ActivityService.getUserActivity()
```

### 3.2 Cambios Específicos para Wallet Dashboard

```diff
  // ❌ ANTES: Snapshot con cálculos client-side
- const snapshot = await WalletService.getDashboardSnapshot(userId)
- // snapshot contenía: ledgerBalance, reservedInOrders, availableBalance, movements

  // ✅ DESPUÉS: Datos pre-calculados del backend
+ const [balances, history] = await Promise.all([
+   WalletService.getBalances(),
+   WalletService.getHistory({ limit: 20 }),
+ ])
+ // balances[0].available ya tiene el balance calculado correctamente
+ // history.data ya tiene los movimientos consolidados y ordenados
```

### 3.3 Manejo de Errores en Componentes

```typescript
import { isApiError } from '@/lib/api'

try {
  const data = await SomeService.doSomething()
} catch (error) {
  if (isApiError(error)) {
    switch (error.code) {
      case 'RATE_LIMITED':
        toast.warn(error.message) // "Demasiadas solicitudes..."
        break
      case 'VALIDATION_ERROR':
        // Mostrar errores por campo
        Object.entries(error.details ?? {}).forEach(([field, messages]) => {
          setFieldError(field, messages[0])
        })
        break
      case 'FORBIDDEN':
        toast.error('No tienes permisos para esta acción')
        break
      default:
        toast.error(error.message)
    }
  }
}
```

---

## 4. Checklist de Validación — Fase 2

| # | Servicio | Test | Criterio de Éxito |
|---|---|---|---|
| 1 | ProfileService | Cargar perfil en dashboard | Datos iguales a los de Supabase directo |
| 2 | ProfileService | Actualizar nombre | Cambio reflejado inmediatamente |
| 3 | ActivityService | Ver actividad reciente | Lista de logs correcta |
| 4 | NotificationsService | Listar notificaciones | Paginación funcional |
| 5 | NotificationsService | Marcar como leída | Badge de unread se actualiza |
| 6 | NotificationsService | Realtime subscribe | Push notification llega en <2s |
| 7 | SupportService | Listar tickets | Tickets del usuario correctos |
| 8 | SupportService | Crear ticket | Ticket creado, notificación a staff |
| 9 | WalletService | Ver balances | `available` = balance real calculado en backend |
| 10 | WalletService | Ver historial | Movimientos paginados y ordenados |
| 11 | WalletService | Filtrar historial | Filtros por tipo/moneda/fecha funcionan |
| 12 | WalletService | Payin routes | Rutas de depósito con instrucciones |
| 13 | AuthService | Login → perfil | JWT se adjunta correctamente |
| 14 | AuthService | Token expirado | Refresh automático, retry transparente |
| 15 | General | 0 queries Supabase en Network tab | Solo Auth y Realtime |

---

## 5. Archivos para Eliminar Post-Migración

Una vez completada y validada la Fase 2, los siguientes imports de Supabase en servicios migrados deben ser removidos:

| Servicio | Import a eliminar |
|---|---|
| `profile.service.ts` | `import { createClient } from '@/lib/supabase/browser'` |
| `activity.service.ts` | `import { createClient } from '@/lib/supabase/browser'` |
| `notifications.service.ts` | **MANTENER** (usado en `subscribe()`) |
| `support.service.ts` | `import { createClient } from '@/lib/supabase/browser'` |
| `wallet.service.ts` | `import { createClient } from '@/lib/supabase/browser'` |

---

## 6. Resumen de Impacto

| Métrica | Antes | Después |
|---|---|---|
| Queries Supabase directas en servicios migrados | ~15 | 1 (Realtime) |
| Líneas de lógica de negocio eliminadas | ~150 | 0 |
| Tablas Supabase accedidas desde browser | ~8 (en estos servicios) | 0 |
| Endpoints REST consumidos | 0 | ~12 |
| Tipos TypeScript actualizados | 0 | 4 (profile, wallet, ledger, support) |
