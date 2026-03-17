# Mejora funcional del modulo de Movimientos

## Objetivo

Rediseñar la experiencia de `Movimientos` para que el flujo del cliente sea mas claro, mas simple y totalmente alineado con la logica real del backend en Supabase.

Este ajuste debe respetar el patron operativo actual del sistema:

1. primero se crea el expediente,
2. luego se muestran instrucciones,
3. despues se suben evidencias o comprobantes,
4. staff valida,
5. staff ejecuta la operacion,
6. finalmente la orden se cierra.

La tabla central para este flujo es `payment_orders`, por lo que la interfaz debe adaptarse a sus campos, estados y documentos asociados, en lugar de inventar una logica distinta.

---

### Regla de interfaz

- El formulario debe dividirse en 4 etapas.
- En la parte superior debe mostrarse un indicador de progreso con la etapa actual.
- El usuario debe entender claramente en que paso se encuentra y que falta para completar el expediente.

Etapas comunes:

1. `Ruta`
2. `Detalle`
3. `Revision`
4. `Finalizacion`

---

## Pestaña Depositar

Esta pestaña debe enfocarse netamente en la logica del sistema para operaciones donde el cliente deposita fondos o inicia un ingreso.

### Etapa 1. Ruta

El cliente debe escoger una de estas rutas:

- `Exterior a Bolivia` (`WORLD_TO_BO`)
- `USA a Wallet` (`US_TO_WALLET`)

La seleccion define:

- el `order_type` de `payment_orders`,
- los campos del siguiente paso,
- la forma en que se interpreta el destino,
- la logica de instrucciones de deposito.

---

### Ruta 1: Exterior a Bolivia (`WORLD_TO_BO`)

#### Etapa 2. Detalle

El formulario debe solicitar:

- monto a enviar
- direccion de cuenta destino o medio de recepcion
- opcion para subir imagen del QR bancario o documento de respaldo

### Campo de almacenamiento sugerido

- el archivo debe guardarse en `order-evidences`
- la referencia debe persistirse en `support_document_url`

### Logica esperada del sistema

- la app crea el expediente en `payment_orders`
- el `order_type` debe ser `WORLD_TO_BO`
- el estado inicial debe ser `created`
- la app calcula o prepara el calculo de `fee_total`
- la app calcula o prepara el calculo de `amount_converted`
- la app registra trazabilidad de creacion

### Datos minimos esperados en la orden

- `user_id`
- `order_type`
- `amount_origin`
- `origin_currency`
- `destination_currency`
- `status`
- `metadata`
- `support_document_url` si el cliente adjunta respaldo

### Recomendacion de `metadata`

Debe incluir al menos:

- metodo de entrega
- direccion o cuenta destino
- observaciones operativas si aplican

---

#### Etapa 3. Revision

Antes de confirmar, el cliente debe ver un resumen de:

- ruta seleccionada
- monto ingresado
- cuenta o destino indicado
- documento adjunto, si existe
- monto estimado a recibir
- fee estimado o configurado

En este punto el usuario confirma la creacion del movimiento.

### Resultado esperado

- termina la creacion del expediente
- la orden permanece en estado `created` hasta que el flujo requiera comprobante de deposito o avance operativo

---

#### Etapa 4. Finalizacion

En este paso se debe mostrar:

- campo para subir comprobante del deposito
- explicacion de que este paso puede completarse ahora o despues

### Regla importante

- el usuario puede omitir este paso temporalmente
- luego debe poder completarlo desde la pestaña `Transacciones`, dentro del detalle del expediente

### Campo backend asociado

- el comprobante del cliente debe guardarse en `evidence_url`

### Cambio de estado

- cuando el cliente sube el comprobante, la orden debe pasar a `waiting_deposit`

---

### Ruta 2: USA a Wallet (`US_TO_WALLET`)

#### Etapa 2. Detalle

El formulario debe solicitar:

- monto en USD
- direccion de la billetera del cliente
- red de recepcion

### Logica esperada del sistema

- la app crea una orden `payment_orders`
- el `order_type` debe ser `US_TO_WALLET`
- el estado inicial debe ser `created`
- la app calcula el fee de red
- la app calcula la comision del servicio
- la app deja registrado el destino cripto en `metadata`

### Recomendacion de `metadata`

Debe incluir:

- `delivery_method`
- `destination_address`
- `stablecoin` si aplica
- `crypto_destination.address`
- `crypto_destination.network`

---

#### Etapa 3. Revision

El cliente debe ver un resumen de:

- monto
- billetera destino
- red
- comision
- monto final estimado

La confirmacion de esta pantalla cierra la etapa de creacion del expediente.

---

#### Etapa 4. Finalizacion

Se debe mostrar:

- campo para subir comprobante del deposito
- mensaje indicando que puede hacerlo ahora o mas tarde desde `Transacciones`

### Cambio de estado

- al adjuntar el comprobante, la orden pasa a `waiting_deposit`

