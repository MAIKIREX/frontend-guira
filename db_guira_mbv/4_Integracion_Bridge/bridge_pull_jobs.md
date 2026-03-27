# Tabla: `public.bridge_pull_jobs`

## 📝 Descripción
Realiza un traqueo inmutable y persistente de las **Operaciones de Sincronizado Masivo** entre los clientes locales creados y la nube remota de Bridge ('Pull from Bridge'). Estas cargas se usan cuando los Operadores (`STAFF` y `ADMIN`) necesitan verificar la integridad y traer el último estado legal de sus clientes al Tenant de Guira (Por ejemplo, un cambio de status de riesgo que Bridge hizo y falló en webhooks pero existe en su Dashboard). Da vida a trabajos cronometrados largos.

**Row Level Security (RLS)**: Activado. Estricto uso por personal del STAFF. 

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `uuid` | PK | Convocatoria y ID del Job para polling de interfaces "Job #91Z..". |
| **`actor_profile_id`** / **`auth_user_id`** | `uuid`, `text`| Nullable | Identificación del humano STAFF (User/Profile id) detonante del esfuerzo de hardware/sincronización y de la llave original usada. |
| **`status`** | `text` | Check Rule | Constreñido bajo ARRAY explorable: `pending`, `running`, `completed`, `failed`. |
| **`progress_message`**| `text` | Nullable | Mensajes expuestos al UI de admin (Ej "Pulleando clientes 1 de 20..."). |
| **`gaps_found`** | `jsonb` | Nullable | Almacena y computa una delta/diferencia (Un Gap Analysis) de cosas observadas divergentes (ej: User en Guira es Pending, User en Bridge es Approved). |
| **`result`** | `jsonb` | Nullable | Snapshot informativo resumen general cuando el estado salte a Completed. |
| **`sync_log`** | `jsonb` | Nullable | Un listado matricial/ordenado con acciones tomadas (Ej `{step: 'merged kyc', ok: true}`). |
| **`created_at`** / **`updated_at`** | `timestamptz` | Default `now()`| Timestamps de registro de la base. |

---

## 🔗 Relaciones (Foreign Keys)
- Solamente traza relación a **`public.user_profiles.id`** del administrador ejecutante. 

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "job_01Pqz8",
  "actor_profile_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "status": "completed",
  "progress_message": "Sincronizado 10 de 10 negocios corporativos KYB encontrados en Bridge API",
  "gaps_found": {
    "mismatches": 2,
    "details": [{"bridge_id": "cust_123", "local_status": "IN_REVIEW", "remote_status": "APPROVED"}]
  },
  "result": {
    "records_pulled": 10,
    "records_updated": 2,
    "errors": 0
  },
  "sync_log": [
    {"step": "fetching_customers", "at": "2024-03-24T18:00:00Z", "ok": true},
    {"step": "merging_differences", "at": "2024-03-24T18:05:00Z", "ok": true}
  ],
  "created_at": "2024-03-24T17:59:00Z",
  "updated_at": "2024-03-24T18:06:00Z"
}
```
