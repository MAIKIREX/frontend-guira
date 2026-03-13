# Documentacion Base para Recrear Guira

Esta carpeta resume el funcionamiento real del proyecto actual con foco en reconstruir el frontend en Next.js sin modificar el backend existente en Supabase.

## Objetivo

Estos archivos deben servir como contexto operativo para una futura reimplementacion del frontend. La prioridad no es copiar la arquitectura actual de React + Vite, sino preservar:

- el comportamiento de cliente, staff y admin,
- los flujos de onboarding y validacion,
- la logica de pagos y expedientes,
- la relacion exacta entre frontend y backend,
- los estados, tablas, uploads y transiciones que el frontend ya utiliza.

## Archivos

- `01-vision-general.md`: que es la plataforma y cuales son sus principios operativos.
- `02-roles-y-navegacion.md`: secciones y comportamiento por rol.
- `03-onboarding-y-validacion.md`: flujo KYC/KYB, documentos, borradores y aprobacion.
- `04-operaciones-y-pagos.md`: wallet, expedientes, pagos, proveedores y estados.
- `05-staff-admin-y-soporte.md`: panel interno, soporte, auditoria y gestion de usuarios.
- `06-contratos-backend-supabase.md`: tablas, buckets, edge functions, RPCs y payloads.
- `07-guia-nextjs-frontend.md`: traduccion funcional del producto actual a un frontend nuevo en Next.js.

## Advertencias importantes

- El backend no debe alterarse. La reimplementacion debe adaptarse a las tablas, buckets y funciones ya existentes.
- En este repositorio aparecen llamadas a backend que no estan incluidas localmente:
  - edge function `login-proxy`
  - RPC `check_user_exists`
- Esas piezas deben considerarse parte del backend vigente aunque no esten versionadas aqui.
- La app actual asume que `profiles` existe para cada usuario autenticado y que controla el rol y el estado de onboarding.

## Reglas de reconstruccion

- Mantener la logica de `Order First`: primero se crea `payment_orders`, luego se muestran instrucciones y luego se suben evidencias.
- Mantener la sincronizacion entre `onboarding.status` y `profiles.onboarding_status`.
- Mantener la separacion de responsabilidades:
  - cliente inicia y alimenta procesos,
  - staff valida y ejecuta,
  - admin configura y gestiona usuarios.
- Mantener la trazabilidad:
  - `activity_logs`,
  - `audit_logs`,
  - `notifications`,
  - evidencias en storage.
