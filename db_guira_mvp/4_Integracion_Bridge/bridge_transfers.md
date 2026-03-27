# Tabla: `public.bridge_transfers`

## Función de la Tabla
La tabla `bridge_transfers` sirve como el nodo de control histórico de todos y cada uno de los movimientos fiduciarios (remesas, fondeos, liquidaciones) que envuelven una transacción concreta llamando al API de Bridge. Consigna los datos en bruto y metadatos vitales de Bridge (desde montos, fees de conversión, ids de idempotencia y orígenes/destinos lógicos) permitiendo orquestar un registro intachable e interrogar a posteriori a la plataforma de Bridge sin perder los orígenes ni montos enviados por Bridge.

## Columnas

| Nombre | Tipo de Dato | Opciones / Restricciones | Valor por Defecto | Descripción Breve |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` (PK) | updatable | `uuid_generate_v4()` | Llave principal única a nivel M-Guira para cada transacción subyacente. |
| `user_id` | `uuid` | nullable, updatable | - | FK a `profiles`. Dueño de la transferencia desde el lado transaccional. |
| `bridge_transfer_id` | `text` | nullable, updatable, unique | - | El `id` real regresado por la API al solicitar la mutación de flujos en Bridge (`trans_xyz`). |
| `idempotency_key` | `text` | updatable, unique | - | Clave local obligatoria pre-generada y enviada a Bridge para prevenir reintentos de cobro idénticos. |
| `transfer_kind` | `text` | updatable | - | Si es un on-ramp o liquidación (`fiat_to_crypto`, `crypto_to_fiat`, `fiat_to_fiat`). |
| `business_purpose` | `text` | updatable | - | Razón comercial bajo KYC de la transferencia, obligado por AML. |
| `amount` | `numeric` | updatable, CHECK | - | CHECK `amount > 0`. Saldo inicial bruto transaccionado hacia la capa de conversión de Bridge. |
| `currency` | `text` | updatable | - | Moneda original ingresada. |
| `exchange_rate` | `numeric` | nullable, updatable | `1` | Rata de cambio aplicada en la inter-moneda si es que la hubo (`USD` a `USDC` a veces difiere del 1:1 o `BS`). |
| `fee_amount`, `net_amount` | `numeric` | nullable, updatable | `0` | Porción que se quedó el desarrollador/proveedor y monto resultante para el usuario tras cruzar el puente. |
| `status` | `text` | nullable, updatable | `'created'` | Bandera dinámica mutada usualmente por Webhook Bridge (ej. `processing`, `completed`, `failed`). |
| `source_type`, `source_id` | `text` | nullable, updatable | - | Qué/quién inicia y el ID del objeto que envía los fondos en Bridge (ej. `virtual_account`, `external_account`). |
| `destination_type`, `destination_id` | `text` | nullable, updatable | - | Origen al que aterrizan (ej. `crypto_wallet`, `external_account`). |
| `metadata` | `jsonb` | nullable, updatable | `'{}` | Cajón para JSON auxiliar misceláneo. |
| `created_at`, `updated_at` | `timestamptz` | nullable, updatable | `now()` | - |

*Nota: Cuenta con RLS (Row Level Security).*

## Relaciones
- **Actor Base:** Embebido hacia `profiles` mediante `user_id`.
- **Relación Cíclica:** La tabla `ledger_entries` en su columna `bridge_transfer_id` es referida para consolidar el monto de esta orden frente al saldo local de la billetera.

## Ejemplo de Uso (JSON)

```json
{
  "id": "ccc12345-e89b-12d3-a456-426614174000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "bridge_transfer_id": "trans_def123456",
  "idempotency_key": "idempotency_xyz_987",
  "transfer_kind": "crypto_to_fiat",
  "business_purpose": "Supplier payment",
  "amount": 1000.00,
  "currency": "USDC",
  "status": "processing",
  "source_type": "crypto_wallet",
  "source_id": "wallet_acct_abc123",
  "destination_type": "external_account",
  "destination_id": "ext_acct_987654zyxwv",
  "exchange_rate": 1.00,
  "fee_amount": 0.50,
  "net_amount": 999.50,
  "created_at": "2026-03-26T15:00:00Z",
  "updated_at": "2026-03-26T15:01:00Z"
}
```
