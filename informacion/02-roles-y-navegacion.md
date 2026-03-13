# Roles y Navegacion

## Regla global de acceso

El flujo base de la aplicacion depende de `AuthContext`:

- se obtiene la sesion activa desde Supabase Auth,
- se carga `profiles` por `user.id`,
- si no hay sesion se muestra `AuthPage`,
- si el perfil esta archivado se fuerza cierre de sesion,
- si el rol es `client` y `onboarding_status` no es `verified`, se fuerza `OnboardingFlow`.

## Roles soportados

### Cliente

Ve estas secciones:

- `Mi Panel` (`operations`)
- `Pagos` (`management`)
- `Historial` (`activity`)
- `Soporte` (`support`)

No puede entrar a administracion.

### Staff

Ve:

- `Historial`
- `Soporte`
- `Administracion`

Puede validar onboarding, procesar operaciones, revisar tickets y operar configuraciones visibles en staff panel.

### Admin

Ve lo mismo que staff pero ademas puede:

- crear usuarios,
- archivar o eliminar usuarios,
- desarchivar usuarios,
- resetear contrasenas,
- gestionar configuraciones mas sensibles.

## Navegacion funcional

La app usa rutas simples:

- `/operations`
- `/management`
- `/activity`
- `/support`
- `/staff`

El sidebar no es solamente UI. Sirve como selector de dominio operativo. La migracion a Next.js deberia mantener esta misma separacion, aunque cambien las rutas exactas.

## Reglas de renderizado por estado

### Caso 1. Usuario no autenticado

Se renderiza `AuthPage`.

### Caso 2. Usuario en recuperacion de password

Se conserva el flujo de `AuthPage` en modo update.

### Caso 3. Cliente no verificado

Se muestra el header basico y el `OnboardingFlow`.

### Caso 4. Perfil archivado

Se hace `signOut()` y se bloquea el uso de la app.

## Consideraciones para Next.js

- Conviene usar rutas por segmento:
  - `/panel`
  - `/pagos`
  - `/actividad`
  - `/soporte`
  - `/admin`
- La autorizacion debe hacerse tanto en cliente como en capa de layout o middleware de frontend.
- El estado de `profile` debe cargarse una sola vez y compartirse por contexto o store.
- El layout debe preservar:
  - menu lateral,
  - campana de notificaciones,
  - cambio de tema,
  - cierre de sesion.
