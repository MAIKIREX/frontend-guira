# Tabla: `public.review_comments`

## 📝 Descripción
Esta tabla guarda los comentarios, discusiones internas y mensajes de retroalimentación en un proceso de revisión (`reviews`). Sirve como un canal de comunicación asíncrono, ya sea para que el Compliance Officer deje anotaciones, o para justificar formalmente al usuario por qué se requieren cambios (`requested_changes = true`) en caso de devoluciones.

**Row Level Security (RLS)**: Activado. Los administradores pueden gestionar todos los comentarios. El usuario que lo crea (Reviewer/Staff) puede insertar sus propios registros.

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `text` | PK | Identificador único del comentario. |
| **`review_id`** | `text` | FK | Referencia a la tabla `reviews.id`, asociando el comentario a una iteración de evaluación concreta. |
| **`author_id`** | `uuid` | FK | Referencia al usuario (STAFF/ADMIN) que escribió el comentario (`user_profiles.id`). |
| **`body`** | `text` | | Contenido descriptivo del comentario. (Ej. "Falta subir lado trasero del documento"). |
| **`requested_changes`**| `boolean` | Default: `false` | Bandera que indica si este comentario actúa como un requerimiento formal, obligando al cliente a enmendar datos y reenviar la revisión. |
| **`affected_paths`** | `text[]` | Default: `{}` | Arreglo de cadenas, útil para referenciar qué campos exactos fallaron de manera programática para destacar el error en el frontend. (Ej. `["contact.address.city", "ubo.last_name"]`). |
| **`created_at`** / **`updated_at`** | `timestamptz` | Default `now()` | Fechas de creación y actualización del comentario. |
| **`resubmitted_for_review_at`**| `timestamptz` | Nullable | Si el usuario emite una corrección y vuelve a enviar, aquí se marca el momento de resubmisión de esta queja. |
| **`resolved_at`** | `timestamptz` | Nullable | Cuando el evaluador considera que el comentario o queja ya está subsanado. |

---

## 🔗 Relaciones (Foreign Keys)
- **`review_id`**: Referencia obligatoria a `public.reviews.id`.
- **`author_id`**: El miembro del staff o administrador que emitió la valoración en `public.user_profiles.id`.

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "cmnt_9xZ0oLr",
  "review_id": "rev_9k2Ls1P3",
  "author_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "body": "El documento adjunto de constitución está ilegible en la página 2. Por favor adjuntar un escaneo en mayor resolución.",
  "requested_changes": true,
  "affected_paths": ["documents.registration", "documents.business_id_front"],
  "created_at": "2024-03-24T19:15:00Z",
  "updated_at": "2024-03-24T19:15:00Z",
  "resubmitted_for_review_at": null,
  "resolved_at": null
}
```
