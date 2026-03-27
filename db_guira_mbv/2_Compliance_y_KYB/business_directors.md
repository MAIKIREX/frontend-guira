# Tabla: `public.business_directors`

## 📝 Descripción
Tabla diseñada para enlistar a los Miembros de la Junta Directiva (Directores y Oficiales Legales) de una empresa bajo evaluación en Guira (Conoce a tu Negocio). Sirve para trazar el control corporativo, distinguiendo este de los Propietarios (que van en `business_ubos`, aunque pueden solaparse). En muchos proveedores financieros como Bridge, se exige proveer quién o quiénes ostentan la firma/represenatividad legal de la cuenta y sus documentaciones (como el ID formal).

**Row Level Security (RLS)**: Activado. Limitado hacia los clientes y los oficiales de `STAFF` y `ADMIN`.

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `text` | PK | Clave única del director. |
| **`business_id`** | `text` | FK | Relación con `businesses.id`. La corporación en donde ostenta el rol esta persona. |
| **`first_name`**, **`last_name`**| `text` | Nullable | Nombres y apellidos. |
| **`position`** | `text` | Nullable | Cargo formal ostentado (Ej. `CEO`, `General Manager`, `Director Legal`, `Board Member`). |
| **`doc_id_ref`** | `text` | FK, Nullable | Referencia a the respectivo `id` en la tabla `documents` para enlazar visualmente su carnet o pasaporte aprobado. |
| **`is_signer`** | `boolean` | Default `false` | Indica si esta persona es un "Autorizado para Firmar" (Signer). Dato fundamental; usualmente los firmantes requieren escrutinio mayor. |
| **`email`**, **`phone`** | `text` | Nullable | Contactos laborales del director en la empresa. |
| **`date_of_birth`**, **`nationality`**| `date` / `text` | Nullable | Datos requeridos para comprobaciones OFAC. |
| **`id_type`** / **`id_number`** | `text` | Nullable | Tipo del documento (`PASSPORT`) y el número para identificación por base de datos de los gobiernos. |
| **`address1`**, **`city`**, **`country`**, etc | Tablas de dirección | Nullable | Residencia del director. |
| **`created_at`** / **`updated_at`** | `timestamptz` | Default `now()` | Timestamp de registro/modificación. |

---

## 🔗 Relaciones (Foreign Keys)
- **Depende de `businesses`** (`business_id -> id`).
- **Referencia a `documents`** (`doc_id_ref -> id`): Apunta hacia un "file" con las fotos del ID validado del Director o su asignación por poderes legales.

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "dir_7Km6N1o",
  "business_id": "biz_8Hn7Mz3K",
  "first_name": "Valeria",
  "last_name": "Rojas",
  "position": "CEO y Representante Legal",
  "is_signer": true,
  "date_of_birth": "1983-05-12",
  "nationality": "BO",
  "id_type": "PASSPORT",
  "id_number": "P3458232BO",
  "doc_id_ref": "doc_LmO83p1",
  "email": "v.rojas@ag-export-latam.com",
  "phone": "70088998",
  "country": "BO",
  "created_at": "2024-03-24T18:07:00Z"
}
```
