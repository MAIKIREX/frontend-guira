# Tabla: `public.bridge_virtual_account_events`

## Función de la Tabla
La tabla `bridge_virtual_account_events` es el registro cronológico y exhaustivo (Log o Webhook receptor) de todos los eventos notificados o capturados que emite el ciclo de vida de una cuenta virtual provista por Bridge en favor de un cliente en M-Guira. Esto incluye notificaciones API de cuando una cuenta recaba dinero o es acreditada por un wire o ACH de terceros, cuando surgen reversos interbancarios o transiciones de estados que impactan a ese número virtual.

## Columnas

| Nombre | Tipo de Dato | Opciones / Restricciones | Valor por Defecto | Descripción Breve |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` (PK) | updatable | `uuid_generate_v4()` | Autogenerado por M-Guira para clasificar el webhook procesado individualmente. |
| `bridge_event_id` | `text` | updatable, unique | - | ID irrefutable traído directamente de la cabeza o el cuerpo del Webhook de Bridge, previniendo inyección duplicada de eventos asíncronos en caso de retry requests. |
| `bridge_virtual_account_id` | `text` | updatable | - | El string principal a la cuenta virtual (`virt_acct_xxxx`) afectada por este latido de sistema. |
| `event_type` | `text` | updatable | - | Concepto funcional emitido por bridge (e.g. `virtual_account_credited`, `virtual_account_debit_failed`). |
| `amount` | `numeric` | nullable, updatable | - | Valor bruto transferido que derivó este evento (si era netamente un webhook monetario). |
| `currency` | `text` | nullable, updatable | - | Fiat que cursó dicho tramo (`USD` generalmente). |
| `raw_payload` | `jsonb` | updatable | - | Carga del payload crudo JSON exacto enviado por Bridge por temas de compliance legal e indemnidad en caso de disputas de saldos (`investigations`). |
| `created_at` | `timestamptz` | nullable, updatable | `now()` | - |

*Nota: Cuenta con RLS habilitado, garantizando que los usuarios no puedan inyectar ni alterar eventos falsificados de recepción bancaria.*

## Relaciones
A nivel semántico, es dependiente al ID `bridge_virtual_account_id` que puede trazarse retroactivamente en `bridge_virtual_accounts` para determinar cuál era la wallet ligada. Operacionalmente, es un sumidero (Sink) de eventos, por lo cual otras tablas no heredan Foráneas de esta, al ser un log puro.

## Ejemplo de Uso (JSON)

```json
{
  "id": "ddd12345-e89b-12d3-a456-426614174000",
  "bridge_event_id": "evt_ab89sdh8a9sdg",
  "bridge_virtual_account_id": "virt_acct_89asd7g87a",
  "event_type": "virtual_account_credited",
  "amount": 5400.00,
  "currency": "USD",
  "raw_payload": {
    "type": "virtual_account_credited",
    "created_at": "2026-03-26T15:30:10.000Z",
    "data": {
       "virtual_account_id": "virt_acct_89asd7g87a",
       "amount": "5400.00",
       "currency": "usd"
    }
  },
  "created_at": "2026-03-26T15:30:15Z"
}
```
