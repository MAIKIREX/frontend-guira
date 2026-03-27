# Tabla: `public.profiles`

## Función de la Tabla
La tabla `profiles` es la tabla central de identidad y usuarios dentro de la plataforma principal del MVP (Wilvelzap's Project). Se utiliza para extender el sistema nativo de autenticación de Supabase (`auth.users`), almacenando información de negocio sobre el usuario, como sus roles (`client`, `staff`, `admin`), nombre completo, su estado de onboarding y su identificador en el proveedor financiero Bridge. Esta tabla actúa como el nodo principal del cual dependen todas las operaciones transaccionales y de logs relativas al ecosistema del usuario.

## Columnas

| Nombre | Tipo de Dato | Opciones / Restricciones | Valor por Defecto | Descripción Breve |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` (PK) | updatable | - | ID único de perfil. Apunta 1:1 al ID del usuario en `auth.users`. |
| `email` | `text` | updatable, unique | - | Dirección de correo electrónico único del usuario. |
| `role` | `user_role` | updatable, ENUM | `'client'` | Determina el nivel de acceso en la plataforma (`client`, `staff`, `admin`). |
| `full_name` | `text` | nullable, updatable | - | Nombre completo del usuario. |
| `created_at` | `timestamptz` | nullable, updatable | `now()` | Fecha y hora en la que se generó este perfil de usuario. |
| `bridge_customer_id` | `text` | nullable, updatable, unique | - | ID de cliente generado en el servidor externo de Bridge (para mapeo financiero). |
| `onboarding_status` | `onboarding_status` | nullable, updatable | `'draft'` | Estado actual del flujo KYC/KYB del usuario (`draft`, `submitted`, `under_review`, `verified`, etc). |
| `metadata` | `jsonb` | nullable, updatable | `'{}` | Flexible objeto JSON para guardar preferencias, tags o datos misceláneos de frontend. |
| `is_archived` | `boolean` | nullable, updatable | `false` | Bandera tipo *soft-delete* para indicar si el usuario fue archivado garantizando la trazabilidad histórica sin borrar sus registros financieros. |

*Nota: Cuenta con RLS (Row Level Security) habilitado para prevenir que usuarios sin privilegios accedan a perfiles de terceros.*

## Relaciones
**Dependencias Hacia Adentro:**
- La columna `id` es un **Foreign Key** hacia `auth.users(id)`.

**Relaciones Salientes (Múltiples tablas la referencian):**
- **Financieras y Operacionales:** `payout_requests`, `onboarding`, `payin_routes`, `wallets`, `bridge_external_accounts`, `bridge_transfers`, `bridge_virtual_accounts`, `payment_orders`, `suppliers`.
- **Auditoría y Soporte:** `activity_logs`, `audit_logs` (como realizado_por), `support_tickets`, `notifications`.
- **Adjuntos:** `documents`.

## Ejemplo de Uso (JSON)

\`\`\`json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "wilvelzap.ceo@empresa.com",
  "role": "client",
  "full_name": "Wilvelzap Martinez",
  "onboarding_status": "verified",
  "bridge_customer_id": "customer_abcdef123456",
  "is_archived": false,
  "metadata": {
    "language": "es",
    "theme": "dark"
  },
  "created_at": "2026-03-26T10:00:00Z"
}
\`\`\`
