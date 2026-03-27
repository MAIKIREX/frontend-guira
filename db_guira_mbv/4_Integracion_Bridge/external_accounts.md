# Tabla: `public.external_accounts`

## 📝 Descripción
Tabla diseñada para guardar información de "Cuentas Externas" pertenecientes a los usuarios. Sirve para almacenar de forma persistente a dónde se moverán los fondos o de dónde llegarán. Cada registro de esta tabla representa un banco (`BANK`), un riel de pago, una cuenta virtual (`VIRTUAL`) u otra ruta en los protocolos donde un usuario necesita conectarse para la operatoria final (ejemplo: cuentas de retiro en EEUU, cuentas bancarias destino en Bolivia). 

**Row Level Security (RLS)**: Activado. Limitado hacia los clientes y los oficiales de `STAFF` y `ADMIN`.

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `text` | PK | Identificador único de la cuenta. |
| **`application_type`** | `subject_type` | Enum | Si esta cuenta proviene de un trámite `KYC` o de `KYB`. |
| **`application_id`** | `text` | | El ID polimórfico de dicha aplicación de origen. |
| **`type`** | `external_account_type`| Enum | Clasifica la naturaleza de la cuenta extranjera: `BANK`, `VIRTUAL` o `CRYPTO`. |
| **`currency`** | `text` | | Divisa base en la que opera la cuenta (ej. `USD`, `BOB`). |
| **`account_holder_name`** | `text` | | Titularidad formal y legal de la cuenta externa. Extremadamente importante porque el marco de compliance prohíbe pagos a terceros en muchos de los esquemas. |
| **`bank_name`**, **`country`** | `text` | | Entidad bancaria o de depósito donde se alojan los fondos y a qué país pertenece (ej. `JPMorgan Chase`, `US`). |
| **`account_number`**, **`routing_number`** | `text` | Nullable | Claves para ubicar los fondos transaccionales de bancos en EEUU (ABA Routing Numbers y No. de Cuenta) |
| **`swift`**, **`iban`** | `text` | Nullable | Claves para ubicar cuentas europeas / internacionales. |
| **`wallet_address`**, **`wallet_network`** | `text` | Nullable | Si el "type" es CRYPTO, aquí se alojaría la llave pública (Dirección) y red blockchain. |
| **`label`** | `text` | Nullable | Etiqueta en frontend para uso amable (Ej. "Mi LLC Banco", "Cuenta de Suelo"). |
| **`purpose`** | `external_account_purpose`| Enum, Default: `KYB`| Razón por la cual se guarda la cuenta. Opciones: `WITHDRAWAL` o `KYB`. |
| **`status`** | `external_account_status`| Enum, Default `APPROVED` | `PENDING`, `APPROVED`, `REJECTED`. Controla uso interno. |
| **`admin_notes`** | `text` | Nullable | Notas de STAFF de por qué una cuenta externa puede ser riesgosa o estar rechazada. |
| **`reviewed_at`** | `timestamptz` | Nullable | Cuando se revisó. |
| **`created_at`** / **`updated_at`** | `timestamptz` | Default `now()` | Fechas relativas al registro. |

---

## 🔗 Relaciones (Foreign Keys)
- Destino/Target en **`withdrawal_requests`** (`external_account_id -> id`). Esto garantiza que los retiros hechos apunten unívocamente a una cuenta permitida y registrada para el cliente.

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "extacc_9M1Lk2O",
  "application_type": "KYB",
  "application_id": "kyb_T9pR2aQ",
  "type": "BANK",
  "currency": "USD",
  "account_holder_name": "Agente Export Ltda",
  "bank_name": "JPMorgan Chase Bank",
  "country": "US",
  "account_number": "000012341234",
  "routing_number": "122200021",
  "label": "Cuenta en Miami",
  "purpose": "WITHDRAWAL",
  "status": "APPROVED",
  "created_at": "2024-03-24T18:15:00Z"
}
```
