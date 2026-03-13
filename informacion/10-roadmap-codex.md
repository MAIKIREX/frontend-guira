# Roadmap para Construccion con Codex

## Objetivo

Este archivo define como pedirle a Codex que construya la app por etapas, usando la documentacion de `informacion/` como contexto base.

La idea es evitar pedir "recrea toda la app" en un solo paso. Eso seria lento, riesgoso y probablemente romperia contratos con Supabase.

## Estrategia correcta

Construir por hitos funcionales.

Cada pedido a Codex debe:

- citar los archivos de `informacion/`,
- pedir un objetivo acotado,
- exigir que no cambie el backend,
- pedir que reutilice el stack confirmado.

## Stack que Codex debe respetar

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod
- Zustand
- Supabase JS
- Lucide React
- jsPDF

## Contexto que debes mencionar en los prompts

Siempre conviene decir algo como:

- usar como fuente `informacion/README.md`
- usar como fuente `informacion/06-contratos-backend-supabase.md`
- respetar `informacion/09-arquitectura-minima-nextjs.md`
- construir por fases segun `informacion/08-plan-implementacion-nextjs.md`

## Hito 1. Base de proyecto

### Objetivo

Dejar lista la estructura y el esqueleto.

### Prompt sugerido

```txt
Revisa la carpeta informacion/ y toma como base README.md, 06-contratos-backend-supabase.md, 08-plan-implementacion-nextjs.md y 09-arquitectura-minima-nextjs.md.

Quiero que adaptes este proyecto Next.js a la arquitectura minima propuesta, usando mi stack:
shadcn, tailwind, react-hook-form, zod, zustand, lucide, supabase-js y jspdf.

No cambies el backend en Supabase. Solo organiza el frontend.

Implementa:
- estructura de carpetas base
- cliente Supabase para browser
- providers base
- stores minimos
- tipos iniciales
- layout principal

No construyas aun onboarding ni pagos. Solo deja el proyecto listo para escalar.
```

## Hito 2. Auth y profile

### Objetivo

Levantar acceso y guardas.

### Prompt sugerido

```txt
Usa la documentacion de informacion/ para implementar auth y carga de profile en el proyecto Next.js actual.

Respeta el backend existente en Supabase y el stack confirmado.

Implementa:
- login con login-proxy
- signup
- recovery con check_user_exists
- update password
- login con Google
- signOut
- carga de profiles
- guardas por rol, onboarding_status e is_archived

No construyas todavia pagos ni staff panel.
```

## Hito 3. Onboarding

### Objetivo

Completar el primer gran modulo del negocio.

### Prompt sugerido

```txt
Quiero que implementes el modulo de onboarding en Next.js usando la documentacion de informacion/.

Basate sobre todo en:
- 03-onboarding-y-validacion.md
- 06-contratos-backend-supabase.md
- 09-arquitectura-minima-nextjs.md

Usa React Hook Form + Zod para formularios.
Usa shadcn para UI.
No modifiques el backend.

Implementa:
- wizard por pasos
- modo persona y empresa
- persistencia local de borrador
- lectura del onboarding existente
- subida de documentos a onboarding_docs
- upsert en documents
- envio final
- manejo de needs_changes
```

## Hito 4. Notificaciones, actividad y soporte

### Objetivo

Cerrar modulos transversales antes de pagos.

### Prompt sugerido

```txt
Implementa en el proyecto Next.js los modulos de notificaciones, actividad y soporte usando la documentacion de informacion/.

Implementa:
- campana con realtime de notifications
- listado de activity_logs
- mezcla con audit_logs para staff/admin
- formulario de support_tickets
- listado de tickets del usuario

Respeta la arquitectura de 09-arquitectura-minima-nextjs.md.
```

## Hito 5. Wallet y dashboard cliente

### Objetivo

Construir el panel principal del cliente.

### Prompt sugerido

```txt
Implementa el dashboard del cliente en Next.js basandote en informacion/04-operaciones-y-pagos.md y informacion/06-contratos-backend-supabase.md.

Necesito:
- lectura de wallets
- calculo de balance desde ledger_entries
- lectura de bridge_transfers pendientes
- lectura de payment_orders
- listado de transferencias activas
- historico de movimientos

No inventes una tabla de balance. Calculalo como indica la documentacion.
```

## Hito 6. Pagos y proveedores

### Objetivo

Implementar el nucleo operativo del cliente.

### Prompt sugerido

```txt
Implementa el modulo de pagos y proveedores usando la documentacion de informacion/.

Usa:
- 04-operaciones-y-pagos.md
- 06-contratos-backend-supabase.md
- 09-arquitectura-minima-nextjs.md

Necesito:
- CRUD de suppliers
- formulario de creacion de payment_orders
- metadata por ruta
- upload de support_document_url
- upload de evidence_url
- cancelacion por cliente
- historial de expedientes
- generacion de PDF con jspdf
```

## Hito 7. Staff panel lectura

### Objetivo

Ver datos internos sin editar todavia.

### Prompt sugerido

```txt
Construye la version de solo lectura del Staff Panel en Next.js.

Debe incluir tabs para:
- onboarding
- payins
- transfers
- orders
- users
- support
- config
- psav

Solo lectura por ahora. No agregues mutaciones aun.
```

## Hito 8. Staff panel acciones

### Objetivo

Agregar operacion real.

### Prompt sugerido

```txt
Extiende el Staff Panel ya construido para soportar acciones operativas reales.

Basate en:
- 05-staff-admin-y-soporte.md
- 06-contratos-backend-supabase.md

Implementa:
- cambio de estados con motivo
- optimistic lock por updated_at
- verificacion/rechazo de onboarding
- flujo de payment_orders hasta completed
- carga de comprobante final
- soporte
- auditoria
- notificaciones

No cambies el backend.
```

## Hito 9. Admin y configuracion

### Objetivo

Terminar las capacidades internas.

### Prompt sugerido

```txt
Implementa en Next.js las funciones de admin y configuracion usando la documentacion de informacion/.

Necesito:
- crear usuario
- archivar/eliminar usuario
- desarchivar usuario
- resetear password
- editar fees_config
- editar app_settings
- gestionar psav_configs
```

## Hito 10. Endurecimiento final

### Objetivo

Cerrar la migracion con calidad.

### Prompt sugerido

```txt
Revisa el proyecto Next.js construido hasta ahora y alinea todo con la documentacion de informacion/.

Quiero que:
- detectes inconsistencias con los contratos de backend
- revises guardas por rol
- revises estados de payment_orders y onboarding
- revises uploads a storage
- revises manejo de errores
- revises PDFs
- completes huecos faltantes

No hagas cambios de backend.
```

## Recomendaciones al trabajar con Codex

- Pidele un hito por vez.
- Siempre dile que revise primero `informacion/`.
- Siempre aclara que el backend en Supabase no se toca.
- Siempre aclara que use tu stack confirmado.
- Si hace cambios grandes, luego pide una revision enfocada solo en bugs y riesgos.

## Orden recomendado real

1. Arquitectura base
2. Auth y profile
3. Onboarding
4. Notificaciones, actividad y soporte
5. Wallet
6. Pagos y proveedores
7. Staff lectura
8. Staff acciones
9. Admin/config
10. Endurecimiento

## Regla final

Si en algun punto Codex propone cambiar tablas, estados o payloads del backend, la respuesta correcta es no. Primero debe adaptar el frontend a los contratos ya documentados.
