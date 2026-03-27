# Tabla: `public.provider_mappings`

## 📝 Descripción
Soluciona el problema de traducción entre las respuestas/entidades del ecosistema Guira y los modelos de datos que imponen los proveedores. Utilizando esta tabla, la plataforma mapea si el estado "DRAFT" en Bridge equivale a "PENDING_REVIEW" en Guira, o qué campos específicos de un JSON deben enlazarse a columnas propias.

**Row Level Security (RLS)**: Activado. Exclusivo de administradores de desarrollo.

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `text` | PK | Identidad del mapeo. |
| **`provider_id`** | `text` | FK | Relación con `provider_candidates.id` indicando contra quién se efectúa este diccionario de traducción. |
| **`resource`** | `text` | | A qué tabla o modelo interno le afecta. Ejemplo: `user_profiles`, `kyc_applications`, o `external_accounts`. |
| **`mapping`** | `jsonb` | | Las reglas de puente dictaminando cómo convertir las llaves / valores provistas por el 3rd party a las de Guira (y viceversa). |
| **`created_at`** | `timestamptz` | Default `now()`| Fecha y hora de creación de la regla. |

---

## 🔗 Relaciones (Foreign Keys)
- Su campo principal y única salida interactúa hacia `provider_candidates` apuntando a `provider_id`.

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "pmap_18xK9Z",
  "provider_id": "prov_Br1dG3x",
  "resource": "kyb_applications",
  "mapping": {
    "status_dict": {
      "approved": "APPROVED",
      "rejected": "REJECTED",
      "manual_review": "IN_REVIEW",
      "incomplete": "NEEDS_CHANGES"
    }
  },
  "created_at": "2024-03-24T12:00:00Z"
}
```
