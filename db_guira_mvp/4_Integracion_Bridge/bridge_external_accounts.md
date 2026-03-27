# Tabla: `public.bridge_external_accounts`

## Función de la Tabla
La tabla `bridge_external_accounts` tiene como fin mantener sincronizados y cacheados dentro de la arquitectura de M-Guira los detalles y cuentas externas (generalmente cuentas bancarias ACH/Wire) que han sido enlazadas por el usuario al API de Bridge (El External Account de Bridge). Sirve para que el sistema local sepa a dónde se enviará el saldo (payout) sin tener que consultar la red interbancaria estadounidense o al proveedor de Bridge a cada segundo, permitiendo una experiencia front-end fluida y nativa.

## Columnas

| Nombre | Tipo de Dato | Opciones / Restricciones | Valor por Defecto | Descripción Breve |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` (PK) | updatable | `uuid_generate_v4()` | Clave interna relacional para M-Guira de esta cuenta. |
| `user_id` | `uuid` | nullable, updatable | - | Integrante del sistema `profiles` dueño de esta cuenta ligada. |
| `bridge_external_account_id` | `text` | nullable, updatable, unique | - | El string fundamental de Bridge para esta cuenta (e.g. `ext_acct_abc123...`). |
| `bank_name` | `text` | nullable, updatable | - | Nombre del Banco o Institución (ej. `Chase Bank`). |
| `account_last_4` | `text` | nullable, updatable | - | Los últimos cuatro dígitos de la cuenta rutificada, por motivos puramente visuales y de UX. |
| `currency` | `text` | nullable, updatable | - | Divisa local en la que opera esa cuenta (Casi siempre `USD`). |
| `is_active` | `boolean` | nullable, updatable | `true` | Determina si el usuario no ha desconectado o archivado esa cuenta en Bridge. |
| `created_at`, `updated_at` | `timestamptz` | nullable, updatable | `now()` | - |

*Nota: Cuenta con RLS (Row Level Security).*

## Relaciones
- **Referenciada al usuario en:** `profiles` a través de `user_id`.

## Ejemplo de Uso (JSON)

```json
{
  "id": "bbb12345-e89b-12d3-a456-426614174000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "bridge_external_account_id": "ext_acct_987654zyxwv",
  "bank_name": "Chase Bank",
  "account_last_4": "3045",
  "currency": "USD",
  "is_active": true,
  "created_at": "2026-03-26T14:20:00Z",
  "updated_at": "2026-03-26T14:20:00Z"
}
```
