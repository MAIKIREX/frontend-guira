# Tabla: `public.fiat_deposit_intents`

## 📝 Descripción
Primera de las tablas del Dominio Transaccional y Orquestación pura de Guira. Como Guira NO es un banco y nunca debita montos remotamente de la billetera del cliente, debe generarse una **"Intención"**. El cliente declara *"Voy a depositar M cantidad de moneda FIAT (ej. Bolivianos) en sus conductos autorizados y subiré mi comprobante"*. Esta tabla rastrea este intento, si cuenta con un código visual QR asignado, y maneja de facto el estado en que los miembros de `STAFF` lo validan.

**Row Level Security (RLS)**: Activado. Limitado hacia los clientes dueños de las intenciones de sus perfiles; mientras `STAFF` y `ADMIN` verifican estos en su Panel.

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `uuid` | PK, Default `gen_random_uuid()`| Integridad identificable de la intención de transacción originada. |
| **`user_id`** | `uuid` | FK | Cliente involucrado y referenciado hacia `user_profiles.id` quien generará los recursos fiat. |
| **`amount`** | `numeric` | | Monto monetario matemático sin decimal flotante (garantizando exactitud SQL monetaria) que el usuario prevé mandar. |
| **`currency`** | `text` | | Código ISO (`BOB`, `USD`, `MXN`), moneda que va a transferirse en FIAT. |
| **`status`** | `text` | Check Rule | Constreñido bajo ARRAY explorable internamente. `PENDING_CONFIRMATION` (Esperando QR), `CONFIRMED_BANK` (Se ha analizado el desembolso), `CREDITED` (Ya acreditado y transformado), `EXPIRED` (Tiempo expirado sin depósito), `FAILED`. |
| **`qr_id`**, **`qr_code`**, **`qr_image_base64`** | `text` | Nullable | Si la pasarela local interbancaria (ej: BNB Banco Nacional o BCP Pagos) facilita un Código Rápido en cadena cruda de caracteres JSON, Base 64 renderizado, y su ID de rastreo para hacer Webhooks o cron polling. |
| **`gloss`** | `text` | Nullable | Glosa, motivo o identificador único para transferencias por texto en el detalle (sirve para engrane automático bancario donde el operario manda el mismo serial que nosotros mostramos en UI). |
| **`expiration_date`** / **`expires_at`**| `date` / `timestamptz` | Nullable | Parámetros que cortan e invalidan la transacción si el cliente se demoró en su depósito. |
| **`credited_transaction_id`**| `uuid` | Nullable | Referencia fundamental cruzada hacia el verdadero `Ledger`: Cuando el depósito es real y validado, un "Transaction" se acuña en la tabla de orquestación central (`public.transactions.id`) insertando sus UUID equivalentes aquí de constancia de cumplimiento de intento. |
| **`bnb_raw_response`** | `jsonb` | Nullable | Snapshot para debugging de la llamada técnica del banco boliviano BNB. |
| **`created_at`** / **`updated_at`** | `timestamptz` | Default `now()`| Timestamps de registro regular de inicio de operaciones en la UI. |

---

## 🔗 Relaciones (Foreign Keys)
- Destino de apuntamiento desde `user_id` a la tabla `public.user_profiles.id`.

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "f8a09b30-c4e1-45af-a9e9-b5d1eab2b79a",
  "user_id": "e30129bc-dbcf-4f51-b844-cb8cb1a03e91",
  "amount": 1000.50,
  "currency": "BOB",
  "status": "PENDING_CONFIRMATION",
  "qr_id": "BNB_10928_QRXT",
  "qr_image_base64": "iVBORw0KGgoAAAANSUhEUgAA...",
  "gloss": "Depósito Intención #BNB10928",
  "expires_at": "2024-03-24T18:00:00Z",
  "credited_transaction_id": null,
  "bnb_raw_response": null,
  "created_at": "2024-03-24T17:00:00Z",
  "updated_at": "2024-03-24T17:01:00Z"
}
```
