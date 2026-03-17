# Reporte de Movimiento: Depositar

## Objetivo

Este documento explica exclusivamente el movimiento **Depositar** del lado del cliente:

- que rutas incluye,
- que significa cada valor del formulario,
- cuales campos son obligatorios para el backend,
- cuales son opcionales,
- y por que los opcionales siguen siendo importantes.

Base usada:

- `informacion/11-reporte-configuracion-supabase.md`
- `informacion/12-reporte-proceso-cliente-enviar-depositar.md`

Validado contra el frontend actual:

- `app/(client)/depositar/page.tsx`
- `features/client/components/client-operations-workspace.tsx`
- `features/payments/components/create-payment-order-form.tsx`
- `features/payments/lib/payment-routes.ts`
- `features/payments/schemas/payment-order.schema.ts`
- `services/payments.service.ts`

---

## 1. Que significa "Depositar" en el sistema actual

La pantalla `depositar` no es un modulo aparte en base de datos. Es una vista del cliente que crea expedientes en `payment_orders` para rutas donde el dinero entra desde afuera y luego se dirige a un destino operativo definido.

Rutas habilitadas en `Depositar`:

- `us_to_wallet`
- `us_to_bolivia`

Estas rutas se convierten en:

```json
{
  "us_to_wallet": {
    "order_type": "US_TO_WALLET",
    "processing_rail": "PSAV"
  },
  "us_to_bolivia": {
    "order_type": "WORLD_TO_BO",
    "processing_rail": "SWIFT | ACH | DIGITAL_NETWORK"
  }
}
```

---

## 2. Flujo real del movimiento Depositar

1. el cliente entra a `depositar`,
2. selecciona la ruta,
3. llena el formulario,
4. el frontend calcula conversion, fee y tipo de cambio,
5. se crea el expediente en `payment_orders` con estado `created`,
6. opcionalmente se sube un respaldo inicial,
7. el cliente recibe instrucciones de deposito,
8. luego sube el comprobante,
9. la orden pasa a `waiting_deposit`,
10. staff valida y continua el proceso.

---

## 3. JSON real que guarda el backend para Depositar

## 3.1 Ejemplo `us_to_wallet`

```json
{
  "user_id": "uuid",
  "order_type": "US_TO_WALLET",
  "processing_rail": "PSAV",
  "amount_origin": 1500,
  "origin_currency": "USD",
  "amount_converted": 1494,
  "destination_currency": "USD",
  "exchange_rate_applied": 1,
  "fee_total": 6,
  "supplier_id": null,
  "beneficiary_id": null,
  "metadata": {
    "delivery_method": "ach",
    "payment_reason": "Fondeo de wallet",
    "intended_amount": 1494,
    "destination_address": "Wallet USDC del cliente",
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

## 3.2 Ejemplo `us_to_bolivia`

```json
{
  "user_id": "uuid",
  "order_type": "WORLD_TO_BO",
  "processing_rail": "SWIFT",
  "amount_origin": 1000,
  "origin_currency": "USD",
  "amount_converted": 6862.4,
  "destination_currency": "Bs",
  "exchange_rate_applied": 6.96,
  "fee_total": 14.6,
  "supplier_id": "uuid-proveedor",
  "beneficiary_id": null,
  "metadata": {
    "delivery_method": "swift",
    "payment_reason": "Retorno de fondos a Bolivia",
    "intended_amount": 6862.4,
    "destination_address": "Cuenta bancaria en Bolivia",
    "stablecoin": "USDC",
    "funding_method": "ach",
    "swift_details": {
      "bankName": "Banco Union",
      "swiftCode": "BUNIBOLX",
      "iban": "00112233",
      "bankAddress": "La Paz",
      "country": "Bolivia"
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
  "route": "us_to_wallet | us_to_bolivia"
}
```

### Que significa

Define la clase de movimiento que el cliente quiere registrar.

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

Es critico para la UI, aunque no exista como columna en la base.

---

## 4.2 Campo `supplier_id`

```json
{
  "supplier_id": "uuid | ''"
}
```

### Que significa

Es el proveedor, beneficiario o contraparte guardada previamente por el cliente.

### Si el backend lo guarda

Si, se guarda como `supplier_id`.

### Si es obligatorio

No.

### Por que importa aunque sea opcional

- ayuda a reutilizar datos ya registrados,
- reduce errores de captura manual,
- permite que staff vea a que beneficiario se relaciona la orden,
- puede autocompletar datos bancarios o cripto en el formulario.

---

## 4.3 Campo `amount_origin`

```json
{
  "amount_origin": 1500
}
```

### Que significa

Monto de origen que el cliente quiere depositar.

### Si el backend lo guarda

Si, como `amount_origin`.

### Si es obligatorio

Si.

### Por que es indispensable

Es la base para calcular:

- `fee_total`
- `amount_converted`
- `exchange_rate_applied`

Sin este valor no se puede armar el expediente.

---

## 4.4 Campo `origin_currency`

```json
{
  "origin_currency": "USD"
}
```

### Que significa

Moneda con la que entra el dinero.

### Si el backend lo guarda

Si.

### Si es obligatorio

Si.

### Importancia

Permite interpretar correctamente el monto original y evita ambiguedad contable.

En `depositar`:

- `us_to_wallet` usa `USD`
- `us_to_bolivia` usa `USD`

---

## 4.5 Campo `destination_currency`

```json
{
  "destination_currency": "USD | Bs"
}
```

### Que significa

Moneda final que recibira el destino.

### Si el backend lo guarda

Si.

### Si es obligatorio

Si.

### Importancia

Define el resultado del movimiento:

- en `us_to_wallet` normalmente `USD`,
- en `us_to_bolivia` normalmente `Bs`.

---

## 4.6 Campo `delivery_method`

```json
{
  "delivery_method": "swift | ach | crypto"
}
```

### Que significa

Canal o forma operativa de entrega del valor.

### Si el backend lo guarda

Si, dentro de `metadata.delivery_method`.

### Si es obligatorio

Si.

### Importancia

Es uno de los campos mas importantes porque define:

- que subbloque se llena en `metadata`,
- que validaciones aplica el formulario,
- que rail toma el frontend para algunas rutas.

Ejemplos:

- `swift` obliga `swift_details`
- `ach` obliga `ach_details`
- `crypto` obliga `crypto_destination`

---

## 4.7 Campo `payment_reason`

```json
{
  "payment_reason": "texto"
}
```

### Que significa

Motivo comercial u operativo de la orden.

### Si el backend lo guarda

Si, dentro de `metadata.payment_reason`.

### Si es obligatorio

Si.

### Importancia

- da contexto a staff,
- mejora trazabilidad,
- ayuda en validacion operativa y auditoria,
- evita expedientes sin justificacion.

---

## 4.8 Campo `intended_amount`

```json
{
  "intended_amount": 1494
}
```

### Que significa

Monto que se pretende entregar o acreditar al destino.

### Si el backend lo guarda

Si, dentro de `metadata.intended_amount`.

### Si es obligatorio

Si.

### Importancia

Aunque en este frontend se rellena de forma derivada, sigue siendo importante porque documenta la expectativa del cliente dentro del expediente.

Sirve para comparar:

- lo esperado por el cliente,
- lo cotizado por staff,
- lo finalmente ejecutado.

---

## 4.9 Campo `destination_address`

```json
{
  "destination_address": "cuenta, wallet o destino textual"
}
```

### Que significa

Destino principal resumido de la operacion.

### Si el backend lo guarda

Si, dentro de `metadata.destination_address`.

### Si es obligatorio

Si.

### Importancia

Es la referencia rapida del expediente. Aunque existan detalles mas estructurados, este campo resume hacia donde va el valor.

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

Aunque parezca accesorio en una operacion bancaria, en este sistema ayuda a unificar el modelo entre rutas fiat y rutas cripto.

---

## 4.11 Campo `funding_method`

```json
{
  "funding_method": "bs | crypto | ach | wallet"
}
```

### Que significa

Indica con que via se fondea la operacion.

### Si el backend lo guarda

Si, como `metadata.funding_method`.

### Si es obligatorio

Solo en la ruta `us_to_bolivia`.

### En `us_to_wallet`

No aplica operativamente en este frontend.

### Por que importa

Da contexto de origen operativo del fondeo y puede cambiar como staff concilia la orden.

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

Son los datos bancarios internacionales del destino.

### Si el backend los guarda

Si, pero no como columnas directas. Se guardan dentro de:

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

Sin estos datos no hay instrucciones suficientes para ejecutar la salida bancaria internacional o la recepcion estructurada.

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

Son los datos bancarios de una operacion ACH.

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

Son claves para identificar la cuenta bancaria exacta de la ruta ACH y evitar rechazos operativos.

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

Son datos criticos. Una red incorrecta o una direccion equivocada puede volver la operacion irreversible.

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

### Si `route = us_to_bolivia`

```json
{
  "metadata.funding_method": true
}
```

---

## 6. Campos opcionales pero importantes

## 6.1 `supplier_id`

No es obligatorio, pero mejora:

- velocidad de carga,
- consistencia de datos,
- relacion con proveedores existentes,
- lectura operativa por parte de staff.

## 6.2 `beneficiary_id`

Actualmente el frontend lo manda como `null`.

No es necesario hoy, pero existe en el contrato y podria servir en una futura normalizacion mas estricta de beneficiarios.

## 6.3 `support_document_url`

No es obligatorio para crear la orden.

Pero es importante porque:

- permite dejar respaldo documental temprano,
- ayuda a validar la intencion del deposito,
- reduce ida y vuelta con staff.

## 6.4 `evidence_url`

No es obligatorio para crear la orden, pero es operativamente critico despues.

Su importancia:

- habilita el cambio a `waiting_deposit`,
- funciona como prueba de que el cliente ya deposito,
- es la base para la conciliacion manual o asistida.

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

Aunque sean derivados, el backend los necesita para que la orden nazca con una cotizacion inicial consistente.

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

El movimiento `Depositar` usa el mismo motor central de `payment_orders`, pero con dos rutas controladas: `us_to_wallet` y `us_to_bolivia`.

Los campos realmente indispensables para backend son:

- identidad de la orden,
- montos,
- monedas,
- rail,
- y `metadata` con los datos del destino.

Los campos opcionales no son relleno. En especial `supplier_id`, `support_document_url` y `evidence_url` mejoran la trazabilidad, aceleran validacion y reducen errores operativos.

El punto mas importante es este: varios campos visibles del formulario no existen como columnas aisladas en la tabla, porque el diseño actual concentra casi toda la configuracion del destino dentro de `metadata`.

