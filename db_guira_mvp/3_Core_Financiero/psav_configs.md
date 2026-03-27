# Tabla: `public.psav_configs`

## Función de la Tabla
La tabla `psav_configs` se utiliza para la configuración estática de cuentas financieras internas y maestras (generalmente conocidas como cuentas de provisión pre-pagadas, FBOs o Pools Master). El MVP utiliza este catálogo para mostrar u operar los fondos principales o vías de inyección central (como cuentas bancarias físicas o billeteras operativas que le pertenecen literalmente a *Guira*) que proveen servicios de saldo por detrás (como si la empresa tuviera distintos puntos de cobro en varios bancos comerciales).

## Columnas

| Nombre | Tipo de Dato | Opciones / Restricciones | Valor por Defecto | Descripción Breve |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` (PK) | updatable | `gen_random_uuid()` | Clave maestra identificativa de configuración. |
| `name` | `text` | updatable | - | Alias interno corporativo. (e.g. `Banco Mercantil Boliviano Cta Principal`). |
| `bank_name` | `text` | updatable | - | Oficial Nombre del Banco asociado. |
| `account_number` | `text` | updatable | - | Domiciliación de Cuenta física. |
| `currency` | `text` | updatable | `'Bs'` | Moneda natural bajo la que se apertura la cuenta recolectante (típicamente Bolivianos por ser orígenes locales, pero permite otras). |
| `is_active` | `boolean` | nullable, updatable | `true` | Determina si esta cuenta recibe o acepta depósitos de clientes. |
| `qr_url` | `text` | nullable, updatable | - | Link externo a la imagen de un código QR simple estático asimilado a la vía de cobro bancaria (facilitando Quick Pays locales). |
| `created_at`, `updated_at` | `timestamptz` | nullable, updatable | `now()` | - |

*Nota: Cuenta con RLS habilitado (Solo lectura para client, mutación solo para staff/admin).*

## Relaciones
Es una entidad sin estado y sin Foreign Keys directas, usada usualmente a través de consultas visuales enviadas al cliente durante el flujo donde él selecciona cómo / a dónde nos abonará FIAT manual u otros depósitos.

## Ejemplo de Uso (JSON)

\`\`\`json
{
  "id": "aaa22aa2-e89b-12d3-a456-426614174000",
  "name": "Guira Corporate BCP",
  "bank_name": "Banco de Credito de Bolivia",
  "account_number": "1234567890123",
  "currency": "Bs",
  "is_active": true,
  "qr_url": "https://guira-storage/qrs/bcp_main.png",
  "created_at": "2026-03-26T17:10:00Z"
}
\`\`\`
