# Tabla: `public.notifications`

## 📝 Descripción
Gestiona el envío de notificaciones internas "In-App" (campana de alertas) a los usuarios y retiene el listado de todos los avisos recibidos que han leído o se han perdido. El sistema de Workers y Edge Functions escribe sobre esta tabla y Supabase Realtime se encarga de enviarlo al Frontend. Almacena las directrices paramétricas y payload, en vez de un string estático traducido, haciendo a la notificación agnóstica del idioma.

**Row Level Security (RLS)**: Activado. Los usuarios pueden ver y marcar las notificaciones propias (`user_id`). `ADMIN`/`STAFF` lectura completa.

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `text` | PK | Clave única de notificación. |
| **`user_id`** | `uuid` | FK | Al usuario perteneciente en `user_profiles.id`. |
| **`template`** | `text` | | Clave de internalización que se mapea a un componente del UI. Ej. `kyc_approved`, `deposit_received`, `support_ticket_replied`. |
| **`payload`** | `jsonb` | | Información variable que rellena el `template` en pantalla. (Ej. `{"amount": 500, "currency": "USD"}`). |
| **`delivered_at`** | `timestamptz` | Nullable | Fechas en que fue efectivamente notificada al sistema cliente o fue marcada leída en pantalla. |
| **`created_at`** / **`updated_at`** | `timestamptz` | Default `now()`| Momentos temporales de existencia del objeto en cola. |

---

## 🔗 Relaciones (Foreign Keys)
- Destino de apuntamiento hacia el destinatario humano real: **`user_profiles.id`**.

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "notf_0z9LmX",
  "user_id": "e30129bc-dbcf-4f51-b844-cb8cb1a03e91",
  "template": "kyc_status_update",
  "payload": {
    "status": "APPROVED",
    "message_key": "Tu solicitud de KYC empresarial ha sido completamente analizada y aprobada.",
    "action_url": "/dashboard/compliance"
  },
  "delivered_at": "2024-03-24T18:05:00Z",
  "created_at": "2024-03-24T18:02:00Z",
  "updated_at": "2024-03-24T18:05:00Z"
}
```
