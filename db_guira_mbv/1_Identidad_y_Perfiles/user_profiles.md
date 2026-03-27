# Tabla: `public.user_profiles`

## 📝 Descripción
La tabla `user_profiles` es el núcleo de identidad dentro del sistema Guira. Sirve como el puente directo entre el servicio de autenticación de Supabase (`auth.users`) y la lógica de negocio de la aplicación. Todo actor dentro del sistema (cliente, administrador, revisor) debe poseer un registro en esta tabla. Dicta el nivel de acceso al definir los roles y mantiene las preferencias del usuario a nivel global de la plataforma.

**Row Level Security (RLS)**: Activado. Un usuario solo puede ver su propio registro. Los administradores pueden ver y gestionar todo, y los miembros del staff pueden consultar los perfiles.

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `uuid` | PK | Identificador único del perfil. Es la clave primaria utilizada en todo el sistema como `user_id` en las relaciones externas. |
| **`user_id`** | `uuid` | Unique | El ID enlazado directamente con la tabla de autenticación de Supabase (`auth.users.id`). Aunque puede compartir el mismo UUID que `id`, esto permite desacoplar la autenticación si es necesario. |
| **`role`** | `user_role` (Enum) | Default: `USER` | Define el nivel de permisos del perfil. Sus valores posibles son: `USER`, `ADMIN`, `STAFF`, `REVIEWER`. Controla el acceso a diferentes secciones del panel de administración y los permisos de RLS. |
| **`created_at`** | `timestamptz` | Default: `now()` | Fecha y hora en que se creó el perfil de usuario. |
| **`updated_at`** | `timestamptz` | Default: `now()` | Fecha y hora de la última modificación en el perfil. Debe actualizarse mediante un trigger en la base de datos cada vez que ocurre un `UPDATE`. |
| **`preferences`** | `jsonb` | Default: `{}` | Objeto JSON estructurado para guardar configuraciones del usuario, tales como el idioma de la interfaz, preferencias de notificaciones o el tema oscuro/claro favorito. |

---

## 🔗 Relaciones (Foreign Keys)
Dado que es la tabla raíz de identidad del usuario, gran cantidad de entidades dependen de ella. Algunas de las principales relaciones (y tablas en las que actúa como `TARGET`) son:

- **`people`** (`user_id -> id`): A cada perfil se le asocia una persona natural cuando hace el Onboarding.
- **`kyc_applications` / `kyb_applications`** (`user_id -> id`): El creador de las aplicaciones de cumplimiento.
- **`wallets`, `balances`, `transactions`, `fiat_deposit_intents`**: Todo recurso financiero le pertenece a un `user_profile`.
- **`reviews`** (`assigned_to_id`, `decided_by_id`): Relaciona quién está asignado para revisar una solicitud y qué miembro del Staff la aprobó o rechazó.
- **`audit_logs`**, **`event_logs`**: Quién disparó la acción dentro del sistema operativo.

---

## 📄 Ejemplo JSON de Uso

Ejemplo de cómo los clientes consumen o estructuran los datos de un `user_profiles` a través de la API (o en el frontend con TypeScript):

```json
{
  "id": "e30129bc-dbcf-4f51-b844-cb8cb1a03e91",
  "user_id": "e30129bc-dbcf-4f51-b844-cb8cb1a03e91",
  "role": "USER",
  "created_at": "2024-03-20T14:32:00.000Z",
  "updated_at": "2024-03-25T09:15:00.000Z",
  "preferences": {
    "language": "es-BO",
    "theme": "dark",
    "email_notifications_enabled": true
  }
}
```
