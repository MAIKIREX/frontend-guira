# Tabla: `public.support_tickets`

## Función de la Tabla
La tabla `support_tickets` centraliza las fallas, requerimientos lógicos y disonancias transaccionales del lado del cliente. Un usuario que necesita soporte en su aplicación genera un nuevo ticket bajo este esquema conteniendo el tipo de auxilio requerido (Subject) junto a su mensajería. Provee la trazabilidad clásica de un centro de atención a cliente (`helpdesk`) que el Staff debe procesar.

## Columnas

| Nombre | Tipo de Dato | Opciones / Restricciones | Valor por Defecto | Descripción Breve |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` (PK) | updatable | `gen_random_uuid()` | Hash primario. |
| `user_id` | `uuid` | updatable | - | Quien experimentó el problema reportado. (FK hacia `profiles`). |
| `subject` | `text` | updatable | - | Resumen categórico dictado mediante dropdown o imput en interfaz. (ej., `Problema con Transferencia`). |
| `message` | `text` | updatable | - | El cuerpo o prompt explicativo redactado descriptivamente. |
| `contact_email` | `text` | updatable | - | Email que el usuario proporcionó para recibir copias de este soporte y contactarlo off-platform si fuere necesario. |
| `contact_phone` | `text` | nullable, updatable | - | Teléfono en caso de escalamientos Nivel 3. |
| `status` | `text` | updatable, CHECK | `'open'` | Verificación booleana con ENUMS abstractos evaluada en string (`'open'`, `'in_progress'`, `'resolved'`, `'closed'`). |
| `created_at`, `updated_at` | `timestamptz` | updatable | `now()` | - |

*Nota: Cuenta con RLS habilitado, los usuarios leen o añaden a sus tickets; y el staff los opera.*

## Relaciones
- Conecta íntegramente de un ticket proveniente a `profiles`.

## Ejemplo de Uso (JSON)

```json
{
  "id": "1t1k3t3t-e89b-12d3-a456-426614174000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "subject": "Wire Transfer Delayed",
  "message": "Mi depósito wire de 5k apareció devuelto en mi banco original pero no se canceló aquí",
  "contact_email": "wilvelzap.ceo@empresa.com",
  "contact_phone": "+59178945612",
  "status": "in_progress",
  "created_at": "2026-03-26T17:25:00Z",
  "updated_at": "2026-03-26T17:28:00Z"
}
```
