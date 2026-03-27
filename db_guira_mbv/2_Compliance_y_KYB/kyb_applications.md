# Tabla: `public.kyb_applications`

## 📝 Descripción
Tabla que guarda la solicitud formal de revisión de Conoce a tu Negocio (Know Your Business - KYB). Similar a `kyc_applications`, pero orientada exclusivamente a validar a la entidad corporativa (`businesses`). Determina si una empresa está legalmente apta para fondear y realizar orquestación de pagos a través de Guira o de plataformas de terceros como Bridge.

**Row Level Security (RLS)**: Activado. Usuarios pueden ver sus propias aplicaciones, `STAFF` y `ADMIN` todas.

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `text` | PK | Identidad única alfanumérica de la solicitud KYB. |
| **`business_id`** | `text` | FK | Referencia a `businesses.id`, empresa que se está validando. |
| **`requester_user_id`** | `uuid` | FK | Referencia al usuario (`user_profiles.id`) que inició este trámite en nombre de la empresa. |
| **`status`** | `application_status` (Enum)| Default: `DRAFT` | Estado actual de avance de la solicitud. Valores: `DRAFT`, `SUBMITTED`, `IN_REVIEW`, `NEEDS_CHANGES`, `RESUBMITTED`, `APPROVED`, `REJECTED`, `NEEDS_BRIDGE_KYC_LINK`. |
| **`provider`** | `text` | Nullable | Proveedor de riesgo que hizo el KYC/KYB. |
| **`provider_id`** | `text` | Unique, Nullable| Identificador del negocio en el proveedor de cumplimiento. |
| **`screening`** | `jsonb` | Nullable | Información consolidada sobre chequeos de listas de sanciones vinculadas a esta empresa. |
| **`last_screened_at`**| `timestamptz` | Nullable | Fecha y hora en que se corrió la última evaluación de riesgo de listas negras / sanciones OFAC sobre esta entidad corporativa. |
| **`tos_contract_id`**| `text` | Nullable | ID del documento/registro de los términos de servicio aceptados en nombre de la empresa. |
| **`source`** | `text` | Default: `platform`| Origen de la solicitud, ej. creada en la app `platform` o un pulleo directo de `bridge_pull`. |
| **`created_at`** / **`updated_at`** | `timestamptz` | Default `now()` | Fechas relativas al registro. |

---

## 🔗 Relaciones (Foreign Keys)
- **Hacia `businesses`** (`business_id -> id`): Apunta al ente corporativo siendo auditado.
- **Hacia `user_profiles`** (`requester_user_id -> id`): Apunta a quien creó la petición.

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "kyb_T9pR2aQ",
  "business_id": "biz_8Hn7Mz3K",
  "requester_user_id": "e30129bc-dbcf-4f51-b844-cb8cb1a03e91",
  "status": "IN_REVIEW",
  "provider": "bridge",
  "provider_id": "cust_123bridge890",
  "screening": null,
  "last_screened_at": null,
  "tos_contract_id": null,
  "source": "platform",
  "created_at": "2024-03-24T18:00:00Z",
  "updated_at": "2024-03-24T18:30:00Z"
}
```
