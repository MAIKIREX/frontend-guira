# Tabla: `public.auth_rate_limits`

## Función de la Tabla
La tabla `auth_rate_limits` tiene el enfoque particular e imperativo en la protección de ciberseguridad para mitigar ataques destructivos (como Inyecciones de OTPs, Credential Stuffing o Bruteforcing directo sobre logins). Actúa en la capa de perímetro, guardando conteos exactos temporales por IP o por clave (email hash), forzando apagados o suspensiones de peticiones si superaron los intentos permisivos al día o la hora en los flujos principales de seguridad.

## Columnas

| Nombre | Tipo de Dato | Opciones / Restricciones | Valor por Defecto | Descripción Breve |
| :--- | :--- | :--- | :--- | :--- |
| `key` | `text` (PK) | updatable | - | Hash alfanumérico abstracto creado a partir de variables como la acción solicitada ligada al correo/usuario o su IP de sesión. (ej. `verify_email:user_abc` o `login:ip_1.2.3.4`). |
| `attempts` | `integer` | nullable, updatable | `1` | Total incremental de ruteos o solicitudes mal hechas bajo esta llave. |
| `last_attempt` | `timestamptz` | nullable, updatable | `now()` | Histórico del momento donde surgió el último ping de esa clave. Requerido para refrescar ventanas métricas. |
| `lockout_until` | `timestamptz` | nullable, updatable | - | Puntero temporal futuro a la hora real hasta la cual el sistema debe lanzar prohibición forzosa (HTTP 429 Too Many Requests) de cara a dicho `key`. |

*Nota: Cuenta con RLS (Row Level Security).*

## Relaciones
Es una microtabla de seguridad perimetral pura y veloz. No posee ninguna llave foránea ni apunta a `profiles` de forma física. Las keys son strings de conveniencia.

## Ejemplo de Uso (JSON)

\`\`\`json
{
  "key": "login_attempts:wilvelzap.ceo@empresa.com",
  "attempts": 4,
  "last_attempt": "2026-03-26T17:50:00Z",
  "lockout_until": "2026-03-26T18:05:00Z"
}
\`\`\`
