# Tabla: `public.bridge_countries`

## 📝 Descripción
Tabla soporte o catálogo configurador que define y estandariza los códigos ISO de países. Originalmente sincronizada al catálogo del Proveedor Tecnológico Financiero de Pagos e Identidad ('Bridge API'), permitiendo al frontend cargar selects estáticos sin inventar países que luego fallarían la revisión por 'País sancionado o País No Soportado'.

**Row Level Security (RLS)**: Activado. Abierta en lecturas globalmente genéricas. Escrita solo por Workers del sistema de administradores.

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`code`** | `text` | PK | Clave primaria. Código de País Estandarizado (Ej `US`, `BO`). |
| **`name`** | `text` | | Nombre amigable general del Estado/País (`United States`, `Bolivia`). |
| **`bridge_code`** | `text` | | Código especial exigido por la API de Bridge que, si bien similar al ISO, podría tener dialectos particulares en su SDK o endpoint (`US`, `BO`). |
| **`is_supported`** | `boolean` | Default `false`| Si internamente y dentro de las reglas de Bridge este país goza del privilegio de hacer negocios o se listará. |
| **`created_at`** / **`updated_at`** | `timestamptz` | Default `now()`| Generación de la bitácora relacional. |

---

## 🔗 Relaciones (Foreign Keys)
- Destino/Originador para **`bridge_subdivisions`** (Provincias o Estados que cuelgan del país general `code`). 

---

## 📄 Ejemplo JSON de Uso

```json
{
  "code": "US",
  "name": "United States of America",
  "bridge_code": "US",
  "is_supported": true,
  "created_at": "2024-03-24T00:00:00Z",
  "updated_at": "2024-03-24T00:00:00Z"
}
```
