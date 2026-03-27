# Tabla: `public.onboarding`

## Función de la Tabla
La tabla `onboarding` modela los formularios y procesos de verificación de identidad (KYC para personas, KYB para corporaciones). Esta tabla gestiona la sumisión asíncrona de datos personales, identificadores corporativos y metadatos complementarios requeridos para perfilar el nivel de riesgo de un cliente (o empresa) antes de interactuar directamente en billeteras o enviar este registro al proveedor Bridge API.

## Columnas

| Nombre | Tipo de Dato | Opciones / Restricciones | Valor por Defecto | Descripción Breve |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` (PK) | updatable | `uuid_generate_v4()` | Clave primaria que identifica el registro de proceso de onboarding de forma única. |
| `user_id` | `uuid` | updatable | - | Usuario al que le pertenece y quien llenó su propio contexto de onboarding (`FK` a `profiles`). |
| `type` | `text` | nullable, updatable, CHECK | - | El tipo de onboarding requerido (`personal` o `company`). Tiene constraint de validación interna. |
| `status` | `onboarding_status` | updatable | `'draft'` | Estado funcional y operativo sobre el progreso KYC/KYB del usuario. |
| `data` | `jsonb` | nullable, updatable | `'{}` | Objeto JSON que almacena dinámicamente campos completos del formulario (dirección, nacionalidad, nombre de la compañía, etc). |
| `observations` | `text` | nullable, updatable | - | Notas dejadas por administradores o sistemas automáticos en caso de rechazo (`rejected`) o `needs_changes`. |
| `bridge_customer_id` | `text` | nullable, updatable | - | Referencia persistente tras mapear el proceso exitoso al ecosistema de Bridge. |
| `is_test` | `boolean` | nullable, updatable | `false` | Bandera para identificar si este registro se hizo a nivel prueba en vez del flujo productivo real. |
| `environment` | `text` | nullable, updatable | `'production'` | Define el entorno API contra el cual este proceso se verificó. |
| `created_at` | `timestamptz` | nullable, updatable | `now()` | Fecha de inicio del proceso de onboarding. |
| `updated_at` | `timestamptz` | nullable, updatable | `now()` | Fecha de última actualización o fase en el estado del proceso. |

*Nota: Cuenta con RLS (Row Level Security).*

## Relaciones
- **Pertenece a:** `profiles` a través de la llave foránea `user_id`.
- **Es referenciada por:** `documents` (A través de `onboarding_id`), lo cual permite asociar múltiples archivos legales (comprobantes, identificaciones) a un proceso de KYC/KYB específico.

## Ejemplo de Uso (JSON)

```json
{
  "id": "111e4567-e89b-12d3-a456-426614174000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "type": "company",
  "status": "under_review",
  "observations": "Falta foto clara del reverso del DNI del director ejecutivo.",
  "data": {
    "company_name": "Tech Corp SA",
    "incorporation_date": "2020-05-15",
    "industry": "Software Services"
  },
  "bridge_customer_id": null,
  "is_test": false,
  "environment": "production",
  "created_at": "2026-03-26T10:15:00Z",
  "updated_at": "2026-03-26T10:30:00Z"
}
```
