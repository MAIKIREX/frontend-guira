# Tabla: `public.asset_prices`

## 📝 Descripción
Almacena tipos de cambio, cuotas y precios de referencia mundiales o locales de activos (monedas fiat y cripto) para que la plataforma Guira calcule dinámicamente o registre un oráculo financiero. Es indispensable para mostrar valores convertidos de USD a BOB (Bolivianos) o conocer la tasa USDC real.

**Row Level Security (RLS)**: Desactivado / Abierto publicamente (`rls_enabled: false`). Cualquier parte del sistema o cualquier cliente puede consultar los precios de los activos vigentes sin requerir token con privilegios superpuestos, posibilitando calculadoras de landing pages (pre-login). Modificación siempre protegida y delegada al motor general de Supabase Service Role.

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `uuid` | PK | Identidad autogenerable del registro de cotización. |
| **`symbol`** | `text` | | Ticker del activo o par bursátil a tasar (`USD_BOB`, `USDC_USD`, `BTC_USD`). |
| **`price`** | `numeric` | | Acumulador de precio puntual, usando `numeric` para absoluta precisión matemática carente de floto residual. |
| **`currency`** | `text` | | Moneda base subyacente la cual tilda el precio unitario del símbolo. |
| **`source`** | `text` | Nullable | Ente u Oráculo emisor de la tasación (`BCB`, `Binance`, `Bridge_Oracle`, `Internal_Manual_Peg`). |
| **`created_at`** / **`updated_at`** | `timestamptz` | Default `now()`| Instante de toma del snapshot. |

---

## 🔗 Relaciones (Foreign Keys)
- Esta tabla actúa como tabla de metadato auxiliar puramente informativa, no tiene uniones rigurosas.

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "aprc_1lZxp92",
  "symbol": "USD_BOB",
  "price": 6.96,
  "currency": "BOB",
  "source": "BCB_Official",
  "created_at": "2024-03-24T00:00:00Z",
  "updated_at": "2024-03-24T00:00:00Z"
}
```
