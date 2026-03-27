# Tabla: `public.provider_candidates`

## 📝 Descripción
Define de manera estática y configurable qué entidades de terceros (Partners o Proveedores) puede incorporar Guira en su ecosistema. Un proveedor puede ser Bridge, Persona, Plaid, Twilio, etc. Guarda información genérica sobre sus claves o los requerimientos de configuración requeridos para instanciar la integración.

**Row Level Security (RLS)**: Activado. Generalmente limitada su visión completa a los superadministradores de plataforma.

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `text` | PK | Identidad única alfanumérica del candidato a integrarse. |
| **`key`** | `text` | Unique | La llave natural de nombre de código interno usada por los ingenieros (Ej. `bridge_v1`, `veriff_kyc_flow_1`). |
| **`name`** | `text` | | Nombre legible por humanos del partner (Ej. "Bridge API Endpoint"). |
| **`requirements`** | `jsonb` | | Definición de las claves esperadas unidas a este proveedor en el sistema (Ej. `"env": ["BRIDGE_API_KEY"]`). |
| **`created_at`** | `timestamptz` | Default `now()`| Timestamps de registro de la base. |

---

## 🔗 Relaciones (Foreign Keys)
- Destino de apuntamiento para las **`provider_mappings`** y **`webhook_events`** que dependen inexorablemente del `id` definido en esta tabla raíz.

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "prov_Br1dG3x",
  "key": "bridge_v2",
  "name": "Bridge KYC/KYB & Ledger Services",
  "requirements": {
    "authType": "Bearer",
    "endpointUrlTemplate": "https://api.bridge.xyz/v2"
  },
  "created_at": "2024-03-22T08:00:00Z"
}
```
