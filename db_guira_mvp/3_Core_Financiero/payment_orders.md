# Tabla: `public.payment_orders`

## Función de la Tabla
La tabla `payment_orders` encarna el "Checkout" o Cesta transaccional principal de Wilvelzap's MVP. Mientras un `payout_request` o `payin_route` definen el concepto o la intencionalidad, el `payment_order` actúa como la Órden completa end-to-end de pagos (o compras de saldos cripto/fiat para pagos a proveedores). Contempla todos los montos de origen, monto final de arribo, tasas de intercambio (`exchange_rate_applied`), el beneficiario cruzado o el proveedor destino que va a gozar de los fondos solicitados y comisiones explícitas de toda la transacción empaquetada.

## Columnas

| Nombre | Tipo de Dato | Opciones / Restricciones | Valor por Defecto | Descripción Breve |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` (PK) | updatable | `uuid_generate_v4()` | Clave primaria. |
| `user_id` | `uuid` | nullable, updatable | - | Dueño iniciador de la OCP. (Comprador o Sender). FK a `profiles`. |
| `order_type` | `text` | updatable | - | Tipo de orden (e.g. `payin`, `payout`, `supplier_payment`, `fx_trade`). |
| `processing_rail` | `text` | updatable | - | Sobre qué red o partner se liquidará la red (e.g. `bridge_ach`, `bridge_crypto`, `local_bank`). |
| `amount_origin` | `numeric` | updatable, CHECK | - | CHECK `>= 0`. Cuánto dinero sale del balance inicial sin conversiones. |
| `origin_currency` | `text` | updatable | - | Moneda original (e.g. `USD`). |
| `amount_converted` | `numeric` | nullable, updatable | - | Monto resultante teórico bajo una divisa destino tras aplicar FX o Bridge. |
| `destination_currency` | `text` | updatable | - | Moneda solicitada de aterrizaje hacia la red (e.g. `USDC`). |
| `exchange_rate_applied` | `numeric` | nullable, updatable | - | Tasa bloqueada que el usuario aceptó en el checkout o cotización. |
| `fee_total` | `numeric` | nullable, updatable | `0` | Porción retirable teórica para la plataforma MVP Guira o comisiones globales que asume el cliente en la cotización. |
| `status` | `order_status` | nullable, updatable | `'created'` | Evolución temporal de la orden (`waiting_deposit`, `deposit_received`, `processing`, `sent`, `completed`, `failed`). |
| `beneficiary_id`, `supplier_id` | `uuid` | nullable, updatable | - | Referencias a terceros (usuario local o proveedor foráneo en `suppliers`) que recibirá el remanente transformado. |
| `evidence_url`, `staff_comprobante_url`, `support_document_url` | `text` | nullable, updatable | - | Links al storage de tickets de comprobante de cara al cliente (invoice / proforma de soporte) y comprobantes subidos por el staff. |
| `metadata` | `jsonb` | nullable, updatable | `'{}` | Cajón para JSON auxiliar para glosas. |
| `is_test`, `environment` | `Mixed` | nullable, updatable | `false`, `'production'`| Entornos para sandoxes u on-ramps. |
| `created_at`, `updated_at` | `timestamptz` | nullable, updatable | `now()` | - |

*Nota: Cuenta con RLS (Row Level Security).*

## Relaciones
Se intercepta transversalmente en el nodo:
- **Asignado a:** Beneficiario opcional local a `profiles` (`beneficiary_id`).
- **Creador:** A `profiles` por el `user_id`.
- **Hacia el Mundo Real:** Al proveedor vía `supplier_id` contra `public.suppliers`.
- **Hacia Adjuntos Adicionales:** A múltiples PDFs o tickets aduaneros a su favor a través de `documents` usando `payment_order_id`.

## Ejemplo de Uso (JSON)

\`\`\`json
{
  "id": "1a2b3c4d-e89b-12d3-a456-426614174000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "order_type": "supplier_payment",
  "processing_rail": "bridge_crypto_usdc",
  "amount_origin": 1000.00,
  "origin_currency": "USD",
  "exchange_rate_applied": 1.00,
  "amount_converted": 995.00,
  "destination_currency": "USDC",
  "fee_total": 5.00,
  "status": "waiting_deposit",
  "supplier_id": "888e4567-e89b-12d3-a456-426614174000",
  "evidence_url": "invoices/2026/03/invoice_001.pdf",
  "created_at": "2026-03-26T16:20:00Z",
  "updated_at": "2026-03-26T16:20:00Z"
}
\`\`\`
