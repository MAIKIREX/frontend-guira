# Referencia: Inventario Completo de Endpoints Backend

> **Propósito:** Catálogo exhaustivo de todos los endpoints del backend `nest-base-backend` organizados por módulo, con método HTTP, path **real verificado contra los controladores**, autenticación requerida, roles permitidos, y estado de consumo en el frontend.  
> **Fuente de verdad:** Controladores NestJS en `nest-base-backend/src/application/`  
> **Última verificación:** 2 Abril 2026  
> **Total:** 129 endpoints (128 consumibles + 1 webhook server-only)

---

## Convenciones

| Símbolo | Significado |
|---|---|
| 🔓 | Requiere autenticación (JWT) |
| 🔓⚡ | Auth requerida con token especial (ej: reset-password link) |
| ❌ | No requiere autenticación |
| 👤 | Accesible por cualquier usuario autenticado |
| 👔 | Solo staff / admin / super_admin |
| 👑 | Solo admin / super_admin |
| 👑👑 | Solo super_admin |
| ✅ | Ya consumido en frontend post-migración |
| ⬜ | Pendiente de implementación |
| 🚫 | No aplica (server-only, webhooks, etc.) |
| 🆕 | Endpoint nuevo que el frontend anterior no contemplaba |

---

## 1. Auth Module (6 endpoints)

| # | Método | Path | Auth | Roles | Fase | Estado | Notas |
|---|---|---|---|---|---|---|---|
| 1 | `POST` | `/auth/register` | ❌ | Público | 3 | ⬜ | RateLimitGuard activo |
| 2 | `GET` | `/auth/me` | 🔓 | 👤 | 2 | ⬜ 🆕 | Perfil completo + rol + onboarding status + límites |
| 3 | `POST` | `/auth/refresh` | ❌ | Público | 1 | ⬜ 🆕 | Recibe refresh_token, retorna nuevo access_token |
| 4 | `POST` | `/auth/logout` | 🔓 | 👤 | 2 | ⬜ 🆕 | Invalida sesión en Supabase Auth |
| 5 | `POST` | `/auth/forgot-password` | ❌ | Público | 3 | ⬜ 🆕 | RateLimitGuard — envía email con link |
| 6 | `POST` | `/auth/reset-password` | 🔓⚡ | 👤 | 3 | ⬜ 🆕 | **Requiere auth** con token especial del email |

> **⚠️ Nota:** `POST /auth/login` NO existe como endpoint — el login se maneja exclusivamente vía Supabase Auth SDK client-side. `GET /auth/session` tampoco existe — la sesión es client-side.

---

## 2. Profiles Module (8 endpoints)

| # | Método | Path | Auth | Roles | Fase | Estado |
|---|---|---|---|---|---|---|
| 7 | `GET` | `/profiles/me` | 🔓 | 👤 | 2 | ⬜ |
| 8 | `PATCH` | `/profiles/me` | 🔓 | 👤 | 2 | ⬜ |
| 9 | `GET` | `/profiles/me/onboarding-status` | 🔓 | 👤 | 2 | ⬜ |
| 10 | `GET` | `/profiles/me/avatar-upload-url` | 🔓 | 👤 | 2 | ⬜ |
| 11 | `GET` | `/admin/profiles` | 🔓 | 👔 | 4 | ⬜ |
| 12 | `GET` | `/admin/profiles/:id` | 🔓 | 👔 | 4 | ⬜ |
| 13 | `PATCH` | `/admin/profiles/:id/freeze` | 🔓 | 👑 | 4 | ⬜ |
| 14 | `PATCH` | `/admin/profiles/:id/activate` | 🔓 | 👑 | 4 | ⬜ |

---

## 3. Onboarding Module (21 endpoints)

### 3a. KYC — Persona Natural

| # | Método | Path | Auth | Roles | Fase | Estado | Notas |
|---|---|---|---|---|---|---|---|
| 15 | `POST` | `/onboarding/kyc/person` | 🔓 | 👤 | 3 | ⬜ | Upsert datos biográficos |
| 16 | `GET` | `/onboarding/kyc/person` | 🔓 | 👤 | 3 | ⬜ 🆕 | Leer datos biográficos |
| 17 | `POST` | `/onboarding/kyc/application` | 🔓 | 👤 | 3 | ⬜ | Crear aplicación KYC |
| 18 | `GET` | `/onboarding/kyc/application` | 🔓 | 👤 | 3 | ⬜ 🆕 | Estado de aplicación KYC |
| 19 | `GET` | `/onboarding/kyc/tos-link` | 🔓 | 👤 | 3 | ⬜ | Link ToS con ?redirect_uri |
| 20 | `POST` | `/onboarding/kyc/tos-accept` | 🔓 | 👤 | 3 | ⬜ | ⚠️ Path correcto: `tos-accept` (no `tos`) |
| 21 | `PATCH` | `/onboarding/kyc/application/submit` | 🔓 | 👤 | 3 | ⬜ | ⚠️ Verbo: `PATCH` (no POST). Path: `application/submit` |

### 3b. KYB — Empresa

| # | Método | Path | Auth | Roles | Fase | Estado | Notas |
|---|---|---|---|---|---|---|---|
| 22 | `POST` | `/onboarding/kyb/business` | 🔓 | 👤 | 3 | ⬜ | Upsert datos empresa |
| 23 | `GET` | `/onboarding/kyb/business` | 🔓 | 👤 | 3 | ⬜ 🆕 | Datos empresa + directors + UBOs |
| 24 | `POST` | `/onboarding/kyb/business/directors` | 🔓 | 👤 | 3 | ⬜ | ⚠️ Path: incluye `/business/` |
| 25 | `DELETE` | `/onboarding/kyb/business/directors/:id` | 🔓 | 👤 | 3 | ⬜ | ⚠️ Path: incluye `/business/` |
| 26 | `POST` | `/onboarding/kyb/business/ubos` | 🔓 | 👤 | 3 | ⬜ | ⚠️ Path: incluye `/business/` |
| 27 | `DELETE` | `/onboarding/kyb/business/ubos/:id` | 🔓 | 👤 | 3 | ⬜ | ⚠️ Path: incluye `/business/` |
| 28 | `POST` | `/onboarding/kyb/application` | 🔓 | 👤 | 3 | ⬜ | Crear aplicación KYB |
| 29 | `GET` | `/onboarding/kyb/application` | 🔓 | 👤 | 3 | ⬜ 🆕 | Estado de aplicación KYB |
| 30 | `GET` | `/onboarding/kyb/tos-link` | 🔓 | 👤 | 3 | ⬜ 🆕 | Link ToS KYB con ?redirect_uri |
| 31 | `POST` | `/onboarding/kyb/tos-accept` | 🔓 | 👤 | 3 | ⬜ | ⚠️ Path: `tos-accept` (no `tos`) |
| 32 | `PATCH` | `/onboarding/kyb/application/submit` | 🔓 | 👤 | 3 | ⬜ | ⚠️ Verbo: `PATCH`. Path: `application/submit` |

### 3c. Documentos

| # | Método | Path | Auth | Roles | Fase | Estado | Notas |
|---|---|---|---|---|---|---|---|
| 33 | `POST` | `/onboarding/documents/upload` | 🔓 | 👤 | 3 | ⬜ | Multipart form: file + document_type + subject_type + subject_id? |
| 34 | `GET` | `/onboarding/documents` | 🔓 | 👤 | 3 | ⬜ | Query: ?subject_type |
| 35 | `GET` | `/onboarding/documents/:id/signed-url` | 🔓 | 👤 | 3 | ⬜ | URL firmada (1 hora) |

---

## 4. Wallets Module (6 endpoints)

| # | Método | Path | Auth | Roles | Fase | Estado | Notas |
|---|---|---|---|---|---|---|---|
| 36 | `GET` | `/wallets` | 🔓 | 👤 | 2 | ⬜ | Wallets activas del usuario |
| 37 | `GET` | `/wallets/balances` | 🔓 | 👤 | 2 | ⬜ | Balances calculados servidor-side |
| 38 | `GET` | `/wallets/balances/:currency` | 🔓 | 👤 | 2 | ⬜ | Balance por divisa |
| 39 | `GET` | `/wallets/payin-routes` | 🔓 | 👤 | 2 | ⬜ | Rutas de pago / cuentas virtuales |
| 40 | `GET` | `/wallets/:id` | 🔓 | 👤 | 2 | ⬜ 🆕 | Detalle de wallet específica |
| 41 | `POST` | `/admin/wallets/balances/adjust` | 🔓 | 👑 | 4 | ⬜ | ⚠️ Path correcto: `balances/adjust` (no `adjust-balance`) |

---

## 5. Ledger Module (3 endpoints)

| # | Método | Path | Auth | Roles | Fase | Estado | Notas |
|---|---|---|---|---|---|---|---|
| 42 | `GET` | `/ledger` | 🔓 | 👤 | 2 | ⬜ | ⚠️ Path: `/ledger` (no `/ledger/history`). Queries: page, limit, from, to, type, currency, status |
| 43 | `GET` | `/ledger/:id` | 🔓 | 👤 | 2 | ⬜ | Detalle entrada |
| 44 | `POST` | `/admin/ledger/adjustment` | 🔓 | 👑 | 4 | ⬜ | Ajuste manual con wallet_id, type, amount, currency, reason |

---

## 6. Payment Orders Module (17 endpoints)

### 6a. User Endpoints

| # | Método | Path | Auth | Roles | Fase | Estado | Notas |
|---|---|---|---|---|---|---|---|
| 45 | `POST` | `/payment-orders/interbank` | 🔓 | 👤 | 3 | ⬜ | Crear orden interbancaria |
| 46 | `POST` | `/payment-orders/wallet-ramp` | 🔓 | 👤 | 3 | ⬜ | Crear orden rampa wallet Bridge |
| 47 | `GET` | `/payment-orders` | 🔓 | 👤 | 3 | ⬜ | Queries: status, flow_category, page, limit |
| 48 | `GET` | `/payment-orders/exchange-rates` | 🔓 | 👤 | 3 | ⬜ 🆕 | Todos los tipos de cambio (inline en PO controller) |
| 49 | `GET` | `/payment-orders/exchange-rates/:pair` | 🔓 | 👤 | 3 | ⬜ 🆕 | Tipo de cambio por par |
| 50 | `GET` | `/payment-orders/:id` | 🔓 | 👤 | 3 | ⬜ | Detalle de orden |
| 51 | `POST` | `/payment-orders/:id/confirm-deposit` | 🔓 | 👤 | 3 | ⬜ | Confirmar con comprobante |
| 52 | `POST` | `/payment-orders/:id/cancel` | 🔓 | 👤 | 3 | ⬜ | Cancelar orden pendiente |

### 6b. Admin Endpoints

| # | Método | Path | Auth | Roles | Fase | Estado | Notas |
|---|---|---|---|---|---|---|---|
| 53 | `GET` | `/admin/payment-orders` | 🔓 | 👔 | 4 | ⬜ | Queries: status, flow_type, flow_category, requires_psav, user_id, from_date, to_date, page, limit |
| 54 | `GET` | `/admin/payment-orders/stats` | 🔓 | 👔 | 4 | ⬜ | Dashboard stats |
| 55 | `POST` | `/admin/payment-orders/:id/approve` | 🔓 | 👔 | 4 | ⬜ | deposit_received → processing |
| 56 | `POST` | `/admin/payment-orders/:id/mark-sent` | 🔓 | 👔 | 4 | ⬜ | processing → sent |
| 57 | `POST` | `/admin/payment-orders/:id/complete` | 🔓 | 👑 | 4 | ⬜ | sent → completed |
| 58 | `POST` | `/admin/payment-orders/:id/fail` | 🔓 | 👑 | 4 | ⬜ | cualquier → failed |

### 6c. PSAV Admin (dentro de AdminPaymentOrdersController)

| # | Método | Path | Auth | Roles | Fase | Estado | Notas |
|---|---|---|---|---|---|---|---|
| 59 | `GET` | `/admin/payment-orders/psav-accounts` | 🔓 | 👔 | 4 | ⬜ | ⚠️ Path real dentro de payment-orders |
| 60 | `POST` | `/admin/payment-orders/psav-accounts` | 🔓 | 👑 | 4 | ⬜ | ⚠️ Path real dentro de payment-orders |

### 6d. Exchange Rates Admin (dentro de AdminPaymentOrdersController)

| # | Método | Path | Auth | Roles | Fase | Estado | Notas |
|---|---|---|---|---|---|---|---|
| 61 | `GET` | `/admin/payment-orders/exchange-rates` | 🔓 | 👑 | 4 | ⬜ | ⚠️ Path real |
| 62 | `POST` | `/admin/payment-orders/exchange-rates/sync` | 🔓 | 👑 | 4 | ⬜ | ⚠️ Verbo POST. Sincroniza desde mercado P2P |
| 63 | `POST` | `/admin/payment-orders/exchange-rates/:pair` | 🔓 | 👑 | 4 | ⬜ | ⚠️ Verbo POST (no PATCH). Body: { rate, spread_percent? } |

---

## 7. Suppliers Module (5 endpoints)

| # | Método | Path | Auth | Roles | Fase | Estado |
|---|---|---|---|---|---|---|
| 64 | `GET` | `/suppliers` | 🔓 | 👤 | 3 | ⬜ |
| 65 | `GET` | `/suppliers/:id` | 🔓 | 👤 | 3 | ⬜ |
| 66 | `POST` | `/suppliers` | 🔓 | 👤 | 3 | ⬜ |
| 67 | `PATCH` | `/suppliers/:id` | 🔓 | 👤 | 3 | ⬜ |
| 68 | `DELETE` | `/suppliers/:id` | 🔓 | 👤 | 3 | ⬜ |

---

## 8. Bridge Module (16 endpoints)

### 8a. User Endpoints

| # | Método | Path | Auth | Roles | Fase | Estado | Notas |
|---|---|---|---|---|---|---|---|
| 69 | `POST` | `/bridge/virtual-accounts` | 🔓 | 👤 | 3 | ⬜ | Crear VA para depósitos |
| 70 | `GET` | `/bridge/virtual-accounts` | 🔓 | 👤 | 3 | ⬜ | Listar VAs activas |
| 71 | `GET` | `/bridge/virtual-accounts/:id` | 🔓 | 👤 | 3 | ⬜ 🆕 | Detalle VA + instrucciones bancarias |
| 72 | `DELETE` | `/bridge/virtual-accounts/:id` | 🔓 | 👤 | 3 | ⬜ 🆕 | Desactivar VA |
| 73 | `POST` | `/bridge/external-accounts` | 🔓 | 👤 | 3 | ⬜ | Registrar cuenta destino |
| 74 | `GET` | `/bridge/external-accounts` | 🔓 | 👤 | 3 | ⬜ | Listar cuentas registradas |
| 75 | `DELETE` | `/bridge/external-accounts/:id` | 🔓 | 👤 | 3 | ⬜ | Desactivar cuenta |
| 76 | `POST` | `/bridge/payouts` | 🔓 | 👤 | 3 | ⬜ | Crear payout (con fee + reserva saldo) |
| 77 | `GET` | `/bridge/payouts` | 🔓 | 👤 | 3 | ⬜ | Listar solicitudes de pago |
| 78 | `GET` | `/bridge/payouts/:id` | 🔓 | 👤 | 3 | ⬜ 🆕 | Detalle de payout |
| 79 | `GET` | `/bridge/transfers` | 🔓 | 👤 | 3 | ⬜ | Historial de transferencias |
| 80 | `GET` | `/bridge/transfers/:id` | 🔓 | 👤 | 3 | ⬜ 🆕 | Detalle de transferencia |
| 81 | `POST` | `/bridge/transfers/:id/sync` | 🔓 | 👤 | 3 | ⬜ 🆕 | Sincronizar estado con Bridge API |
| 82 | `POST` | `/bridge/liquidation-addresses` | 🔓 | 👤 | 3 | ⬜ | Crear dirección crypto → fiat |
| 83 | `GET` | `/bridge/liquidation-addresses` | 🔓 | 👤 | 3 | ⬜ | Listar direcciones activas |

### 8b. Admin Endpoints 🆕

| # | Método | Path | Auth | Roles | Fase | Estado | Notas |
|---|---|---|---|---|---|---|---|
| 84 | `POST` | `/admin/bridge/payouts/:id/approve` | 🔓 | 👔 | 4 | ⬜ 🆕 | Aprobar payout pendiente → ejecuta en Bridge |
| 85 | `POST` | `/admin/bridge/payouts/:id/reject` | 🔓 | 👔 | 4 | ⬜ 🆕 | Rechazar payout → libera saldo. Body: { reason } |

---

## 9. Compliance Module (14 endpoints)

### 9a. User Endpoints

| # | Método | Path | Auth | Roles | Fase | Estado | Notas |
|---|---|---|---|---|---|---|---|
| 86 | `POST` | `/compliance/documents/upload-url` | 🔓 | 👤 | 3 | ⬜ 🆕 | URL firmada para subir a Storage |
| 87 | `POST` | `/compliance/documents` | 🔓 | 👤 | 3 | ⬜ 🆕 | Registrar documento tras upload |
| 88 | `GET` | `/compliance/documents` | 🔓 | 👤 | 3 | ⬜ | Query: ?subject_type |
| 89 | `GET` | `/compliance/kyc` | 🔓 | 👤 | 3 | ⬜ | ⚠️ Path: `/compliance/kyc` (no `/compliance/status`) |
| 90 | `GET` | `/compliance/kyb` | 🔓 | 👤 | 3 | ⬜ 🆕 | Estado KYB empresa |
| 91 | `GET` | `/compliance/reviews` | 🔓 | 👤 | 3 | ⬜ 🆕 | Historial de revisiones del usuario |

### 9b. Admin Endpoints

| # | Método | Path | Auth | Roles | Fase | Estado | Notas |
|---|---|---|---|---|---|---|---|
| 92 | `GET` | `/admin/compliance/reviews` | 🔓 | 👔 | 4 | ⬜ | Queries: priority, assigned_to |
| 93 | `GET` | `/admin/compliance/reviews/:id` | 🔓 | 👔 | 4 | ⬜ | Detalle + comentarios + historial |
| 94 | `PATCH` | `/admin/compliance/reviews/:id/assign` | 🔓 | 👔 | 4 | ⬜ 🆕 | ⚠️ Verbo PATCH. Asignar a analista |
| 95 | `PATCH` | `/admin/compliance/reviews/:id/escalate` | 🔓 | 👔 | 4 | ⬜ | ⚠️ Verbo PATCH (no POST) |
| 96 | `POST` | `/admin/compliance/reviews/:id/comments` | 🔓 | 👔 | 4 | ⬜ | ⚠️ Path: `reviews/:id/comments` |
| 97 | `POST` | `/admin/compliance/reviews/:id/approve` | 🔓 | 👔 | 4 | ⬜ | ⚠️ Path incluye `/reviews/` |
| 98 | `POST` | `/admin/compliance/reviews/:id/reject` | 🔓 | 👔 | 4 | ⬜ | ⚠️ Path incluye `/reviews/` |
| 99 | `POST` | `/admin/compliance/reviews/:id/request-changes` | 🔓 | 👔 | 4 | ⬜ | ⚠️ Path incluye `/reviews/`. Body: { reason, required_actions[] } |

> **❌ ELIMINADO:** `POST /admin/compliance/:id/send-to-bridge` — No existe. El envío a Bridge es automático dentro de `approveReview`.

---

## 10. Fees Module (6 endpoints)

| # | Método | Path | Auth | Roles | Fase | Estado | Notas |
|---|---|---|---|---|---|---|---|
| 100 | `GET` | `/fees` | 🔓 | 👤 | 3 | ⬜ | ⚠️ Path: `/fees` (no `/fees/public`). Requiere auth |
| 101 | `GET` | `/admin/fees` | 🔓 | 👔 | 4 | ⬜ | Todas (activas + inactivas) |
| 102 | `POST` | `/admin/fees` | 🔓 | 👑 | 4 | ⬜ | Crear tarifa |
| 103 | `PATCH` | `/admin/fees/:id` | 🔓 | 👑 | 4 | ⬜ | Actualizar tarifa |
| 104 | `GET` | `/admin/fees/overrides/:userId` | 🔓 | 👔 | 4 | ⬜ | Overrides por usuario |
| 105 | `POST` | `/admin/fees/overrides` | 🔓 | 👑 | 4 | ⬜ | ⚠️ userId en body (no path param) |

> **Nota:** Exchange Rates y PSAV no tienen controladores independientes top-level. Sus endpoints admin están embebidos en `AdminPaymentOrdersController`. Los exchange-rates de usuario están en `PaymentOrdersController`.

---

## 11. Notifications Module (4 endpoints)

| # | Método | Path | Auth | Roles | Fase | Estado |
|---|---|---|---|---|---|---|
| 106 | `GET` | `/notifications` | 🔓 | 👤 | 2 | ⬜ |
| 107 | `GET` | `/notifications/unread-count` | 🔓 | 👤 | 2 | ⬜ |
| 108 | `PATCH` | `/notifications/:id/read` | 🔓 | 👤 | 2 | ⬜ |
| 109 | `PATCH` | `/notifications/read-all` | 🔓 | 👤 | 2 | ⬜ |

---

## 12. Support Module (7 endpoints)

| # | Método | Path | Auth | Roles | Fase | Estado | Notas |
|---|---|---|---|---|---|---|---|
| 110 | `POST` | `/support/tickets` | 🔓 | 👤 | 2 | ⬜ | Crear ticket |
| 111 | `GET` | `/support/tickets` | 🔓 | 👤 | 2 | ⬜ | Mis tickets |
| 112 | `GET` | `/support/tickets/:id` | 🔓 | 👤 | 2 | ⬜ | Detalle ticket |
| 113 | `GET` | `/admin/support/tickets` | 🔓 | 👔 | 4 | ⬜ | Queries: status, assigned_to, page |
| 114 | `PATCH` | `/admin/support/tickets/:id/assign` | 🔓 | 👔 | 4 | ⬜ | ⚠️ Verbo PATCH (no POST) |
| 115 | `PATCH` | `/admin/support/tickets/:id/status` | 🔓 | 👔 | 4 | ⬜ | ⚠️ Verbo PATCH (no POST) |
| 116 | `PATCH` | `/admin/support/tickets/:id/resolve` | 🔓 | 👔 | 4 | ⬜ | ⚠️ Verbo PATCH (no POST) |

---

## 13. Admin Module (12 endpoints)

### 13a. Public Settings (sin auth)

| # | Método | Path | Auth | Roles | Fase | Estado | Notas |
|---|---|---|---|---|---|---|---|
| 117 | `GET` | `/settings/public` | ❌ | Público | 2 | ⬜ 🆕 | Config pública de la app |

### 13b. Activity (usuario autenticado)

| # | Método | Path | Auth | Roles | Fase | Estado | Notas |
|---|---|---|---|---|---|---|---|
| 118 | `GET` | `/activity` | 🔓 | 👤 | 2 | ⬜ 🆕 | Feed de actividad del usuario logueado. Query: ?limit |

### 13c. Admin Panel

| # | Método | Path | Auth | Roles | Fase | Estado | Notas |
|---|---|---|---|---|---|---|---|
| 119 | `GET` | `/admin/settings` | 🔓 | 👑 | 4 | ⬜ | Listar todos los settings |
| 120 | `POST` | `/admin/settings` | 🔓 | 👑👑 | 4 | ⬜ | Crear setting (super_admin only) |
| 121 | `PATCH` | `/admin/settings/:key` | 🔓 | 👑👑 | 4 | ⬜ | Actualizar setting |
| 122 | `GET` | `/admin/audit-logs` | 🔓 | 👔 | 4 | ⬜ | Queries: performed_by, action, table_name, page |
| 123 | `GET` | `/admin/audit-logs/user/:userId` | 🔓 | 👔 | 4 | ⬜ 🆕 | Audit logs por usuario específico |
| 124 | `GET` | `/admin/activity/:userId` | 🔓 | 👔 | 4 | ⬜ | ⚠️ Path: userId como path param (no query) |

### 13d. Reconciliación Financiera 🆕

| # | Método | Path | Auth | Roles | Fase | Estado | Notas |
|---|---|---|---|---|---|---|---|
| 125 | `POST` | `/admin/reconciliation/run` | 🔓 | 👑 | 4 | ⬜ 🆕 | Ejecutar reconciliación manual |
| 126 | `GET` | `/admin/reconciliation` | 🔓 | 👑 | 4 | ⬜ 🆕 | Historial de reconciliaciones. Query: ?page |
| 127 | `GET` | `/admin/reconciliation/:id` | 🔓 | 👑 | 4 | ⬜ 🆕 | Detalle + informe discrepancias |

### 13e. Transaction Limits (en compliance controller) 🆕

| # | Método | Path | Auth | Roles | Fase | Estado | Notas |
|---|---|---|---|---|---|---|---|
| 128 | `POST` | `/admin/users/:id/limits` | 🔓 | 👑 | 4 | ⬜ 🆕 | Límites de transacción personalizados |

---

## 14. Webhooks Module (Server-Only)

| # | Método | Path | Auth | Roles | Fase | Estado |
|---|---|---|---|---|---|---|
| 129 | `POST` | `/webhooks/bridge` | HMAC | Server | — | 🚫 |

> Los webhooks son procesados server-side y no requieren consumo directo del frontend. Los efectos (actualizaciones de estado en transfers, deposits, KYB) impactan los datos que el frontend consume a través de los otros endpoints.

---

## Resumen por Fase

| Fase | Endpoints a implementar | Porcentaje del total |
|---|---|---|
| Fase 1 | 1 (auth/refresh para interceptor) | 1% |
| Fase 2 | 20 endpoints (Auth me/logout, Profile, Wallet, Ledger, Notifications, Support, Activity, Settings public) | 16% |
| Fase 3 | 48 endpoints (PaymentOrders user, Onboarding completo, Bridge user, Compliance user, Suppliers, Fees public) | 37% |
| Fase 4 | 59 endpoints (Admin: orders, bridge, compliance, profiles, wallets, ledger, fees, support, settings, audit, reconciliation, limits) | 46% |
| **Total** | **128 endpoints** (129 incluyendo webhook server-only) | **100%** |

---

## Resumen por Tipo de Acceso

| Tipo | Cantidad | Descripción |
|---|---|---|
| Público (sin auth) | 4 | Registro, forgot-password, exchange rates (vía PO), settings público |
| Auth especial (🔓⚡) | 1 | Reset password con token de email |
| Usuario autenticado (👤) | 63 | Operaciones del usuario sobre sus propios datos |
| Staff/Admin (👔) | 29 | Listados admin, reviews, tickets |
| Admin/Super Admin (👑) | 28 | Configuración, freeze, ajustes, compliance actions, reconciliación |
| Super Admin (👑👑) | 3 | Creación de settings |
| Server-only (🚫) | 1 | Webhook Bridge |

---

## Changelog vs versión anterior

| Cambio | Cantidad | Detalle |
|---|---|---|
| Endpoints agregados | +23 | Auth (4), Onboarding (7), Bridge (7), Compliance (4), Admin (5), Wallets (1) |
| Endpoints eliminados | -2 | `GET /auth/session`, `POST /admin/compliance/:id/send-to-bridge` |
| Paths corregidos | 18 | Onboarding (8), Compliance (6), Wallets (1), Ledger (1), Fees (2) |
| Verbos corregidos | 5 | PATCH vs POST en onboarding submit, compliance escalate/assign, support admin |
| **Total anterior** | **106** | — |
| **Total actual** | **128 + 1 webhook = 129** | — |
