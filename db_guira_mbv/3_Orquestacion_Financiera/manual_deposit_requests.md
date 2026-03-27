# Tabla: `public.manual_deposit_requests`

## 📝 Descripción
Un subsistema complementario a `fiat_deposit_intents`, especialmente orientado cuando el fondeo del usuario requiere intervención absolutamente humana y asignación manual caso a caso por Guira (por ejemplo: Un depósito manual de gran volumen SWIFT que cae a una cuenta concentradora maestra ajena a automatizaciones o entregas de cripto 'Over the Counter' [OTC]).

**Row Level Security (RLS)**: Activado. Jerarquía dependiente de Cliente para vista, y vista gerencial / escritura de los Administradores de Fondos (STAFF).

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `uuid` | PK | Expediente único. |
| **`user_id`** | `uuid` | FK | Al cliente dueño amparándolo hacia `user_profiles.id`. |
| **`amount`**, **`currency`** | `numeric`, `text`| | Valores absolutos solicitados por el cliente. |
| **`network`** | `text` | | Si corresponde a un depósito en stablecoin u otc fiat (`ethereum`, `ach`). |
| **`status`** | `text` | Check Rule | Matriz de flujo en ARRAY (`PENDING`, `ASSIGNED`, `COMPLETED`, `REJECTED`, `EXPIRED`). |
| **`assigned_address`**| `text` | Nullable | En vez de pasarelas mecánicas, acá un STAFF mete a mano a qué dirección o código SWIFT concentrador se deba enviar dicho monto. |
| **`tx_hash`** | `text` | Nullable | Prueba final aportada. |
| **`admin_notes`** | `text` | Nullable | Comentario interno ("Cliente mandó 1 BTC de origen dudoso, freezado."). |
| **`assigned_by`** / **`confirmed_by`** / **`rejected_by`** | `uuid` | FK, Nullable | Colección de Punteros hacia los operarios y cajeros STAFF `user_profiles` que facilitaron direcciones de depósito y la aprobaron u observaron al final del workflow. |
| **`created_at`** / **`updated_at`** | `timestamptz` | Default `nowUTC()`| Timestamp de la petición de fondeo. |

---

## 🔗 Relaciones (Foreign Keys)
- Destino vertical por origen al **`user_profiles.id`** .
- Destinos de autoría por `assigned_by`, `confirmed_by`, `rejected_by` directos hacia **`user_profiles.id`**.

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "mdr_10xL9Qp",
  "user_id": "e30129bc-dbcf-4f51-b844-cb8cb1a03e91",
  "amount": 100000.00,
  "currency": "USDC",
  "network": "ethereum",
  "status": "COMPLETED",
  "assigned_address": "0xMaestroColdWalletTesoreriaGuiraXYZ...",
  "tx_hash": "0x12039210bc...",
  "admin_notes": "Saldos comprobados vía Etherscan, listos para fondear el Balance final.",
  "assigned_by": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "confirmed_by": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "created_at": "2024-03-24T18:00:00Z",
  "updated_at": "2024-03-24T19:00:00Z"
}
```
