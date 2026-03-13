# Operaciones, Wallet y Pagos

## Idea central

La operacion principal del producto gira sobre `payment_orders`. El frontend actual sigue la regla "crear orden primero" y usa ese registro como expediente central.

## Rutas o tipos de operacion detectados

`PaymentsPanel` trabaja con:

- `bolivia_to_exterior`
- `us_to_wallet`
- `crypto_to_crypto`
- `us_to_bolivia`
- `bank_to_crypto`
- `crypto_to_bank`

## Tipos de orden y rieles

### `OrderType`

- `BO_TO_WORLD`
- `WORLD_TO_BO`
- `US_TO_WALLET`
- `CRYPTO_TO_CRYPTO`

### `ProcessingRail`

- `ACH`
- `SWIFT`
- `PSAV`
- `DIGITAL_NETWORK`

## Estado de `payment_orders`

- `created`
- `waiting_deposit`
- `deposit_received`
- `processing`
- `sent`
- `completed`
- `failed`

## Carga inicial del panel de pagos

El frontend consulta:

- `payin_routes` del usuario,
- `bridge_transfers` del usuario,
- `suppliers` del usuario,
- `fees_config`,
- `payment_orders` del usuario,
- `app_settings`,
- `psav_configs` activos.

## Metadata que arma el frontend al crear una orden

El objeto `metadata` base detectado es:

- `delivery_method`
- `payment_reason`
- `intended_amount`
- `destination_address`
- `stablecoin`

Para rutas Bolivia/exterior o exterior/Bolivia agrega:

- `funding_method`
- `swift_details`
- `ach_details`
- `crypto_destination`

`swift_details`:

- `bankName`
- `swiftCode`
- `iban`
- `bankAddress`
- `country`

`ach_details`:

- `routingNumber`
- `accountNumber`
- `bankName`

`crypto_destination`:

- `address`
- `network`

## Creacion de la orden

Se usa `createPaymentOrder()` y se envian estos datos:

- `userId`
- `orderType`
- `rail`
- `amountOrigin`
- `originCurrency`
- `destinationCurrency`
- `beneficiaryId`
- `supplierId`
- `amountConverted`
- `exchangeRate`
- `feeTotal`
- `metadata`

## Flujo cliente despues de crear la orden

### Caso Bolivia -> Exterior

- crea orden,
- si hay documento de respaldo lo sube a `support_document_url`,
- muestra instrucciones,
- espera comprobante del cliente,
- la orden queda en `created` hasta que el cliente suba evidencia.

### Caso Exterior -> Bolivia

- crea orden,
- tambien espera evidencia del cliente,
- queda en `created`.

### Otros casos automatizados en frontend actual

- despues de crear la orden, el frontend marca `completed` directamente.

## Subida de evidencia del cliente

Cuando el cliente sube comprobante:

- se usa bucket `order-evidences`,
- se actualiza `payment_orders.evidence_url`,
- luego se actualiza `status = 'waiting_deposit'`.

Tipos permitidos detectados:

- `image/jpeg`
- `image/png`
- `image/webp`
- `application/pdf`

## Cancelacion por cliente

Si la orden sigue en:

- `created`
- `waiting_deposit`

el cliente puede cancelarla. El frontend hace:

- `status = 'failed'`
- agrega `metadata.rejection_reason = 'Cancelado por el usuario'`

## Gestion de proveedores

La entidad `suppliers` funciona como agenda de beneficiarios o contraparte.

Payload detectado para crear o actualizar:

- `user_id`
- `name`
- `country`
- `payment_method`
- `bank_details`
- `crypto_details`
- `address`
- `phone`
- `email`
- `tax_id`

## WalletDashboard

El panel del cliente no usa una tabla de balance cerrada. Calcula el saldo desde movimientos:

1. busca la `wallet` del usuario,
2. lee `ledger_entries`,
3. suma depositos y resta payouts,
4. consulta `bridge_transfers` pendientes,
5. consulta `payment_orders`,
6. descuenta del balance todos los expedientes no fallidos.

## Cierre operativo por staff

El avance real de una orden manual en staff es:

1. `created` o `waiting_deposit` -> `deposit_received`
2. `deposit_received` -> `processing`
3. `processing` -> `sent`
4. `sent` -> `completed`

En esos pasos staff completa:

- tasa real,
- comision real,
- monto neto,
- referencia o hash,
- comprobante final.

## PDF de comprobante

Tanto cliente como staff pueden disparar `generatePaymentPDF()`. La recreacion en Next.js debe mantener la capacidad de descargar comprobantes operativos.
