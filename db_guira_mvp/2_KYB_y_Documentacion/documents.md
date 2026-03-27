# Tabla: `public.documents`

## Función de la Tabla
La tabla `documents` gestiona un registro logístico centralizado de todo tipo de activos documentales y binarios adjuntados en la plataforma. Ya sean identificadores para cumplimiento de regulaciones AML y procesos KYC institucionales subidos durante perfiles de empresas, o recibos, órdenes, extractos y contratos legales atados a usuarios específicos, la tabla asegura un rastreo absoluto de cada pieza y un enlace indirecto al archivo (o metadata del archivo) subyacente alojado en Storage.

## Columnas

| Nombre | Tipo de Dato | Opciones / Restricciones | Valor por Defecto | Descripción Breve |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` (PK) | updatable | `gen_random_uuid()` | CUID primario identificativo para el documento en sí. |
| `user_id` | `uuid` | nullable, updatable | - | Dueño fundamental de la posesión visual del archivo (Protección RLS estricta contra `profiles`). |
| `onboarding_id` | `uuid` | nullable, updatable | - | FK Polimórfica (Opcional): Si este Doc nació adjunto a un proceso `onboarding`. |
| `payment_order_id` | `uuid` | nullable, updatable | - | FK Polimórfica (Opcional): Si este Doc es probatorio aduanero y pertenece estrictamente a una transacción financiera `payment_orders`. |
| `doc_type` | `text` | updatable | - | Categoría fuerte encriptada del adjunto para agilizar las inferencias (ej., `passport_front`, `invoice`, `utility_bill`). |
| `storage_path` | `text` | updatable | - | Ubicación exacta de la ruta URI (supabase storage key / S3 key) donde el objeto binario existe de forma privada. |
| `mime_type` | `text` | nullable, updatable | - | MIME (ej., `application/pdf`, `image/jpeg`). |
| `file_size` | `bigint` | nullable, updatable | - | Tamaño registrado en bytes del activo. |
| `metadata` | `jsonb` | nullable, updatable | `'{}` | JSON auxiliar para notas logísticas sobre qué parte cubría el documento, firmas del equipo o fechas expiratorias. |
| `created_at` | `timestamptz` | nullable, updatable | `now()` | - |

*Nota: Cuenta con RLS (Row Level Security).*

## Relaciones
Es el ancla receptiva (N:1) de referencias a tres pilares del esquema:
- **KYC/KYB:** Lligadura a `onboarding`.
- **Fondos e Historia Económica:** Lligadura probatoria explícita y directa a `payment_orders`.
- **Individuo Soberano:** Lligadura nativa a `profiles` (`user_id`).

## Ejemplo de Uso (JSON)

\`\`\`json
{
  "id": "d0c111ea-e89b-12d3-a456-426614174000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "onboarding_id": "111e4567-e89b-12d3-a456-426614174000",
  "payment_order_id": null,
  "doc_type": "national_id_front",
  "storage_path": "user_123e/kyc/national_id_front_171221.jpg",
  "mime_type": "image/jpeg",
  "file_size": 2500000,
  "metadata": {},
  "created_at": "2026-03-26T17:15:00Z"
}
\`\`\`
