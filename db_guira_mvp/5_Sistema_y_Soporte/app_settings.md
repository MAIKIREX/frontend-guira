# Tabla: `public.app_settings`

## Función de la Tabla
La tabla `app_settings` proporciona un mecanismo puro de clave-valor (Key-Value) altamente dinámico para la plataforma. Sirve para almacenar variables de entorno a nivel lógico y switches condicionales (`feature_flags`) o mensajes globales (por ejemplo un banner público de "Mantenimiento el domingo") que el frontend o backend requieran sin necesidad de reconstruir los Docker containers o la aplicación de Vercel/NextJS.

## Columnas

| Nombre | Tipo de Dato | Opciones / Restricciones | Valor por Defecto | Descripción Breve |
| :--- | :--- | :--- | :--- | :--- |
| `key` | `text` (PK) | updatable | - | Nombre del identificador alfanumérico estricto usado por el software (ej. `MAINTENANCE_MODE`). |
| `value` | `text` | nullable, updatable | - | El string raw, número en string, o JSON en string que contiene el valor activo sobreescribido a nivel de DB. |
| `description` | `text` | nullable, updatable | - | Comentarios dirigidos al Staff para entender qué hace exactamente esta llave. |
| `updated_at` | `timestamptz` | nullable, updatable | `now()` | Instante de la última vez que el Staff le actualizó el valor a la variable de aplicación. |

*Nota: Cuenta con RLS (Row Level Security).*

## Relaciones
No posee dependencias. Es una tabla *Singleton Categórica* (Standalone) usada transversalmente de forma aislada a cualquier identidad.

## Ejemplo de Uso (JSON)

```json
{
  "key": "MIN_WITHDRAWAL_AMOUNT",
  "value": "50.00",
  "description": "El monto mínimo permitido de USD convertido para ser fondeado mediante orden",
  "updated_at": "2026-03-26T17:00:00Z"
}
```
