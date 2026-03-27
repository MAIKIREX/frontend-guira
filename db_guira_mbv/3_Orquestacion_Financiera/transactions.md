# Tabla: `public.transactions`

## 📝 Descripción
El verdadero **"Ledger"** o "Libro Mayor" inmutable de Guira. Si `balances` es el total actual en la billetera, `transactions` contiene cada movimiento que dio origen y sumó/restó a ese total. Cada que se aprueba un `fiat_deposit_intents` o se liquida un `withdrawal_requests`, Guira acuña ("mints") obligatoriamente un registro en esta tabla. Esto respalda que toda suma provenga de una ecuación transaccional histórica trazable.

**Row Level Security (RLS)**: Activado. Limitado hacia los clientes o vista completa para administrativos de reconciliación en modo Solo-Lectura.

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `uuid` | PK | Identidad única UUIDv4 de la transacción oficial. |
| **`user_id`** | `uuid` | FK | Fiel propietario del débito o crédito (`user_profiles.id`). |
| **`type`** | `text` | Check Rule | Constreñido bajo: `DEPOSIT` (inbound), `WITHDRAWAL` (outbound). |
| **`amount`**, **`currency`** | `numeric`, `text`| | El valor contable y divisa subyacente de liquidación local registrada afectando al cliente. |
| **`status`** | `text` | | Estatus de la transacción oficial (e.g., `COMPLETED`, `PENDING`, `FAILED`). |
| **`tx_hash`** | `text` | Nullable | Si proviene de Blockchain, aquí yace la firma exadecimal (0x...). Si no, el código Swift o comprobante bancario numérico. |
| **`rail`** | `text` | Nullable | Riel financiero por el que se transportó (`ACH`, `SWIFT`, `PSAV`, `CRYPTO`, `MANUAL`). |
| **`original_amount`** / **`original_currency`** | `numeric` / `text` | Nullable | Dado que un cliente pudo enviar `10,000 BOB`, y localmente en Ledger se transó a `1,400 USD`, aquí se conserva el estado prístino pre-fx conversion. |
| **`usdc_amount`** / **`fx_rate`** | `numeric` / `numeric` | Nullable | Tasa de Cambio aplicada históricamente sobre el `original_amount` para obtener el `amount` de ledger, y su valor en una stablecoin si intervinieron criptomonedas como transporte. |
| **`external_reference`**| `text` | Nullable | Referencia genérica a la tabla abstracta que dio origen (IDs de API externa, Invoice IDs). |
| **`created_at`** / **`updated_at`** | `timestamptz` | Default `now()`| Timestamps de registro de la base. |

---

## 🔗 Relaciones (Foreign Keys)
- Proyectado hacia **`certificates`**: Que acuña recibos de este ID.
- Proyectado hacia **`receipts`**: Que guarda HTML del comprobante a enviar al cliente.
- Proyectado hacia **`transaction_documents`**: Que alberga los documentos soporte de la transferencia avalando AML (origen de fondos).
- Subordinado a **`user_profiles.id`**.

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "tx_2lZjK8pQ",
  "user_id": "e30129bc-dbcf-4f51-b844-cb8cb1a03e91",
  "type": "DEPOSIT",
  "amount": 1400.00,
  "currency": "USD",
  "status": "COMPLETED",
  "tx_hash": "0x123abc456def789...",
  "rail": "PSAV",
  "original_amount": 9744.00,
  "original_currency": "BOB",
  "fx_rate": 6.96,
  "usdc_amount": 1400.00,
  "external_reference": "intent_f8a09b30-c4e1...",
  "created_at": "2024-03-24T18:00:00Z"
}
```
