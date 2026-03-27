# Tabla: `public.businesses`

## 📝 Descripción
Tabla central del dominio corporativo. Almacena la identidad pura y datos operativos de empresas clientes de Guira. Es análoga a la tabla `people` pero para entidades corporativas. Solo se aprueban para su uso una vez completan un proceso en `kyb_applications`.

**Row Level Security (RLS)**: Activado. Los usuarios regulares solo pueden ver la propia empresa que han registrado. `STAFF` y `ADMIN` cuentan con acceso irrestricto en lectura.

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `text` | PK | Clave única de la entidad empresarial. |
| **`legal_name`** | `text` | | Razón social formal o denominación legal (Ej. "Industrias y Servicios SRL"). |
| **`trade_name`** | `text` | Nullable | Nombre Comercial o nombre ficticio (DBA - Doing Business As). |
| **`registration_number`**| `text` | Nullable | Matrícula de comercio, registro empresarial local (Fundaempresa, SEPREC). |
| **`tax_id`** | `text` | Nullable | Número de identificación tributaria institucional o legal (NIT, EIN en EEUU). |
| **`entity_type`** | `text` | | Forma jurídica de la empresa. Ej: `LLC`, `C_CORP`, `SRL`, `SA`. |
| **`phone`** / **`email`** | `text` | Nullable | Correo institucional y número de teléfono de la corporación. El email suele requerirse por pasarelas externas obligatoriamente. |
| **`phone_country`** | `text` | Nullable | Prefijo de país para el número corporativo de contacto. |
| **`address`... / `city` ... / `country`** | Tablas de dirección | Nullable | El domicilio legal completo donde opera o fue registrada la sede de la corporación. |
| **`operating_countries`** | `text[]` | Nullable | Arreglo indicando las geografías en las que factura (para filtrados de riesgo y normativas). |
| **`website`** | `text` | Nullable | La URL web principal de la compañía. Requisito usual para onboarding B2B. |
| **`business_description`**, **`business_industry`**, **`account_purpose`** | `text` | Nullable | Textos descriptivos de propósito operativo (prevención de LA/FT), describiendo rubro, propósito de la cuenta y origen de los fondos. |
| **`source_of_funds`**| `text` | Nullable | Motivación económica base o ruta del dinero empresarial (ventas, utilidades, nóminas, etc). |
| **`conducts_money_services`** / **`...using_bridge`** | `boolean` | Default: `false` | Banderas críticas anti-riesgo. Determina si la empresa en sí es una firma de transferencias monetarias (MSB - Money Services Business) o una entidad financiera, y si empleará el servicio para procesarlo. Requiere alto nivel de compliance extra. |
| **`compliance_screening_explanation`** | `text` | Nullable | Por si deben argumentar por qué la alarma anterior encendió y justificarla en Onboarding. |
| **`created_at`** / **`updated_at`** | `timestamptz` | Default: `now()` | Fechas relativas al registro. |

---

## 🔗 Relaciones (Foreign Keys)
- **Actúa como TARGET (Entidad Principal)** para el ecosistema KYB:
  - `kyb_applications` (`business_id -> id`): El estado del trámite en el que está inmersa esta empresa.
  - `business_directors` (`business_id -> id`): Referencia los oficiales o rep. legales (directores) de la empresa.
  - `business_ubos` (`business_id -> id`): Referencia los Beneficiarios Finales (Ultimate Beneficial Owners) de la empresa.
  - `documents` (`business_id -> id`): Para asociar NIT e Incorporaciones a esta compañía.

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "biz_8Hn7Mz3K",
  "legal_name": "Agente Export Ltda.",
  "trade_name": "AgExport",
  "registration_number": "12345678-01",
  "tax_id": "9087654321014",
  "entity_type": "LTDA",
  "address1": "Av. Las Américas 543",
  "city": "Santa Cruz",
  "country": "BO",
  "website": "www.ag-export-latam.com",
  "email": "legal@ag-export-latam.com",
  "phone_country": "591",
  "phone": "610998877",
  "business_description": "Exportación de productos agrícolas a EEUU",
  "account_purpose": "Pago a proveedores logísticos gringos en USD",
  "source_of_funds": "Ingresos por exportación",
  "conducts_money_services": false,
  "created_at": "2024-03-22T08:00:00Z"
}
```
