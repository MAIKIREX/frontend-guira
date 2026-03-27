# Tabla: `public.balances`

## 📝 Descripción
Tabla maestra del saldo financiero local. Constituye el agregado matemático del patrimonio de un cliente dentro de Guira. Funciona independientemente de su `wallets` real en blockchain o el saldo en `fiat_deposit_intents`, sirviendo como la variable central para aprobar operaciones de retiro de la UI (User Interface) o para la disponibilidad del cliente.

**Row Level Security (RLS)**: Activado. Limitado hacia su titular en modo `Select`. Únicamente un trigger interno de la base de datos o el motor de reconciliación en modo Service puede aplicar mutaciones sobre la celda `amount`.

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `uuid` | PK | Identidad única alfanumérica del contenedor de balance. |
| **`user_id`** | `uuid` | FK | Al usuario perteneciente en `user_profiles.id`. |
| **`currency`** | `text` | | Código ISO indicando qué divisa contiene este registro (`USD`, `BOB`, `USDC`). Un usuario puede tener *N* filas de balance por cada *N* divisa soportada. |
| **`amount`** | `numeric` | Default `0` | Sumatoria contable neta actual del dinero consolidado. El uso de variable Numérica imposibilita los ataques de precisión de flotantes (Floating Point Arithmetics vulnerabilities). |
| **`created_at`** / **`updated_at`** | `timestamptz` | Default `now()`| Timestamps de ciclo de vida en base. |

---

## 🔗 Relaciones (Foreign Keys)
- Destino de apuntamiento desde `user_id` a la tabla `public.user_profiles.id`. Toda revisión humana o automatizada se rige por cruzar este registro con el cliente originador.

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "bal_0oZ1mXp",
  "user_id": "e30129bc-dbcf-4f51-b844-cb8cb1a03e91",
  "currency": "USD",
  "amount": 25050.75,
  "created_at": "2024-03-24T18:00:00Z",
  "updated_at": "2024-03-24T19:00:00Z"
}
```
