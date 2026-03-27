# Tabla: `public.suppliers`

## Función de la Tabla
La tabla `suppliers` organiza la base de datos o agenda bancaria del directorio de Proveedores B2B de los usuarios. Cuando un cliente institucional necesita procesar un `payment_order` y depositar a un socio comercial regular en China, México, u otra latitud, las cuentas a enviar dinero de dicho socio se guardan aquí bajo un concepto y KYC ligero aislado (beneficiary agenda list), sirviendo de agenda reutilizable de transferencias o fondeos recurrentes.

## Columnas

| Nombre | Tipo de Dato | Opciones / Restricciones | Valor por Defecto | Descripción Breve |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` (PK) | updatable | `gen_random_uuid()` | Clave interna del contacto de proveedor B2B. |
| `user_id` | `uuid` | updatable | - | Administrador / Usuario o perfil B2B creador de esta libreta de negocio (`FK` a `profiles`). |
| `name` | `text` | updatable | - | Razón social real, o alias del proveedor asociado (ej. `Foxconn Technology Group`). |
| `country` | `text` | updatable | - | Ubicación de la residencia fiscal del proveedor (ej. `CN` o `US`). |
| `payment_method` | `text` | updatable | - | Enrutador o canal de defecto guardado pre-evaluado AML (`Wire`, `ACH`, `USDC`). |
| `bank_details` | `jsonb` | nullable, updatable | `'{}` | Objeto que estandariza metadatos bancarios del ABA, SWIFT, Beneficiary Names corporativos internacionales requeridos. |
| `crypto_details` | `jsonb` | nullable, updatable | `'{}` | En caso de que se abonen fondos en formato crypto (Stablecoins), especifica billetera de red y ecosistema. |
| `address`, `phone`, `email` | `text` | nullable, updatable | - | Conjunto de variables suplementarias de compliance y notificación exigida a veces en remesas por bancos gringos. |
| `tax_id` | `text` | nullable, updatable | - | ID tributario empresarial del proveedor. |
| `created_at` | `timestamptz` | nullable, updatable | `now()` | - |

*Nota: Cuenta con RLS (Row Level Security).*

## Relaciones
- **Agenda Propiedad de:** Unilateral a `profiles` bajo `user_id`.
- **Es inyectado hacia:** `payment_orders` a través de la llave cruzada opcional de `supplier_id`. Esta relación documenta legalmente dónde aterrizó un monto procesado por Guira a nombre de un cliente que pagó a su proveedor externo en la red de la orden.

## Ejemplo de Uso (JSON)

\`\`\`json
{
  "id": "888e4567-e89b-12d3-a456-426614174000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Global Manufacturing S.A.",
  "country": "CN",
  "payment_method": "USDC",
  "bank_details": {},
  "crypto_details": {
    "network": "ethereum",
    "address": "0xABCDEF1234567890ABCDEF1234567890ABCDEF12"
  },
  "email": "payments@globalmanufacturing.com",
  "tax_id": "CN-99988877",
  "created_at": "2026-03-26T14:30:10Z"
}
\`\`\`
