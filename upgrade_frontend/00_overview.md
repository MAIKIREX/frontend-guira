# Upgrade Frontend — Plan Maestro de Evolución

> **Proyecto:** m-guira (Next.js) → nest-base-backend (NestJS)  
> **Fecha:** Abril 2026  
> **Estado:** Planificación técnica — Sin implementación aún

---

## 1. Contexto y Motivación

El frontend `m-guira` actualmente opera como una aplicación **database-first**, realizando consultas CRUD directas contra Supabase desde el navegador del usuario. Esta arquitectura presenta:

- **Riesgo de seguridad crítico:** Lógica de negocio, esquemas de datos y RLS policies expuestos al cliente
- **Deuda técnica:** 10 servicios frontend con ~1,600 líneas de código que duplican o ignoran la lógica del backend
- **Capacidades desperdiciadas:** 16 módulos backend con 128+ endpoints no consumidos

El backend `nest-base-backend` ha evolucionado a un **BFF (Backend-for-Frontend)** completo con:
- Motor de 11 flujos financieros especializados
- Motor de compliance con review/approve/reject/escalate
- Motor de fees dinámico con overrides por cliente
- Integración completa con Bridge API (Virtual Accounts, External Accounts, Payouts)
- Sincronización automática de tasas de cambio
- Procesamiento de webhooks con retry y auditoría
- Guards de seguridad: `SupabaseAuthGuard`, `RolesGuard`, `RateLimitGuard`

---

## 2. Objetivo de la Migración

Transformar el frontend de una aplicación **database-first** a una aplicación **API-first**:

```
ANTES (Actual):
┌─────────────┐         ┌──────────────┐
│  Frontend   │ ──SQL──►│   Supabase   │
│  (m-guira)  │◄──rows──│   (directo)  │
└─────────────┘         └──────────────┘

DESPUÉS (Objetivo):
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│  Frontend   │ ──REST─►│   Backend    │ ──SQL──►│   Supabase   │
│  (m-guira)  │◄──JSON──│   (NestJS)   │◄──rows──│              │
└─────────────┘         └──────────────┘         └──────────────┘
       │                                                │
       └──── Supabase Auth SDK (login/session) ─────────┘
       └──── Supabase Realtime (notifications) ─────────┘
```

---

## 3. Decisiones Arquitectónicas Clave

### 3.1 Autenticación — Modelo Híbrido

| Componente | Tecnología | Razón |
|---|---|---|
| Login / Register / OAuth | Supabase Auth SDK (mantener) | Flujo de auth probado, OAuth providers, session management |
| Token para API calls | JWT extraído de Supabase session | El backend valida el mismo JWT via `SupabaseAuthGuard` |
| Autorización por roles | Backend `@Roles()` + `RolesGuard` | Centralizada, no replicable en frontend |
| Refresh de token | Interceptor axios con retry 401 | Transparente para el desarrollador |

### 3.2 Supabase — Qué Se Mantiene vs Qué Se Elimina

| Uso de Supabase | Mantener | Eliminar | Razón |
|---|---|---|---|
| `supabase.auth.*` | ✅ | — | Flujo de autenticación estándar |
| `supabase.channel()` (Realtime) | ✅ | — | Backend no ofrece WebSocket/SSE equivalente |
| `supabase.from('tabla').select()` | — | ✅ | Migrar a `GET /endpoint` del backend |
| `supabase.from('tabla').insert()` | — | ✅ | Migrar a `POST /endpoint` del backend |
| `supabase.from('tabla').update()` | — | ✅ | Migrar a `PATCH /endpoint` del backend |
| `supabase.storage.upload()` | — | ✅ | Migrar a `POST /onboarding/documents/upload` (multipart) |
| `supabase.functions.invoke()` | — | ✅ | Migrar a endpoint REST del backend |

### 3.3 Convención de Servicios Frontend (Post-Migración)

```typescript
// PATRÓN ACTUAL (ELIMINAR GRADUALMENTE)
import { createClient } from '@/lib/supabase/browser'

export const WalletService = {
  async getBalances(userId: string) {
    const supabase = createClient()
    const { data } = await supabase.from('ledger_entries').select('*').eq('wallet_id', walletId)
    // ... cálculos client-side ...
    return calculatedBalance
  }
}

// PATRÓN NUEVO (ADOPTAR)
import { api } from '@/lib/api/client'
import type { WalletBalance } from '@/types/wallet'

export const WalletService = {
  async getBalances(): Promise<WalletBalance[]> {
    return api.get<WalletBalance[]>('/wallets/balances')
    // El backend calcula, filtra por JWT user, y retorna datos listos
  }
}
```

---

## 4. Prerrequisitos Técnicos

Antes de iniciar cualquier fase, se requiere:

| # | Prerrequisito | Estado | Notas |
|---|---|---|---|
| 1 | `axios` instalado en m-guira | ✅ Completado | `npm install axios` ejecutado |
| 2 | Backend desplegado y accesible | ⬜ Pendiente | Necesita URL base (dev/staging/prod) |
| 3 | Variable `NEXT_PUBLIC_API_URL` configurada | ⬜ Pendiente | `.env.local` |
| 4 | CORS configurado en backend | ⬜ Pendiente | Permitir origin del frontend |
| 5 | Swagger/OpenAPI del backend disponible | ⬜ Opcional | Para validar contratos de API |

---

## 5. Estructura de Fases

La migración se divide en **4 fases** secuenciales, cada una documentada en su propio archivo:

| Fase | Archivo | Descripción | Duración | Riesgo |
|---|---|---|---|---|
| 1 | `01_fase1_infraestructura_api.md` | Cliente API centralizado, interceptores, tipos base | 1 semana | Bajo |
| 2 | `02_fase2_migracion_lectura.md` | Migración de servicios de lectura (GET) + auth/me, activity, settings | 2 semanas | Bajo |
| 3 | `03_fase3_migracion_escritura_y_nuevos_modulos.md` | Migración de escritura (POST/PATCH) + UI nuevas para Bridge, Compliance, KYB, Auth flow completo | 3 semanas | Alto |
| 4 | `04_fase4_panel_admin.md` | Refactorización del panel admin + Bridge admin, Reconciliación, Límites | 2 semanas | Medio |

Documentos de referencia complementarios:

| Archivo | Contenido |
|---|---|
| `05_tipos_y_dtos.md` | Definiciones TypeScript completas para todos los tipos nuevos y actualizados |
| `06_endpoints_inventario.md` | Inventario de 129 endpoints backend verificados contra controladores reales |
| `07_nuevas_vistas_y_funcionalidades.md` | Vistas y funcionalidades nuevas requeridas por el backend que el frontend anterior no soportaba |

---

## 6. Métricas de Éxito

Al completar las 4 fases, el frontend debe cumplir:

| Métrica | Valor Objetivo |
|---|---|
| Llamadas directas a Supabase (excepto Auth + Realtime) | 0 |
| Servicios frontend migrados a REST | 10/10 |
| Flujos financieros soportados en UI | 11/11 |
| Endpoints backend consumidos | ≥128 |
| Lógica de negocio en frontend | 0 (delegada al backend) |
| Tipos TypeScript sincronizados con backend DTOs | 100% |
| Nuevas vistas creadas para funcionalidades backend | 8+ |

---

## 7. Archivos Frontend Impactados — Mapa Completo

### Servicios (10 archivos — TODOS serán modificados)

| Archivo | Líneas | Acción | Fase |
|---|---|---|---|
| `services/auth.service.ts` | 77 | Mantener parcial (Supabase Auth), agregar `POST /auth/register` | 2 |
| `services/profile.service.ts` | 41 | Reescribir → `GET /profiles/me` | 2 |
| `services/activity.service.ts` | 30 | Reescribir → `GET /activity` (user) + `GET /admin/activity/:userId` (admin) | 2 |
| `services/notifications.service.ts` | 100 | Parcial: REST para CRUD, mantener Realtime subscribe | 2 |
| `services/support.service.ts` | 50 | Reescribir → `GET/POST /support/tickets` | 2 |
| `services/wallet.service.ts` | 208 | Reescribir → `GET /wallets/balances` + `GET /ledger` | 2 |
| `services/payments.service.ts` | 222 | Reescribir → `POST /payment-orders/*` (11 flujos) | 3 |
| `services/onboarding.service.ts` | 134 | Reescribir → `POST /onboarding/kyc/*` + `POST /onboarding/kyb/*` | 3 |
| `services/staff.service.ts` | 542 | **ELIMINAR** — Reemplazar por servicios admin especializados | 4 |
| `services/admin.service.ts` | 388 | Reescribir → `GET/POST /admin/*` endpoints | 4 |

### Tipos (11 archivos — 7 serán modificados, 12+ nuevos)

| Archivo | Acción | Fase |
|---|---|---|
| `types/profile.ts` | Actualizar (agregar campos Bridge/freeze) | 2 |
| `types/wallet.ts` | Actualizar (agregar provider, network, label) | 2 |
| `types/payment-order.ts` | Actualizar (agregar flow_type, flow_category, etc.) | 3 |
| `types/onboarding.ts` | Actualizar (agregar KYB, directores, UBOs) | 3 |
| `types/bridge.ts` | **NUEVO** — VirtualAccount, ExternalAccount, Payout, Transfer | 3 |
| `types/compliance.ts` | **NUEVO** — ComplianceReview, ComplianceAction | 3 |
| `types/fees.ts` | **NUEVO** — FeeConfig, CustomerFeeOverride | 3 |
| `types/exchange-rate.ts` | **NUEVO** — ExchangeRate, ExchangeRatePair | 3 |
| `types/psav.ts` | **NUEVO** — PsavAccount, DepositInstructions | 3 |
| `types/ledger.ts` | **NUEVO** — LedgerEntry (extendido), LedgerFilter | 2 |
| `types/api.ts` | **NUEVO** — ApiResponse, PaginatedResponse, ApiError | 1 |
| `types/admin.ts` | **NUEVO** — AdminStats, AuditLogEntry, AppSetting | 4 |

### Archivos Nuevos Clave

| Archivo | Propósito | Fase |
|---|---|---|
| `lib/api/client.ts` | Instancia axios centralizada | 1 |
| `lib/api/interceptors.ts` | Token attach, retry 401, error transform | 1 |
| `lib/api/types.ts` | Tipos genéricos de respuesta API | 1 |
| `services/bridge.service.ts` | **NUEVO** servicio para Bridge API | 3 |
| `services/compliance.service.ts` | **NUEVO** servicio para Compliance | 3 |
| `services/exchange-rates.service.ts` | **NUEVO** servicio para Exchange Rates | 3 |
| `services/fees.service.ts` | **NUEVO** servicio para Fees | 3 |
| `services/ledger.service.ts` | **NUEVO** servicio dedicado para Ledger | 3 |
| `services/psav.service.ts` | **NUEVO** servicio para PSAV | 3 |
| `services/admin/orders.admin.service.ts` | **NUEVO** — reemplaza parte de staff.service | 4 |
| `services/admin/compliance.admin.service.ts` | **NUEVO** — reemplaza parte de staff.service | 4 |
| `services/admin/users.admin.service.ts` | **NUEVO** — reemplaza parte de staff.service + transaction limits | 4 |
| `services/admin/config.admin.service.ts` | **NUEVO** — fees, exchange rates, PSAV, settings, reconciliation | 4 |
| `services/admin/support.admin.service.ts` | **NUEVO** — reemplaza parte de staff.service | 4 |
| `services/admin/bridge.admin.service.ts` | **NUEVO** — approve/reject payouts Bridge | 4 |
| `services/admin/reconciliation.admin.service.ts` | **NUEVO** — reconciliación financiera | 4 |
