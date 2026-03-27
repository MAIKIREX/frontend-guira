# Auditoría Detallada: Nueva Base de Datos (new_db) — Guira Production

> **Fecha:** 2026-03-26  
> **Auditor:** Análisis técnico generado con base en la documentación de Bridge API, los flujos de negocio del proyecto actual, y las mejores prácticas de sistemas financieros de producción.  
> **Alcance:** Evaluación de la nueva propuesta de base de datos (`new_db`) para los servicios: Exterior→Bolivia, USA→Wallet, Bolivia→Exterior, Crypto→Crypto, y la integración con Bridge API.

---

## 📊 Resumen General

| Categoría | Calificación | Observación |
|---|---|---|
| Cobertura de servicios del negocio | ✅ **9/10** | Todos los flujos principales cubiertos. Falta soporte explícito para PIX/SPEI. |
| Integración con Bridge API | ✅ **8.5/10** | Muy bien alineada. Faltan columnas clave de receipt y tx_hash. |
| Seguridad y compliance | ✅ **9/10** | RLS, audit_logs inmutables, OFAC screening. Excelente base. |
| Integridad financiera | ✅ **9.5/10** | Modelo híbrido balances + ledger es correcto y sólido. |
| Trazabilidad | ✅ **9/10** | Webhook sink + compliance_review_events bien diseñados. |
| Escalabilidad | ✅ **8/10** | Estructura relacional limpia. Puede añadir batch payments y cards. |

---

## 🔍 SECCIÓN 1: Revisión por Servicio del Negocio

---

### 🌏 SERVICIO 1: Exterior → Bolivia (Pay-In Fiat Internacional)

**Descripción del servicio:** Un remitente en USA, Europa o Latinoamérica envía dinero vía Wire/ACH/SEPA/SPEI/PIX hacia la cuenta de un usuario boliviano en Guira. El dinero aterriza como USDC en la wallet del usuario.

**Flujo en new_db:**
```
remitente → Wire/ACH/SEPA → bridge_virtual_accounts
         → webhook_events (pending)
         → CRON: payment_orders + ledger_entries + UPDATE balances
         → notifications
```

#### ✅ Lo que está bien
- `bridge_virtual_accounts` almacena `routing_number`, `account_number`, `bank_name` → correcto para USD ACH/Wire.
- `webhook_events` con patrón Inbox garantiza que ningún depósito se pierde.
- `CRON worker` + `ledger_entries` + `balances` cover el flujo completo.

#### ⚠️ Hallazgos y Recomendaciones

| # | Hallazgo | Impacto | Recomendación |
|---|---|---|---|
| 1.1 | `bridge_virtual_accounts` solo modela USD (routing_number/account_number). No tiene campo para `clabe` (MXN), `iban` (EUR), `br_code` (BRL), `sort_code` (GBP). | **ALTO** — Si se aceptan remesas desde MX, EU, BR o UK, no se pueden guardar las instrucciones de depósito. | Añadir columnas: `clabe text`, `iban text`, `br_code text`, `sort_code text`, `source_currency text` NOT NULL. |
| 1.2 | `payment_orders` no guarda el `sender_name` ni `deposit_message` (campo vital para matching en Bridge). | **MEDIO** — La rastreabilidad del remitente queda en `raw_payload` del webhook, no como dato consultable. | Añadir `sender_name text`, `deposit_message text`, `bank_name text` a `payment_orders`. |
| 1.3 | No existe tabla de tipo `exchange_rates` ni registro de la tasa de cambio aplicada en el momento del depósito (USD→USDC). | **MEDIO** — Para auditorías financieras o disputas, es imposible verificar qué tasa aplicó Bridge en un depósito histórico sin consultar a Bridge. | Añadir `exchange_rate numeric(18,8)` y `exchange_rate_source text` a `payment_orders`. |
| 1.4 | `bridge_virtual_account_events` no tiene campo `receipt jsonb` para guardar el receipt de Bridge (initial_amount, exchange_fee, developer_fee, final_amount). | **MEDIO** | Añadir `receipt jsonb` o columnas individuales: `initial_amount`, `exchange_fee`, `developer_fee_amount`, `final_amount`. |

---

### 🇺🇸 SERVICIO 2: USA → Wallet del Cliente (Pay-In Directo)

**Descripción del servicio:** Un usuario en USA envía dinero desde su cuenta bancaria personal hacia su propia wallet en Guira. Se usa una Virtual Account USD (ACH Push).

**Flujo en new_db:** Idéntico a Servicio 1. La Virtual Account USD ya cubre este flujo.

#### ✅ Lo que está bien
- El flujo está completamente modelado.
- `bridge_virtual_accounts.developer_fee_percent` guarda el fee aplicado.

#### ⚠️ Hallazgos

| # | Hallazgo | Impacto | Recomendación |
|---|---|---|---|
| 2.1 | No hay un campo `beneficiary_address` en `bridge_virtual_accounts`. Bridge lo devuelve y es necesario para que el remitente pueda enviar un Wire (los wires requieren dirección del beneficiario). | **ALTO** | Añadir `bank_beneficiary_address text` y `bank_address text` a `bridge_virtual_accounts`. |
| 2.2 | `wallets.address` referencia la dirección de destino de la VA. Pero si un usuario tiene múltiples wallets (Ethereum, Solana, Polygon), no está claro cuál dirección se usa como destino en cada VA. | **ALTO** — Risk de fondos enviados a la red equivocada. | Añadir `destination_wallet_id uuid FK→wallets.id` a `bridge_virtual_accounts` para hacer explícita qué wallet recibe los fondos de esa VA específica. |
| 2.3 | No existe un estado `deactivated` en el flujo de VA. Si una VA se desactiva en Bridge (ej. por KYC rechazado), esto no se refleja localmente. | **MEDIO** | El campo `status` existe, confirmar que incluye `'deactivated'` y `'suspended'` además de `'activated'`. |

---

### 🇧🇴 SERVICIO 3: Bolivia → Exterior (Payout / Retiro Internacional)

**Descripción del servicio:** Un usuario boliviano quiere enviar dinero a su cuenta bancaria en el exterior (USA, Europa, Latam). Guira convierte USDC de la wallet del usuario en USD fiat y lo envía vía Wire/ACH/SEPA a la cuenta bancaria registrada.

**Flujo en new_db:**
```
balances.available_amount verificado → payout_requests (status='pending_review')
    → bridge_transfers (on_behalf_of, source:usdc, destination:ach/wire)
    → ledger_entries (withdrawal -amount)
    → UPDATE balances (amount--, reserved--)
    → webhook: transfer.complete → certificates
```

#### ✅ Lo que está bien
- `payout_requests` tiene `idempotency_key` → prevent double execution.
- `bridge_transfers` guarda `source_payment_rail` y `destination_payment_rail`.
- `fees_config` + `customer_fee_overrides` permiten monetización flexible.
- `bridge_external_accounts` guarda las cuentas bancarias destino.

#### ⚠️ Hallazgos

| # | Hallazgo | Impacto | Recomendación |
|---|---|---|---|
| 3.1 | `bridge_transfers` no guarda el `receipt` completo devuelto por Bridge (initial_amount, exchange_fee, developer_fee, final_amount, destination_tx_hash). Estos datos son críticos para auditoría y para emitir certificados correctos. | **ALTO** | Añadir columnas a `bridge_transfers`: `receipt_initial_amount numeric`, `receipt_exchange_fee numeric`, `receipt_developer_fee numeric`, `receipt_final_amount numeric`, `destination_tx_hash text`. |
| 3.2 | `bridge_transfers` no guarda `source_deposit_instructions` ni `deposit_message`. Si el estado queda en `awaiting_funds`, no hay datos para mostrarle al cliente qué instrucciones debe seguir. | **ALTO** | Añadir `source_deposit_instructions jsonb` y `deposit_message text` a `bridge_transfers`. |
| 3.3 | `bridge_external_accounts` no guarda el `owner.type` (individual/business) ni `owner.name` requeridos por Bridge para validar titularidad de la cuenta bancaria. | **MEDIO** | Añadir `owner_name text`, `owner_type text CHECK ('individual', 'business')` a `bridge_external_accounts`. |
| 3.4 | `payout_requests` no guarda `business_purpose` con suficiente detalle. Para compliance internacional (especialmente retiros grandes hacia Europa), reguladores exigen el propósito específico del pago. | **MEDIO** | El campo `business_purpose` existe pero se recomienda añadir `beneficiary_name text` y `beneficiary_reference text` (número de factura o contrato) para trazabilidad total. |
| 3.5 | No existe soporte explícito para SEPA (retiros a cuentas europeas con IBAN). `bridge_external_accounts` tiene `routing_number` y `account_number` pero no `iban` ni `bic_swift`. | **ALTO** — Si hay usuarios europeos, sus payouts no se pueden modelar. | Añadir `iban text`, `bic_swift text`, `payment_rail text` a `bridge_external_accounts`. |

---

### ₿ SERVICIO 4: Crypto → Crypto (On-chain Swaps)

**Descripción del servicio:** Un usuario envía USDC en Ethereum y quiere recibirlo en USDT en Solana, o en USDC en Polygon. Bridge maneja la conversión cross-chain.

**Flujo en new_db:**
```
payout_requests (source: eth/usdc, destination: solana/usdt)
    → bridge_transfers (transfer_kind='crypto_to_crypto')
    → ledger_entries (withdrawal)
    → webhook: transfer.complete
```

#### ✅ Lo que está bien
- `bridge_transfers.transfer_kind` puede marcar `'crypto_to_crypto'`.
- `bridge_liquidation_addresses` cubre el caso de receiving crypto y convertir a fiat automáticamente.

#### ⚠️ Hallazgos

| # | Hallazgo | Impacto | Recomendación |
|---|---|---|---|
| 4.1 | No existe una tabla de tipo `bridge_wallets` (wallets custodias de Bridge) separada de `wallets`. `wallets` es la tabla del cliente, pero para Crypto→Crypto usando fondos de la plataforma (prefunded), se necesita distinguir entre la wallet del cliente y la wallet del operador (Hot Wallet de Guira). | **ALTO** — Risk de confusión entre fondos del cliente y fondos de la plataforma. | Crear tabla `platform_wallets` (o documentar en `wallets` con `owner_type = 'platform' | 'client'`): representa las wallets de Guira usadas como fuente en transfers custodios. |
| 4.2 | `bridge_liquidation_addresses` no guarda `destination_currency` ni `destination_payment_rail` como columnas tipadas. Si se quiere consultar qué liquidation addresses están configuradas con SEPA vs ACH, hay que parsear el JSON. | **BAJO** | Confirmar que los campos están tipados en el schema, no solo en `raw_payload`. |
| 4.3 | No existe registro de `exchange_rate_snapshot` para operaciones Crypto→Crypto. La tasa ETH/USDC al momento del swap es un dato financiero crítico. | **MEDIO** | Añadir `exchange_rate numeric(18,8)`, `exchange_rate_at timestamptz` a `bridge_transfers`. |
| 4.4 | `wallets` tiene `currency` (ej. `USDC`) pero no `network` como parte del UNIQUE constraint junto con `user_id`. Si un usuario tiene USDC en Ethereum Y USDC en Solana, el constraint `(user_id, currency, network)` los distingue correctamente. Verificar que `network` existe en el constraint. | **ALTO** — Depósitos podrían acreditarse a la wallet equivocada. | Confirmar en la definición SQL que el UNIQUE CONSTRAINT es `(user_id, currency, network)` — no solo `(user_id, currency)`. |

---

## 🔍 SECCIÓN 2: Integración con Bridge API — Análisis Técnico

---

### 2.1 Customers y KYC

| Verificación | Estado | Observación |
|---|---|---|
| `profiles.bridge_customer_id` guarda el customer ID de Bridge | ✅ OK | |
| Se soporta el flujo de KYC Link (link generado por Bridge para verificación interactiva) | ⚠️ Parcial | No existe tabla para guardar los `kyc_links` generados por Bridge. Si Bridge devuelve un link, no hay dónde guardarlo ni rastrear su estado. Añadir `bridge_kyc_links (id, user_id, link_url, status, expires_at)`. |
| `kyc_applications.provider_id` guarda el bridge_customer_id una vez aprobado | ✅ OK | |
| El campo `tos_contract_id` rastrea la versión de ToS que Bridge requiere | ✅ OK | |

### 2.2 Virtual Accounts

| Verificación | Estado | Observación |
|---|---|---|
| `bridge_virtual_accounts` guarda el `bridge_virtual_account_id` (ID en Bridge) | ✅ OK | |
| Soporte para VA USD (ACH + Wire) | ✅ OK | routing_number + account_number presentes |
| Soporte para VA EUR (SEPA/IBAN) | ❌ FALTA | No hay columna `iban` |
| Soporte para VA MXN (SPEI/CLABE) | ❌ FALTA | No hay columna `clabe` |
| Soporte para VA BRL (PIX) | ❌ FALTA | No hay columna `br_code` |
| Soporte para VA GBP (FPS) | ❌ FALTA | No hay columna `sort_code` |
| `developer_fee_percent` guardado | ✅ OK | |
| `destination_address` (wallet que recibe los USDC) vinculado a `wallets.id` | ⚠️ No explícito | `bridge_virtual_accounts.destination_address` es `text`, no FK → `wallets.id`. Puede causar inconsistencias. |

### 2.3 Transfers

| Verificación | Estado | Observación |
|---|---|---|
| `idempotency_key` presente en `bridge_transfers` y `payout_requests` | ✅ OK | |
| `on_behalf_of` → se usa `profiles.bridge_customer_id` | ✅ OK | |
| Estado `awaiting_funds` → `payment_processed` → `complete` → `failed` | ⚠️ Parcial | Solo se modela `status` como text. No hay constraint CHECK con los estados válidos de Bridge. |
| `receipt` (initial_amount, exchange_fee, developer_fee, final_amount, destination_tx_hash) | ❌ FALTA | Ninguno de estos campos está en `bridge_transfers`. |
| `source_deposit_instructions.deposit_message` guardado | ❌ FALTA | |
| `exchange_rate` guardado al momento de la transacción | ❌ FALTA | |

### 2.4 Webhooks

| Verificación | Estado | Observación |
|---|---|---|
| `webhook_events` con Inbox Pattern | ✅ EXCELENTE | |
| `provider_event_id` para deduplicación | ✅ OK | |
| `retry_count` para manejo de fallos | ✅ OK | |
| Soporte para evento `liquidation_address.payment_completed` | ⚠️ No explícito | Solo se menciona `virtual_account.funds_received`. Añadir a `event_type` CHECK. |
| Soporte para `transfer.payment_processed` (estado intermedio) | ⚠️ No explícito | Solo se menciona `transfer.complete`. Falta el estado intermedio que Bridge envía primero. |
| Checksum/signature verification del webhook de Bridge | ❌ FALTA | Bridge firma sus webhooks. No hay tabla o campo para guardar el `bridge_signature` verificado. Añadir `signature_verified boolean default false` a `webhook_events`. |

---

## 🔍 SECCIÓN 3: Seguridad y Compliance

| Hallazgo | Estado | Recomendación |
|---|---|---|
| RLS en todas las tablas | ✅ OK | |
| `audit_logs` inmutables (sin UPDATE/DELETE) | ✅ EXCELENTE | |
| `auth_rate_limits` contra fuerza bruta | ✅ OK | |
| `compliance_review_events` inmutables | ✅ EXCELENTE | |
| OFAC screening guardado en `kyc_applications.screening` jsonb | ✅ OK | Considerar añadir `pep_screening jsonb` separado para ejecuciones de PEP check. |
| `is_pep` en `people` y `business_ubos` | ✅ OK | |
| No existe tabla `blacklist_checks` para registrar resultados de listas externas (OFAC, UN, EU) | ⚠️ | Para auditorías serias, se recomienda guardar el resultado de cada check en tabla separada con timestamp. |
| Límites de transacción por usuario (límites AML) | ❌ FALTA | No hay tabla `transaction_limits` o campo en `profiles` para límites individuales (ej. max $10,000/día). Crítico para AML. |
| `audit_logs` no tiene campo `ip_address` ni `user_agent` | ⚠️ | Añadir `ip_address inet`, `user_agent text` para trazabilidad forense completa. |
| No existe campo `is_frozen` en `profiles` o `wallets` para bloqueo de cuenta por OFAC | ⚠️ MEDIO | Añadir `is_frozen boolean default false` y `frozen_reason text` a `profiles` y `wallets`. |

---

## 🔍 SECCIÓN 4: Integridad Financiera

| Hallazgo | Estado | Recomendación |
|---|---|---|
| Modelo híbrido: `balances` (mutable visible) + `ledger_entries` (inmutable histórico) | ✅ EXCELENTE | Mejor práctica de sistemas financieros de producción. |
| `balances.reserved_amount` para fondos bloqueados en retiros | ✅ OK | |
| `balances.available_amount` como computed field actualizado por trigger | ✅ OK | |
| `ledger_entries` sin UPDATE/DELETE (solo INSERT) | ✅ OK | Confirmar que hay trigger que rechaza UPDATE/DELETE. |
| No existe tabla `reconciliation_runs` para registrar ejecuciones de conciliación | ❌ FALTA | Para producción financiera, se necesita registrar cuándo se hizo la conciliación entre `balances` y `SUM(ledger_entries)`. |
| `certificates` guarda comprobantes inmutables de transacciones | ✅ OK | |
| `fees_config` y `customer_fee_overrides` permiten monetización flexible | ✅ OK | |
| No hay tabla de tipo `dispute_requests` para reversos y disputas | ⚠️ | Cuando un usuario disputa un cargo o Bridge reversa un transfer, no hay tabla para gestionar el proceso de reversión formal. |

---

## 🔍 SECCIÓN 5: Tablas Faltantes / Funcionalidades No Cubiertas

| Tabla/Feature | Justificación |
|---|---|
| **`bridge_kyc_links`** | Bridge puede generar links de KYC interactivo. Si se usa este flujo, no hay dónde guardar el link, su estado y fecha de expiración. |
| **`transaction_limits`** | Límites AML por usuario (diarios, semanales, mensuales) por tipo de transacción. Crítico para compliance. |
| **`dispute_requests`** | Gestión de disputas, reversas y chargebacks. Essential en producción. |
| **`reconciliation_runs`** | Registro de cuándo y con qué resultado se corrió el proceso de conciliación `balances = SUM(ledger_entries)`. |
| **`exchange_rate_history`** | Guardar tasas históricas de cambio (USD/USDC, EUR/USDC) para auditoría y cálculo retrospectivo de transacciones. |
| **`platform_wallets`** | Distinguir entre wallets del cliente y hot wallets de la plataforma usadas como fuente en transfers. |
| **`cards`** (futuro) | Bridge soporta emisión de tarjetas Visa. Si se planea esta feature, la arquitectura actual no tiene soporte. |
| **`batch_settlements`** (futuro) | Bridge soporta liquidaciones masivas en lote. No está cubierto. |

---

## 🔍 SECCIÓN 6: Hallazgos en Columnas Específicas

### Tabla `bridge_virtual_accounts` — Columnas a añadir

```sql
ALTER TABLE bridge_virtual_accounts ADD COLUMN IF NOT EXISTS
  source_currency         text NOT NULL DEFAULT 'usd',
  clabe                   text,                    -- MXN/SPEI
  iban                    text,                    -- EUR/SEPA
  br_code                 text,                    -- BRL/PIX
  sort_code               text,                    -- GBP/FPS
  bank_beneficiary_address text,                  -- Requerido para Wire
  bank_address            text,                    -- Dirección de Lead Bank
  destination_wallet_id   uuid REFERENCES wallets(id),  -- FK explícita a wallet destino
  deactivated_at          timestamptz;             -- Cuando Bridge desactiva la VA
```

### Tabla `bridge_transfers` — Columnas a añadir

```sql
ALTER TABLE bridge_transfers ADD COLUMN IF NOT EXISTS
  bridge_state            text,                    -- awaiting_funds | payment_processed | complete | failed
  source_deposit_instructions jsonb,              -- Para mostrar instrucciones al cliente
  deposit_message         text,                    -- Mensaje de referencia obligatorio
  receipt_initial_amount  numeric(20,6),           -- Del receipt de Bridge
  receipt_exchange_fee    numeric(20,6),
  receipt_developer_fee   numeric(20,6),
  receipt_final_amount    numeric(20,6),
  destination_tx_hash     text,                    -- Hash de la transacción blockchain final
  exchange_rate           numeric(18,8),           -- Tasa aplicada en el momento
  exchange_rate_at        timestamptz;             -- Cuando se capturó la tasa
```

### Tabla `bridge_external_accounts` — Columnas a añadir

```sql
ALTER TABLE bridge_external_accounts ADD COLUMN IF NOT EXISTS
  owner_name              text,                    -- Nombre del titular
  owner_type              text CHECK (owner_type IN ('individual', 'business')),
  iban                    text,                    -- Para cuentas europeas
  bic_swift               text,                    -- SWIFT para transfers internacionales
  payment_rail            text,                    -- ach | wire | sepa | fps
  verified                boolean DEFAULT false;   -- Si Bridge verificó la cuenta
```

### Tabla `webhook_events` — Columnas a añadir

```sql
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS
  signature_verified      boolean DEFAULT false,   -- Firma Bridge verificada
  bridge_event_version    text;                    -- Versión de la API del evento
```

### Tabla `profiles` — Columnas a añadir

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  is_frozen               boolean DEFAULT false,   -- Cuenta bloqueada por OFAC/AML
  frozen_reason           text,                    -- Razón del bloqueo
  daily_limit_usd         numeric(20,2) DEFAULT 10000,   -- Límite AML diario
  monthly_limit_usd       numeric(20,2) DEFAULT 50000;
```

---

## ✅ SECCIÓN 7: Lo que Está Correctamente Bien Diseñado

1. **Modelo híbrido de saldo** (`balances` + `ledger_entries`): Es la arquitectura correcta para sistemas financieros de producción. Permite consultas instantáneas de saldo sin comprometer la integridad del ledger.

2. **Onboarding relacional** (`people`, `businesses`, `business_directors`, `business_ubos`, `kyc_applications`, `kyb_applications`): Reemplazar el JSON dinámico por tablas relacionales es la decisión correcta para un sistema que maneja dinero real. Permite validaciones SQL, índices eficientes y queries de compliance estructuradas.

3. **Bridge wallets con address/network/provider** (`wallets`): Modelar wallets como direcciones blockchain reales con proveedor custodio es la arquitectura correcta para integrar con Bridge Bridge Wallets.

4. **Webhook Sink Pattern** (`webhook_events`): Excelente. Sin este patrón, los depósitos se perderían en caso de downtime.

5. **Idempotency keys** en `payout_requests` y `bridge_transfers`: Fundamental para evitar doble ejecución.

6. **Compliance audit trail inmutable** (`compliance_review_events`, `audit_logs`): Arquitectura excelente para cumplir con regulaciones AML/KYC internacionales.

7. **`bridge_pull_jobs`** para reconciliación forzada: Excelente para detectar y recuperar gaps transaccionales.

---

## 📋 PRIORIZACIÓN DE MEJORAS

### 🔴 Crítico (implementar antes de go-live)
1. Añadir columnas a `bridge_virtual_accounts`: `iban`, `clabe`, `br_code`, `destination_wallet_id`, `bank_beneficiary_address`
2. Añadir `receipt_*` y `destination_tx_hash` a `bridge_transfers`
3. Añadir `is_frozen` a `profiles` y `wallets`
4. Añadir `iban`, `bic_swift`, `owner_name`, `owner_type`, `payment_rail` a `bridge_external_accounts`
5. Crear tabla `transaction_limits`

### 🟡 Importante (sprint siguiente)
1. Crear tabla `bridge_kyc_links`
2. Añadir `ip_address`, `user_agent` a `audit_logs`
3. Añadir `signature_verified` a `webhook_events`
4. Crear tabla `reconciliation_runs`
5. Añadir `exchange_rate` y `exchange_rate_at` a `bridge_transfers`

### 🟢 Mejora futura
1. Tabla `dispute_requests`
2. Tabla `exchange_rate_history`
3. Tabla `platform_wallets`
4. Preparación para `cards` (Bridge Visa cards)
5. Preparación para `batch_settlements`
