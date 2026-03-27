# Tabla: `public.documents`

## 📝 Descripción
Actúa como el repositorio centralizado e inventario de metadatos para **archivos y evidencias físicas** en Guira. Un `document` no contiene al archivo en sí, sino su información estructural. Los archivos crudos subidos a Supabase Storage se manejan mediante las entidades `document_versions` y referencian a estas "Carpetas" base (polymorphic relationship model). Puede enlazarse a procesos KYC corporativos, UBOs, registros o comprobantes.

**Row Level Security (RLS)**: Activado. Lectura restringida por pertenencia de aplicación o ID.

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `text` | PK | Identidad única alfanumérica del documento lógico. |
| **`application_type`** / **`subject_type`** | `subject_type` | Enums | Define qué ente motivó la recopilación del documento (`KYC`, `KYB`, `UBO`). |
| **`application_id`** / **`subject_id`**| `text` | | Almacena los identificadores asociados al ente/trámite para hacer búsquedas polimórficas eficientes. |
| **`owner_user_id`** | `uuid` | FK, Nullable | Referencia al `user_profiles.id` dueño de los bits cargados. |
| **`business_id`** | `text` | FK, Nullable | Referencia a `businesses.id` a la que pertenece este doc. |
| **`ubo_id`** | `text` | FK, Nullable | Referencia a `business_ubos.id` al que pertenece este doc. |
| **`doc_type`** | `document_type` | Enum | Clasifica qué representa la imagen a nivel general: `IDENTITY` (Identidad), `ADDRESS_PROOF` (Prueba Residencial), `REGISTRATION` (Testimonio de Constitución), `TAX_CERT` (NIT), `SELFIE`, `OTHER`. |
| **`document_subtype`** | `kyc_document_subtype`| Enum | Sub clasificación minuciosa: `PASSPORT`, `DRIVERS_LICENSE`, `NATIONAL_ID`, `UTILITY_BILL`, `BANK_STATEMENT`. |
| **`document_side`** | `document_side` | Enum, Nullable| Aplicable mayoritariamente a IDs (`FRONT`, `BACK`). |
| **`status`** | `document_status`| Enum | Ayuda a manejar si el documento ingresado es validable: `OK`, `BLURRED`, `EXPIRED`, `UNREADABLE`, `PENDING_REVIEW`. |
| **`mime`**, **`size`**, **`filename`**| Varios | | Datos de metadato del objeto de archivo (tipo MIME, bytes, nombre subido). |
| **`expires_at`** | `date` | Nullable | Fecha de caducidad expirable si es Identidad (`doc_type = IDENTITY`). |
| **`issuing_country`**| `text` | Nullable | Código ISO del país emisor del documento de identificación. |
| **`created_at`** / **`updated_at`** | `timestamptz` | Default `now()`| Timestamps de registro y modificación de metadatos. |

---

## 🔗 Relaciones (Foreign Keys)
- Destino de **`business_directors`** y **`business_ubos`** que enlazan su ID referenciado a este objeto en la columna de sus tablas (`identity_document_id`).
- Destino de las actualizaciones iterativas en **`document_versions`** (`document_id -> id`).
- Referencia a `owner_user_id`, `business_id` y `ubo_id` para control RLS en escalada jerárquica.

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "doc_LmO83p1",
  "application_type": "KYB",
  "application_id": "kyb_T9pR2aQ",
  "subject_type": "UBO",
  "subject_id": "ubo_Pz92LkP",
  "owner_user_id": "e30129bc-dbcf-4f51-b844-cb8cb1a03e91",
  "business_id": "biz_8Hn7Mz3K",
  "doc_type": "IDENTITY",
  "document_subtype": "NATIONAL_ID",
  "document_side": "FRONT",
  "status": "OK",
  "mime": "image/jpeg",
  "size": 1850320,
  "filename": "cedula_identidad_frente.jpg",
  "expires_at": "2030-05-15",
  "issuing_country": "BO",
  "created_at": "2024-03-24T18:05:00Z"
}
```
