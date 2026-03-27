# Tabla: `public.platform_settings`

## 📝 Descripción
Sirve como el almacén de configuración Global (Singleton/Tenant único) de las reglas de variables económicas macro de Guira. Funciona para cambiar comisiones paramétricas sin desplegar y editar hardcodes de repositorios de software, permitiendo al SuperAdministrador modificar porcentajes.

**Row Level Security (RLS)**: Activado. Su contenido es sensible económicamente, y solo debe ser expuesto y manipulado a nivel Sistema/Admin.

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`id`** | `text` | PK, Check Rule | Identidad única. Solo se permite matemáticamente registrar con valor: `global`, forzando el patrón Singleton en la Base de PostgreSQL. |
| **`liquidation_developer_fee_percent`**| `numeric` | Default `0.20` | Comisión o 'Fee' cobrado a la hora de hacer drenajes y liquidaciones. Se sitúa en un 0.20% originariamente. |
| **`updated_at`** | `timestamptz` | Default `now()` | Historiador de última recalibración macro. |

---

## 🔗 Relaciones (Foreign Keys)
- Sin dependencias, es el estrato base configurativo supremo de comisiones del "Business Service".

---

## 📄 Ejemplo JSON de Uso

```json
{
  "id": "global",
  "liquidation_developer_fee_percent": 0.25,
  "updated_at": "2024-03-24T10:00:00Z"
}
```
