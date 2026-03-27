# Tabla: `public.payin_routes`

## Función de la Tabla
La tabla `payin_routes` es la capa que gestiona la definición de las vías operativas de entrada o depósitos (Rutas de Depósito de Pago) dentro de un perfil. Las transacciones "pay-in" necesitan definir cómo se recolectará el dinero o bajo qué métricas funcionales de depósitos actuar. Sirve para almacenar instrucciones, porcentajes de comisiones aplicadas (fees), y su metadata adicional bajo una vía preestablecida.

## Columnas

| Nombre | Tipo de Dato | Opciones / Restricciones | Valor por Defecto | Descripción Breve |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` (PK) | updatable | `uuid_generate_v4()` | Clave primaria. ID propio de la ruta. |
| `user_id` | `uuid` | updatable | - | Identificador del usuario (FK a `profiles`) que es dueño de este circuito de Pay-in. |
| `type` | `text` | nullable, updatable | - | Tipo o categoría de la ruta de depósito (e.g., transferencia bancaria, procesador X, ACH). |
| `status` | `payin_route_status` | updatable | `'submitted'` | Estado administrativo o de habilitación de esta vía de depósito (`draft`, `approved`, `active`, `inactive`, etc.). |
| `instructions` | `jsonb` | nullable, updatable | `'{}` | Objeto JSON con las indicaciones concisas sobre cómo el cliente/usuario debe estructurar su ingreso desde la fuente bancaria (p.ej., números de ruta, beneficiario). |
| `metadata` | `jsonb` | nullable, updatable | `'{}` | Información y propiedades de telemetría adicionales sobre la interacción en esta ruta. |
| `fee_percentage` | `numeric` | nullable, updatable | - | Comisión porcentual o deducible al momento en que el usuario use esta ruta en específico para inyectar fondos. |
| `created_at` | `timestamptz` | nullable, updatable | `now()` | Cuándo se configuró. |
| `updated_at` | `timestamptz` | nullable, updatable | `now()` | Cuándo se actualizó por última vez. |

*Nota: Cuenta con RLS (Row Level Security).*

## Relaciones
- **Depende de:** `profiles` de forma directa a través de su columna `user_id`. No hay otras tablas dependientes a nivel estructural base explícita mostrada (otros pueden apuntar de manera semántica, pero las DB constrains son a profiles).

## Ejemplo de Uso (JSON)

\`\`\`json
{
  "id": "222e4567-e89b-12d3-a456-426614174000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "type": "wire_transfer_us",
  "status": "active",
  "fee_percentage": 1.2,
  "instructions": {
    "bank_name": "JPMorgan Chase",
    "routing_number": "122000244",
    "account_number": "9998887771",
    "beneficiary": "Wilvelzap Corporate LLC"
  },
  "metadata": {},
  "created_at": "2026-03-26T10:45:00Z",
  "updated_at": "2026-03-26T10:45:00Z"
}
\`\`\`
