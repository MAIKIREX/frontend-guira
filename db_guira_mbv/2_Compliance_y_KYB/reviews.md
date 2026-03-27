# Tabla: `public.reviews`

## 📝 Descripción
La tabla `reviews` maneja el proceso central de evaluación y aprobación en la plataforma Guira. Representa una "solicitud de revisión" realizada por un usuario (ejemplo, enviar un KYC corporativo o individual) que debe ser auditada por un miembro del equipo interno (Staff/Reviewer) antes de que el usuario pueda operar con entidades financieras.

**Row Level Security (RLS)**: Activado. Restringido estrictamente para que solo usuarios con privilegios administrativos (`ADMIN`, `STAFF`, `REVIEWER`) puedan acceder y leer. Los clientes normales no consultan directamente esta tabla, sino la tabla de la aplicación origen (ej. `kyc_applications`).

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `text` | PK | Identificador único de la revisión. |
| **`subject_type`** | `subject_type` (Enum)| | El tipo de entidad que se está revisando. Valores posibles: `KYC` (Conoce a tu cliente), `KYB` (Conoce a tu negocio), `UBO` (Beneficiario Final). |
| **`subject_id`** | `text` | | El ID del sujeto o de la aplicación bajo revisión. Hace un "polymorphic linking" lógico hacia tablas como `kyc_applications` o `kyb_applications`. |
| **`assigned_to_id`**| `uuid` | Nullable, FK | El `id` del perfil de usuario (STAFF) asignado para hacer la revisión. Si es `NULL`, la solicitud está en la piscina general (pool). |
| **`decided_by_id`** | `uuid` | Nullable, FK | El `id` del perfil de usuario (STAFF) que tomó la decisión final sobre la revisión. |
| **`decided_at`** | `timestamptz` | Nullable | Fecha y hora en que se emitió el fallo/decisión final. |
| **`decision`** | `review_decision` (Enum)| Default: `NONE` | Estado / veredicto de la revisión. Valores posibles: `NONE` (Aún sin revisar), `APPROVE` (Aprobado), `REJECT` (Rechazado), `REQUEST_CHANGES` (Devuelto al cliente para correcciones). |
| **`created_at`** / **`updated_at`** | `timestamptz` | Default `now()` | Fechas de creación y actualización del registro. |

---

## 🔗 Relaciones (Foreign Keys)
- **Hacia `user_profiles`**:
  - `assigned_to_id`: Staff encargado.
  - `decided_by_id`: Staff que aprobó el cierre.
- **Como Origen (TARGET) para**:
  - `review_comments` (`review_id -> id`): Discusiones y notas dejadas por el equipo de revisión o notas hacia el cliente.
  - `review_events` (`review_id -> id`): Historial de cambios de estado de esta revisión (Audit Trail de la revisión).

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "rev_9k2Ls1P3",
  "subject_type": "KYB",
  "subject_id": "kyb_app_1029384",
  "assigned_to_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "decided_by_id": null,
  "decided_at": null,
  "decision": "NONE",
  "created_at": "2024-03-24T18:00:00Z",
  "updated_at": "2024-03-24T18:30:00Z"
}
```
