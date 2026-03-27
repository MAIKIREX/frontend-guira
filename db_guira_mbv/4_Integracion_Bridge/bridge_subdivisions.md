# Tabla: `public.bridge_subdivisions`

## 📝 Descripción
Complementaria a los países (`bridge_countries`). Este catálogo abarca las Subdivisiones Geopolíticas (Estados, Provincias, Departamentos) exigidas por normativa de domicilio internacional (Bank Routing o Direcciones Físicas), vitales porque en ciertos países como EE.UU. la regulación es estatal (Ej; Nueva York o Texas exigen BitLicenses que prohíben operaciones, así que Bridge veta IPs de ciertos estados y esto es requerido con precisión milimétrica).

**Row Level Security (RLS)**: Activado. Lectura general.

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `uuid` | PK | Indentificador genérico para que ORMs funcionen de manera sencilla sin PK compuestas. |
| **`country_code`** | `text` | FK | Código `code` del país superior amparador (Ej. `US` o `BO`). Relativo a `bridge_countries`. |
| **`code`** | `text` | | Nomenclatura local amigable o standard postal (`NY`, `TX`, `LP`). |
| **`name`** | `text` | | Nombre legal explícito del Estado o subdivisión (`New York`, `Texas`, `La Paz`). |
| **`bridge_code`** | `text` | | Código equivalente validado estrictamente en los endpoints y SDK de Bridge para evitar 'ValidationError'. |
| **`created_at`** / **`updated_at`** | `timestamptz` | Default `now()`| Creación. |

---

## 🔗 Relaciones (Foreign Keys)
- Enganchada explícitamente a su padre superior en **`bridge_countries.code`**.

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "subdiv_8Jq10Lz",
  "country_code": "US",
  "code": "CA",
  "name": "California",
  "bridge_code": "CA",
  "created_at": "2024-03-24T00:00:00Z"
}
```
