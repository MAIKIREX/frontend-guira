# Contratos de Backend con Supabase

## Principio

Este archivo resume que espera el backend actual del frontend. El objetivo es que el nuevo frontend en Next.js consuma exactamente estos contratos.

## Auth

Variables requeridas:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

La app actual usa `sessionStorage` para persistir sesion.

## Tabla `profiles`

Campos detectados:

- `id`
- `email`
- `role`
- `full_name`
- `onboarding_status`
- `bridge_customer_id`
- `created_at`
- `is_archived`
- `metadata`

Uso funcional desde frontend:

- determinar rol `client | staff | admin`,
- bloquear acceso si `is_archived = true`,
- forzar onboarding si `onboarding_status !== 'verified'`,
- mostrar nombre del usuario,
- asociar estado operativo con onboarding.

## Tabla `onboarding`

Campos detectados:

- `id`
- `user_id`
- `type`
- `status`
- `data`
- `observations`
- `bridge_customer_id`
- `created_at`
- `updated_at`

Payload funcional de borrador:

```json
{
  "id": "opcional",
  "user_id": "uuid",
  "type": "personal | company",
  "status": "draft",
  "data": { "...": "formData completo" },
  "updated_at": "ISO8601"
}
```

Payload de envio detectado:

```json
{
  "id": "opcional",
  "user_id": "uuid",
  "type": "personal | company",
  "status": "submitted",
  "data": { "...": "formData y paths de documentos" },
  "updated_at": "ISO8601"
}
```

Payload de revision UBO detectado:

```json
{
  "status": "under_review",
  "data": {
    "...": "formData previo",
    "ubos": [
      {
        "first_names": "string",
        "last_names": "string",
        "percentage": "string|number",
        "nationality": "string",
        "docs": {
          "passport": "storage_path",
          "id_front": "storage_path"
        }
      }
    ]
  },
  "updated_at": "ISO8601"
}
```

## Tabla `documents`

Campos detectados:

- `onboarding_id`
- `user_id`
- `doc_type`
- `storage_path`
- `mime_type`
- `file_size`

Conflicto usado en `upsert`:

- `onboarding_id,doc_type`

## Bucket `onboarding_docs`

Uso:

- documentos de onboarding,
- documentos de UBO.

Patrones de archivos observados:

- `{userId}/{docKey}_draft_{timestamp}.{ext}`
- `{userId}/{docKey}_{timestamp}.{ext}`
- `{userId}/ubo_{index}_{docKey}_draft_{timestamp}.{ext}`
- `{userId}/ubo_{index}_{docKey}_{timestamp}.{ext}`

## Tabla `payment_orders`

Campos detectados:

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

Payload de creacion detectado:

```json
{
  "user_id": "uuid",
  "order_type": "BO_TO_WORLD | WORLD_TO_BO | US_TO_WALLET | CRYPTO_TO_CRYPTO",
  "processing_rail": "ACH | SWIFT | PSAV | DIGITAL_NETWORK",
  "amount_origin": 0,
  "origin_currency": "Bs | USD | USDT | USDC",
  "destination_currency": "Bs | USD | USDT | USDC",
  "beneficiary_id": null,
  "supplier_id": "uuid|null",
  "amount_converted": 0,
  "exchange_rate_applied": 1,
  "fee_total": 0,
  "metadata": {},
  "status": "created"
}
```

Metadata minima detectada en la creacion:

```json
{
  "delivery_method": "swift | ach | crypto",
  "payment_reason": "string",
  "intended_amount": 0,
  "destination_address": "string",
  "stablecoin": "USDC"
}
```

Metadata adicional para ciertos casos:

```json
{
  "funding_method": "bs | crypto | ach | wallet",
  "swift_details": {
    "bankName": "string",
    "swiftCode": "string",
    "iban": "string",
    "bankAddress": "string",
    "country": "string"
  },
  "ach_details": {
    "routingNumber": "string",
    "accountNumber": "string",
    "bankName": "string"
  },
  "crypto_destination": {
    "address": "string",
    "network": "string"
  }
}
```

Transiciones de estado detectadas:

- `created` -> recien creado, aun sin validacion.
- `waiting_deposit` -> cliente ya subio comprobante.
- `deposit_received` -> staff valida recepcion.
- `processing` -> staff fija tasa, fee y monto neto.
- `sent` -> staff registra referencia o hash.
- `completed` -> staff sube comprobante final.
- `failed` -> cancelado, rechazado o no procesable.

Payload de paso a `processing`:

```json
{
  "status": "processing",
  "exchange_rate_applied": 10.55,
  "amount_converted": 980.25,
  "fee_total": 15
}
```

Payload de paso a `sent`:

```json
{
  "status": "sent",
  "metadata": {
    "...": "metadata previo",
    "reference": "hash o referencia bancaria"
  }
}
```

Payload de paso a `completed`:

```json
{
  "status": "completed",
  "staff_comprobante_url": "publicUrl",
  "metadata": {
    "...": "metadata previo",
    "completed_at": "ISO8601"
  }
}
```

Payload de cancelacion o rechazo:

```json
{
  "status": "failed",
  "metadata": {
    "...": "metadata previo",
    "rejection_reason": "motivo"
  }
}
```

## Bucket `order-evidences`

Uso:

- comprobante del cliente,
- respaldo documental,
- comprobante final de staff.

Columnas asociadas:

- `evidence_url`
- `support_document_url`
- `staff_comprobante_url`

## Tabla `suppliers`

Payload detectado:

```json
{
  "user_id": "uuid",
  "name": "string",
  "country": "string",
  "payment_method": "bank | crypto",
  "bank_details": {
    "bank_name": "string",
    "swift_code": "string",
    "account_number": "string",
    "bank_country": "string"
  },
  "crypto_details": {
    "address": "string"
  },
  "address": "string",
  "phone": "string",
  "email": "string",
  "tax_id": "string"
}
```

## Tablas operativas adicionales

### `wallets`

Uso:

- asociar al usuario una wallet operativa.

Campos minimos observados:

- `id`
- `user_id`
- `currency`

### `ledger_entries`

Uso:

- fuente de verdad para balance calculado del cliente.

Campos detectados:

- `wallet_id`
- `bridge_transfer_id`
- `type`
- `amount`
- `description`
- `metadata`
- `created_at`

Valores de `type`:

- `deposit`
- `payout`

### `bridge_transfers`

Uso:

- transferencias ligadas al dominio wallet/bridge.

Payload de creacion detectado en `lib/bridge.ts`:

```json
{
  "user_id": "uuid",
  "idempotency_key": "string",
  "transfer_kind": "wallet_to_wallet | wallet_to_external_crypto | wallet_to_external_bank | virtual_account_to_wallet | external_bank_to_wallet",
  "business_purpose": "supplier_payment | client_withdrawal | funding | liquidation | internal",
  "amount": 0,
  "currency": "string",
  "status": "pending",
  "destination_type": "wallet | external_account | external_crypto_address",
  "destination_id": "opcional",
  "fee_amount": 0,
  "net_amount": 0,
  "exchange_rate": 1,
  "metadata": {
    "system": "guira-bridge-v1",
    "network": "opcional",
    "timestamp": "ISO8601"
  }
}
```

Validaciones previas en frontend:

- usuario verificado,
- idempotencia por `idempotency_key`,
- saldo suficiente para egresos desde wallet,
- calculo de fees por `business_purpose`.

### `notifications`

Campos funcionales:

- `user_id`
- `type`
- `title`
- `message`
- `link`
- `is_read`
- `created_at`

Tipos observados:

- `status_change`
- `onboarding_update`
- `new_order`
- `support_update`
- `system`

### `support_tickets`

Payload detectado:

```json
{
  "user_id": "uuid",
  "subject": "string",
  "message": "string",
  "contact_email": "string",
  "contact_phone": "string"
}
```

Estados observados:

- `open`
- `in_progress`
- `resolved`
- `closed`

### `fees_config`

Campos detectados:

- `id`
- `type`
- `fee_type`
- `value`
- `currency`

Tipos observados:

- `route_creation`
- `supplier_payment`

### `app_settings`

Uso:

- configuracion global de la plataforma.

Setting confirmado:

- `bolivia_exchange_rate`

### `psav_configs`

Uso:

- configuracion de rieles o proveedores PSAV.

El frontend hace:

- `select`,
- `upsert`,
- `delete`,
- filtrado por `is_active`.

### `activity_logs`

Payload:

```json
{
  "user_id": "uuid",
  "action": "string",
  "metadata": {}
}
```

Acciones observadas:

- `login`
- `signup`
- `guardar_borrador`
- `enviar_onboarding`
- `enviar_docs_socios`
- `request_payin`
- `request_payout`
- `create_ticket`

### `audit_logs`

Payload funcional:

```json
{
  "performed_by": "uuid",
  "role": "staff | admin",
  "action": "create | update | change_status | logical_cancel",
  "table_name": "string",
  "record_id": "uuid",
  "previous_values": {},
  "new_values": {},
  "reason": "string",
  "source": "ui | api | system"
}
```

Regla importante observada:

- si la accion no es `create`, el motivo debe existir y tener al menos 5 caracteres.

## Edge Functions presentes en el repo

- `admin-create-user`
- `admin-delete-user`
- `admin-reset-password`
- `admin-unarchive-user`

### `admin-create-user`

Body detectado:

```json
{
  "email": "user@example.com",
  "password": "secret",
  "full_name": "Nombre Apellido",
  "role": "client | staff | admin"
}
```

Comportamiento:

- valida que el solicitante sea admin,
- crea usuario en Supabase Auth,
- actualiza `profiles`,
- deja `onboarding_status = 'verified'`.

### `admin-delete-user`

Body detectado:

```json
{
  "userId": "uuid",
  "action": "archive | delete"
}
```

Comportamiento:

- si hay historial en `bridge_transfers` o `payment_orders`, no permite `delete`,
- si no hay historial y se pide `delete`, elimina usuario de Auth,
- en caso contrario archiva:
  - `profiles.is_archived = true`
  - ban de Auth de larga duracion

### `admin-reset-password`

Body detectado:

```json
{
  "email": "user@example.com"
}
```

Comportamiento:

- valida admin,
- dispara email de recovery con `redirectTo`.

### `admin-unarchive-user`

Body detectado:

```json
{
  "userId": "uuid"
}
```

Comportamiento:

- `profiles.is_archived = false`,
- remueve el ban en Auth.

## Edge Function usada pero no presente en el repo

- `login-proxy`

Payload detectado:

```json
{
  "email": "user@example.com",
  "password": "secret"
}
```

## RPC usado pero no presente en el repo

- `check_user_exists`

Payload detectado:

```json
{
  "p_email": "user@example.com"
}
```
