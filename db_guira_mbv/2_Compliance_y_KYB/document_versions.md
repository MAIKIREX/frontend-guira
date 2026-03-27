# Tabla: `public.document_versions`

## 📝 Descripción
Extiende el patrón de auditoría y almacenamiento de los metadatos de documentos (`documents`). Resuelve el problema donde la evaluación de Compliance requiere rechazar un `document` debido a borrosidad u obsolescencia, y un usuario necesita re-subir una imagen *sin romper* ni crear un nuevo ID de base estructural o arruinar el hilo de revisiones (`reviews`). Esta tabla almacena los Punteros y URLs base de Storage asociadas a su versión del archivo real.

**Row Level Security (RLS)**: Activado. Misma política jerárquica que rige la tabla superior document.

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `text` | PK | Identificador único de este slot de re-versión. |
| **`document_id`** | `text` | FK | Relaciona y ancla históricamente al `documents.id`. |
| **`version`** | `integer` | | Valor escalar numérico. Empezando de 1 hasta N (`1`, `2`, `3`...). Facilita recuperar el último o el historial temporal de lo que se subió. |
| **`uri`** | `text` | | URI formal hacia donde está hospedado el objeto criptográfico o raw bytes (normalmente, la dirección en un clúster Pouch/Supabase Storage, como `bucket_name/uuid-uuid.jpg`). |
| **`mime`** | `text` | | Replicación del Media Type del upload (`image/png`, `application/pdf`). |
| **`size`** | `integer` | | Longitud temporal de los bytes subidos. |
| **`created_at`** | `timestamptz` | Default `now()`| Momento exacto de carga en caso de ser necesario un escrutinio cronológico. No existe 'update' al ser inmutable (Append-only). |

---

## 🔗 Relaciones (Foreign Keys)
- Su campo principal y única salida como Foreign Key es interactuar hacia su 'Padre', la tabla principal `documents` apuntando a la celda `document_id`.

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "docv_v2jK9x0O",
  "document_id": "doc_LmO83p1",
  "version": 2,
  "uri": "kyc_documents/a1b2c3d4-e5f6-7a8b/cedula_identidad_frente_v2.jpg",
  "mime": "image/jpeg",
  "size": 1963240,
  "created_at": "2024-03-24T19:30:00Z"
}
```
