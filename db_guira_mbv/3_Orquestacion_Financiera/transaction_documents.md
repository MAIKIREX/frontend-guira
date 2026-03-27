# Tabla: `public.transaction_documents`

## 📝 Descripción
Tabla conectiva M a N que emparenta un Movimiento Financiero Oficial (`transactions`) con su respectivo Respaldo Físico o Justificativo Aduanero/Bancario (`documents` o `supplier_payment_documents`). En operaciones de lavado de dinero (AML), ninguna transacción grande fluye si no trae asociado el PDF de declaración jurada, contrato o recibo del banco corresponsal. Esta tabla crea este polimorfismo.

**Row Level Security (RLS)**: Activado. Jerarquía subordinada al de la `transactions`.

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `uuid` | PK | Identificador único de este puente de relación. |
| **`transaction_id`** | `uuid` | FK | Vincula hacia `public.transactions.id` (El envío o depósito formal). |
| **`document_table`** | `text` | | Patrón Polimórfico: Indica en **cuál de las tablas** documentales vive este archivo (`documents` o `supplier_payment_documents`). |
| **`document_id`** | `uuid` | | El Identificador en crudo. Dada la naturaleza de `text` vs `uuid` en las primarias de esas tablas, requiere cautela en la API de casteo. |
| **`created_at`** | `timestamptz` | Default `now()`| Timestamps de ciclo relacionando la carga. |

---

## 🔗 Relaciones (Foreign Keys)
- Destino de apuntamiento irrestricto hacia `public.transactions.id`.

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "txdoc_8x7O90C",
  "transaction_id": "tx_2lZjK8pQ",
  "document_table": "supplier_payment_documents",
  "document_id": "spdoc_9Kx1jL",
  "created_at": "2024-03-24T18:00:00Z"
}
```
