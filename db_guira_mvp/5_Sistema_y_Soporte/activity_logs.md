# Tabla: `public.activity_logs`

## Función de la Tabla
`activity_logs` sirve como el registro de auditoría principal enfocado a la UX para rastrear las interacciones o acciones que el usuario (o el sistema bajo su nombre) ha ejecutado. Es distinta de una tabla de `audit_logs` severa que traza a nivel fila por fila (`INSERT`, `UPDATE`); esta tabla funciona para mostrar el Feed Histórico al cliente ("Has añadido un banco", "Iniciaste sesión", "Transferencia pendiente") proveyéndole una sensación de seguridad y control temporal de su perfil.

## Columnas

| Nombre | Tipo de Dato | Opciones / Restricciones | Valor por Defecto | Descripción Breve |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` (PK) | updatable | `uuid_generate_v4()` | ID consecutivo del log. |
| `user_id` | `uuid` | nullable, updatable | - | Actor del evento (opcional para acciones del sistema autónomo, pero FK a `profiles`). |
| `action` | `text` | updatable | - | Cadena de texto humana-leíble o tipada de diccionario que expone el suceso (ej. `login_success`, `wallet_created`, `document_uploaded`). |
| `metadata` | `jsonb` | nullable, updatable | `'{}` | Carga JSON con sub-datos específicos del evento (IDs correlacionales, IPs involucradas o strings). |
| `created_at` | `timestamptz` | nullable, updatable | `now()` | - |

*Nota: Cuenta con RLS (Row Level Security).*

## Relaciones
- **Realizada por/Hacia:** `profiles` mediante `user_id`. Esto permite tener un endpoint /activity listando exclusivamente los hechos de ese usuario.

## Ejemplo de Uso (JSON)

```json
{
  "id": "aaa12345-e89b-12d3-a456-426614174000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "action": "payout_requested",
  "metadata": {
    "amount": 2500,
    "currency": "USD",
    "payout_id": "555e4567-e89b-12d3-a456-426614174000",
    "ip_address": "192.168.1.100"
  },
  "created_at": "2026-03-26T12:00:05Z"
}
```
