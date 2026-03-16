# Plan de Mejora: Panel de Staff y Administración

Este documento detalla las mejoras requeridas para el panel interno de Guira, optimizando la experiencia de revisión operativa y gobierno del sistema.

## 1. Módulo de Onboarding (KYC/KYB)

**Objetivo:** Facilitar la validación de registros de nuevos clientes mediante una vista detallada y estructurada.

- **Acción:** Añadir botón "Ver Detalles" en cada fila de la tabla de Onboarding.
- **Interfaz (Modal de 2 Pasos/Niveles):**
    - **Nivel 1: Datos Generales:**
        - Mostrar `full_name` y `email`.
        - Visualizar el objeto `data` del registro de onboarding de forma estructurada (Teléfono, Dirección, NIT/CI, etc. según si es `personal` o `company`).
    - **Nivel 2: Verificación Documental:**
        - Listado de archivos subidos por el usuario.
        - Integración con el bucket `onboarding_docs` para previsualizar o descargar los documentos (ID Front, Registro de Comercio, etc.).
- **Acciones Rápidas:**
    - Botones de estado: `Verified` (verde), `Needs Changes` (amarillo - requiere motivo), `Rejected` (rojo - requiere motivo).
    - El cambio de estado debe actualizar tanto la tabla `onboarding` como el `onboarding_status` en `profiles`.

## 2. Módulo de Órdenes de Pago (Orders)

**Objetivo:** Controlar el ciclo de vida de las transferencias con visibilidad total de comprobantes.

- **Acción:** Añadir botón "Gestionar Orden" en la tabla de Orders.
- **Interfaz (Modal de Gestión):**
    - **Cabecera Dinámica:** Mostrar el `status` actual en la parte superior con colores distintivos:
        - `created` / `waiting_deposit`: Amarillo.
        - `deposit_received` / `processing` / `sent`: Azul.
        - `completed`: Verde.
        - `failed`: Rojo.
    - **Detalle de la Orden:**
        - Montos: `amount_origin` vs `amount_converted`.
        - Riel de procesamiento: `ACH`, `SWIFT`, `PSAV`.
        - Metadatos: Detalles bancarios de destino (`swift_details`, `ach_details`).
    - **Sección de Evidencias:**
        - Visualizar el comprobante de depósito enviado por el cliente (`evidence_url`).
        - Historial de documentos de respaldo (`support_document_url`).
- **Acciones de Staff:**
    - Cambiar estado según el flujo: Validar depósito -> Preparar Cotización -> Marcar como Enviado -> Completar (subiendo comprobante final).

## 3. Módulo de Usuarios (Users) - Solo Admin

**Objetivo:** Gestión de identidades y seguridad de acceso.

- **Acción:** Añadir botón "Administrar Usuario" en la tabla de Users.
- **Interfaz (Modal Administrativo):**
    - Resumen de perfil: Nombre, Email, Rol y Fecha de registro.
- **Funcionalidades Críticas:**
    - **Reset Password:** Disparar flujo de recuperación de contraseña vía Edge Function `admin-reset-password`.
    - **Archivar Usuario:** Cambiar `is_archived = true` para bloquear acceso sin borrar historial (Traceability).
    - **Eliminar Usuario:** Ejecutar borrado físico vía Edge Function `admin-delete-user` (solo si no tiene historial financiero).

## 4. Gestión de PSAV

**Objetivo:** Eliminar la dependencia de edición de JSON manual por una interfaz de usuario limpia.

- **Migración de DB Necesaria:** Añadir columna `qr_url` (text) a la tabla `psav_configs`.
- **Nuevo Formulario de Gestión:**
    - Reemplazar la vista `<pre>{JSON}</pre>` por campos de formulario:
        - Nombre del Canal (`name`).
        - Banco (`bank_name`).
        - Número de Cuenta (`account_number`).
        - Moneda (`currency`).
        - Switch de Activo/Inactivo (`is_active`).
- **Gestión de QR:**
    - Implementar carga de imagen para el código QR que se mostrará al cliente al elegir este método de pago.
    - Almacenar el archivo en un nuevo bucket (o carpeta en assets) y guardar la URL pública en el registro.

---

## Consideraciones Técnicas (Stack)

- **Backend:** Uso intensivo de `AdminService` y `StaffService`.
- **Auditoría:** Cada acción realizada en estos modales DEBE registrar un evento en `audit_logs` con el motivo correspondiente.
- **Notificaciones:** El sistema debe disparar una notificación al usuario final cada vez que su orden o onboarding cambie de estado.