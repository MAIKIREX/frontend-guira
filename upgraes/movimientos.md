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

## Regla general de UX y negocio

### 1. Campos calculados no editables por el cliente

En la seccion actual `Depositar y enviar`, dentro del paso `Define la ruta y el expediente`, los siguientes campos deben ser solo de lectura para el cliente:

- `monto destino`
- `tipo de cambio`
- `fee total`

### Comportamiento esperado

- El cliente no debe poder editar estos valores manualmente.
- `exchange_rate_applied` y `fee_total` deben venir desde el sistema, segun configuracion interna, reglas de negocio o carga hecha por `staff` / `admin`.
- La UI solo debe mostrar el resultado calculado.
- Si todavia no existe una cotizacion final, la interfaz debe mostrar que el valor es estimado o pendiente de confirmacion.

### Sustento backend

Segun el contrato de `payment_orders`, estos campos ya existen:

- `amount_converted`
- `exchange_rate_applied`
- `fee_total`

Por lo tanto:

- el frontend debe leerlos y mostrarlos,
- no debe tratarlos como inputs libres para el cliente,
- debe preservar la coherencia con el estado de la orden.

---

## Estructura general del modulo

La seccion `Movimientos` debe dividirse visualmente en dos grandes acciones:

- `Depositar`
- `Enviar`

Cada una debe manejarse como un flujo por etapas.

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
- monto esperado en destino
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
- `intended_amount`
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

---

## Pestaña Enviar

Esta pestaña debe enfocarse en operaciones donde el cliente crea un expediente para enviar fondos a un tercero o a una direccion externa.

### Etapa 1. Ruta

El cliente debe escoger una de estas rutas:

- `Bolivia a Exterior` (`BO_TO_WORLD`)
- `Cripto a Cripto` (`CRYPTO_TO_CRYPTO`)

---

### Ruta 1: Bolivia a Exterior (`BO_TO_WORLD`)

#### Etapa 2. Detalle

Esta etapa corresponde a la creacion del expediente `PaymentOrder`.

El formulario debe solicitar:

- monto en bolivianos
- beneficiario o proveedor
- motivo del pago
- documento de respaldo

### Seleccion de beneficiario / proveedor

Debe existir una opcion para:

- seleccionar un proveedor ya guardado en `suppliers`
- crear un nuevo proveedor si no existe

### Regla al seleccionar proveedor existente

Cuando el usuario elige un proveedor guardado, la app debe autocompletar:

- datos de cuenta o destino
- direccion de billetera si aplica
- datos bancarios o cripto segun el metodo
- informacion complementaria necesaria dentro de `metadata`

### Sustento backend

La tabla `payment_orders` tiene:

- `supplier_id`
- `beneficiary_id`
- `metadata`

La tabla `suppliers` ya funciona como agenda de beneficiarios o contrapartes, por lo que este selector debe apoyarse en esa tabla.

### Documento de respaldo

El archivo debe:

- subirse al bucket `order-evidences`
- guardarse en `support_document_url`

### Logica esperada del sistema

- la app crea un registro unico en `payment_orders`
- el `order_type` debe ser `BO_TO_WORLD`
- el estado inicial debe ser `created`
- el expediente queda listo para mostrar instrucciones de deposito

### Recomendacion de `metadata`

Debe incluir:

- `payment_reason`
- `delivery_method`
- `intended_amount`
- datos bancarios o cripto del destino
- observaciones relevantes

Si el envio es bancario internacional, puede incluir un bloque como:

- `swift_details.bankName`
- `swift_details.swiftCode`
- `swift_details.iban`
- `swift_details.bankAddress`
- `swift_details.country`

---

#### Etapa 3. Revision

El usuario debe revisar:

- ruta elegida
- monto en Bs
- proveedor o beneficiario seleccionado
- motivo del pago
- documento adjunto
- datos de destino

Al confirmar:

- se termina la creacion del movimiento
- la orden sigue en estado `created`

---

#### Etapa 4. Finalizacion

La app debe mostrar instrucciones para completar el deposito local asociado a esa orden.

### Ejemplo de salida esperada

- QR de pago
- datos de cuenta PSAV
- referencia unica de la orden

### Regla importante

- el usuario puede salir sin completar este paso
- luego puede retomarlo desde `Transacciones`

### Cambio de estado recomendado

- cuando el usuario sube el comprobante del deposito, la orden debe pasar a `waiting_deposit`

---

### Ruta 2: Cripto a Cripto (`CRYPTO_TO_CRYPTO`)

#### Etapa 2. Detalle

El formulario debe solicitar:

- monto en USDC o activo configurado
- proveedor o beneficiario

Al seleccionar el proveedor, la app debe completar:

- direccion de billetera
- red
- datos relevantes de `metadata`

Tambien debe permitir:

- crear un nuevo proveedor si no existe uno guardado

### Logica esperada del sistema

- la app crea una orden `payment_orders`
- el `order_type` debe ser `CRYPTO_TO_CRYPTO`
- el estado inicial debe ser `created`
- la app deja el destino cripto persistido en `metadata`

### Recomendacion de `metadata`

Debe incluir:

- `delivery_method = crypto`
- `destination_address`
- `stablecoin`
- `crypto_destination.address`
- `crypto_destination.network`

---

#### Etapa 3. Revision

El resumen debe mostrar:

- monto
- proveedor seleccionado
- direccion de destino
- red
- moneda o stablecoin

La confirmacion finaliza la etapa de creacion del expediente.

---

#### Etapa 4. Finalizacion

La app debe mostrar la direccion de deposito de Guira o las instrucciones para fondear la orden.

### Regla importante

- el usuario puede salir y completar este paso despues desde `Transacciones`

### Cambio de estado

- al subir el comprobante del deposito, la orden pasa a `waiting_deposit`

---

## Estados operativos que la UI debe respetar

La interfaz no debe inventar estados nuevos para `payment_orders`. Debe usar los ya detectados en backend:

- `created`
- `waiting_deposit`
- `deposit_received`
- `processing`
- `sent`
- `completed`
- `failed`

### Comportamiento sugerido por estado

- `created`: expediente creado pero aun pendiente de comprobante o de siguiente accion operativa
- `waiting_deposit`: cliente ya envio comprobante y staff debe validar
- `deposit_received`: staff confirmo recepcion del deposito
- `processing`: operacion en ejecucion
- `sent`: transferencia enviada, con hash o referencia
- `completed`: operacion cerrada con comprobante final
- `failed`: operacion cancelada, rechazada o fallida

---

## Reglas de archivos y evidencias

Todos los archivos del flujo de movimientos deben seguir el contrato actual del sistema:

- bucket: `order-evidences`

### Columnas relacionadas en `payment_orders`

- `support_document_url`: documento de respaldo cargado por cliente durante la creacion
- `evidence_url`: comprobante de deposito cargado por cliente
- `staff_comprobante_url`: comprobante final cargado por staff al cierre

### Regla de producto

La interfaz debe diferenciar claramente estos tres documentos para no mezclar:

- respaldo documental
- comprobante de deposito del cliente
- comprobante final emitido por staff

---

## Pestaña Transacciones

La vista de `Transacciones` debe reorganizarse en dos pestañas internas:

- `Transferencias y movimientos`
- `Expedientes`

---

### 1. Transferencias y movimientos

Aqui se deben mostrar todas las transacciones operativas de la cuenta, incluyendo:

- depositos
- envios
- movimientos vinculados al flujo financiero del usuario

Esta vista debe servir como historial general.

---

### 2. Expedientes

Aqui se deben mostrar todos los expedientes creados por el usuario, principalmente los registros de `payment_orders`.

Esta vista debe ser la principal para retomar procesos incompletos.

### Requisitos funcionales

- permitir colapsar o expandir expedientes
- permitir continuar pasos pendientes desde aqui
- mostrar claramente el estado actual del expediente
- mostrar numero de expediente
- mostrar tipo de ruta
- mostrar fecha de creacion

### Filtros requeridos

- filtro por estado
- buscador por numero de expediente

### Casos que debe soportar

- subir comprobante faltante
- revisar instrucciones de deposito otra vez
- consultar documentos ya cargados
- seguir el avance del expediente segun el estado

---

## Criterios de implementacion

### La nueva experiencia debe cumplir con todo lo siguiente

- simplificar los formularios y enfocarlos en decisiones concretas
- mostrar solo los campos que correspondan segun la ruta elegida
- usar formularios por etapas con indicador visual de progreso
- impedir que el cliente edite `tipo de cambio`, `fee total` y `monto destino`
- reutilizar `suppliers` para beneficiarios o contrapartes guardadas
- mantener la creacion de orden sobre `payment_orders`
- almacenar documentos en las columnas correctas
- permitir completar pasos pendientes desde `Transacciones`
- respetar los estados reales del backend sin redefinirlos

---

## Resultado esperado

Al finalizar esta mejora, el modulo de `Movimientos` debe sentirse mas simple para el cliente, pero a la vez mas robusto y consistente con Supabase.

El usuario debe poder:

- crear un expediente sin confusiones,
- entender en que etapa esta,
- ver montos calculados sin modificarlos,
- adjuntar documentos en el momento correcto,
- retomar procesos desde `Transacciones`,
- y seguir el estado real de su orden hasta su cierre.
