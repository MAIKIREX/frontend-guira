# Reporte de Proceso Cliente: Enviar y Depositar

## Objetivo

Este reporte describe el flujo del lado del cliente para las secciones de **enviar** y **depositar**, indicando:

- que se guarda realmente en Supabase,
- que valores son obligatorios,
- que valores son opcionales,
- que valores son extras o solo viven en la interfaz,
- y como queda configurado el contrato de `payment_orders`.

Base principal:

- `informacion/11-reporte-configuracion-supabase.md`

Validado contra el frontend actual:

- `features/payments/lib/payment-routes.ts`
- `features/payments/schemas/payment-order.schema.ts`
- `services/payments.service.ts`
- `features/payments/components/create-payment-order-form.tsx`
- `features/payments/components/payments-history-table.tsx`

---

## 1. Que significa "enviar" y "depositar" en el frontend actual

El frontend usa un mismo expediente: `payment_orders`.

La diferencia es de presentacion y de ruta:

- **Enviar**: se usa principalmente en `bolivia_to_exterior` y `crypto_to_crypto`.
- **Depositar**: se usa principalmente en `us_to_bolivia` y `us_to_wallet`.

Pero en base de datos ambos siguen casi el mismo flujo:

1. el cliente crea la orden en `payment_orders`,
2. opcionalmente sube un respaldo inicial,
3. el sistema muestra instrucciones de deposito o fondeo,
4. el cliente sube el comprobante,
5. la orden pasa a `waiting_deposit`,
6. staff valida,
7. staff publica cotizacion final,
8. el cliente acepta la cotizacion,
9. la orden pasa a `processing`.

---

## 2. Flujo real del lado del cliente

## 2.1 Crear expediente

El cliente llena el formulario y se hace un `insert` en `payment_orders`.

Estado inicial real:

```json
{
  "status": "created"
}
```

Si el cliente adjunta un respaldo inicial, no se guarda junto al `insert`. Primero se crea la orden y luego se hace un `update` aparte para `support_document_url`.

## 2.2 Subir respaldo inicial

El archivo se sube al bucket `order-evidences` y luego se actualiza la columna:

```json
{
  "support_document_url": "https://...archivo-publico..."
}
```

Esto **no cambia el estado**.

## 2.3 Subir comprobante del deposito

El archivo se sube al bucket `order-evidences` y luego se actualiza:

```json
{
  "evidence_url": "https://...archivo-publico...",
  "status": "waiting_deposit"
}
```

La transicion a `waiting_deposit` solo ocurre si la orden estaba en `created`.

## 2.4 Aceptar cotizacion final

Cuando staff ya dejo tasa, fee y monto final, el cliente hace este `update`:

```json
{
  "status": "processing",
  "metadata": {
    "client_quote_accepted_at": "2026-03-16T00:00:00.000Z"
  }
}
```

Ese `metadata` no reemplaza el anterior: se fusiona con el que ya tenia la orden.

## 2.5 Cancelar expediente

Mientras la orden siga en `created` o `waiting_deposit`, el cliente puede cancelar:

```json
{
  "status": "failed",
  "metadata": {
    "rejection_reason": "Cancelado por el usuario"
  }
}
```

---

## 3. JSON real que se envia a la base de datos al crear la orden

## 3.1 Payload base real de `payment_orders`

Este es el contrato real que arma `buildPaymentOrderPayload()` y luego inserta `createPaymentOrder()`:

```json
{
  "user_id": "uuid-del-usuario",
  "order_type": "BO_TO_WORLD",
  "processing_rail": "SWIFT",
  "amount_origin": 7000,
  "origin_currency": "Bs",
  "amount_converted": 1003.59,
  "destination_currency": "USD",
  "exchange_rate_applied": 6.96,
  "fee_total": 15,
  "supplier_id": "uuid-del-proveedor",
  "beneficiary_id": null,
  "metadata": {
    "delivery_method": "swift",
    "payment_reason": "Pago a proveedor del exterior",
    "intended_amount": 1003.59,
    "destination_address": "Cuenta beneficiaria final",
    "stablecoin": "USDC",
    "funding_method": "bs",
    "swift_details": {
      "bankName": "Banco Exterior",
      "swiftCode": "BOFAUS3N",
      "iban": "DE1234567890",
      "bankAddress": "Berlin",
      "country": "Germany"
    }
  }
}
```

El servicio agrega internamente:

```json
{
  "status": "created"
}
```

---

## 4. Campos necesarios, opcionales y extras

## 4.1 Campos realmente necesarios para el `insert`

Estos son obligatorios por contrato frontend actual:

```json
{
  "user_id": "obligatorio",
  "order_type": "obligatorio",
  "processing_rail": "obligatorio",
  "amount_origin": "obligatorio",
  "origin_currency": "obligatorio",
  "amount_converted": "obligatorio",
  "destination_currency": "obligatorio",
  "exchange_rate_applied": "obligatorio",
  "fee_total": "obligatorio",
  "metadata": "obligatorio"
}
```

Dentro de `metadata`, siempre son obligatorios:

```json
{
  "delivery_method": "obligatorio",
  "payment_reason": "obligatorio",
  "intended_amount": "obligatorio",
  "destination_address": "obligatorio",
  "stablecoin": "obligatorio"
}
```

## 4.2 Campos opcionales en el `insert`

```json
{
  "supplier_id": "opcional",
  "beneficiary_id": "opcional, actualmente siempre va null"
}
```

Tambien son opcionales segun la ruta o metodo:

```json
{
  "metadata": {
    "funding_method": "solo obligatorio en bolivia_to_exterior y us_to_bolivia",
    "swift_details": "solo obligatorio si delivery_method = swift",
    "ach_details": "solo obligatorio si delivery_method = ach",
    "crypto_destination": "solo obligatorio si delivery_method = crypto"
  }
}
```

## 4.3 Campos extra o derivados

Estos no son "extra" en sentido inutil, pero **no los escribe el usuario manualmente como dato final de negocio**:

```json
{
  "amount_converted": "calculado por frontend",
  "exchange_rate_applied": "calculado por frontend",
  "fee_total": "calculado por frontend",
  "intended_amount": "en la practica se rellena con el monto calculado"
}
```

Se calculan usando:

- `app_settings.bolivia_exchange_rate`
- `fees_config.value`

## 4.4 Campos que existen en la UI pero no se guardan tal cual en la tabla

Estos viven en el formulario y luego se transforman:

```json
{
  "route": "solo UI",
  "swift_bank_name": "termina dentro de metadata.swift_details.bankName",
  "swift_code": "termina dentro de metadata.swift_details.swiftCode",
  "swift_iban": "termina dentro de metadata.swift_details.iban",
  "swift_bank_address": "termina dentro de metadata.swift_details.bankAddress",
  "swift_country": "termina dentro de metadata.swift_details.country",
  "ach_routing_number": "termina dentro de metadata.ach_details.routingNumber",
  "ach_account_number": "termina dentro de metadata.ach_details.accountNumber",
  "ach_bank_name": "termina dentro de metadata.ach_details.bankName",
  "crypto_address": "termina dentro de metadata.crypto_destination.address",
  "crypto_network": "termina dentro de metadata.crypto_destination.network",
  "supportFile": "solo archivo temporal UI",
  "evidenceFile": "solo archivo temporal UI"
}
```

---

## 5. JSON por seccion

## 5.1 Seccion Enviar

Ejemplo comun para `bolivia_to_exterior`:

```json
{
  "user_id": "uuid",
  "order_type": "BO_TO_WORLD",
  "processing_rail": "SWIFT",
  "amount_origin": 10000,
  "origin_currency": "Bs",
  "amount_converted": 1434.63,
  "destination_currency": "USD",
  "exchange_rate_applied": 6.96,
  "fee_total": 15,
  "supplier_id": "uuid-proveedor",
  "beneficiary_id": null,
  "metadata": {
    "delivery_method": "swift",
    "payment_reason": "Pago internacional",
    "intended_amount": 1434.63,
    "destination_address": "Cuenta bancaria final",
    "stablecoin": "USDC",
    "funding_method": "bs",
    "swift_details": {
      "bankName": "Banco X",
      "swiftCode": "ABCDUS00",
      "iban": "DE123456789",
      "bankAddress": "Direccion banco",
      "country": "Germany"
    }
  },
  "status": "created"
}
```

### Necesarios

```json
{
  "user_id": true,
  "order_type": true,
  "processing_rail": true,
  "amount_origin": true,
  "origin_currency": true,
  "amount_converted": true,
  "destination_currency": true,
  "exchange_rate_applied": true,
  "fee_total": true,
  "metadata.delivery_method": true,
  "metadata.payment_reason": true,
  "metadata.intended_amount": true,
  "metadata.destination_address": true,
  "metadata.stablecoin": true,
  "metadata.funding_method": true,
  "metadata.swift_details.bankName": true,
  "metadata.swift_details.swiftCode": true,
  "metadata.swift_details.iban": true,
  "metadata.swift_details.bankAddress": true,
  "metadata.swift_details.country": true
}
```

### Opcionales o extra

```json
{
  "supplier_id": "opcional",
  "beneficiary_id": "extra en este frontend, siempre null"
}
```

## 5.2 Seccion Depositar

Ejemplo comun para `us_to_wallet`:

```json
{
  "user_id": "uuid",
  "order_type": "US_TO_WALLET",
  "processing_rail": "PSAV",
  "amount_origin": 2000,
  "origin_currency": "USD",
  "amount_converted": 1994,
  "destination_currency": "USD",
  "exchange_rate_applied": 1,
  "fee_total": 6,
  "supplier_id": null,
  "beneficiary_id": null,
  "metadata": {
    "delivery_method": "ach",
    "payment_reason": "Fondeo wallet",
    "intended_amount": 1994,
    "destination_address": "Wallet del cliente",
    "stablecoin": "USDC",
    "ach_details": {
      "routingNumber": "021000021",
      "accountNumber": "000123456789",
      "bankName": "JPMorgan Chase"
    }
  },
  "status": "created"
}
```

### Necesarios

```json
{
  "user_id": true,
  "order_type": true,
  "processing_rail": true,
  "amount_origin": true,
  "origin_currency": true,
  "amount_converted": true,
  "destination_currency": true,
  "exchange_rate_applied": true,
  "fee_total": true,
  "metadata.delivery_method": true,
  "metadata.payment_reason": true,
  "metadata.intended_amount": true,
  "metadata.destination_address": true,
  "metadata.stablecoin": true,
  "metadata.ach_details.routingNumber": true,
  "metadata.ach_details.accountNumber": true,
  "metadata.ach_details.bankName": true
}
```

### Opcionales o extra

```json
{
  "supplier_id": "opcional",
  "beneficiary_id": "extra en este frontend, siempre null",
  "metadata.funding_method": "no aplica en us_to_wallet"
}
```

---

## 6. Updates reales sobre la tabla `payment_orders`

## 6.1 Update al subir respaldo

```json
{
  "support_document_url": "https://bucket-public-url"
}
```

## 6.2 Update al subir comprobante

```json
{
  "evidence_url": "https://bucket-public-url",
  "status": "waiting_deposit"
}
```

## 6.3 Update al aceptar cotizacion

```json
{
  "status": "processing",
  "metadata": {
    "client_quote_accepted_at": "2026-03-16T00:00:00.000Z"
  }
}
```

## 6.4 Update al cancelar

```json
{
  "status": "failed",
  "metadata": {
    "rejection_reason": "Cancelado por el usuario"
  }
}
```

---

## 7. Descripcion de campos para entender la configuracion de la base

## 7.1 Columnas estructurales de `payment_orders`

- `id`: identificador del expediente.
- `user_id`: usuario dueño de la orden.
- `order_type`: tipo de operacion de negocio.
- `processing_rail`: rail operativo por donde se ejecuta.
- `amount_origin`: monto original declarado por el cliente.
- `origin_currency`: moneda origen.
- `amount_converted`: monto estimado o final de conversion.
- `destination_currency`: moneda destino.
- `exchange_rate_applied`: tipo de cambio aplicado.
- `fee_total`: costo operativo o comision total.
- `status`: etapa del flujo.
- `beneficiary_id`: beneficiario formal si el modelo lo usa.
- `supplier_id`: proveedor o contraparte guardada en agenda.
- `metadata`: bloque flexible JSON con detalles del destino y trazabilidad del flujo.
- `evidence_url`: comprobante del deposito cargado por cliente.
- `support_document_url`: respaldo documental cargado por cliente.
- `staff_comprobante_url`: comprobante final cargado por staff.
- `created_at`: fecha de creacion.
- `updated_at`: fecha de ultima actualizacion.

## 7.2 Subcampos de `metadata`

- `delivery_method`: define si la entrega final es `swift`, `ach` o `crypto`.
- `payment_reason`: motivo comercial u operativo.
- `intended_amount`: monto que el usuario espera entregar o recibir.
- `destination_address`: destino operativo resumido.
- `stablecoin`: stablecoin de referencia.
- `funding_method`: como se fondea la operacion en rutas bancarias.
- `swift_details`: datos bancarios internacionales.
- `ach_details`: datos ACH.
- `crypto_destination`: wallet y red de destino.
- `quote_prepared_at`: fecha en que staff publico cotizacion.
- `quote_prepared_by`: staff que preparo cotizacion.
- `client_quote_accepted_at`: fecha de aceptacion del cliente.
- `reference`: hash o referencia de envio final.
- `completed_at`: fecha de cierre.
- `rejection_reason`: motivo de cancelacion o rechazo.

---

## 8. Conclusiones operativas

1. La tabla central para enviar y depositar es `payment_orders`.
2. El cliente no inserta archivos dentro del `insert`; los archivos siempre entran por `storage` y luego actualizan URLs.
3. `support_document_url` es opcional y no cambia estado.
4. `evidence_url` es la pieza que mueve la orden de `created` a `waiting_deposit`.
5. `amount_converted`, `exchange_rate_applied` y `fee_total` si se guardan en base, pero en este frontend nacen como valores calculados, no como captura libre.
6. Muchos campos visibles del formulario no existen como columnas; terminan normalizados dentro de `metadata`.
7. `beneficiary_id` existe en el contrato, pero en el frontend actual no se usa realmente.

