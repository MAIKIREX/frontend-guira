# Tabla: `public.people`

## 📝 Descripción
La tabla `people` almacena la información personal, de identidad y de contacto de un individuo humano. Es empleada principalmente durante el onboarding (registro y "Conoce a tu Cliente" o KYC) de un usuario natural. Esta tabla mantiene los datos en crudo que luego serán evaluados por el equipo de cumplimiento o por un proveedor externo.

**Row Level Security (RLS)**: Activado. Un usuario "USER" solo puede consultar y actualizar su propio registro (basado en `user_id`). "STAFF" tiene lectura global, y "ADMIN" posee control total.

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `text` | PK | Identificador único de la persona (suele generarse desde la pasarela de pago, el CRM interno, o es un UUID texturizado). |
| **`user_id`** | `uuid` | Unique, FK | Referencia hacia `user_profiles.id`. Asegura la relación estricta 1:1 entre un perfil de acceso y una identidad humana en la plataforma. |
| **`first_name`** | `text` | Nullable | Primer y/o segundo nombre legal de la persona, tal cual aparece en su documento de identidad. |
| **`last_name`** | `text` | Nullable | Apellidos legales de la persona. |
| **`email`** | `text` | Nullable | Dirección de correo electrónico de la persona, usada para contactar durante seguimientos de casos. |
| **`date_of_birth`** | `date` | Nullable | Fecha de nacimiento (`AAAA-MM-DD`). Crítico para determinar mayoría de edad en evaluación KYC. |
| **`nationality`** | `text` | Nullable | Código o nombre del país de nacionalidad. |
| **`phone`** | `text` | Nullable | Número telefónico, usualmente sin el código de país. |
| **`phone_country`** | `text` | Nullable | Código de país para el teléfono (Ej. "MX", "BO", o prefijo numérico). Integración vital para Bridge o Twilio. |
| **`address1` / `address2`**| `text` | Nullable | Líneas de dirección física de residencia de la persona. |
| **`city`**, **`state`**, **`postal`**, **`country`** | `text` | Nullable | Desglose geográfico del domicilio para verificación de prueba de residencia y bloqueo sancionatorio. |
| **`id_type`** | `text` | Nullable | Tipo de documento, por ejemplo, `PASSPORT`, `NATIONAL_ID`, `DRIVING_LICENSE`. |
| **`id_number`** | `text` | Nullable | El identificador alfanumérico extraído del documento de identidad. |
| **`tax_identification_number`**| `text` | Nullable | Número de identificación fiscal (NIT/CI/RUC para Bolivia, RFC/CURP para México). Necesario para aprobación KYC y ciertos rieles financieros. |
| **`occupation`** | `text` | Nullable | Ocupación laboral (Compliance AML / Prevención de lavado). |
| **`annual_income`** | `text` | Nullable | Rango de ingreso anual estimado (Regulación KYC). |
| **`created_at`** / **`updated_at`** | `timestamptz` | Default `now()` | Auditoría de creación y última actualización del registro humano. |

---

## 🔗 Relaciones (Foreign Keys)
- **Hacia la tabla raíz**:
  - `user_id` referencia a `public.user_profiles.id`.
- **Tablas que dependen de `people`**:
  - `kyc_applications` (`person_id -> id`): Un proceso de análisis y revisión KYC de esta precisa identidad.

---

## 📄 Ejemplo JSON de Uso

Un ejemplo de la información obtenida al consultar el cliente `/api/people/me`:

```json
{
  "id": "pers_8jH9sD2B",
  "user_id": "e30129bc-dbcf-4f51-b844-cb8cb1a03e91",
  "first_name": "Juan Pérez",
  "last_name": "García",
  "email": "juan.perez@email.com",
  "date_of_birth": "1990-05-15",
  "nationality": "BO",
  "phone_country": "591",
  "phone": "70012345",
  "address1": "Av. Arce #1234",
  "address2": "Apto 3B",
  "city": "La Paz",
  "state": "La Paz",
  "postal": "0000",
  "country": "BO",
  "id_type": "NATIONAL_ID",
  "id_number": "1234567-LP",
  "tax_identification_number": "1234567015",
  "occupation": "Software Engineer",
  "annual_income": "24000-50000"
}
```
