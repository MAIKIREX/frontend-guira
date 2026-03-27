# Tabla: `public.certificates`

## 📝 Descripción
Generador de comprobantes de inmutabilidad (Certificados o Recibos Criptográficos). Una de las normas pilares de la plataforma de "orquestación" es brindar paz mental al cliente y al regulador emitiendo un PDF y comprobante de que una transferencia se fraguó legalmente. Una vez una operación transita en `transactions` a estatus completado, el backend dispara la emisión de este registro, conteniendo los payloads inmutables verificables.

**Row Level Security (RLS)**: Activado. Exclusivo para el emisor/usuario dueño del objeto transaccional y visualización general para el Staff que da soporte.

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `uuid` | PK | UUID emitido por la plataforma a perpetuidad para verificar un documento. |
| **`user_id`** | `uuid` | FK | Cliente involucrado y referenciado hacia `user_profiles.id`. |
| **`transaction_id`**| `uuid` | FK, Unique | Traza exclusiva 1:1 indicando de qué Ledger se certificó este comprobante, en base a la celda en la principal tabla `transactions.id`. |
| **`payload`** | `jsonb` | | Información detallada insertada en crudo sobre todo el mapeo de cuenta a cuenta, montos exactos, fechas y partes (A, B y Bridge) del contrato. |
| **`payload_hash`** | `text` | | Hash MD5 o SHA256 derivado de la suma matemática del texto de string convertido en el `payload`. Demuestra inmutabilidad local. |
| **`signature`** | `text` | | Si correspondiese, firma secreta del emisor de la plataforma sobre el hash dando validez. Asegura no repudio. |
| **`qr_url`** | `text` | | Liga para que un ente analista escanée el PDF visual y sea mandado a un endpoint público donde se confirme la validez y metadata del PDF. |
| **`pdf_base64`** | `text` | | Cadena inmensa de texto con la pre-renderización cruda en formato Base 64 Bytearray del Documento. Facilita enviar como File a traves de Correos sin bajar de un S3 Bucket. |
| **`created_at`** | `timestamptz` | Default `now()`| Momento exacto de emisión inalterable del comprobante de culminación financiera. |

---

## 🔗 Relaciones (Foreign Keys)
- Destino de apuntamiento desde `user_id` a la tabla `public.user_profiles.id`.
- Amparador y referenciador principal y unívoco a **`public.transactions.id`**.

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "cert_1Pk9Z0M1",
  "user_id": "e30129bc-dbcf-4f51-b844-cb8cb1a03e91",
  "transaction_id": "tx_2lZjK8pQ",
  "payload": {
    "sender": "Juan Pérez",
    "receiver": "Amazon AWS",
    "amount": 1400.00,
    "tx_hash": "0x123abc...",
    "rail": "PSAV_TO_SWIFT"
  },
  "payload_hash": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "signature": "hmac_sha256_01xxxxxxxxx29910",
  "qr_url": "https://api.guirademo.com/v1/certificates/cert_1Pk9Z0M1/verify",
  "pdf_base64": "JVBERi0xLjQKJdPr6eEKMSAwIG9iaiAK...",
  "created_at": "2024-03-24T18:05:00Z"
}
```
