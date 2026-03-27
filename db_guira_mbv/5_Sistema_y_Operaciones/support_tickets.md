# Tabla: `public.support_tickets`

## 📝 Descripción
Tabla orientada a almacenar en crudo las peticiones de asistencia, quejas formales de servicio al cliente o disputas sobre transacciones que un usuario redacta en la plataforma Guira. Funciona independientemente de los comentarios atados al proceso de Onboarding.

**Row Level Security (RLS)**: Activado. De uso interno por personal administrativo y listado único para los propios clientes de sus folios.

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `uuid` | PK | Expediente UUID Ticket referenciado desde UI. |
| **`user_id`** | `uuid` | FK, Nullable | Al cliente dueño amparándolo hacia `user_profiles.id`. Si es nulo, es un ticket enviado desde el Landing Page pre-autenticación. |
| **`subject`** | `text` | | Asunto general resumido o derivado por selector (Ej: `Rechazo de KYC`, `Problema retiro Cripto`). |
| **`message`** | `text` | | Cuerpo narrativo extenso. |
| **`contact_email`** | `text` | Nullable | Email para el feedback (fundamental si el remitente no está autenticado como User_id). |
| **`contact_phone`** | `text` | Nullable | Número brindado para atención al cliente presencial o whatsapp. |
| **`status`** | `text` | Default `open`| Estructura en control libre del seguimiento del staff (`open`, `investigating`, `resolved`). |
| **`created_at`** / **`updated_at`** | `timestamptz` | Default `nowUTC()`| Timestamp de ciclo en base temporal transcurrida. |

---

## 🔗 Relaciones (Foreign Keys)
- Destino vertical de la tabla `public.user_profiles.id`.

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "tkt_8LqP0mA",
  "user_id": "e30129bc-dbcf-4f51-b844-cb8cb1a03e91",
  "subject": "Delay in SWIFT Release",
  "message": "Envié la instrucción ayer con mi Invoice de China pero aún sigue procesando, ¿está todo OK?",
  "contact_email": "v.rojas@ag-export-latam.com",
  "status": "open",
  "created_at": "2024-03-24T18:00:00Z",
  "updated_at": "2024-03-24T18:00:00Z"
}
```
