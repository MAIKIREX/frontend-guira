# Tabla: `public.payout_requests`

## Función de la Tabla
La tabla `payout_requests` es el mecanismo a través del cual los usuarios de la plataforma M-Guira (Wilvelzap's MVP) solicitan retirar (payout) sus fondos desde su balance interno (de `wallets` / `ledger_entries`) hacia el mundo exterior utilizando métodos tradicionales o crypto, mediante procesadores configurados. Esta tabla aloja la intención de retiro, el monto solicitado y la confirmación de la ruta a la cual este dinero será volcado (provider_data). También rastrea el ciclo de vida o estado de esta solicitud hasta ser completada o fallida. 

## Columnas

| Nombre | Tipo de Dato | Opciones / Restricciones | Valor por Defecto | Descripción Breve |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` (PK) | updatable | `uuid_generate_v4()` | Clave primaria. ID único para la solicitud de retiro. |
| `user_id` | `uuid` | updatable | - | El dueño de este retiro, que posee los fondos (FK a `profiles`). |
| `amount` | `numeric` | updatable | - | Monto exacto demandado del fondo a retirar (bruto). |
| `currency` | `text` | updatable | - | Cripto o FIAT divisa objetivo del retiro (e.g. `USD`, `BS`, `USDC`). |
| `provider_data` | `jsonb` | nullable, updatable | `'{}` | Destino detallado externalizado (ABA, Cuenta Corriente Bancaria, Llave SWIFT o Billetera destino). |
| `status` | `payout_status` | updatable | `'submitted'` | Enum que coordina en el tablero de transacciones como va el trámite a lo largo del proceso (`draft`, `submitted`, `under_review`, `approved`, `processing`, `paid`, `failed`, `rejected`). |
| `attachment_url` | `text` | nullable, updatable | - | Ruta URL (bucket) a un comprobante que justifique o confirme el desembolso desde caja. |
| `bridge_transfer_id` | `text` | nullable, updatable | - | Si se transaccionó contra Bridge API (Bridge Transfers), este es el recibo correlacional de ese endpoint. |
| `created_at` | `timestamptz` | nullable, updatable | `now()` | - |
| `updated_at` | `timestamptz` | nullable, updatable | `now()` | - |

*Nota: Cuenta con RLS (Row Level Security).*

## Relaciones
- **Generada por:** `profiles` a través de su columna `user_id`.

## Ejemplo de Uso (JSON)

\`\`\`json
{
  "id": "555e4567-e89b-12d3-a456-426614174000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "amount": 2500.00,
  "currency": "USD",
  "status": "processing",
  "provider_data": {
    "bank_name": "Bank of America",
    "account_last_4": "4567",
    "ach_routing": "012345678"
  },
  "bridge_transfer_id": "trans_abc987654",
  "attachment_url": null,
  "created_at": "2026-03-26T12:00:00Z",
  "updated_at": "2026-03-26T12:05:00Z"
}
\`\`\`
