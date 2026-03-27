# Tabla: `public.bridge_liquidation_addresses`

## 📝 Descripción
Tabla infraestructura dedicada al "On-Ramp" para empresas con Bridge. Esta permite asignar carteras criptográficas exclusivas "De Liquidación" (Liquidation Addresses). Todo Dólar enviado a nombre de Bridge se liquida acá. Representa una conexión vital para cobrar a clientes Web3 en USDC y que Bridge recaude ese USDC, lo mute a cuenta bancaria Fiat Wire/ACH y lo desembolse a un carril tradicional con los checks de fraude habilitados. 

**Row Level Security (RLS)**: Activado. De uso interno por sistema mayormente y en modo lectura sobre el `user_id`.

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `uuid` | PK | Correlativo de tabla. |
| **`user_id`** | `uuid` | FK | Al usuario asignado internamente (`user_profiles.id`). |
| **`bridge_customer_id`** | `text` | | Correlaciona esta billetera de liquidaciones con el ente que pasó el KYB en Bridge. |
| **`bridge_liquidation_address_id`** | `text` | | La etiqueta física guardada en el proveedor (su identificador real vía API). |
| **`chain`** | `text` | | Red originaria desde donde ingresan las stablecoins (`polygon`, `arbitrum`, `optimism`). |
| **`currency`** | `text` | | Forma de fondo del ingreso cripto originario (`USDC`). |
| **`destination_payment_rail`**| `text` | | Camino de fin finalizado (Ej: `ach_push`, `wire`). |
| **`destination_currency`** | `text` | | El subyacente que caerá (`USD`). |
| **`destination_address`** | `text` | Nullable | Un ID UUID o Token referenciando la cuenta bancaria ABA final. |
| **`raw_payload`** | `jsonb` | | Archivo JSON plano con las configuraciones exactas proporcionadas contra API. |
| **`created_at`** / **`updated_at`** | `timestamptz` | Default `now()`| Cronología relacional. |

---

## 🔗 Relaciones (Foreign Keys)
- Depende verticalmente de la tabla superior de sistema en `user_profiles.id`.

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "bl_address_0kM9",
  "user_id": "e30129bc-dbcf-4f51-b844-cb8cb1a03e91",
  "bridge_customer_id": "cust_8283mX20",
  "bridge_liquidation_address_id": "l_addr_3mMz8",
  "chain": "polygon",
  "currency": "USDC",
  "destination_payment_rail": "wire",
  "destination_currency": "USD",
  "destination_address": "vwal_bridge_kX910a",
  "raw_payload": {
    "network": "polygon",
    "fiat_destination_id": "fdst_839P01l"
  },
  "created_at": "2024-03-24T18:00:00Z",
  "updated_at": "2024-03-24T18:00:00Z"
}
```
