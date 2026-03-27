# Tabla: `public.supplier_payment_document_versions`

## 📝 Descripción
Misma lógica estructural que `document_versions` en los procesos de KYC. Si un cliente adjuntó una Proforma Invoice arruinada en `supplier_payment_documents`, este modelo versionado permite que el cliente resuba una vez el analista deniega (`REJECTED`) el primer intento, evitando duplicar IDs core dependientes y protegiendo el árbol del expediente en Supabase Storage.

**Row Level Security (RLS)**: Activado. Jerarquía dependiente del doc original o con nivel admin.

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `uuid` | PK | Identidad única alfanumérica del parche. |
| **`supplier_payment_document_id`**| `uuid` | FK | Relacionado en parentesco hacia la definición abstracta de doc `supplier_payment_documents.id`. |
| **`version`** | `integer` | | Valor que incrementa en iteraciones (`1`, `2`). |
| **`storage_uri`** | `text` | | Fichaje físico real apuntando a Supabase Pouch (Ej. `invoices/abc-897-fgi_v2.pdf`). |
| **`mime`**, **`size`** | Varios | | Extensiones y capacidad temporal. |
| **`uploaded_by`** | `uuid` | FK, Nullable | Rastreador enlazado a `user_profiles.id` indicando quién fue el usuario autenticado que ejecutó este parcheo de información. |
| **`created_at`** | `timestamptz` | Default `now()`| Timestamp inmutable del suceso. |

---

## 🔗 Relaciones (Foreign Keys)
- Destino foráneo al padre en **`supplier_payment_documents.id`** y trazabilidad sobre persona en **`user_profiles.id`**.

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "spv_3pL1zO9",
  "supplier_payment_document_id": "spdoc_9Kx1jL",
  "version": 2,
  "storage_uri": "supplier_docs/a1b2c3d4/factura_proforma_shenzhen_corregida.pdf",
  "mime": "application/pdf",
  "size": 612030,
  "uploaded_by": "e30129bc-dbcf-4f51-b844-cb8cb1a03e91",
  "created_at": "2024-03-24T20:30:00Z"
}
```
