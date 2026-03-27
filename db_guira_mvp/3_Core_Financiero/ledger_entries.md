# Tabla: `public.ledger_entries`

## Función de la Tabla
`ledger_entries` representa el Libro Mayor de movimientos contables y la pieza más importante a nivel de consistencia financiera. A diferencia de esquemas simples que sobreescriben un campo de "monto total", este sistema usa entradas contables de tipo `deposit`, `payout`, `fee`, o `adjustment`. Sumar positivamente y restando negativamente todas estas filas vinculadas a una determinada `wallet_id` genera en milisegundos y con total auditabilidad fiscal, el balance total exacto de un cliente. 

## Columnas

| Nombre | Tipo de Dato | Opciones / Restricciones | Valor por Defecto | Descripción Breve |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` (PK) | updatable | `uuid_generate_v4()` | Clave primaria. Movimiento único contable. |
| `wallet_id` | `uuid` | updatable | - | Vinculación foránea al `wallet` que ve este movimiento. |
| `type` | `ledger_entry_type` | updatable | - | Si es un ingreso (`deposit`), salida (`payout`), una deducción transaccional (`fee`), o compensación interna manual (`adjustment`). |
| `amount` | `numeric` | updatable | - | Cantidad estricta económica del evento. Generalmente depósitos son positivos y retiros/fees son negativos. |
| `description` | `text` | nullable, updatable | - | Etiqueta o glosa leíble para identificar por qué ocurrió el movimiento en el feed financiero. |
| `reference_id` | `text` | nullable, updatable | - | ID laxo cruzado (p.ej un payment_order_id, un string de recibo bancario, invoice). |
| `metadata` | `jsonb` | nullable, updatable | `'{}` | JSON extendido, ideal para información de logs complementarios vinculados a transacciones. |
| `bridge_transfer_id` | `uuid` | nullable, updatable | - | FK directa hacia `bridge_transfers`. Si este recuento de ledger derivó del procesamiento de una API externa desde Bridge. |
| `created_at` | `timestamptz` | nullable, updatable | `now()` | - |

*Nota: Cuenta con RLS. Esta tabla jamás debería ser mutada en el sentido de actualziar "amounts", solo debe ser Análoga en base a Insertos para cumplir con las normas de inmutabilidad financiera en sistemas serios.*

## Relaciones
- **Apunta como registro de asiento hacia:** `wallets` a través de `wallet_id`.
- **Derivada directamente en caso de existir transbordos en puente a:** `bridge_transfers` a través de `bridge_transfer_id`.

## Ejemplo de Uso (JSON)

\`\`\`json
{
  "id": "444e4567-e89b-12d3-a456-426614174000",
  "wallet_id": "333e4567-e89b-12d3-a456-426614174000",
  "type": "deposit",
  "amount": 15000.50,
  "description": "ACH Payout from Tech Corp Sales",
  "reference_id": "INVOICE-0089",
  "bridge_transfer_id": null,
  "metadata": {
    "bank_sender": "Wells Fargo"
  },
  "created_at": "2026-03-26T11:05:05Z"
}
\`\`\`
