# Tabla: `public.audit_logs`

## Función de la Tabla
La tabla `audit_logs` actúa como un estricto y riguroso log transaccional y rastreador de campos a nivel base de datos sobre la información de plataforma. A diferencia de `activity_logs` que sirve propósitos de Front-End, esta tabla intercepta transiciones y anotaciones de "quién cambió qué, cuándo y en qué nivel lógico (ej. usuario vs staff vs admin)". Principalmente vital en procesos AML y SOC-2 para trazar si el backoffice manipuló montos, IDs de billeteras o variables críticas sin justificación escrita.

## Columnas

| Nombre | Tipo de Dato | Opciones / Restricciones | Valor por Defecto | Descripción Breve |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` (PK) | updatable | `uuid_generate_v4()` | Hash de seguimiento unitario del evento logueado de cambio de estado de DB. |
| `performed_by` | `uuid` | nullable, updatable | - | Actor principal (generalmente el `user_id` de `profiles`) que gatilló el UPDATE, DELETE o INSERT. |
| `role` | `text` | nullable, updatable, CHECK | - | Contexto bajo el que actuó, filtrado por un constrain `role = ANY (ARRAY['user', 'staff', 'admin'])`. |
| `action` | `text` | updatable | - | Acción concreta de base de datos o lógica CRUD (`UPDATE_ONBOARDING`, `MANUAL_LEDGER_ENTRY`, `ARCHIVED_USER`). |
| `table_name` | `text` | updatable | - | Entidad raíz donde ocurrió la modificación (`onboarding`, `profiles`, `ledger_entries`, etc.). |
| `record_id` | `uuid` | updatable | - | Llave foránea textual del objeto que sufrió la mutación, vinculándolo inequívocamente con su tabla original. |
| `affected_fields` | `text[]` | nullable, updatable | - | Array puro de strings que enumera qué claves sufrieron un cambio real en base al difeo. (ej. `["status", "is_archived"]`). |
| `previous_values` | `jsonb` | nullable, updatable | - | Snapshot fotográfico del objeto antes de ocurrir la acción de borrado o actualización. |
| `new_values` | `jsonb` | nullable, updatable | - | Snapshot fotográfico de la row post actualización. |
| `reason` | `text` | nullable, updatable | - | Justificación humana o prompt requerida (o logueada) para validar legalmente una alteración sensible frente a inspectores AML. |
| `source` | `text` | nullable, updatable | `'ui'` | Cómo o desde donde se ejecutó (ej. `api`, `bridge_webhook`, `admin_panel`). |
| `created_at` | `timestamptz` | nullable, updatable | `now()` | - |

*Nota: Cuenta con RLS (Row Level Security).*

## Relaciones
- Se conecta hacia `profiles` mediante la columna de `performed_by` para indexar qué administradores u operarios están operando sobre clientes.

## Ejemplo de Uso (JSON)

```json
{
  "id": "fff12345-e89b-12d3-a456-426614174000",
  "performed_by": "000e4567-e89b-12d3-a456-426614174000",
  "role": "admin",
  "action": "UPDATE_ONBOARDING",
  "table_name": "onboarding",
  "record_id": "111e4567-e89b-12d3-a456-426614174000",
  "affected_fields": [
    "status",
    "observations"
  ],
  "previous_values": {
    "status": "under_review",
    "observations": null
  },
  "new_values": {
    "status": "verified",
    "observations": "KYB Review Passed successfully via Acuant."
  },
  "reason": "Documentación válida contrastada manual por analista de compliance",
  "source": "admin_panel",
  "created_at": "2026-03-26T16:10:00Z"
}
```
