# Vision General del Proyecto

## Que es Guira

Guira es una plataforma de orquestacion operativa para flujos financieros. No se presenta como banco ni como custodio de fondos. El frontend organiza solicitudes, validaciones, estados, documentos y seguimiento de operaciones que finalmente se apoyan en rieles externos.

## Idea funcional del producto

El producto tiene tres dominios principales:

- alta y verificacion de clientes,
- gestion de operaciones financieras,
- supervision y ejecucion por parte del equipo interno.

El cliente no entra directo a operar. Primero debe:

1. autenticarse,
2. tener un `profile`,
3. completar onboarding,
4. quedar validado por staff,
5. recien entonces acceder al panel operativo.

## Principio operativo mas importante

Toda operacion sensible se documenta antes de ejecutarse. La plataforma crea registros, recopila evidencias y mueve estados. El frontend actual refleja esta regla con mucha claridad:

- primero existe el registro en base de datos,
- luego se muestran instrucciones al usuario,
- luego el usuario sube respaldo,
- luego staff valida,
- luego staff ejecuta y cierra.

## Modulos funcionales

- `AuthPage`: login, signup, recovery y actualizacion de password.
- `OnboardingFlow`: KYC/KYB por pasos con persistencia de borrador.
- `WalletDashboard`: resumen del cliente, operaciones activas e historico.
- `PaymentsPanel`: inicio y seguimiento de pagos/expedientes.
- `ActivityLog`: actividad del usuario y auditoria operativa.
- `SupportPage`: tickets de soporte y FAQ.
- `StaffPanel`: validacion, operaciones, soporte, configuracion y usuarios.
- `NotificationBell`: notificaciones en tiempo real con realtime de Supabase.

## Modelo mental correcto para rehacer el frontend

Al recrear la app, no conviene pensarla como "pantallas independientes". Conviene pensarla como maquina de estados por dominio:

- autenticacion,
- onboarding,
- operacion,
- validacion interna,
- cierre y trazabilidad.

El frontend nuevo debe mostrar u ocultar vistas segun:

- `session`,
- `profiles.role`,
- `profiles.onboarding_status`,
- `profiles.is_archived`.

## Dependencias de backend detectadas

El frontend actual depende de:

- Supabase Auth,
- tablas relacionales en `public`,
- buckets de Storage,
- Edge Functions administrativas,
- un RPC para verificar existencia de usuario,
- una Edge Function de login por proxy.

La reimplementacion debe asumir que esos contratos ya existen y que hay que consumirlos sin redisenarlos.
