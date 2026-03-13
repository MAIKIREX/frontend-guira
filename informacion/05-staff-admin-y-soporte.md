# Staff, Admin, Soporte y Trazabilidad

## StaffPanel

El panel interno concentra la mayor parte de la operacion administrativa. Sus tabs detectados son:

- `onboarding`
- `payins`
- `transfers`
- `orders`
- `config`
- `psav`
- `users`
- `support`

## Consultas por tab

- `onboarding` -> `onboarding` con join a `profiles`
- `payins` -> `payin_routes`
- `transfers` -> `bridge_transfers`
- `orders` -> `payment_orders`
- `users` -> `profiles`
- `support` -> `support_tickets`
- `config` -> `fees_config` y `app_settings`
- `psav` -> `psav_configs`

## Cambio de estados

El metodo central de staff hace:

1. obtiene usuario autenticado,
2. registra auditoria si hay motivo,
3. fusiona metadata con `rejection_reason` cuando aplica,
4. actualiza el registro con optimistic lock usando `updated_at`,
5. ejecuta efectos colaterales segun la tabla,
6. crea notificacion al usuario.

## Efectos colaterales importantes

### Cuando cambia `onboarding`

- sincroniza `profiles.onboarding_status`,
- puede actualizar `profiles.full_name`,
- puede actualizar `profiles.metadata`,
- si pasa a `verified`, crea `wallet` si no existe.

### Cuando cambia `bridge_transfers` a `completed`

- localiza la `wallet`,
- crea `ledger_entries`,
- define `type` como `deposit` o `payout`,
- deja descripcion y metadata.

### Cuando cambia cualquier flujo relevante

- crea una notificacion en `notifications`.

## Soporte

### Cliente

El cliente puede:

- crear ticket,
- listar sus tickets,
- ver estado de atencion.

Payload detectado para `support_tickets`:

- `user_id`
- `subject`
- `message`
- `contact_email`
- `contact_phone`

Estados de tickets visibles:

- `open`
- `in_progress`
- `resolved`
- `closed`

### Staff

Desde administracion, staff puede mover el estado del ticket usando el mismo sistema de cambios de estado.

## Notificaciones

Las notificaciones se guardan en `notifications` y la campana:

- lee las ultimas 20,
- cuenta `is_read = false`,
- escucha inserts con realtime,
- puede marcar una o todas como leidas.

Payload para crear notificacion:

- `user_id`
- `type`
- `title`
- `message`
- `link`

Tipos detectados:

- `status_change`
- `onboarding_update`
- `new_order`
- `support_update`
- `system`

## Actividad y auditoria

### `activity_logs`

Se usa para acciones del usuario:

- login,
- signup,
- guardar borrador,
- enviar onboarding,
- iniciar pagos,
- crear tickets.

Payload:

- `user_id`
- `action`
- `metadata`

### `audit_logs`

Se usa para acciones del equipo interno con nivel de trazabilidad mas fuerte.

Campos detectados:

- `performed_by`
- `role`
- `action`
- `table_name`
- `record_id`
- `affected_fields`
- `previous_values`
- `new_values`
- `reason`
- `source`

Regla importante:

- si la accion no es `create`, el motivo es obligatorio y debe ser descriptivo.

## Gestion de usuarios

### Crear usuario

El frontend invoca edge function `admin-create-user` con:

- `email`
- `password`
- `full_name`
- `role`

### Archivar o eliminar usuario

Se usa `admin-delete-user`.

Payload:

- `userId`
- `action`

Comportamiento:

- si tiene historial financiero, no se permite hard delete,
- el flujo por defecto es archivar,
- al archivar se pone `profiles.is_archived = true`,
- tambien se banea en Auth,
- solo si no tiene historial y se pide `delete`, se elimina definitivamente.

### Desarchivar usuario

Se usa `admin-unarchive-user` con:

- `userId`

### Reset de password

Se usa `admin-reset-password` con:

- `email`

## Configuracion interna

### `fees_config`

Tipos detectados:

- `route_creation`
- `supplier_payment`

### `app_settings`

Se detecta especialmente:

- `bolivia_exchange_rate`

### `psav_configs`

Se usan para configurar rieles o proveedores PSAV activos.
