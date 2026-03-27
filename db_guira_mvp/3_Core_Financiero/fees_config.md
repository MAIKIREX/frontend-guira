# Tabla: `public.fees_config`

## Función de la Tabla
La tabla corporativa `fees_config` guarda de forma transversal en base de datos la tabla de Tarifas o Comisiones genéricas de la plataforma. Evita quemar ("hardcodear") números como `5%` o `$1.5` en el código fuente de las funciones y API en backend limitando a que el Staff pueda alterar estos márgenes libremente desde su panel de configuraciones. Determina, por tipo de casuística de sistema operativo, cuánta utilidad recolectar y bajo qué modelo (plano o porcentual).

## Columnas

| Nombre | Tipo de Dato | Opciones / Restricciones | Valor por Defecto | Descripción Breve |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` (PK) | updatable | `gen_random_uuid()` | Clave única (no expuesta). |
| `type` | `text` | updatable, unique | - | Etiqueta en string ("slug") a la cual se referirá el sistema en código. (e.g. `bridge_crypto_payout_fee`, `fiat_onramp_fee`, `local_wire_fee`). Es única. |
| `fee_type` | `text` | updatable, CHECK | - | Modalidad de comisión: Puede ser `'fixed'` (un valor constante flat sin importar el volumen) o `'percentage'` (un recargo porcentual 0-100%). |
| `value` | `numeric` | updatable | - | Magnitud de la comisión, valor puramente ad dimensional pero tratado como monto estricto. |
| `currency` | `text` | updatable | - | El ISO Code que demarca en caso de los fixed si valen `$5 USD` o `5.00 BO`. |
| `created_at` | `timestamptz` | nullable, updatable | `now()` | - |

*Nota: Cuenta con RLS (Row Level Security).*

## Relaciones
Es una entidad sin estado y sin dependientes de foráneas (`zero FKs`). Sirve como caché operativo o memoria de referencia para calcular en tiempo real los márgenes transaccionales (como los originados en `payment_orders`).

## Ejemplo de Uso (JSON)

\`\`\`json
{
  "id": "abc234k23f9",
  "type": "bridge_crypto_payout_fee",
  "fee_type": "percentage",
  "value": 1.50,
  "currency": "USD",
  "created_at": "2026-03-26T12:00:00Z"
}
\`\`\`
