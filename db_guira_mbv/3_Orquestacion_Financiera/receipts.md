# Tabla: `public.receipts`

## 📝 Descripción
Al contrario que los `certificates` (PDFs crudos Hasheados y certificados inmutables de cara al regulador), la tabla de Recibos (`receipts`) está diseñada para la Interfaz del Usuario. Guarda el string en código HTML pre-renderizado amigable a la marca (con los montos embebidos en diseño de Tailwind/CSS inline, colores corporativos etc.) de cómo se le debe mostrar al cliente el desglose amigable del costo de la transacción tras completarse. Permite que el cliente entre al "History" y renderice rápidamente ese HTML.

**Row Level Security (RLS)**: Activado. Acceso general a los clientes propios.

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `uuid` | PK | El ID de entrega de recibo. |
| **`user_id`** | `uuid` | FK | Dueño natural referenciado a `user_profiles.id`. |
| **`transaction_id`** | `uuid` | FK, Unique | Lazo férreo 1:1, asegurando que solo haya un único recibo gráfico de factura virtual (Nota de Cargo/Abono) por cada operación transaccional existente en `transactions.id`. |
| **`html`** | `text` | | El marcado Hyper-Text-Markup completo y estático, previamente empaquetado por las plantillas backend. |
| **`created_at`** | `timestamptz` | Default `now()`| Generación de la bitácora gráfica en el sistema. |

---

## 🔗 Relaciones (Foreign Keys)
- Conectividad a la tabla principal abstracta cruzada  `public.transactions.id`.
- Trazabilidad y dominio propietario hacia `public.user_profiles.id`.

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "rcpt_bO8QZ9",
  "user_id": "e30129bc-dbcf-4f51-b844-cb8cb1a03e91",
  "transaction_id": "tx_2lZjK8pQ",
  "html": "<div style=\"font-family: Arial;\"><h1>Recibo de Pago de Orquestación</h1><p>Has transferido 1,400 USDC a la LLC Amazon AWS el 24 de marzo.</p></div>",
  "created_at": "2024-03-24T18:05:00Z"
}
```
