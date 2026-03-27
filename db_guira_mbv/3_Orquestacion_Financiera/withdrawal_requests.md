# Tabla: `public.withdrawal_requests`

## 📝 Descripción
Si el usuario necesita liquidar su saldo o retirar dinero de la plataforma hacia su cuenta bancaria de la vida real (fuera del Ledger interno de Guira) o a un proveedor pagador (Supplier), debe cursar un "Withdrawal Request". Una vez más, reafirmando el papel orquestador de Guira, este es un Ticket de intención de salida, donde se especifica monto, cuenta de destino y proveedor.

**Row Level Security (RLS)**: Activado. Limitado hacia los clientes dueños de la retirada; `STAFF` y `ADMIN` supervisan las colas de salida en su panel y aplican las liberaciones.

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `uuid` | PK, Default `gen_random_uuid()`| Identidad generada automáticamente. |
| **`user_id`** | `uuid` | FK | Cliente involucrado y referenciado hacia `user_profiles.id` que solicitó el retiro de recursos. |
| **`external_account_id`**| `text` | FK | Apunta a una cuenta bancaria o virtual en `external_accounts.id` previamente auditada y autorizada para el perfil de este usuario donde se mandará el cheque/transferencia. |
| **`amount`** / **`currency`** | `numeric` / `text` | | Monto a detraer y enviar, más la divisa respectiva (`BOB`, `USD`, `USDC`). |
| **`status`** | `text` | Check Rule | Constreñido bajo ARRAY: `PENDING_REVIEW` (Lista de espera para el administrador), `APPROVED` (Sancionado positivamente), `REJECTED`, `PROCESSING` (Ya enviado a ACH/Wire, esperando confirmación del banco), `COMPLETED`, `FAILED`. |
| **`reason`** | `text` | Nullable | Motivo por el que el usuario argumenta enviar su dinero (Ayuda en compliance AML). |
| **`admin_notes`** | `text` | Nullable | Bitácora confidencial o apuntes del administrador justificando una demora o rechazo. |
| **`processed_at`**| `timestamptz` | Nullable | Reloj de cuándo se disparó la transferencia en el banco final. |
| **`tx_reference`**| `text` | Nullable | Número serial del Banco u origen proveedor extra de liquidación. |
| **`provider_id`**| `text` | Nullable | ID del proveedor encargado del "payout" (ejemplo, `bridge_api`). |
| **`provider_reference`**| `text` | Nullable | El número de traza (Trace ID) devuelto por la API externa. |
| **`created_at`** / **`updated_at`** | `timestamptz` | Default `now()`| Timestamps de ciclo de vida en base. |

---

## 🔗 Relaciones (Foreign Keys)
- Destino de apuntamiento desde `user_id` a la tabla `public.user_profiles.id`.
- Referencia estricta a una titularidad pre aprobada en `public.external_accounts.id`.

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "wdreq_9x2L1PZ",
  "user_id": "e30129bc-dbcf-4f51-b844-cb8cb1a03e91",
  "external_account_id": "extacc_9M1Lk2O",
  "amount": 5000.00,
  "currency": "USD",
  "status": "PROCESSING",
  "reason": "Pago a proveedor extranjero importación Q3",
  "admin_notes": "Sujeto revisado OFAC el lunes. OK para release.",
  "tx_reference": "WIRE_299308112",
  "provider_id": "bridge",
  "provider_reference": "transfer_9Jz8XkL1",
  "processed_at": "2024-03-24T18:00:00Z",
  "created_at": "2024-03-24T16:00:00Z",
  "updated_at": "2024-03-24T18:00:00Z"
}
```
