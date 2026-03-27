# Tabla: `public.notifications`

## Función de la Tabla
La tabla `notifications` alberga a gran nivel los pings operacionales o proactivos que una maquinaria paralela o Edge Functions incrustan a favor del usuario. Esta data habilita la clásica "Campana de Notificaciones" en la UI superior, guiando al pre-render de títulos ("Documento Rechazado") y enlaces embebidos (Links clickeables dentro de la plataforma que te lleven al Order, al Ticket, o al Onboarding modal en cuestión). Aporta una rica capa de interacción Push/Pull para la atención B2B.

## Columnas

| Nombre | Tipo de Dato | Opciones / Restricciones | Valor por Defecto | Descripción Breve |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` (PK) | updatable | `extensions.uuid_generate_v4()` | Clave interna relacional de notificación. |
| `user_id` | `uuid` | updatable | - | El destinatario explícito de la notificación (`FK` strong contra `profiles`). |
| `type` | `text` | updatable | - | Contexto (scope / context tag) técnico del motor de UI. (e.g. `system`, `financial`, `onboarding_update`). |
| `title` | `text` | updatable | - | Cabecera atrevida y corta (ej. `Depósito Recibido exitosamente`). |
| `message` | `text` | updatable | - | Cadena de texto humana descriptiva secundaria que explica lo atado. |
| `link` | `text` | nullable, updatable | - | Link Relativo de la SPA app (ej. `/app/transacciones/123456...`) permitiendo re-routing instintivo. |
| `is_read` | `boolean` | updatable | `false` | Indica si el usuario visualmente ya marcó, scrolleó, o clickeó mediante mutación este mensaje. |
| `created_at`, `updated_at` | `timestamptz` | updatable | `now()` | - |

*Nota: Cuenta con RLS (Row Level Security).*

## Relaciones
- **Pertenencia Cíclica y Estricta:** Subordinado único a `profiles` (`user_id`).

## Ejemplo de Uso (JSON)

```json
{
  "id": "nnn12345-e89b-12d3-a456-426614174000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "type": "financial",
  "title": "Deposito de Pay-In Confirmado",
  "message": "Tu depósito de 1500 USD bajo Tech Corp ACH acaba de acreditarse en tu balance.",
  "link": "/dashboard/wallets?currency=USD",
  "is_read": false,
  "created_at": "2026-03-26T17:35:00Z"
}
```
