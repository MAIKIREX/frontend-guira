# Tabla: `public.supplier_payment_documents`

## 📝 Descripción
Un pago a proveedores en mercados regulados exige estricta justificación aduanera (una orden de compra en proforma). Esta tabla guarda la configuración estructural y los metadatos de qué tipo de comprobante está anexando un cliente a un ticket de pedido de giro en `supplier_payment_requests`.

**Row Level Security (RLS)**: Activado. Jerarquía dependiente del Request original o con nivel de administrador.

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `uuid` | PK | Identificador natural del expediente documental del pago. |
| **`supplier_payment_request_id`**| `uuid` | FK | Relacionado a la petición de orden de giro Swift `supplier_payment_requests.id`. |
| **`customs_document_type`**| `text` | | Clasifica qué representa la imagen: `COMMERCIAL_INVOICE`, `PROFORMA`, `BILL_OF_LADING` (Guía marítima). |
| **`filename`** | `text` | | Nombre del fichero subido originariamente. |
| **`mime`**, **`size`** | Varios | | Extensiones y capacidad en KB. |
| **`status`** | `text` | Check Rule | Constreñido bajo: `PENDING_REVIEW` (Esperando), `APPROVED`, `REJECTED`. El staff lee la factura para validarla antes de cursar un desembolso, previniendo facturas ficticias. |
| **`admin_notes`** | `text` | Nullable | Archivo de queja (ej. "La factura subida no cuadra con el nombre del banco beneficiario."). |
| **`created_at`** / **`updated_at`** | `timestamptz` | Default `now()`| Timestamps de registro de la base. |

---

## 🔗 Relaciones (Foreign Keys)
- Depende verticalmente de la tabla **`supplier_payment_requests`**.
- Sus versiones y archivos byte a byte son gestionadas por los enlaces de **`supplier_payment_document_versions`**.

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "spdoc_9Kx1jL",
  "supplier_payment_request_id": "spr_Px92K10j",
  "customs_document_type": "PROFORMA",
  "filename": "factura_proforma_shenzhen.pdf",
  "mime": "application/pdf",
  "size": 529012,
  "status": "APPROVED",
  "admin_notes": "Importes, incoterms y cuentas puente coincidentes con la orden.",
  "created_at": "2024-03-24T18:00:00Z",
  "updated_at": "2024-03-24T19:00:00Z"
}
```
