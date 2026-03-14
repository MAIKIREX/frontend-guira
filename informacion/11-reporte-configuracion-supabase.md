# Reporte de Configuracion de Base de Datos y Backend en Supabase

## Objetivo

Este documento resume como esta configurado el backend actual de Guira sobre Supabase, que tablas y buckets usa el frontend, que payloads JSON espera, y como fluye la operacion segun los contratos detectados en la documentacion y el codigo vigente.

Fuentes usadas:

- `informacion/03-onboarding-y-validacion.md`
- `informacion/04-operaciones-y-pagos.md`
- `informacion/05-staff-admin-y-soporte.md`
- `informacion/06-contratos-backend-supabase.md`
- `types/payment-order.ts`
- `types/staff.ts`
- `lib/supabase/browser.ts`

---

## 1. Conexion y acceso a Supabase

### Variables de entorno activas en la app actual

La implementacion actual en Next.js usa:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Nota:
- La documentacion historica menciona `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` porque el proyecto anterior venia de Vite.
- En el frontend actual de Next.js las variables efectivas son las `NEXT_PUBLIC_*`.

### Tipo de cliente

- Cliente browser con `createBrowserClient()`.
- Sesion gestionada por Supabase Auth.
- La app depende de que exista una fila en `profiles` para cada usuario autenticado.

---

## 2. Modelo general del backend

La base de datos esta organizada alrededor de 4 ejes:

1. Identidad y permisos.
2. Onboarding y validacion documental.
3. Operaciones financieras sobre `payment_orders` y `bridge_transfers`.
4. Trazabilidad mediante `activity_logs`, `audit_logs`, `notifications` y archivos en Storage.

### Regla estructural importante

El sistema sigue el patron `Order First`:

1. primero se crea el expediente,
2. luego se muestran instrucciones,
3. despues se suben evidencias,
4. staff valida,
5. cliente autoriza la cotizacion final,
6. staff ejecuta y cierra.

---

## 3. Tablas principales y contrato funcional

## 3.1 `profiles`

### Funcion

Controla identidad operativa del usuario.

### Campos detectados

- `id`
- `email`
- `role`
- `full_name`
- `onboarding_status`
- `bridge_customer_id`
- `created_at`
- `is_archived`
- `metadata`

### Uso desde frontend

- determinar si el usuario es `client`, `staff` o `admin`,
- bloquear acceso si `is_archived = true`,
- redirigir a onboarding si `onboarding_status !== 'verified'`,
- mostrar nombre y email,
- sincronizar el estado de onboarding.

### Ejemplo de registro

```json
{
  "id": "4f4a1c1f-8f2f-4e7f-a8a9-2f24f0d8d5d1",
  "email": "cliente@guira.com",
  "role": "client",
  "full_name": "Industrial Albus S.A.",
  "onboarding_status": "verified",
  "bridge_customer_id": null,
  "created_at": "2026-03-14T10:00:00Z",
  "is_archived": false,
  "metadata": {}
}
```

---

## 3.2 `onboarding`

### Funcion

Expediente KYC/KYB del cliente.

### Campos detectados

- `id`
- `user_id`
- `type`
- `status`
- `data`
- `observations`
- `bridge_customer_id`
- `created_at`
- `updated_at`

### Tipos

- `personal`
- `company`

### Estados

- `draft`
- `submitted`
- `under_review`
- `verified`
- `rejected`
- `needs_changes`
- `waiting_ubo_kyc`

### JSON de borrador

```json
{
  "id": "opcional",
  "user_id": "uuid",
  "type": "personal",
  "status": "draft",
  "data": {
    "email": "cliente@guira.com",
    "phone": "+59170000000",
    "first_names": "Juan",
    "last_names": "Perez"
  },
  "updated_at": "2026-03-14T10:00:00Z"
}
```

### JSON de envio

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "type": "company",
  "status": "submitted",
  "data": {
    "company_legal_name": "Industrial Albus S.A.",
    "registration_number": "REG-001",
    "country_of_incorporation": "Bolivia",
    "legal_rep_first_names": "Maria",
    "legal_rep_last_names": "Lopez",
    "docs": {
      "company_cert": "storage_path",
      "legal_rep_id": "storage_path"
    }
  },
  "updated_at": "2026-03-14T10:05:00Z"
}
```

### JSON para UBOs

```json
{
  "status": "under_review",
  "data": {
    "ubos": [
      {
        "first_names": "Carlos",
        "last_names": "Rojas",
        "percentage": 40,
        "nationality": "Boliviana",
        "docs": {
          "passport": "onboarding_docs/user/ubo_0_passport_123.pdf",
          "id_front": "onboarding_docs/user/ubo_0_id_front_123.jpg"
        }
      }
    ]
  },
  "updated_at": "2026-03-14T10:10:00Z"
}
```

### Flujo backend asociado

1. cliente guarda borrador en `onboarding.status = 'draft'`.
2. se suben documentos al bucket `onboarding_docs`.
3. se registran punteros en `documents`.
4. al enviar, `onboarding.status = 'submitted'`.
5. tambien se sincroniza `profiles.onboarding_status`.
6. staff revisa, observa o verifica.
7. si verifica, puede crearse `wallet`.

---

## 3.3 `documents`

### Funcion

Indice de archivos documentales del onboarding.

### Campos detectados

- `onboarding_id`
- `user_id`
- `doc_type`
- `storage_path`
- `mime_type`
- `file_size`

### Regla de `upsert`

- conflicto por `onboarding_id,doc_type`

### Ejemplo JSON

```json
{
  "onboarding_id": "uuid",
  "user_id": "uuid",
  "doc_type": "id_front",
  "storage_path": "user123/id_front_1710000000.jpg",
  "mime_type": "image/jpeg",
  "file_size": 245001
}
```

---

## 3.4 `payment_orders`

### Funcion

Expediente central de pagos y operaciones.

### Campos detectados

- `id`
- `user_id`
- `order_type`
- `processing_rail`
- `amount_origin`
- `origin_currency`
- `amount_converted`
- `destination_currency`
- `exchange_rate_applied`
- `fee_total`
- `status`
- `beneficiary_id`
- `supplier_id`
- `metadata`
- `evidence_url`
- `support_document_url`
- `staff_comprobante_url`
- `created_at`
- `updated_at`

### Tipos de orden

- `BO_TO_WORLD`
- `WORLD_TO_BO`
- `US_TO_WALLET`
- `CRYPTO_TO_CRYPTO`

### Rieles

- `ACH`
- `SWIFT`
- `PSAV`
- `DIGITAL_NETWORK`

### Estados

- `created`
- `waiting_deposit`
- `deposit_received`
- `processing`
- `sent`
- `completed`
- `failed`

### JSON de creacion de orden

```json
{
  "user_id": "uuid",
  "order_type": "BO_TO_WORLD",
  "processing_rail": "SWIFT",
  "amount_origin": 7000,
  "origin_currency": "Bs",
  "destination_currency": "USD",
  "beneficiary_id": null,
  "supplier_id": "uuid",
  "amount_converted": 1000,
  "exchange_rate_applied": 7,
  "fee_total": 25,
  "metadata": {
    "delivery_method": "swift",
    "payment_reason": "Pago a proveedor",
    "intended_amount": 1000,
    "destination_address": "Cuenta bancaria exterior",
    "stablecoin": "USDC",
    "funding_method": "bs",
    "swift_details": {
      "bankName": "Banco Exterior",
      "swiftCode": "BOFAUS3N",
      "iban": "DE1234567890",
      "bankAddress": "Berlin",
      "country": "Germany"
    }
  },
  "status": "created"
}
```

### JSON minimo de `metadata`

```json
{
  "delivery_method": "swift",
  "payment_reason": "Pago internacional",
  "intended_amount": 1000,
  "destination_address": "Cuenta destino",
  "stablecoin": "USDC"
}
```

### JSON extendido para ACH

```json
{
  "delivery_method": "ach",
  "payment_reason": "Fondeo wallet",
  "intended_amount": 1500,
  "destination_address": "Wallet USDC",
  "stablecoin": "USDC",
  "ach_details": {
    "routingNumber": "021000021",
    "accountNumber": "000123456789",
    "bankName": "JPMorgan Chase"
  }
}
```

### JSON extendido para cripto

```json
{
  "delivery_method": "crypto",
  "payment_reason": "Bridge entre redes",
  "intended_amount": 500,
  "destination_address": "0x8f...ab1",
  "stablecoin": "USDT",
  "crypto_destination": {
    "address": "0x8f...ab1",
    "network": "Polygon"
  }
}
```

### JSON para publicar cotizacion final por staff

```json
{
  "exchange_rate_applied": 10.55,
  "amount_converted": 980.25,
  "fee_total": 15,
  "metadata": {
    "quote_prepared_at": "2026-03-14T10:20:00Z",
    "quote_prepared_by": "staff-user-uuid"
  }
}
```

### JSON para aceptacion del cliente

```json
{
  "status": "processing",
  "metadata": {
    "client_quote_accepted_at": "2026-03-14T10:25:00Z"
  }
}
```

### JSON para paso a `sent`

```json
{
  "status": "sent",
  "metadata": {
    "reference": "0xabc123hash"
  }
}
```

### JSON para paso a `completed`

```json
{
  "status": "completed",
  "staff_comprobante_url": "https://public-url-comprobante.pdf",
  "metadata": {
    "completed_at": "2026-03-14T10:40:00Z"
  }
}
```

### JSON para cancelacion o rechazo

```json
{
  "status": "failed",
  "metadata": {
    "rejection_reason": "Cancelado por el usuario"
  }
}
```

### Flujo backend asociado

1. cliente crea `payment_orders`.
2. opcionalmente sube `support_document_url`.
3. cliente sube evidencia y la orden pasa a `waiting_deposit`.
4. staff valida recepcion y cambia a `deposit_received`.
5. staff publica tasa, fee y monto final.
6. cliente acepta la cotizacion final y recien ahi pasa a `processing`.
7. staff registra hash o referencia en `sent`.
8. staff sube comprobante final y pasa a `completed`.
9. si falla o se cancela, se marca `failed`.

---

## 3.5 `suppliers`

### Funcion

Agenda de beneficiarios o contrapartes de pago.

### JSON esperado

```json
{
  "user_id": "uuid",
  "name": "Proveedor Uno",
  "country": "Bolivia",
  "payment_method": "bank",
  "bank_details": {
    "bank_name": "Banco Union",
    "swift_code": "BUNIBOLX",
    "account_number": "00112233",
    "bank_country": "Bolivia"
  },
  "crypto_details": {
    "address": ""
  },
  "address": "Av. Principal 123",
  "phone": "+59170001122",
  "email": "proveedor@example.com",
  "tax_id": "NIT-123"
}
```

---

## 3.6 `wallets`

### Funcion

Asocia una wallet operativa al usuario.

### Campos minimos

- `id`
- `user_id`
- `currency`

### Ejemplo JSON

```json
{
  "user_id": "uuid",
  "currency": "USD"
}
```

---

## 3.7 `ledger_entries`

### Funcion

Fuente de verdad del balance operativo.

### Campos

- `wallet_id`
- `bridge_transfer_id`
- `type`
- `amount`
- `description`
- `metadata`
- `created_at`

### Tipos

- `deposit`
- `payout`

### Ejemplo JSON

```json
{
  "wallet_id": "wallet-uuid",
  "bridge_transfer_id": "bridge-uuid",
  "type": "deposit",
  "amount": 500,
  "description": "Ingreso confirmado desde bridge",
  "metadata": {
    "system": "guira-bridge-v1"
  }
}
```

---

## 3.8 `bridge_transfers`

### Funcion

Transferencias relacionadas al dominio wallet/bridge.

### JSON detectado

```json
{
  "user_id": "uuid",
  "idempotency_key": "transfer-20260314-001",
  "transfer_kind": "wallet_to_external_crypto",
  "business_purpose": "client_withdrawal",
  "amount": 200,
  "currency": "USD",
  "status": "pending",
  "destination_type": "external_crypto_address",
  "destination_id": null,
  "fee_amount": 3,
  "net_amount": 197,
  "exchange_rate": 1,
  "metadata": {
    "system": "guira-bridge-v1",
    "network": "Polygon",
    "timestamp": "2026-03-14T10:30:00Z"
  }
}
```

### Validaciones front detectadas

- usuario verificado,
- idempotencia,
- saldo suficiente,
- calculo de fees por `business_purpose`.

---

## 3.9 `notifications`

### Funcion

Sistema de notificaciones internas con realtime.

### Campos

- `user_id`
- `type`
- `title`
- `message`
- `link`
- `is_read`
- `created_at`

### Tipos observados

- `status_change`
- `onboarding_update`
- `new_order`
- `support_update`
- `system`

### Ejemplo JSON

```json
{
  "user_id": "uuid",
  "type": "status_change",
  "title": "Actualizacion de orden",
  "message": "Tu orden ya tiene cotizacion final lista para aprobar.",
  "link": "/transacciones",
  "is_read": false
}
```

---

## 3.10 `support_tickets`

### Funcion

Mesa de soporte del cliente y staff.

### JSON de creacion

```json
{
  "user_id": "uuid",
  "subject": "No puedo completar onboarding",
  "message": "El formulario no guarda mis documentos.",
  "contact_email": "cliente@guira.com",
  "contact_phone": "+59170000000"
}
```

### Estados

- `open`
- `in_progress`
- `resolved`
- `closed`

### Flujo backend asociado

1. cliente crea ticket.
2. staff lo ve en `support_tickets`.
3. staff cambia estado y registra motivo.
4. se crea `audit_logs` y `notifications`.

---

## 3.11 `fees_config`

### Funcion

Configuracion de fees del sistema.

### Campos

- `id`
- `type`
- `fee_type`
- `value`
- `currency`

### Tipos observados

- `route_creation`
- `supplier_payment`

### Ejemplo JSON

```json
{
  "id": "fee-uuid",
  "type": "route_creation",
  "fee_type": "fixed",
  "value": 15,
  "currency": "USD"
}
```

---

## 3.12 `app_settings`

### Funcion

Configuracion global de plataforma.

### Setting confirmado

- `bolivia_exchange_rate`

### Ejemplos validos segun el tipo actual del valor

#### string

```json
{
  "key": "support_email",
  "value": "soporte@guira.com"
}
```

#### number

```json
{
  "key": "bolivia_exchange_rate",
  "value": 6.96
}
```

#### boolean

```json
{
  "key": "maintenance_mode",
  "value": false
}
```

#### json

```json
{
  "key": "client_preferences_defaults",
  "value": {
    "compact_amounts": false,
    "highlight_pending_approvals": true
  }
}
```

---

## 3.13 `psav_configs`

### Funcion

Configuracion de rieles o proveedores PSAV.

### Operaciones detectadas

- `select`
- `upsert`
- `delete`
- filtrado por `is_active`

### Ejemplo JSON generico

```json
{
  "id": "psav-1",
  "is_active": true,
  "provider_name": "Proveedor PSAV",
  "account_reference": "ACC-001",
  "metadata": {
    "country": "USA"
  }
}
```

---

## 3.14 `activity_logs`

### Funcion

Trazabilidad de acciones del usuario.

### JSON esperado

```json
{
  "user_id": "uuid",
  "action": "payment_order_created",
  "metadata": {
    "order_id": "uuid",
    "order_type": "BO_TO_WORLD"
  }
}
```

### Acciones observadas o derivadas

- `login`
- `signup`
- `guardar_borrador`
- `enviar_onboarding`
- `enviar_docs_socios`
- `request_payin`
- `request_payout`
- `create_ticket`
- `payment_order_created`
- `payment_order_file_uploaded`
- `payment_order_quote_accepted`
- `payment_order_cancelled`

---

## 3.15 `audit_logs`

### Funcion

Trazabilidad fuerte para acciones de staff y admin.

### JSON esperado

```json
{
  "performed_by": "uuid",
  "role": "staff",
  "action": "change_status",
  "table_name": "payment_orders",
  "record_id": "uuid",
  "previous_values": {
    "status": "waiting_deposit"
  },
  "new_values": {
    "status": "deposit_received"
  },
  "reason": "Se confirmo el ingreso en el riel local",
  "source": "ui"
}
```

### Regla importante

Si la accion no es `create`, el motivo debe existir y tener al menos 5 caracteres.

---

## 4. Buckets de Storage

## 4.1 `onboarding_docs`

### Uso

- documentos de onboarding,
- documentos de UBOs.

### Patrones observados

- `{userId}/{docKey}_draft_{timestamp}.{ext}`
- `{userId}/{docKey}_{timestamp}.{ext}`
- `{userId}/ubo_{index}_{docKey}_draft_{timestamp}.{ext}`
- `{userId}/ubo_{index}_{docKey}_{timestamp}.{ext}`

### Ejemplo

```json
{
  "storage_path": "7b4d/id_front_1710000000.jpg"
}
```

## 4.2 `order-evidences`

### Uso

- comprobante del cliente,
- respaldo documental,
- comprobante final de staff.

### Columnas asociadas

- `evidence_url`
- `support_document_url`
- `staff_comprobante_url`

### Ejemplo de path

```json
{
  "path": "user-uuid/order-uuid/evidence_url_1710000000.pdf"
}
```

---

## 5. Edge Functions y RPCs

## 5.1 Edge Functions presentes

- `admin-create-user`
- `admin-delete-user`
- `admin-reset-password`
- `admin-unarchive-user`

### `admin-create-user`

#### Body JSON

```json
{
  "email": "user@example.com",
  "password": "secret",
  "full_name": "Nombre Apellido",
  "role": "client"
}
```

#### Flujo

1. valida que quien llama sea admin,
2. crea usuario en Supabase Auth,
3. sincroniza `profiles`,
4. deja `onboarding_status = 'verified'`.

### `admin-delete-user`

#### Body JSON

```json
{
  "userId": "uuid",
  "action": "archive"
}
```

#### Flujo

1. valida admin,
2. revisa historial en `bridge_transfers` y `payment_orders`,
3. si hay historial no permite `delete`,
4. si no hay historial y la accion es `delete`, elimina en Auth,
5. si no, archiva en `profiles` y banea al usuario.

### `admin-reset-password`

#### Body JSON

```json
{
  "email": "user@example.com"
}
```

### `admin-unarchive-user`

#### Body JSON

```json
{
  "userId": "uuid"
}
```

## 5.2 Edge Function usada pero no presente en repo

### `login-proxy`

```json
{
  "email": "user@example.com",
  "password": "secret"
}
```

Nota:
- El frontend actual ya no depende de esta function para loguear, pero fue parte del backend historico detectado.

## 5.3 RPC usada pero no presente en repo

### `check_user_exists`

```json
{
  "p_email": "user@example.com"
}
```

Uso:
- validacion previa antes de recovery de password.

---

## 6. Flujo de funcionamiento backend por modulo

## 6.1 Auth y acceso

1. Supabase Auth crea o valida la sesion.
2. El frontend busca la fila en `profiles`.
3. Segun `role`, `is_archived` y `onboarding_status`, resuelve acceso.
4. Si `profiles` no existe o el usuario esta archivado, no hay acceso operativo.

## 6.2 Onboarding

1. cliente crea borrador en `onboarding`.
2. sube archivos a `onboarding_docs`.
3. registra referencias en `documents`.
4. envia a `submitted`.
5. staff revisa y puede pasar a `needs_changes`, `rejected` o `verified`.
6. al verificar, se sincroniza `profiles.onboarding_status` y puede crearse `wallet`.

## 6.3 Operaciones y pagos

1. cliente crea `payment_orders`.
2. cliente sube respaldo o evidencia.
3. la orden pasa a `waiting_deposit`.
4. staff valida y cambia a `deposit_received`.
5. staff publica cotizacion final.
6. cliente acepta y la orden pasa a `processing`.
7. staff registra referencia `sent`.
8. staff sube comprobante final y la cierra como `completed`.
9. en cada cambio importante se genera `notifications` y `audit_logs`.

## 6.4 Wallet y bridge

1. `wallets` identifica la billetera del usuario.
2. `bridge_transfers` registra transferencias del dominio wallet.
3. `ledger_entries` consolida depositos y payouts.
4. el balance del cliente se calcula desde `ledger_entries`, `bridge_transfers` y `payment_orders` activos.

## 6.5 Soporte

1. cliente crea `support_tickets`.
2. staff los lee y cambia estado.
3. cada cambio genera `audit_logs` y `notifications`.

## 6.6 Staff y admin

1. staff opera onboarding, orders y support.
2. admin ademas opera users, config y PSAV.
3. toda accion sensible debe dejar `reason`, `previous_values`, `new_values` y `source` en `audit_logs`.

---

## 7. Recomendaciones para integrar con este backend

- No cambiar nombres de estados ni enums sin verificar el backend real.
- Mantener `profiles` como fuente de verdad para permisos y onboarding.
- Mantener el patron `Order First`.
- Mantener uploads en los buckets ya usados por el sistema.
- Si una columna acepta `json`, preservar el tipo original en vez de convertir todo a string.
- Tratar `activity_logs`, `audit_logs` y `notifications` como parte del dominio, no como extras opcionales.

---

## 8. Resumen ejecutivo

Supabase en Guira no esta usado solo como autenticacion o CRUD simple. Funciona como backend operativo completo:

- Auth gestiona acceso,
- `profiles` define permisos y estado operativo,
- `onboarding` y `documents` sostienen KYC/KYB,
- `payment_orders` centraliza expedientes financieros,
- `wallets`, `bridge_transfers` y `ledger_entries` modelan dinero y movimientos,
- `support_tickets` cubre soporte,
- `notifications`, `activity_logs` y `audit_logs` sostienen trazabilidad,
- Storage conserva evidencia documental y comprobantes.

En otras palabras: el backend de Supabase ya define casi todo el comportamiento del producto, y el frontend debe adaptarse a esos contratos en lugar de inventar otros.
