# Tabla: `public.audit_logs`

## 📝 Descripción
Tabla fundamental de seguridad y regulación forense de la plataforma. Como parte del cumplimiento normativo (Compliance y Seguridad Financiera), cada cambio de estado, modificación de saldo o creación de una orden crítica en Guira requiere registrar el "Quién, Cuándo y Qué" fue alterado (`user`, `timestamp`, `diff`). Su objetivo no es orquestar lógica ni interfaces con los clientes y nadie tiene permisos de modificación sobre la misma; estrictamente de "Append-Only" y consulta en modo Read-Only de Administradores.

**Row Level Security (RLS)**: Activado. Limitado hacia los oficiales de `ADMIN` para acceso solo lectura en interfaz. No hay permisos para eliminar campos (Protección `DELETE = false`).

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `text` | PK | Identidad única. Las filas son insertadas usualmente mediante `Triggers` genéricos de motor de PostgreSql adjuntos a cada tabla auditada. |
| **`action`** | `audit_action` | Enum | Categoriza el evento en su naturaleza CRUD y de sistema: `CREATE`, `UPDATE`, `DELETE`, `STATE_CHANGE`, `WEBHOOK_PROCESS`, `LOGIN`. |
| **`actor_user_id`** | `uuid` | FK, Nullable | Clave apuntando al `user_profiles.id` del perpetrador. Si es `NULL` indica que fue alterado por un `cronjob`, `webhook` robótico o el backend (ServiceRole). |
| **`table_name`** | `text` | | La tabla destino impactada por este cambio (ej. `kyc_applications`, o `balances`). |
| **`record_id`** | `text` | | Referencia explícita en formato texto hacia un PK de la tabla listada en el campo previo. (Como es polimórfico y desnormalizado, usar `text` es más seguro frente a UUID constraints en tabla). |
| **`diff`** | `jsonb` | Nullable | Un historial fotográfico (Before/After) exacto de las celdas mutadas, muy valioso. Registra los cambios de balance o cambio a la alza en saldos (`{"old": {"amount": 0}, "new": {"amount": 1000}}`). |
| **`ip`** / **`ua`** | `text` | Nullable | Georreferenciamiento o metadata del protocolo HTTP (IP Address, User Agent Browser) de origen del cambio. |
| **`created_at`** | `timestamptz` | Default `now()`| Reloj milisegundo absoluto de la alteración ocurrida. Esta tabla carece deliberadamente de `updated_at`. |

---

## 🔗 Relaciones (Foreign Keys)
- La única trazabilidad fuerte por base de datos que maneja es el responsable de ejecutar, asociado bajo llave hacia **`user_profiles.id`**.

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "aud_0b9Z1xC",
  "action": "UPDATE",
  "actor_user_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "table_name": "reviews",
  "record_id": "rev_9k2Ls1P3",
  "diff": {
    "decision": {
      "old": "NONE",
      "new": "APPROVE"
    },
    "decided_by_id": {
      "old": null,
      "new": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
    }
  },
  "ip": "200.87.16.51",
  "ua": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
  "created_at": "2024-03-24T20:15:00Z"
}
```
