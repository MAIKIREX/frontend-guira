# Tabla: `public.bridge_virtual_accounts`

## Función de la Tabla
La tabla `bridge_virtual_accounts` almacena los datos de las "cuentas virtuales" emitidas por Bridge para un usuario de MVP Guira (Wilvelzap's Project). Las cuentas virtuales son pseudo-cuentas bancarias con números de ruta y números de cuenta genuinos proporcionados temporalmente por los rieles de Bridge a nuestro cliente. Estos números permiten que el cliente o entidad reciba transferencias ACH o Wires regulares de parte de terceros como si poseyesen una cuenta bancaria directa real en los EE.UU.

## Columnas

| Nombre | Tipo de Dato | Opciones / Restricciones | Valor por Defecto | Descripción Breve |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` (PK) | updatable | `uuid_generate_v4()` | Clave primaria local de M-Guira. |
| `user_id` | `uuid` | nullable, updatable | - | Cliente final/beneficiario (`FK` a `profiles`) a quién pertenece esta cuenta receptora virtual. |
| `bridge_virtual_account_id` | `text` | updatable, unique | - | El string único provisto por el API de Bridge (e.g. `virt_acct_abc123`) tras crearla. |
| `bank_name` | `text` | nullable, updatable | - | Nombre físico del banco subyacente o sponsor bank de la cuenta virtual provista por Bridge (ej., `Evolve Bank & Trust`). |
| `account_number` | `text` | nullable, updatable | - | Número de cuenta completo visible al cliente final. |
| `routing_number` | `text` | nullable, updatable | - | Routing number ACH/Wire emitido por el sponsor. |
| `is_active` | `boolean` | nullable, updatable | `true` | Determina si esta cuenta sigue vigente y puede recibir fondos o fue dada de baja logística o regulatoria. |
| `created_at` | `timestamptz` | nullable, updatable | `now()` | - |

*Nota: Cuenta con RLS habilitado (Usuarios únicamente ven sus sub-cuentas asignadas).*

## Relaciones
- **Pertenencia:** Embebida vía `user_id` hacia `profiles`. 
- **Semántica Log:** La tabla `bridge_virtual_account_events` recaba el string `bridge_virtual_account_id` cuando ocurre un evento con fondos para identificar qué fila de aquí fue impactada, cruzando el saldo.

## Ejemplo de Uso (JSON)

```json
{
  "id": "eee12345-e89b-12d3-a456-426614174000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "bridge_virtual_account_id": "virt_acct_89asd7g87a",
  "bank_name": "Evolve Bank & Trust",
  "routing_number": "122000244",
  "account_number": "9000188201",
  "is_active": true,
  "created_at": "2026-03-26T16:00:00Z"
}
```
