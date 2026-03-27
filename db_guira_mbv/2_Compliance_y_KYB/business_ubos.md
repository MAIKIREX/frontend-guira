# Tabla: `public.business_ubos`

## 📝 Descripción
Tabla que representa a los "Ultimate Beneficial Owners" (Beneficiarios Finales) de una empresa registrada en `businesses`. Por normativa AML/CFT internacional y requerimientos de intermediarios financieros de nivel 1, se debe identificar a todas las personas y/o entidades que posean más de un 25% (u otro umbral regulatorio) de una organización. Cada uno debe ser documentado y auditado con su respectivo tipo de documento (`identity_document_id`).

**Row Level Security (RLS)**: Activado. Restringe a los clientes a ver exclusivamente los UBOs de una empresa que ellos crearon. `STAFF` y `ADMIN` tienen permisos totales.

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `text` | PK | Clave única del Beneficiario Final. |
| **`business_id`** | `text` | FK | Relación con `businesses.id`. La empresa de la cual el UBO es propietario. |
| **`first_name`** | `text` | | Primer nombre legal del Beneficiario. |
| **`last_name`** | `text` | | Apellido legal del Beneficiario. |
| **`date_of_birth`** | `date` | Nullable | Fecha de nacimiento para procesos AML/Screening. |
| **`nationality`**/ **`country_of_residence`** | `text` | Nullable | País de origen y donde reside habitualmente (para calcular el factor de riesgo). |
| **`ownership_percent`**| `numeric` | Nullable | Porcentaje de propiedad de acciones de la corporación. Un dato fundamental para compliance. |
| **`id_type`** / **`id_number`** | `text` | Nullable | Tipo del documento (`PASSPORT`) y el número de identificación del mismo. |
| **`identity_document_id`**| `text` | FK, Nullable | Un ID físico/digital asociado en la tabla de `documents`. Relación al objeto de base de datos que hospeda las imágenes reales del documento. |
| **`email`**, **`phone`** | `text` | Nullable | Datos de contacto para procesos que requieran validez de comunicación u OTP. |
| **`address1`**, **`city`**, **`country`**, etc | Tablas de dirección | Nullable | Ubicación del domicilio fiscal o vivienda del UBO. Crítico para el compliance de origen de fondos. |
| **`created_at`** / **`updated_at`** | `timestamptz` | Default `now()` | Fechas relativas al registro del UBO. |

---

## 🔗 Relaciones (Foreign Keys)
- **Depende de `businesses`** (`business_id -> id`).
- **Referencia a `documents`** (`identity_document_id -> id`): Donde radica la fotografía del pasaporte/CI utilizada para verificar la identidad real declarada en el UBO.
- **Objetivo de `documents`** (`ubo_id -> id`): Los documentos pueden asociarse retrospectivamente a este registro para guardar Pruebas de Direccion (Proof of Address) del UBO.

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "ubo_Pz92LkP",
  "business_id": "biz_8Hn7Mz3K",
  "first_name": "Luis",
  "last_name": "Méndez",
  "date_of_birth": "1975-08-20",
  "nationality": "BO",
  "ownership_percent": 60.5,
  "country_of_residence": "BO",
  "id_type": "NATIONAL_ID",
  "id_number": "9080706-LP",
  "identity_document_id": "doc_Mx32vL9",
  "email": "l.mendez@ag-export-latam.com",
  "address1": "Barrio Equipetrol",
  "city": "Santa Cruz",
  "country": "BO",
  "created_at": "2024-03-24T18:05:00Z"
}
```
