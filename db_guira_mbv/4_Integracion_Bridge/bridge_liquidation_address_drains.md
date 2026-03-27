# Tabla: `public.bridge_liquidation_address_drains`

## 📝 Descripción
Un "Drain" ("Drenaje" o "Vaciado") ocurre cuando la `bridge_liquidation_addresses` recibe fondos USDC en Polygon/Ethereum a nombre del cliente, y asíncronamente Bridge decide empacar y "Drenar" esos activos hacia la cuenta Fiat (Wire/ACH) pactada. Esta tabla escucha el Webhook de Drenajes (`Liquidation drains`) y mantiene un comprobante de que los fondos criptográficos efectivamente ya partieron hacia el mundo tradicional de banco en banco para ese perfil.

**Row Level Security (RLS)**: Activado. Limitado hacia su titular en modo Select, y staff en todo.

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `uuid` | PK | Clave única de drenaje interno. |
| **`user_id`** | `uuid` | FK | Vincula hacia `public.user_profiles.id` (Al beneficiario que vio salir su cripto a fiat). |
| **`bridge_liquidation_address_id`**| `text` | | El Identificador en crudo de la bóveda vaciada referída. |
| **`drain_id`** | `text` | | Puntero físico al ID del proceso del evento en Bridge, donde se consolidaron y quemaron monedas. |
| **`amount`** / **`currency`** | `text`, `text`| | El cuantuí original liquidado o esfumado a nivel red, a veces stringizado para proteger desbordamientos ETH (`format: "200.55"` en texto en vez de numeric localmente). |
| **`destination_payment_rail`**| `text` | | Camino terminal asignado de pago Wire, ACH. |
| **`destination_currency`** | `text` | | Divisa fíat a la cual se está mutando (Generalmente el USD global) |
| **`status`** | `text` | | El estatus resolutivo local. |
| **`raw_payload`**| `jsonb`| | Captura textual para debug. |
| **`created_at`** | `timestamptz` | Default `now()`| Timestamps. |

---

## 🔗 Relaciones (Foreign Keys)
- Subordinado mediante clave foránea exclusiva a **`user_profiles.id`**.

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "drain_0pX1lz2",
  "user_id": "e30129bc-dbcf-4f51-b844-cb8cb1a03e91",
  "bridge_liquidation_address_id": "l_addr_3mMz8",
  "drain_id": "drain_abc123XYZ",
  "amount": "1400.00",
  "currency": "USDC",
  "destination_payment_rail": "wire",
  "destination_currency": "USD",
  "status": "completed",
  "created_at": "2024-03-24T18:00:00Z"
}
```
