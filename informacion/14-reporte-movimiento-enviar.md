# Reporte de Movimiento: Enviar

## Objetivo

Este documento explica exclusivamente el movimiento **Enviar** del lado del cliente:

- que rutas incluye,
- que significa cada valor del formulario,
- cuales campos son obligatorios para el backend,
- cuales son opcionales,
- y por que los opcionales siguen siendo importantes.

Base usada:

- `informacion/11-reporte-configuracion-supabase.md`
- `informacion/12-reporte-proceso-cliente-enviar-depositar.md`

Validado contra el frontend actual:

- `app/(client)/enviar/page.tsx`
- `features/client/components/client-operations-workspace.tsx`
- `features/payments/components/create-payment-order-form.tsx`
- `features/payments/lib/payment-routes.ts`
- `features/payments/schemas/payment-order.schema.ts`
- `services/payments.service.ts`

---

## 1. Que significa "Enviar" en el sistema actual

La pantalla `enviar` tampoco es una tabla aparte. Es una vista del cliente que crea expedientes en `payment_orders` para operaciones donde el valor sale desde Bolivia o se mueve entre redes digitales.

Rutas habilitadas en `Enviar`:

- `bolivia_to_exterior`
- `crypto_to_crypto`

Estas rutas se convierten en:

```json
{
  "bolivia_to_exterior": {
    "order_type": "BO_TO_WORLD",
    "processing_rail": "SWIFT | ACH | DIGITAL_NETWORK"
  },
  "crypto_to_crypto": {
    "order_type": "CRYPTO_TO_CRYPTO",
    "processing_rail": "DIGITAL_NETWORK"
  }
}
```

---

## 2. Flujo real del movimiento Enviar

1. el cliente entra a `enviar`,
2. selecciona la ruta,
3. llena el formulario,
4. el frontend calcula conversion, fee y tipo de cambio inicial,
5. se crea el expediente en `payment_orders` con estado `created`,
6. opcionalmente se sube un respaldo inicial,
7. el sistema muestra instrucciones de deposito o fondeo,
8. el cliente sube el comprobante,
9. la orden pasa a `waiting_deposit`,
10. staff valida y continua el proceso.

---

## 3. JSON real que guarda el backend para Enviar

## 3.1 Ejemplo `bolivia_to_exterior`

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
    "payment_reason": "Pago internacional a proveedor",
    "intended_amount": 1434.63,
    "destination_address": "Cuenta bancaria del beneficiario",
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

## 3.2 Ejemplo `crypto_to_crypto`

```json
{
  "user_id": "uuid",
  "order_type": "CRYPTO_TO_CRYPTO",
  "processing_rail": "DIGITAL_NETWORK",
  "amount_origin": 500,
  "origin_currency": "USDC",
  "amount_converted": 497,
  "destination_currency": "USDC",
  "exchange_rate_applied": 1,
  "fee_total": 3,
  "supplier_id": null,
  "beneficiary_id": null,
  "metadata": {
    "delivery_method": "crypto",
    "payment_reason": "Transferencia entre redes",
    "intended_amount": 497,
    "destination_address": "0x8f2...ab1",
    "stablecoin": "USDC",
    "crypto_destination": {
      "address": "0x8f2...ab1",
      "network": "Polygon"
    }
  },
  "status": "created"
}
```

---

## 4. Significado de cada campo del formulario

## 4.1 Campo `route`

```json
{
  "route": "bolivia_to_exterior | crypto_to_crypto"
}
```

### Que significa

Define el tipo de envio que el cliente quiere registrar.

### Si el backend lo guarda

No se guarda como columna.

### Para que sirve

Sirve para que el frontend derive:

- `order_type`
- `processing_rail`
- monedas por defecto
- metodo de entrega permitido
- validaciones especificas

### Importancia

Es un campo de interfaz, pero controla toda la estructura del expediente.

---

## 4.2 Campo `supplier_id`

```json
{
  "supplier_id": "uuid | ''"
}
```

### Que significa

Es el proveedor, beneficiario o contraparte asociada al envio.

### Si el backend lo guarda

Si, se guarda como `supplier_id`.

### Si es obligatorio

No.

### Por que importa aunque sea opcional

- permite reutilizar contrapartes ya registradas,
- reduce errores de digitacion,
- ayuda a staff a identificar rapidamente el destino comercial,
- puede autocompletar datos del beneficiario.

---

## 4.3 Campo `amount_origin`

```json
{
  "amount_origin": 10000
}
```

### Que significa

Monto que el cliente quiere enviar desde el origen.

### Si el backend lo guarda

Si, como `amount_origin`.

### Si es obligatorio

Si.

### Por que es indispensable

Es la base para calcular:

- `fee_total`
- `amount_converted`
- `exchange_rate_applied`

Sin este valor no existe expediente util.

---

## 4.4 Campo `origin_currency`

```json
{
  "origin_currency": "Bs | USDC"
}
```

### Que significa

Moneda en la que sale el valor.

### Si el backend lo guarda

Si.

### Si es obligatorio

Si.

### Importancia

Define la lectura contable del monto inicial.

En `enviar`:

- `bolivia_to_exterior` usa normalmente `Bs`
- `crypto_to_crypto` usa normalmente `USDC`

---

## 4.5 Campo `destination_currency`

```json
{
  "destination_currency": "USD | USDC"
}
```

### Que significa

Moneda final esperada en el destino.

### Si el backend lo guarda

Si.

### Si es obligatorio

Si.

### Importancia

Define el resultado final del envio y ayuda a interpretar la conversion.

---

## 4.6 Campo `delivery_method`

```json
{
  "delivery_method": "swift | ach | crypto"
}
```

### Que significa

Forma operativa en la que se entrega el valor al destino.

### Si el backend lo guarda

Si, dentro de `metadata.delivery_method`.

### Si es obligatorio

Si.

### Importancia

Define:

- que estructura se arma dentro de `metadata`,
- que validaciones exige el formulario,
- y que rail queda finalmente asociado.

Ejemplos:

- `swift` exige `swift_details`
- `ach` exige `ach_details`
- `crypto` exige `crypto_destination`

---

## 4.7 Campo `payment_reason`

```json
{
  "payment_reason": "texto"
}
```

### Que significa

Motivo comercial u operativo del envio.

### Si el backend lo guarda

Si, dentro de `metadata.payment_reason`.

### Si es obligatorio

Si.

### Importancia

- da contexto a staff,
- mejora trazabilidad,
- ayuda en soporte y auditoria,
- evita ordenes sin motivo claro.

---

## 4.8 Campo `intended_amount`

```json
{
  "intended_amount": 1434.63
}
```

### Que significa

Monto que se pretende entregar en el destino.

### Si el backend lo guarda

Si, dentro de `metadata.intended_amount`.

### Si es obligatorio

Si.

### Importancia

Aunque el frontend lo va sincronizando con los valores calculados, este campo conserva la expectativa operativa del cliente.

---

## 4.9 Campo `destination_address`

```json
{
  "destination_address": "cuenta, wallet o destino textual"
}
```

### Que significa

Es el resumen corto del destino final del envio.

### Si el backend lo guarda

Si, dentro de `metadata.destination_address`.

### Si es obligatorio

Si.

### Importancia

Da una lectura rapida del destino aunque los detalles tecnicos vivan en subobjetos de `metadata`.

---

## 4.10 Campo `stablecoin`

```json
{
  "stablecoin": "USDC | USDT | otra"
}
```

### Que significa

Activo estable de referencia para la operacion.

### Si el backend lo guarda

Si, dentro de `metadata.stablecoin`.

### Si es obligatorio

Si.

### Importancia

Permite mantener un modelo uniforme entre rutas bancarias y rutas digitales.

---

## 4.11 Campo `funding_method`

```json
{
  "funding_method": "bs | crypto | ach | wallet"
}
```

### Que significa

Describe con que via se fondea el envio.

### Si el backend lo guarda

Si, como `metadata.funding_method`.

### Si es obligatorio

Solo en la ruta `bolivia_to_exterior`.

### En `crypto_to_crypto`

No aplica en este frontend.

### Por que importa

Ayuda a explicar desde que tipo de origen sale el valor y como debe interpretarlo operativamente el equipo.

---

## 4.12 Campos SWIFT

```json
{
  "swift_bank_name": "Banco",
  "swift_code": "Codigo SWIFT",
  "swift_iban": "IBAN o cuenta",
  "swift_bank_address": "Direccion del banco",
  "swift_country": "Pais"
}
```

### Que significan

Son los datos bancarios internacionales del beneficiario.

### Si el backend los guarda

Si, pero dentro de:

```json
{
  "metadata": {
    "swift_details": {
      "bankName": "",
      "swiftCode": "",
      "iban": "",
      "bankAddress": "",
      "country": ""
    }
  }
}
```

### Si son obligatorios

Si, cuando `delivery_method = "swift"`.

### Importancia

Sin estos datos no existe informacion suficiente para ejecutar un envio bancario internacional.

---

## 4.13 Campos ACH

```json
{
  "ach_routing_number": "routing",
  "ach_account_number": "cuenta",
  "ach_bank_name": "banco"
}
```

### Que significan

Son los datos de una salida bancaria por ACH.

### Si el backend los guarda

Si, dentro de:

```json
{
  "metadata": {
    "ach_details": {
      "routingNumber": "",
      "accountNumber": "",
      "bankName": ""
    }
  }
}
```

### Si son obligatorios

Si, cuando `delivery_method = "ach"`.

### Importancia

Son necesarios para identificar de forma precisa la cuenta bancaria destino.

---

## 4.14 Campos cripto

```json
{
  "crypto_address": "wallet",
  "crypto_network": "red"
}
```

### Que significan

Definen la wallet y la red blockchain destino.

### Si el backend los guarda

Si, dentro de:

```json
{
  "metadata": {
    "crypto_destination": {
      "address": "",
      "network": ""
    }
  }
}
```

### Si son obligatorios

Si, cuando `delivery_method = "crypto"`.

### Importancia

Son criticos, porque una direccion o red incorrecta puede derivar en perdida irreversible del activo.

---

## 5. Campos que el backend necesita si o si

## 5.1 Obligatorios siempre

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
  "metadata.stablecoin": true
}
```

## 5.2 Obligatorios segun el metodo

### Si `delivery_method = swift`

```json
{
  "metadata.swift_details.bankName": true,
  "metadata.swift_details.swiftCode": true,
  "metadata.swift_details.iban": true,
  "metadata.swift_details.bankAddress": true,
  "metadata.swift_details.country": true
}
```

### Si `delivery_method = ach`

```json
{
  "metadata.ach_details.routingNumber": true,
  "metadata.ach_details.accountNumber": true,
  "metadata.ach_details.bankName": true
}
```

### Si `delivery_method = crypto`

```json
{
  "metadata.crypto_destination.address": true,
  "metadata.crypto_destination.network": true
}
```

### Si `route = bolivia_to_exterior`

```json
{
  "metadata.funding_method": true
}
```

---

## 6. Campos opcionales pero importantes

## 6.1 `supplier_id`

No es obligatorio, pero mejora:

- la velocidad de captura,
- la consistencia del destino,
- la relacion con contrapartes ya registradas,
- la lectura operativa para staff.

## 6.2 `beneficiary_id`

Actualmente el frontend lo manda como `null`.

No es necesario hoy, pero sigue existiendo en el contrato y podria usarse luego para una normalizacion mas estricta del beneficiario.

## 6.3 `support_document_url`

No es obligatorio al crear la orden.

Pero sigue siendo importante porque:

- permite adjuntar respaldo del pago desde el inicio,
- ayuda a justificar el envio,
- acelera la revision por parte del staff.

## 6.4 `evidence_url`

No es obligatorio para crear el expediente, pero es clave despues.

Su importancia:

- permite mover la orden a `waiting_deposit`,
- funciona como prueba de que el cliente ya fondeo,
- ayuda en conciliacion y seguimiento.

---

## 7. Valores calculados por frontend que igual se guardan en backend

Estos valores no son libres en la UI, pero si se persisten:

```json
{
  "amount_converted": "calculado",
  "exchange_rate_applied": "calculado",
  "fee_total": "calculado",
  "metadata.intended_amount": "calculado o sincronizado"
}
```

Se calculan a partir de:

- `app_settings`
- `fees_config`

### Por que importan

Porque la orden nace con una cotizacion preliminar que el backend y el staff luego pueden revisar, corregir o reemplazar.

---

## 8. Campos del formulario que no existen como columnas directas

```json
{
  "route": "solo UI",
  "swift_bank_name": "se transforma a metadata.swift_details.bankName",
  "swift_code": "se transforma a metadata.swift_details.swiftCode",
  "swift_iban": "se transforma a metadata.swift_details.iban",
  "swift_bank_address": "se transforma a metadata.swift_details.bankAddress",
  "swift_country": "se transforma a metadata.swift_details.country",
  "ach_routing_number": "se transforma a metadata.ach_details.routingNumber",
  "ach_account_number": "se transforma a metadata.ach_details.accountNumber",
  "ach_bank_name": "se transforma a metadata.ach_details.bankName",
  "crypto_address": "se transforma a metadata.crypto_destination.address",
  "crypto_network": "se transforma a metadata.crypto_destination.network"
}
```

---

## 9. Conclusion

El movimiento `Enviar` usa el mismo motor central de `payment_orders`, pero con dos rutas controladas: `bolivia_to_exterior` y `crypto_to_crypto`.

Los campos indispensables para backend son:

- identidad de la orden,
- montos,
- monedas,
- rail,
- y `metadata` con los datos del destino.

Los campos opcionales no son decorativos. En especial `supplier_id`, `support_document_url` y `evidence_url` aportan contexto, aceleran validacion y reducen errores operativos.

El punto mas importante es este: la mayor parte de la configuracion del envio no vive en columnas separadas, sino dentro de `metadata`, que es donde el sistema concentra el detalle operativo del destino.

