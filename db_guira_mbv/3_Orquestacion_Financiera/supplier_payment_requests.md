# Tabla: `public.supplier_payment_requests`

## 📝 Descripción
Un módulo de negocio B2B clave en Guira es facilitar "Pago a Proveedores" para empresas locales que importan bienes del exterior. Esta tabla separa la operatoria de un retiro corriente (`withdrawal_requests`) y maneja el flujo operativo del pago directo a la cuenta Swift/ACH/Iban de la fábrica internacional (el Proveedor de la Empresa del Cliente).

**Row Level Security (RLS)**: Activado. Limitado hacia el creador en cliente y vista abierta de procesamiento para `STAFF`.

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `uuid` | PK | ID UUIDv4 del requerimiento de pago. |
| **`user_id`** | `uuid` | FK | Al usuario originador de este cargo operativo (`user_profiles.id`). |
| **`beneficiary_name`**| `text` | | El nombre verificado de la persona fiscal o jurídica extranjera del proveedor asiático, americano, etc. |
| **`bank_name`**, **`bank_country`** | `text` | Nullable | Institución bancaria receptora del Swift. |
| **`account_number`** | `text` | Nullable | Número local de cuenta / CLABE bancaria. |
| **`iban`**, **`swift`** | `text` | Nullable | Identidades exigidas en pagos Cross-Border (Internacional). |
| **`extra_destination_details`**| `jsonb` | Nullable | Acomodamiento flexible de datos exóticos adicionales requeridos por las aduanas extranjeras (ej. Códigos de banco correspondientes). |
| **`amount`**, **`currency`** | `numeric`, `text`| | El volumen de plata que se ordena saldar. |
| **`status`** | `text` | Check Rule | Constreñido bajo: `PENDING_REVIEW` (Esperando luz verde de compliance Guira), `APPROVED`, `REJECTED`, `COMPLETED` (Swift emitido). |
| **`admin_notes`** | `text` | Nullable | Comentarios internos forenses. |
| **`tx_reference`**| `uuid` | Nullable | Apuntador auxiliar a un cruce en una base del proveedor. |
| **`provider_id`** / **`provider_reference`**| `text` | Nullable | Integración para rastrear este envío SWIFT desde el Partner financiero. |
| **`reviewed_at`** / **`completed_at`**| `timestamptz` | Nullable | Estampado de paso temporal asíncrono. |
| **`created_at`** / **`updated_at`** | `timestamptz` | Default `now()`| Base natural del registro inicial de UI. |

---

## 🔗 Relaciones (Foreign Keys)
- Destinado hacia **`user_profiles.id`** del generador de la intención.
- Proyectado hacia afuera para anclaje en **`supplier_payment_documents`** que deben anexar Pruebas (Facturas Comerciales).

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "spr_Px92K10j",
  "user_id": "e30129bc-dbcf-4f51-b844-cb8cb1a03e91",
  "beneficiary_name": "Shenzhen Teco Manufacturing Co. Ltd",
  "bank_name": "Bank of China",
  "bank_country": "CN",
  "account_number": "81203912039102",
  "swift": "BKCHCNBJXXX",
  "amount": 150000.00,
  "currency": "USD",
  "status": "APPROVED",
  "admin_notes": "Due diligence OK y factura comercial de respaldo emparejada. Mandar por wire.",
  "provider_id": "bridge",
  "created_at": "2024-03-23T14:30:00Z"
}
```
