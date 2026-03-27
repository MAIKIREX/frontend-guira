# Tabla: `public.webhook_events`

## 📝 Descripción
Tabla fundamental de infraestructura. Guira delega parte de su operatoria a rieles financieros externos (Proveedores API). Estos rieles usan "Webhooks" asíncronos para comunicar a la plataforma cuando algo se aprobó o falló. La tabla `webhook_events` actúa como una "Bandeja de Entrada/Buffer". Recibe en crudo los llamados de red y los pone en cola para que los *Workers* internos los procesen sin perder mensajes por caídas de red o errores de parseo.

**Row Level Security (RLS)**: Activado. Permisos exclusivos para Service Role y Administradores de Infraestructura.

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `text` | PK | UUID/ID único del evento de webhook interno. |
| **`provider_id`** | `text` | FK, Nullable | Proveedor causante del webhook (Apunta a `provider_candidates.id`). |
| **`provider_key`** | `text` | | String llave ("bridge", "persona"), usado mayoritariamente para ubicar la lógica delegada (Handlers y Parsers). |
| **`event_id`** | `text` | Unique | El ID **original enviado por el proveedor** en su Payload. Identificador de Deduplicación crítico para manejar re-envíos y evitar re-procesar dinero. |
| **`headers`** | `jsonb` | | Cabeceras HTTP originales (necesarias para comprobar las firmas HMAC criptográficas en un worker diferido). |
| **`payload`** | `jsonb` | | El cuerpo del POST JSON sin inmutar. |
| **`status`** | `webhook_status` | Enum | Estado de esta entrada en la cola: `RECEIVED` (Esperando turno), `PROCESSED` (Procesado OK y efectos aplicados en BD), `FAILED`, `RETRYING`, `IGNORED`, `DUPLICATE`. |
| **`retries`** | `integer` | Default `0` | Veces en las que el Worker local intentó digerir este payload y falló (límite de Dead Letter Queue). |
| **`error`** | `text` | Nullable | Exception log message de código en caso de que su status sea `FAILED`. |
| **`processed_at`** | `timestamptz` | Nullable | Cuándo el worker le dio el visto bueno final. |
| **`received_at`** | `timestamptz` | Default `now()`| Cuándo impactó la petición HTTP en la función Edge o endpoint. |

---

## 🔗 Relaciones (Foreign Keys)
- **`provider_id`**: Traza estricta de `public.provider_candidates.id`.

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "whk_T7oPqmX1",
  "provider_id": "prov_Br1dG3x",
  "provider_key": "bridge",
  "event_id": "evt_bridge_x190kLp",
  "headers": {
    "host": "api.guira.com",
    "signature": "hmac_sha256=10f9e8d7c6b5a4..."
  },
  "payload": {
    "type": "customer.kyc_status_updated",
    "customer_id": "cust_123bridge890",
    "status": "approved"
  },
  "status": "PROCESSED",
  "retries": 0,
  "error": null,
  "processed_at": "2024-03-24T18:01:05Z",
  "received_at": "2024-03-24T18:01:03Z"
}
```
