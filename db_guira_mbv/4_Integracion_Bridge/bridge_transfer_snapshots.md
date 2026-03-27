# Tabla: `public.bridge_transfer_snapshots`

## 📝 Descripción
Tabla de aseguramiento de reconciliación ("Idempotent snapshots"). Cuando un webhook asume un retiro o bien se corre un `bridge_pull_jobs` manual, se debe conocer en retrospectiva el estado de cómo y por dónde Bridge asegura que cursó el pago de un Withdraw hacia USD. Este snapshot "congela" en JSON la versión entregada por Bridge y avista el valor del dinero sin importan si Guira la aprobó en su tabla interna `transactions`. Crucial para emparejar cuadres de caja general y disputas.

**Row Level Security (RLS)**: Activado. Lectura restringida por pertenencia de perfil asociado al User (y lectura global para Staff).

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `uuid` | PK | Correlativo de tabla interno (Snapshot ID). |
| **`user_id`** | `uuid` | FK | Fiel propietario del débito referenciado hacia `user_profiles.id`. |
| **`bridge_customer_id`** | `text` | | Ente con el que Bridge conoce al dueño en su propio registro. |
| **`bridge_transfer_id`** | `text` | Unique | El folio identificativo final (`tx_82Mzo19Z`) asegurando cero repetición en base al modelo de Bridge. |
| **`transfer_state`** | `text` | | Status final dictado desde AFUERA de Guira (`completed`). |
| **`amount`**, **`currency`** | `text`, `text`| | El valor procesado y despachado ("1400" "USD"). |
| **`source`** / **`destination`** | `jsonb` / `jsonb`| Default `{}` | Las redes interconectadas que Bridge atestigua que usó (De Polygon hacia JP Morgan Bank en JSON string arrays). |
| **`receipt`** | `jsonb` | Default `{}` | La constancia externa del recibo. |
| **`bridge_created_at`** / **`bridge_updated_at`**| `timestamptz` | Nullable | Las fechas estampadas originalmente **"Por el Servidor de Bridge"**. |
| **`synced_at`**| `timestamptz` | Default `now()`| Instante temporal en el que el trabajador local de Guira empaquetó esta imagen "congelada". |
| **`raw_payload`** | `jsonb` | Default `{}` | Captura total para debugging de llamadas SDK. |
| **`created_at`** / **`updated_at`** | `timestamptz` | Default `now()`| Cronología relacional de Guira DB. |

---

## 🔗 Relaciones (Foreign Keys)
- Destino de apuntamiento desde `user_id` a la tabla `public.user_profiles.id`.

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "br_snap_9Z1K1p3",
  "user_id": "e30129bc-dbcf-4f51-b844-cb8cb1a03e91",
  "bridge_transfer_id": "tx_2lZjK8pQ",
  "transfer_state": "completed",
  "amount": "1400.00",
  "currency": "USD",
  "source": {"wallet": "address_0x3M9F..." },
  "destination": {"account": "routing_122...", "currency": "USD"},
  "synced_at": "2024-03-24T18:05:00Z"
}
```
