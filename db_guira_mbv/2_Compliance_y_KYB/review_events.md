# Tabla: `public.review_events`

## 📝 Descripción
Esta tabla es un registro inmutable de auditoría (Log de cambios de estado) específico para las revisiones. Almacena las transiciones de estado de una aplicación. Esto es crítico para mantener la métrica de Cuota de Nivel de Servicio (SLA) y probar el seguimiento ante entes reguladores de que se validó a un cliente adecuadamente.

**Row Level Security (RLS)**: Activado. Su acceso está reservado exclusivamente para perfiles con privilegios de administrador o compliance staff (`role = 'STAFF' o 'ADMIN'`).

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `text` | PK | Identificador único del evento en la revisión. |
| **`review_id`** | `text` | FK | Referencia a `public.reviews.id`. |
| **`actor_id`** | `uuid` | Nullable, FK | Refiere a `user_profiles.id`. Indica qué usuario provocó la transición de estado (puede ser un STAFF aprobando, o el mismo cliente marcando como "Sometido"). |
| **`from_status`** | `application_status` (Enum)| Nullable | Estado original del que partió la aplicación antes de este evento. Enumeración similar al ciclo normal: `DRAFT`, `SUBMITTED`, `IN_REVIEW`, `NEEDS_CHANGES`, `RESUBMITTED`, `APPROVED`, `REJECTED`, `NEEDS_BRIDGE_KYC_LINK`. |
| **`to_status`** | `application_status` (Enum)| Nullable | Estado nuevo en el que quedó la aplicación. |
| **`metadata`** | `jsonb` | | Datos adicionales relativos al cambio. Útil para incrustar razones automáticas o datos de API (ej. resultados de Bridge Webhook). |
| **`created_at`** | `timestamptz` | Default `now()` | Cuándo exactamente ocurrió el cambio de evento de manera inamovible (No existe updated_at porque esta tabla es apendicular - append only). |

---

## 🔗 Relaciones (Foreign Keys)
- **`review_id`**: Traza a la petición que se está auditando en `public.reviews.id`.
- **`actor_id`**: Traza a quién efectuó la acción de cambio (Compliance u Operador API) en `public.user_profiles.id`.

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "revent_2mXp8Qz",
  "review_id": "rev_9k2Ls1P3",
  "actor_id": "e30129bc-dbcf-4f51-b844-cb8cb1a03e91",
  "from_status": "DRAFT",
  "to_status": "SUBMITTED",
  "metadata": {
    "reason": "Client triggered manual submit via user panel",
    "ip_address": "8.8.8.8"
  },
  "created_at": "2024-03-24T18:05:00Z"
}
```
