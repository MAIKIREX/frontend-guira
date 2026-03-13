# Guia para Recrear el Frontend en Next.js

## Objetivo de esta migracion

Rehacer el frontend con Next.js manteniendo:

- el mismo backend en Supabase,
- la misma idea de negocio,
- los mismos estados,
- los mismos contratos de datos,
- las mismas responsabilidades por rol.

## Stack confirmado para esta migracion

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod
- Zustand
- Supabase JS
- Lucide React

Librerias adicionales recomendadas:

- `jspdf` para generacion de comprobantes PDF
- `@hookform/resolvers` para integrar Zod con React Hook Form
- `sonner` o equivalente para toasts
- `date-fns` para manejo consistente de fechas
- `next-themes` si quieres conservar modo claro/oscuro
- `@tanstack/react-query` si luego quieres cachear lecturas complejas, aunque no es obligatorio

## Lo que no debe cambiar

- nombres de tablas y columnas usados por el frontend,
- buckets y rutas de upload,
- edge functions administrativas,
- RPC `check_user_exists`,
- edge function `login-proxy`,
- reglas de negocio basadas en estado.

## Pantallas que el nuevo frontend debe tener

### Acceso

- login
- registro
- recuperacion de password
- actualizacion de password por recovery token

### Cliente

- panel principal
- pagos y expedientes
- historial
- soporte
- onboarding

### Staff/Admin

- dashboard de administracion
- revision de onboarding
- revision de transferencias y expedientes
- soporte
- configuracion
- usuarios
- PSAV configs

## Servicios recomendados

- `authService`
- `profileService`
- `onboardingService`
- `paymentsService`
- `walletService`
- `staffService`
- `supportService`
- `notificationService`

## Estructura base a tomar como punto de partida

Partiendo de una base como:

- `app/`
- `components/ui/`
- `lib/`

la evolucion recomendada es crecer hacia dominios y no dejar toda la logica dentro de `app/`.

La estructura objetivo debe tender a:

- `app/` para rutas, layouts y pantallas
- `components/` para UI compartida
- `features/` para modulos de negocio
- `lib/` para utilidades y cliente Supabase
- `services/` para contratos con backend
- `stores/` para Zustand
- `types/` para tipos de dominio

## Reglas de UI que vale la pena preservar

- bloquear operacion si el cliente no esta verificado,
- usar feedback de estado muy visible,
- mantener campana de notificaciones,
- mantener historial y trazabilidad,
- exponer el ID corto del expediente para soporte,
- permitir re-subida de comprobantes mientras la orden no se cierre.

## Riesgos a evitar en la recreacion

- asumir que el saldo es un campo fijo y no un calculo,
- saltarse `payment_orders` y mostrar instrucciones antes de crear expediente,
- dejar desincronizado `profiles.onboarding_status`,
- cambiar nombres de `metadata` que staff ya espera,
- ignorar optimistic locking basado en `updated_at`,
- perder el flujo de uploads a storage.

## Secuencia recomendada para construir la nueva app

1. Resolver autenticacion y carga de `profile`.
2. Implementar guardas por rol y onboarding.
3. Implementar onboarding completo con storage.
4. Implementar `payment_orders` y proveedores.
5. Implementar wallet e historial.
6. Implementar notificaciones y soporte.
7. Implementar `StaffPanel` modularizado.
8. Validar todos los cambios de estado contra Supabase.

## Criterio final de exito

La migracion sera correcta si un usuario puede:

- registrarse o entrar,
- completar onboarding,
- ser validado por staff,
- iniciar una operacion,
- subir evidencias,
- recibir cambios de estado,
- consultar historial y soporte,
- mientras staff puede procesar y cerrar el expediente sin tocar el backend actual.
