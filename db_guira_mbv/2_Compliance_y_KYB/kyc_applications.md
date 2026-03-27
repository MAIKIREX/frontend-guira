# Tabla: `public.kyc_applications`

## 📝 Descripción
Representa la carpeta digital y solicitud formal de un cliente (Persona Natural) que quiere registrarse en Guira y pasar la normativa "Know Your Customer" (Conoce a tu Cliente). Es en esta entidad donde se decide y aloja el estado integral o status a lo largo del proceso. 

**Row Level Security (RLS)**: Activado. Los usuarios `USER` pueden ver su propio progreso, mientras que el `STAFF` y el `ADMIN` tienen acceso panorámico de todas las solicitudes.

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `text` | PK | Identidad única alfanumérica de la solicitud de KYC. |
| **`user_id`** | `uuid` | FK | Referencia al usuario de sistema en `user_profiles.id` que pide su análisis. |
| **`person_id`** | `text` | FK | Referencia a `people.id`, conteniendo los datos en duro e inmutables (nombres, fechas) ingresados. |
| **`status`** | `application_status` (Enum)| Default: `DRAFT` | El estado de la petición que rige el comportamiento de la interfaz y las capacidades transaccionales del usuario. Desde `DRAFT` hasta `APPROVED` (permite operar). |
| **`provider`** | `text` | Nullable | Por si la verificación es manual (`platform`) o hecha por un tercero (por ej. `bridge`, `persona`, `veriff`). |
| **`provider_id`** | `text` | Nullable, Unique | El ID en el sistema enlazado del tercero. Permite relacionar webhooks asíncronamente. |
| **`screening`** | `jsonb` | Nullable | Respuesta consolidada del escrutinio (PEPs, sanciones OFAC, Listas negras). |
| **`last_screened_at`**| `timestamptz` | Nullable | Reloj de la última vez en que se revisaron sus datos contra la lista de sanciones y escrutinio en el proveedor. |
| **`tos_contract_id`**| `text` | Nullable | El id del registro o documento aceptado para 'Terms of Service' (Términos de servicio). |
| **`source`** | `text` | Default `platform`| Explica el canal por el cual nació este registro KYC: `platform` indica que se originó normalmente por un usuario de la UI, y `bridge_pull` que fue extraído/sincronizado desde el panel de Bridge por un Job. |
| **`created_at`** / **`updated_at`** | `timestamptz` | Default `now()` | Fechas de creación y actualización del registro. |

---

## 🔗 Relaciones (Foreign Keys)
- **`user_id`**: Se relaciona estrictamente con `public.user_profiles.id`.
- **`person_id`**: Obligatorio relacionarse con los datos estructurados en `public.people.id`.

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "kyc_bQz8Xm2",
  "user_id": "e30129bc-dbcf-4f51-b844-cb8cb1a03e91",
  "person_id": "pers_8jH9sD2B",
  "status": "APPROVED",
  "provider": "bridge",
  "provider_id": "cust_123bridge890",
  "screening": {
    "pep_hits": 0,
    "ofac_sanctions": false,
    "risk_score": "LOW"
  },
  "last_screened_at": "2024-03-24T18:00:00Z",
  "tos_contract_id": "tos_001_v2",
  "source": "platform",
  "created_at": "2024-03-24T17:30:00Z",
  "updated_at": "2024-03-24T18:30:00Z"
}
```
