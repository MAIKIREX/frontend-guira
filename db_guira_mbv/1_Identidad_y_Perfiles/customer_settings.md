# Tabla: `public.customer_settings`

## 📝 Descripción
Tabla anexa al modelo de Identidad Individual (`user_profiles`). Resuelve el desafío de las Reglas Unitarias y Tarifas Diferenciadas ("Custom Pricing / Dynamic Fees"). Permite sobreescribir los valores macroeconómicos vistos en la tabla global (`platform_settings`), adjudicándole al cliente un beneficio, una exoneración, o márgenes adaptativos si su volumen transaccional es corporativo elevado.

**Row Level Security (RLS)**: Activado. Limitado hacia su cliente portador. 

---

## 🏗️ Columnas de la Tabla

| Columna | Tipo de Dato | Opciones | Descripción Detallada |
| :--- | :--- | :--- | :--- |
| **`user_id`** | `uuid` | PK, FK | Actúa como llave primaria y puente uno a uno directo hacia la principal identidad transaccional en `user_profiles.id`. |
| **`payment_route_developer_fee_percent`**| `numeric` | Check Rule | Tarifa unitaria cobrada para utilizar las rutas de depósito pagaderas a un destino orquestado. Cuenta con un constreñidor matemático de que el `Fee >= 0` AND `< 100` (De 0 a menos de 100%). |
| **`created_at`** / **`updated_at`** | `timestamptz` | Default `now()`| Generación de la bitácora relacional unitaria y tracking de negociación comercial de cuentas. |

---

## 🔗 Relaciones (Foreign Keys)
- Uniones rígidas como PK a la tabla **`public.user_profiles.id`** del cliente. 

---

## 📄 Ejemplo JSON de Uso

```json
{
  "user_id": "e30129bc-dbcf-4f51-b844-cb8cb1a03e91",
  "payment_route_developer_fee_percent": 0.15,
  "created_at": "2024-03-24T18:00:00Z",
  "updated_at": "2024-03-24T18:00:00Z"
}
```
