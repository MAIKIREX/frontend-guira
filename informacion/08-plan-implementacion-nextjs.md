# Plan de Implementacion en Next.js

## Objetivo

Construir un nuevo frontend en Next.js que replique el comportamiento funcional de Guira sin alterar el backend actual en Supabase.

El plan prioriza:

- mantener contratos de datos,
- reducir riesgo de regresiones,
- construir primero las bases compartidas,
- dejar staff/admin para una segunda mitad del proyecto,
- validar cada fase contra el backend real.

## Principios de implementacion

- No redisenar tablas ni edge functions.
- No cambiar nombres de estados operativos.
- No asumir nuevos endpoints intermedios si no son necesarios.
- Mover primero autenticacion y control de acceso.
- Implementar primero lectura y despues escritura en dominios sensibles.
- Tratar `payment_orders` como expediente central.

## Stack confirmado

Para esta migracion la documentacion ya queda alineada a este stack:

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod
- Zustand
- Supabase JS client
- Lucide React
- jsPDF

Librerias adicionales recomendadas:

- `@hookform/resolvers`
- `sonner`
- `date-fns`
- `next-themes`

Regla de implementacion:

- Server Components solo para bootstrap o lectura controlada.
- Client Components para auth interactiva, formularios, uploads, realtime y tablas operativas.

## Estructura sugerida

```txt
app/
  (public)/
  (client)/
  (staff)/
components/
  ui/
features/
services/
stores/
lib/
  supabase/
types/
```

## Fase 0. Preparacion

### Objetivo

Dejar lista la base del proyecto antes de tocar logica de negocio.

### Tareas

- Crear proyecto Next.js con TypeScript.
- Configurar variables de entorno para Supabase.
- Definir cliente Supabase para browser.
- Definir cliente auxiliar para server si se necesita bootstrap.
- Crear tipos base de dominio:
  - `Profile`
  - `Onboarding`
  - `PaymentOrder`
  - `Supplier`
  - `Notification`
  - `SupportTicket`
- Crear layout base y sistema de rutas.
- Crear proveedor global de sesion/perfil.

### Criterio de salida

- La app levanta.
- Se puede leer la sesion.
- Se puede cargar `profiles` del usuario autenticado.

## Fase 1. Auth y control de acceso

### Objetivo

Replicar exactamente las reglas de entrada actuales.

### Tareas

- Implementar login usando `login-proxy`.
- Implementar signup con reglas actuales:
  - aceptar terminos,
  - password minimo de 12 caracteres,
  - al menos un numero,
  - al menos un caracter especial.
- Implementar recovery usando RPC `check_user_exists` y `resetPasswordForEmail`.
- Implementar update password.
- Implementar login con Google.
- Implementar `signOut`.
- Cargar `profile` despues de autenticar.
- Aplicar reglas:
  - sin sesion -> pantalla auth,
  - perfil archivado -> salida forzada,
  - cliente no verificado -> onboarding,
  - staff/admin -> acceso a panel interno.

### Criterio de salida

- Un usuario puede entrar y salir.
- La app enruta segun rol y estado de onboarding.

## Fase 2. Shell de aplicacion y navegacion

### Objetivo

Construir el contenedor principal donde viviran los modulos.

### Tareas

- Crear sidebar por rol.
- Crear header responsive.
- Agregar cambio de tema si quieres conservarlo.
- Integrar campana de notificaciones en layout.
- Crear placeholders funcionales para:
  - panel cliente,
  - pagos,
  - actividad,
  - soporte,
  - administracion.

### Criterio de salida

- Toda la navegacion principal existe y respeta permisos.

## Fase 3. Onboarding

### Objetivo

Implementar el flujo KYC/KYB completo antes de habilitar operaciones.

### Tareas

- Crear wizard por pasos.
- Implementar seleccion de tipo:
  - persona,
  - empresa.
- Implementar persistencia local:
  - step,
  - type,
  - onboarding id,
  - formData.
- Implementar lectura del onboarding existente.
- Implementar lectura de `documents`.
- Implementar guardado de borrador.
- Implementar uploads inmediatos a `onboarding_docs`.
- Implementar `upsert` en `documents`.
- Implementar envio final con `status = submitted`.
- Implementar envio de docs UBO con `status = under_review`.
- Implementar estado `needs_changes`.

### Validaciones minimas

- campos requeridos por paso,
- trim de textos,
- fechas validas,
- tipos de archivo,
- manejo diferenciado para empresa y persona.

### Criterio de salida

- Un cliente nuevo puede completar onboarding y dejarlo listo para revision.

## Fase 4. Notificaciones y actividad

### Objetivo

Agregar trazabilidad base antes de construir operaciones completas.

### Tareas

- Implementar listado de `notifications`.
- Implementar unread count.
- Implementar realtime de Supabase.
- Implementar marcar una y todas como leidas.
- Implementar vista de `activity_logs`.
- Si el usuario es staff/admin, mezclar con `audit_logs`.

### Criterio de salida

- El usuario ve actividad y notificaciones como en la app actual.

## Fase 5. Soporte

### Objetivo

Cubrir un flujo sencillo pero operativo y transversal.

### Tareas

- Crear formulario de ticket.
- Guardar en `support_tickets`.
- Listar tickets propios.
- Mostrar estados.
- Registrar actividad `create_ticket`.

### Criterio de salida

- Cliente puede crear y consultar tickets.

## Fase 6. Wallet y dashboard cliente

### Objetivo

Construir el panel principal del cliente.

### Tareas

- Leer `wallets`.
- Leer `ledger_entries`.
- Calcular balance derivado.
- Leer `bridge_transfers` pendientes.
- Leer `payment_orders`.
- Mostrar transferencias activas.
- Mostrar historico.
- Mostrar accesos rapidos:
  - enviar pago,
  - agregar fondos.

### Riesgo importante

No persistir balance calculado en frontend ni asumir que existe un campo `balance` confiable en backend.

### Criterio de salida

- Cliente puede ver el mismo resumen operativo que hoy.

## Fase 7. Modulo de pagos y expedientes

### Objetivo

Recrear el corazon operativo de cliente.

### Tareas

- Listar historial mezclando `bridge_transfers` y `payment_orders`.
- Leer `fees_config`.
- Leer `app_settings`.
- Leer `psav_configs`.
- Leer y gestionar `suppliers`.
- Implementar creacion de orden con `payment_orders`.
- Implementar metadata por ruta.
- Implementar upload de `support_document_url`.
- Implementar upload de `evidence_url`.
- Implementar cancelacion por cliente.
- Implementar descarga de PDF.

### Orden recomendado

1. CRUD de `suppliers`
2. Creacion de `payment_orders`
3. Upload de evidencias
4. Historial y estados
5. PDF

### Criterio de salida

- Cliente puede iniciar y seguir operaciones de forma completa.

## Fase 8. Staff panel de solo lectura

### Objetivo

Entrar al dominio interno de forma segura, primero leyendo.

### Tareas

- Crear tabs del panel.
- Implementar consultas por tab:
  - onboarding,
  - payins,
  - transfers,
  - orders,
  - users,
  - support,
  - config,
  - psav.
- Mostrar detalle de cada item.
- Mostrar documentos y evidencias.

### Criterio de salida

- Staff puede revisar todo el estado operativo sin editar.

## Fase 9. Staff panel con acciones

### Objetivo

Habilitar ejecucion operativa real.

### Tareas

- Implementar cambios de estado con motivo cuando corresponda.
- Implementar optimistic lock con `updated_at`.
- Implementar flujo de onboarding:
  - verified,
  - rejected,
  - needs_changes.
- Implementar flujo de `payment_orders`:
  - deposit_received,
  - processing,
  - sent,
  - completed,
  - failed.
- Implementar carga de comprobante final de staff.
- Implementar compartir documentos al cliente.
- Implementar flujo de `support_tickets`.
- Implementar insercion de `ledger_entries` al completar `bridge_transfers`.
- Implementar notificaciones al usuario.
- Implementar auditoria en `audit_logs`.

### Criterio de salida

- Staff puede operar el negocio desde el nuevo frontend.

## Fase 10. Admin y configuracion

### Objetivo

Completar las capacidades de administracion.

### Tareas

- Crear usuario con `admin-create-user`.
- Archivar o eliminar usuario con `admin-delete-user`.
- Desarchivar con `admin-unarchive-user`.
- Resetear password con `admin-reset-password`.
- Editar `fees_config`.
- Editar `app_settings`.
- Gestionar `psav_configs`.

### Criterio de salida

- Admin recupera todo lo que hoy hace el panel actual.

## Fase 11. Endurecimiento y validacion final

### Objetivo

Cerrar la migracion con seguridad operativa.

### Tareas

- Revisar errores y estados vacios.
- Probar rutas protegidas.
- Probar uploads grandes y tipos invalidos.
- Probar usuarios archivados.
- Probar sesion expirada.
- Probar concurrencia basica con `updated_at`.
- Verificar que los mismos cambios se reflejen correctamente en Supabase.

### Checklist de validacion funcional

- Signup y login funcionan.
- Recovery funciona.
- Cliente no verificado cae en onboarding.
- Staff puede verificar onboarding.
- Se crea wallet al verificar.
- Cliente puede crear proveedor.
- Cliente puede crear `payment_order`.
- Cliente puede subir comprobante.
- Staff puede mover el expediente hasta `completed`.
- Se genera PDF.
- Soporte funciona.
- Notificaciones funcionan.
- Auditoria funciona.

## Orden de construccion recomendado si quieres velocidad

1. Fase 0
2. Fase 1
3. Fase 2
4. Fase 3
5. Fase 7
6. Fase 6
7. Fase 4
8. Fase 5
9. Fase 8
10. Fase 9
11. Fase 10
12. Fase 11

## Orden de construccion recomendado si quieres reducir riesgo

1. Fase 0
2. Fase 1
3. Fase 2
4. Fase 3
5. Fase 4
6. Fase 5
7. Fase 6
8. Fase 7
9. Fase 8
10. Fase 9
11. Fase 10
12. Fase 11

## Entregables sugeridos por hito

### Hito 1

- auth
- profile
- layouts
- guardas

### Hito 2

- onboarding completo
- notificaciones
- actividad
- soporte

### Hito 3

- wallet
- proveedores
- pagos cliente

### Hito 4

- panel staff lectura
- panel staff acciones

### Hito 5

- admin
- configuracion
- estabilizacion

## Recomendacion final

Si luego quieres que Codex te reconstruya la aplicacion, lo ideal es hacerlo por hitos y no en un solo paso. La razon es simple:

- el modulo de onboarding ya es grande,
- pagos y staff comparten estados sensibles,
- una reconstruccion completa en una sola iteracion sube mucho el riesgo de romper contratos con Supabase.

La mejor estrategia es:

1. levantar base y auth,
2. hacer onboarding,
3. hacer cliente,
4. hacer staff/admin,
5. endurecer.
