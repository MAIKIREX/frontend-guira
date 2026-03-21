# Modo Admin: inventario de ventanas

## Objetivo

Este documento describe todas las ventanas, pantallas y diálogos relevantes del modo admin actualmente implementado en la aplicación. El modo admin vive dentro del espacio `staff`, pero añade herramientas exclusivas para gobierno operativo, configuración y administración de usuarios.

## Alcance del modo admin

El modo admin utiliza el mismo shell interno que staff:

- Sidebar lateral colapsable
- Header superior con tema, notificaciones y menú de usuario
- Área principal de trabajo

Las rutas base detectadas son:

- `/admin`
- `/admin/onboarding/[id]`
- `/admin/soporte`
- `/auditoria`

Además, dentro de `/admin` existen vistas internas organizadas por tabs.

---

## 1. Shell general del modo admin

### 1.1. Layout interno

Archivo base:

- `app/(staff)/layout.tsx`
- `components/layout/staff-shell.tsx`

Descripción:

- Es el contenedor global de toda la experiencia interna.
- Tiene sidebar desktop, sidebar móvil y header sticky.
- El sidebar puede colapsarse.
- El header contiene acceso a cambio de tema, notificaciones y menú del usuario autenticado.

### 1.2. Navegación lateral

Archivo:

- `components/layout/staff-navigation.tsx`

Opciones visibles:

- `Panel` -> `/admin`
- `Soporte` -> `/admin/soporte`
- `Auditoria` -> `/auditoria`

Nota:

- Aunque el panel principal contiene muchas herramientas, la navegación lateral solo expone tres entradas de primer nivel.
- Dentro de `Panel` se concentran la mayoría de módulos administrativos.

---

## 2. Ventana principal: Panel Admin

Ruta:

- `/admin`

Archivos:

- `app/(staff)/admin/page.tsx`
- `features/staff/components/staff-readonly-panel.tsx`

Descripción general:

- Es la ventana principal del modo admin.
- Funciona como centro de control interno.
- Reúne métricas, auditoría reciente, tablas operativas y herramientas administrativas.
- Usa tabs para separar dominios funcionales.

### 2.1. Encabezado del panel

Elementos:

- Título: `Centro de control interno`
- Mensaje principal: `Staff valida, ejecuta y admin gobierna`
- Descripción operacional del panel
- Botón `Actualizar`

Propósito:

- Dar contexto operativo inmediato.
- Permitir refrescar el snapshot interno de datos.

### 2.2. Bloque de alertas y métricas

Elementos:

- Aviso de `límites documentales detectados` cuando existan gaps
- Métricas de:
  - Onboarding
  - Orders
  - Support
  - Users
- Tarjetas de rol:
  - Staff
  - Cliente
  - Admin

Propósito:

- Mostrar volumen operativo.
- Resumir responsabilidades por actor del sistema.

### 2.3. Radar de auditoría

Componente:

- `RecentAuditCard`

Descripción:

- Tarjeta lateral con los últimos eventos de auditoría.
- Muestra:
  - tabla afectada
  - acción
  - motivo
  - fecha

Propósito:

- Visibilidad rápida sobre movimientos internos recientes.

---

## 3. Tabs internas del Panel Admin

El panel principal contiene diez tabs funcionales.

### 3.1. Tab `Overview`

Descripción:

- Resume el flujo operativo completo.
- Explica el rol de cada módulo.
- Muestra la secuencia funcional:
  - Onboarding
  - Orders
  - Audit
  - Support
  - Admin tools
  - Rieles no cerrados

Uso:

- Ventana de orientación para entender cómo está dividido el trabajo interno.

### 3.2. Tab `Onboarding`

Descripción:

- Tabla operativa de expedientes KYC/KYB.
- Muestra:
  - cliente
  - tipo
  - estado
  - fecha de actualización
  - observaciones
  - acción `Ver detalles`

Acción principal:

- Abre el expediente detallado en `/admin/onboarding/[id]`.

### 3.3. Tab `Orders`

Descripción:

- Tabla de órdenes de pago.
- Muestra:
  - ID
  - tipo
  - rail
  - monto
  - estado
  - archivos adjuntos
  - acciones

Acción principal:

- Abre una ventana modal de gestión de orden.

### 3.4. Tab `Support`

Descripción:

- Bandeja operativa de tickets de soporte.
- Muestra:
  - cliente
  - asunto
  - estado
  - contacto
  - fecha
  - acciones

Acción principal:

- Abre modal para cambiar estado del ticket.

### 3.5. Tab `Audit`

Descripción:

- Tabla de auditoría completa.
- Muestra:
  - tabla
  - acción
  - motivo
  - fuente
  - fecha

Propósito:

- Seguimiento formal de cambios internos.

### 3.6. Tab `Payins`

Descripción:

- Vista genérica en solo lectura de `payin_routes`.
- Se muestra como listado de registros serializados.

Propósito:

- Exponer datos aún no cerrados funcionalmente.

### 3.7. Tab `Transfers`

Descripción:

- Tabla de `bridge_transfers`.
- Muestra:
  - ID
  - tipo
  - business purpose
  - monto
  - estado
  - fecha

Propósito:

- Lectura operativa de transferencias sin acciones activas.

### 3.8. Tab `Users`

Descripción:

- Tabla de usuarios del sistema.
- Muestra:
  - usuario
  - rol
  - onboarding
  - archivado
  - fecha de alta
  - acciones

Privilegios:

- Las acciones reales de administración solo están disponibles para admin.

Acciones principales:

- Crear usuario
- Administrar usuario

### 3.9. Tab `Config`

Descripción:

- Área administrativa dividida en dos tarjetas:
  - `Estructura de Comisiones`
  - `Variables del Sistema`

Propósito:

- Ajustar parámetros globales del negocio y del sistema.

Acciones principales:

- Editar fee config
- Editar app setting

### 3.10. Tab `PSAV`

Descripción:

- Gestión de canales de pago PSAV.
- Muestra:
  - QR
  - canal
  - banco y cuenta
  - moneda
  - estado
  - acciones

Acciones principales:

- Crear canal PSAV
- Editar canal
- Eliminar canal

---

## 4. Ventana de detalle de onboarding

Ruta:

- `/admin/onboarding/[id]`

Archivos:

- `app/(staff)/admin/onboarding/[id]/page.tsx`
- `features/staff/components/onboarding-detail-page.tsx`

Descripción general:

- Es una pantalla completa dedicada al expediente KYC/KYB.
- Sustituye la lógica de revisión rápida por una vista más profunda y estructurada.
- Está pensada para revisar identidad, documentos y estado sin perder contexto.

### 4.1. Hero del expediente

Incluye:

- botón `Volver a onboarding`
- etiqueta `Mesa de verificación`
- nombre del expediente o empresa
- estado actual
- métricas de:
  - tipo
  - actualizado
  - documentos

### 4.2. Resumen superior

Incluye tarjetas con:

- nombre
- apellido
- nacimiento

Y un bloque lateral con:

- acciones visibles del expediente
- acceso directo a aprobar, pedir cambios o rechazar

### 4.3. Tab `Información personal`

Muestra:

- información principal del perfil
- campos adicionales del payload `onboarding.data`

Propósito:

- lectura rápida de datos personales o societarios.

### 4.4. Tab `Documentos`

Muestra:

- lista de documentos cargados
- tipo de documento
- número de documento
- fecha de carga
- mime/origen
- ruta de almacenamiento
- vista previa si existe URL firmada
- botón para abrir archivo

Incluye además:

- bloque lateral de contexto de revisión
- recordatorios sobre aprobar, pedir cambios o rechazar

### 4.5. Tab `Verificación`

Muestra:

- estado actual KYC/KYB
- fecha de envío
- fecha de revisión
- comentarios del revisor
- bridge customer id

También incluye:

- bloque de lectura operativa
- repetición de acciones principales del expediente

---

## 5. Ventana independiente de soporte

Ruta:

- `/admin/soporte`

Archivo:

- `app/(staff)/admin/soporte/page.tsx`
- `features/support/components/staff-support-list.tsx`

Descripción:

- Es una página dedicada exclusivamente a la bandeja de soporte.
- Muestra tickets en una tabla simple con:
  - fecha
  - cliente
  - asunto
  - estado

Diferencia con la tab `Support`:

- La tab dentro del panel es más operativa y está integrada al centro de control.
- Esta ventana separada funciona como bandeja dedicada.

---

## 6. Ventana independiente de auditoría

Ruta:

- `/auditoria`

Archivo:

- `app/(staff)/auditoria/page.tsx`
- `features/activity/components/audit-list.tsx`

Descripción:

- Página dedicada a auditoría para staff y admin.
- Muestra las últimas acciones críticas internas.

Campos visibles:

- fecha
- usuario
- rol
- acción
- tabla
- motivo

Diferencia con la tab `Audit`:

- La tab del panel es una versión integrada al centro de control.
- Esta página ofrece una vista exclusiva de auditoría.

---

## 7. Ventanas modales administrativas

Además de las páginas completas, el modo admin tiene múltiples diálogos modales.

## 7.1. Gestión de usuarios

Archivo:

- `features/staff/components/admin-action-dialogs.tsx`

### Crear usuario

Componente:

- `CreateUserDialog`

Campos:

- email
- password
- nombre completo
- rol
- motivo

Propósito:

- Crear usuarios desde admin con trazabilidad en auditoría.

### Administrar usuario

Componente:

- `UserDetailDialog`

Contenido:

- resumen del usuario
- nombre
- email
- rol
- estado de archivado
- acceso a acciones rápidas

### Archivar usuario

Componente:

- `ArchiveDeleteUserDialog` con acción `archive`

Campo:

- motivo

### Eliminar usuario

Componente:

- `ArchiveDeleteUserDialog` con acción `delete`

Campo:

- motivo

Nota:

- La eliminación se plantea como una acción crítica con trazabilidad.

### Desarchivar usuario

Componente:

- `UnarchiveUserDialog`

Campo:

- motivo

### Resetear contraseña

Componente:

- `ResetPasswordDialog`

Campo:

- motivo

Propósito:

- Disparar recovery por email y dejar registro administrativo.

---

## 7.2. Configuración de comisiones

Componente:

- `FeeConfigDialog`

Campos:

- valor numérico
- divisa
- justificación del cambio

Propósito:

- Ajustar parámetros de comisión que afectan cálculos futuros.

---

## 7.3. Variables del sistema

Componente:

- `AppSettingDialog`

Campos:

- valor de la variable
- bitácora operativa

Comportamiento:

- Respeta el tipo del valor anterior cuando es boolean, number o json.

Propósito:

- Editar variables críticas globales de la aplicación.

---

## 7.4. Gestión de canales PSAV

Componentes:

- `PsavCreateDialog`
- `PsavUpsertDialog`
- `PsavDeleteDialog`

### Crear o editar PSAV

Campos:

- nombre del canal
- entidad bancaria
- número de cuenta
- divisa
- archivo QR
- visibilidad operativa
- bitácora de cambio

Extras visuales:

- preview lateral del QR
- vista resumida del canal en tiempo real

### Eliminar PSAV

Campos:

- motivo de eliminación

Propósito:

- Remover un canal de pago del sistema con confirmación fuerte.

---

## 8. Ventanas modales operativas disponibles dentro del modo admin

Aunque no son exclusivas de admin, también forman parte del trabajo diario dentro de este modo.

Archivo:

- `features/staff/components/staff-action-dialogs.tsx`

## 8.1. Onboarding

### Ver detalle rápido de onboarding

Componente:

- `OnboardingDetailDialog`

Descripción:

- Modal resumido del onboarding.
- Hoy convive con la nueva pantalla completa del expediente.

### Cambiar estado de onboarding

Componente:

- `OnboardingActionDialog`

Estados posibles:

- verificar
- pedir cambios
- rechazar

Campo:

- motivo

Efecto:

- actualiza onboarding
- sincroniza `profiles.onboarding_status`
- registra auditoría
- notifica al cliente

## 8.2. Soporte

### Cambiar estado del ticket

Componente:

- `SupportTicketActions`

Campos:

- nuevo estado
- motivo

Estados:

- open
- in_progress
- resolved
- closed

## 8.3. Órdenes

### Gestionar orden

Componente:

- `OrderDetailDialog`

Contenido:

- detalle transaccional
- información de destino
- respaldo y comprobantes
- estado actual
- acciones habilitadas

### Validar depósito del cliente

Componente:

- `OrderReasonActionDialog` con acción `deposit_received`

Campo:

- motivo

Condición:

- requiere comprobante de depósito del cliente

### Marcar failed

Componente:

- `OrderReasonActionDialog` con acción `failed`

Campo:

- motivo

### Preparar cotización

Componente:

- `OrderQuoteDialog`

Campos:

- tipo de cambio
- monto convertido calculado
- fee total
- motivo

Efecto:

- publica la cotización final
- mueve la orden a `processing`

### Registrar sent

Componente:

- `OrderSentDialog`

Campos:

- referencia o hash
- motivo

Efecto:

- mueve la orden a `sent`

### Completar orden

Componente:

- `OrderCompletionDialog`

Campos:

- comprobante final
- motivo

Efecto:

- sube comprobante final
- mueve la orden a `completed`

---

## 9. Resumen funcional del modo admin

El modo admin actualmente combina cuatro niveles de ventanas:

1. Shell interno general
2. Páginas completas
3. Tabs dentro del panel principal
4. Diálogos modales de acción

La distribución funcional queda así:

- Gobierno general y métricas: `Panel`
- Revisión documental profunda: `Onboarding detail`
- Atención de tickets: `Soporte`
- Trazabilidad: `Auditoría`
- Administración de usuarios: `Users`
- Parámetros globales: `Config`
- Canales operativos de pago: `PSAV`

## 10. Observación de diseño

La mayor concentración de ventanas está dentro de `/admin`, especialmente en tabs y modales. Si más adelante se quiere mejorar la claridad del modo admin, una evolución natural sería separar el panel en macrosecciones más visibles:

- Operaciones
- Soporte
- Control
- Administración

Esto haría que la experiencia sea más escalable y menos dependiente de una sola pantalla con muchas tabs.
