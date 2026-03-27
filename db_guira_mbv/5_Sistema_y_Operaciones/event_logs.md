# Tabla: `public.event_logs`

## 📝 Descripción
Tabla designada como bitácora de telemetría de Sistema y Administrador (`STAFF/SYSTEM`). Mientras que `webhook_events` atiende interacciones asíncronas HTTP, y `customer_events_log` rastrea acciones propias de clientes en la UI, esta tabla capta eventos originados por automatizaciones subyacentes o tareas desencadenadas manualmente por los oficiales de cumplimiento (e.g. `admin.submitted_to_bridge`).

**Row Level Security (RLS)**: Activado. Su contenido pertenece al contexto general y a veces cuenta con información sensible, su uso es solo para el equipo gerencial.

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `text` | PK | Expediente único. |
| **`event_id`** | `text` | Unique | El folio natural del evento subyacente que lo originó, protegiendo contra ingestiones dobles. |
| **`provider_key`** | `text` | | Herramienta referenciada ("bridge", "persona"). |
| **`provider_id`** | `text` | Nullable | ID del payload subyacente. |
| **`source`** | `text` | | Quién disparó el log (`admin.bridge_submission`, `bridge_pull.worker`). |
| **`event_type`** | `text` | | Qué pasó explícitamente (`admin.submitted_to_bridge`). |
| **`context`** | `jsonb` | Default `{}` | Variables anexas del suceso estructuradas (`applicationId, jobId`). |
| **`headers`** / **`payload`** | `jsonb` | Default `{}` | Retención de lo enviado en la llamada (Headers de la Request si la hubo). |
| **`status`** | `webhook_status` | Default `RECEIVED` | Puesto que los eventos sistémicos a veces envuelven un reproceso en Edge Functions, su estatus replica el flujo de las integraciones (`RECEIVED`, `PROCESSED`, `FAILED`, `RETRYING`). |
| **`retries`** | `integer` | Default `0` | Veces de falla en la cola reintentadora. |
| **`error`** | `text` | Nullable | Motivo o Stack Trace si algo tronó. |
| **`received_at`** | `timestamptz` | Default `now()`| Instante de toma inicial. |
| **`created_at`** / **`updated_at`** | `timestamptz` | Default `nowUTC()`| Timestamp de la petición de base. |

---

## 🔗 Relaciones (Foreign Keys)
- Tabla desconectada que actúa como cubo de datos sin uniones restrictivas, favoreciendo la alta velocidad de escritura (high-throughput writes) por parte de workers sin esperar Locks de referencialidad.

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "evtSys_1aX9Mz2L",
  "event_id": "job_01Pqz8_sync_1",
  "provider_key": "guira_scheduler",
  "source": "cron.bridge_pull",
  "event_type": "scheduled.pull_started",
  "context": {
    "total_expected_records": 1500
  },
  "status": "PROCESSED",
  "retries": 0,
  "created_at": "2024-03-24T18:00:00Z",
  "updated_at": "2024-03-24T18:00:00Z"
}
```
