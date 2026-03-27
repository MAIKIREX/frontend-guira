# Tabla: `public.customer_events_log`

## 📝 Descripción
Complemento a la bitácora anterior (`event_logs`), pero con foco total en eventos disparados exclusiva y voluntariamente por el cliente una vez logra ser aprobado (es decir, en vida transaccional). Registra intenciones explícitas ("Cliente pidió un retiro", "Cliente creó ruta de pagos"). Es esencial para métricas agregadas del CRM o tableros de crecimiento mostrando "cuánto operan los usuarios".

**Row Level Security (RLS)**: Activado. Limitado hacia los clientes dueños de las identidades de sus perfiles; mientras `STAFF` y `ADMIN` verifican estos en su Panel.

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `uuid` | PK | Default `gen_random_uuid()` |
| **`event_id`** | `text` | Unique | Folio único de idempotencia para la carga del cliente. |
| **`user_id`** | `uuid` | FK | Al cliente dueño originador del acto voluntario amparándolo hacia `user_profiles.id`. |
| **`source`** | `text` | | Origen natural en el módulo de frontend o API (`customer.withdrawal.create`). |
| **`event_type`** | `text` | | La etiqueta semántica de mercadotecnia / seguimiento que define este suceso (`withdrawal.requested`). |
| **`status`** | `webhook_status` | Default `RECEIVED`| Constreñido bajo ARRAY (`RECEIVED`, `PROCESSED`, `FAILED`, `RETRYING`, `IGNORED`). |
| **`context`** | `jsonb` | Default `{}` | Variables de contexto (Request ID, Transaction ID, IP address). |
| **`headers`** / **`payload`** | `jsonb` | Default `{}` | Cuerpos completos de información remitida. |
| **`provider_id`** / **`provider_key`** | `text` | Nullable | Rastreador enlazado y subyacente (Ej: Al enviar el retiro, afectó Bridge). |
| **`error`** / **`retries`** | `text` / `integer`| Nullable | Retórica de procesamiento y cola para funciones asíncronas. |
| **`received_at`** | `timestamptz` | Default `now()`| Instante de toma inicial. |
| **`created_at`** / **`updated_at`** | `timestamptz` | Default `nowUTC()`| Timestamp de ciclo en base temporal transcurrida. |

---

## 🔗 Relaciones (Foreign Keys)
- Todo es relativo estrictamente al individuo detonador referenciado hacia la tabla `public.user_profiles.id`.

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "celog_8zN21Lx",
  "event_id": "evt_USR_18MxLqZ",
  "user_id": "e30129bc-dbcf-4f51-b844-cb8cb1a03e91",
  "source": "customer.fiat_deposit.create",
  "event_type": "deposit.intent.created",
  "status": "PROCESSED",
  "context": {
    "intent_id": "f8a09b30-c4e1-45af..."
  },
  "payload": {
    "amount": 1000.50,
    "currency": "BOB"
  },
  "created_at": "2024-03-24T17:00:00Z"
}
```
