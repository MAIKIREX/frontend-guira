# Arquitectura Minima Next.js

## Objetivo

Definir una arquitectura inicial concreta para construir la nueva app sin improvisar carpetas, servicios y providers a medida que el proyecto crece.

Esta arquitectura esta pensada para tu stack:

- Next.js App Router
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod
- Zustand
- Supabase JS
- Lucide React
- jsPDF

## Punto de partida actual

Tu base actual, segun la estructura mostrada, arranca bien:

- `app/`
- `components/ui/`
- `lib/`

Eso esta bien para iniciar, pero para Guira se quedara corto rapido porque el proyecto tiene:

- auth y perfiles,
- onboarding complejo,
- pagos con estados,
- wallet,
- soporte,
- notificaciones,
- panel staff/admin.

Por eso conviene ordenar la app por capas.

## Estructura recomendada

```txt
app/
  (public)/
    login/page.tsx
    registro/page.tsx
    recuperar/page.tsx
  (client)/
    panel/page.tsx
    pagos/page.tsx
    actividad/page.tsx
    soporte/page.tsx
    onboarding/page.tsx
  (staff)/
    admin/page.tsx
    admin/onboarding/page.tsx
    admin/ordenes/page.tsx
    admin/transferencias/page.tsx
    admin/usuarios/page.tsx
    admin/soporte/page.tsx
    admin/configuracion/page.tsx
    admin/psav/page.tsx
  api/
  favicon.ico
  globals.css
  layout.tsx
  page.tsx

components/
  ui/
  layout/
  shared/
  forms/
  feedback/

features/
  auth/
    components/
    hooks/
    schemas/
    services/
    types/
  profile/
  onboarding/
  payments/
  wallet/
  support/
  notifications/
  staff/

lib/
  supabase/
    browser.ts
    server.ts
    middleware.ts
  utils/
  constants/
  validators/

services/
  auth.service.ts
  profile.service.ts
  onboarding.service.ts
  payments.service.ts
  wallet.service.ts
  support.service.ts
  notifications.service.ts
  admin.service.ts

stores/
  auth-store.ts
  profile-store.ts
  notifications-store.ts
  onboarding-store.ts

types/
  auth.ts
  profile.ts
  onboarding.ts
  payment-order.ts
  supplier.ts
  support.ts
  notification.ts

public/
```

## Criterio de separacion

### `app/`

Solo debe contener:

- rutas,
- layouts,
- carga inicial de pantalla,
- composicion de features.

No debe concentrar la logica de negocio completa.

### `components/ui/`

Aqui va todo lo generado por shadcn:

- button
- input
- dialog
- sheet
- dropdown-menu
- table
- badge
- tabs
- form
- textarea
- toast

No mezclar aqui logica de pagos, onboarding ni auth.

### `features/`

Cada feature debe contener su propia logica de interfaz:

- formularios,
- hooks del dominio,
- schemas de Zod,
- componentes del modulo,
- funciones auxiliares propias.

### `services/`

Aqui se centraliza la comunicacion con Supabase y contratos backend.

Ejemplo:

- `payments.service.ts` crea y actualiza `payment_orders`
- `onboarding.service.ts` gestiona `onboarding`, `documents` y storage
- `admin.service.ts` invoca edge functions administrativas

### `stores/`

Usar Zustand solo para estado transversal y no para todo.

Casos correctos:

- perfil actual,
- notificaciones no leidas,
- estado de onboarding si necesitas persistencia en cliente,
- estado de shell de aplicacion.

Casos incorrectos:

- meter todas las tablas del sistema en un store gigante,
- duplicar en store datos que solo vive una pantalla.

## Providers recomendados

En `app/layout.tsx` conviene montar:

- `ThemeProvider` si usas tema
- `AuthProvider`
- `ProfileProvider` o store bootstrap
- `Toaster`

Si usas React Query, montarlo aqui tambien.

## Cliente Supabase

Separa al menos:

- `lib/supabase/browser.ts`
- `lib/supabase/server.ts`

El cliente browser se usa para:

- auth interactiva,
- uploads,
- realtime,
- formularios.

## Formularios

Usar React Hook Form + Zod para:

- auth
- onboarding
- soporte
- proveedores
- acciones staff que requieran validacion

Patron recomendado por feature:

```txt
features/payments/
  schemas/create-payment-order.schema.ts
  hooks/use-create-payment-order.ts
  components/create-payment-order-form.tsx
```

## Schemas Zod recomendados

Crear schemas separados para:

- login
- signup
- recovery
- update-password
- onboarding-personal
- onboarding-company
- supplier
- support-ticket
- payment-order
- staff-processing-order
- staff-sent-order

## Uso de shadcn

Componentes que realmente vas a necesitar:

- `button`
- `input`
- `textarea`
- `label`
- `form`
- `select`
- `checkbox`
- `dialog`
- `sheet`
- `tabs`
- `table`
- `badge`
- `card`
- `dropdown-menu`
- `alert-dialog`
- `toast` o `sonner`
- `separator`
- `skeleton`

## Manejo de PDFs

Para conservar el comportamiento actual:

- usar `jspdf`
- encapsularlo en `features/payments/lib/generate-payment-pdf.ts`

No mezclar la logica PDF directamente dentro de la pantalla.

## Recomendacion de librerias

Minimas para este proyecto:

- `@supabase/supabase-js`
- `react-hook-form`
- `zod`
- `@hookform/resolvers`
- `zustand`
- `lucide-react`
- `jspdf`
- `clsx`
- `tailwind-merge`

Recomendadas:

- `sonner`
- `date-fns`
- `next-themes`

Opcional:

- `@tanstack/react-query`

## Regla importante para este proyecto

No construir primero una arquitectura "bonita" y despues intentar meter la logica. En Guira conviene una arquitectura minima pero estricta:

- servicios claros,
- features separadas,
- shadcn solo para UI,
- formularios tipados,
- stores pequenos,
- contratos backend centralizados.

## Primera version concreta

Si quieres arrancar rapido, esta es una primera version suficiente:

```txt
app/
components/
  ui/
  layout/
features/
  auth/
  onboarding/
  payments/
  wallet/
  support/
  notifications/
  staff/
lib/
  supabase/
services/
stores/
types/
```

Con esa base ya puedes construir el proyecto sin tener que rehacer estructura a la mitad.
