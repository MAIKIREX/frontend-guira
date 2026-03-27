# Tabla: `public.wallets`

## 📝 Descripción
Tabla conectada al modelo de recepción (Recieving) descentralizado (Cripto). Retiene un inventario de direcciones públicas (Billeteras) adjudicadas y de propiedad directa de la plataforma y prestadas en subcuenta al usuario. Al recibir fondeo del usuario o terceros ajenos a la plataforma hacia ese token en `address`/`network`, se asienta indirectamente su titularidad y saldo en Guira. Funciona frecuentemente emparentado con APIs generadoras como Bridge.

**Row Level Security (RLS)**: Activado. Limitado hacia los clientes o nivel de vista completa para administrativos de reconciliación.

---Wilvelzap's Project

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `uuid` | PK | Identidad única alfanumérica de la bóveda o token billetera. |
| **`user_id`** | `uuid` | FK | A quién le pertenece lógicamente ser acreedor del balance depositado en ella (`user_profiles.id`). |
| **`currency`** | `text` | | Clasifica qué moneda corre aquí (`ETH`, `USDC`, `USDT`). |
| **`address`** | `text` | | Hash público o public key en la base de la red (La cadena exadecimal `0x...`). |
| **`network`** | `text` | | Etiqueta de la blockchain o layer operativo (`polygon`, `optimism`, `ethereum`, `stellar`). |
| **`provider_key`** | `text` | Nullable | Quien generó y custodia la Private Key (Ej. "bridge", "fireblocks"). |
| **`provider_wallet_id`**| `text` | Nullable | ID del servicio B2B correspondiente y homólogo para webhooks (Ej. la Bridge Virtual Wallet string). |
| **`created_at`** / **`updated_at`** | `timestamptz` | Default `now()`| Timestamps de vigencia y provisionado. |

---

## 🔗 Relaciones (Foreign Keys)
- Destino base dependiente de **`user_profiles.id`** para dar significado orgánico de "de quién es esto".

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "wal_2LpZ91m",
  "user_id": "e30129bc-dbcf-4f51-b844-cb8cb1a03e91",
  "currency": "USDC",
  "address": "0x1b2c3D4e5F6G7H8i9J0kL...",
  "network": "polygon",
  "provider_key": "bridge",
  "provider_wallet_id": "vwal_bridge_kX910a",
  "created_at": "2024-03-24T18:00:00Z",
  "updated_at": "2024-03-24T18:00:00Z"
}
```
