# Tabla: `public.wallets`

## Función de la Tabla
La tabla `wallets` funciona como las arcas lógicas maestras o cubetas organizadas por `divisa` dentro del proyecto Wilvelzap (M-Guira). En vez de simplemente guardar un balance mutable como un número entero libre, cualquier movimiento de dinero deberá calcularse procesando contabilidad basada en doble o múltiple asiendo cruzado, donde cada billetera define a nivel muy alto un tipo de moneda a la que tiene un perfil suscrito, permitiéndole operar con esa moneda. 

## Columnas

| Nombre | Tipo de Dato | Opciones / Restricciones | Valor por Defecto | Descripción Breve |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` (PK) | updatable | `uuid_generate_v4()` | Identificador fundamental de la billetera lógica. |
| `user_id` | `uuid` | updatable | - | Propietario o beneficiario contable directo en `profiles`. |
| `currency` | `text` | updatable | `'USD'` | Símbolo o notación de la divisa (fiduciaria, crypto o híbrida) en la que opera (e.g. `USD`, `BS`, `USDC`). |
| `created_at` | `timestamptz` | nullable, updatable | `now()` | Instante exacto de creación del sub-contenedor. |

*Nota: Cuenta con RLS (Row Level Security).*

## Relaciones
- **Hacia arriba (Pertenece a):** Se vincula de forma foránea a los usuarios a través del `user_id` en la tabla externa matriz `profiles`.
- **Hacia abajo (Padre de):** Es el pilar sobre el cual iterará la tabla central contable `ledger_entries`. Todas las anotaciones sumatorias y extractivas se acoplan al identificador transaccional primario de `wallets`.

## Ejemplo de Uso (JSON)

\`\`\`json
{
  "id": "333e4567-e89b-12d3-a456-426614174000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "currency": "USD",
  "created_at": "2026-03-26T11:00:00Z"
}
\`\`\`
