# Tabla: `public.bridge_virtual_accounts`

## 📝 Descripción
Parte fundamental de la orquestación transaccional transfronteriza y Off-Ramp. Cuando un usuario del "Exterior" necesita que Bridge (El proveedor) lo recaude a través de una red local del exterior de alto rango (como Plaid o red local ACH), Bridge emite una "Cuenta Virtual" a nombre del usuario. El dinero impacta esta cuenta, y Bridge lo auto-liquida hacia USDT/USDC hacia las billeteras web3 operadas en la liquidadora maestra de Guira. Esta tabla empareja esa arquitectura con los humanos de nuestro Tenant y sus reglas.

**Row Level Security (RLS)**: Activado. Lectura restringida por pertenencia de perfil asociado al User.

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `uuid` | PK | Integridad referencial lógica de nuestra APP. |
| **`user_id`** | `uuid` | FK | Humano atado del proceso, referencia hacia `user_profiles.id`. |
| **`bridge_customer_id`** | `text` | | Ente espejo con el que Bridge conoce al dueño en su propio registro (Ej. `cust_xxx`). |
| **`bridge_virtual_account_id`**| `text` | | El ID objeto del Bank Account creado en Bridge y emitido en sus APIs (Ej. `vacc_129Xzqa`). |
| **`status`** | `text` | | Condición operativa dictaminada asíncronamente vía Webhook por el proveedor (`active`, `closed`, `pending_review`). |
| **`source_currency`** | `text` | | Lo que recibirá desde el mundo legado tradicional (`USD`, `EUR`). |
| **`destination_currency`** | `text` | | Lo que escupirá al liquidar internamente a nivel onchain (`USDC`). |
| **`destination_payment_rail`**| `text` | | Por qué carril va a vaciarse esta cuenta puente (Ej. `polygon_usdc`). |
| **`destination_bridge_wallet_id`**| `text` | Nullable | ID de cartera billetera de liquidez on-chain si va retenida o a nombre proxy en la propia tenencia dentro de Bridge System. |
| **`source_deposit_instructions`**| `jsonb` | | Archivo rico conteniendo los ABA/Routing / Swift / IBAN expuestos para mostrarlos en el Frontend, es la "interfaz bancaria" dada remotamente. |
| **`destination`** | `jsonb` | | Detalles de la ruta final a la que liquidará internamente cada centavo. |
| **`created_at`** / **`updated_at`** | `timestamptz` | Default `now()`| Timestamps de ciclo en base de datos local. |

---

## 🔗 Relaciones (Foreign Keys)
- Destino de apuntamiento desde `user_id` a la tabla `public.user_profiles.id`.

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "bva_0z1Lk2P9",
  "user_id": "e30129bc-dbcf-4f51-b844-cb8cb1a03e91",
  "bridge_customer_id": "cust_8283mX20",
  "bridge_virtual_account_id": "vacc_0oMkZ129",
  "status": "active",
  "source_currency": "USD",
  "destination_currency": "USDC",
  "destination_payment_rail": "polygon",
  "destination_bridge_wallet_id": null,
  "source_deposit_instructions": {
    "bank_name": "Evolve Bank & Trust",
    "account_number": "123456789",
    "routing_number": "122201928"
  },
  "destination": {
    "address": "0x4Fc...12z",
    "network": "polygon"
  },
  "created_at": "2024-03-24T18:00:00Z",
  "updated_at": "2024-03-24T18:10:00Z"
}
```
