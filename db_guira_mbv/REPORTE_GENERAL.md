# Reporte General de Base de Datos - Guira V1

Como Ingeniero de Software Fullstack, he analizado la base de datos de Supabase para el proyecto **Guira V1**, cruzando esta información con el contexto del negocio (orquestación financiera, no custodia, transferencias mediante ACH/SWIFT/PSAV/Cripto). A continuación, presento este reporte arquitectónico.

## Resumen Arquitectónico
La base de datos está diseñada alrededor de varios dominios principales (Bounded Contexts). Utiliza PostgreSQL alojado en Supabase, y emplea de manera intensiva Row Level Security (RLS) para proteger el acceso a los datos, asegurando que los clientes solo vean su información, y los administradores puedan observar todo.

### 1. Dominio de Usuarios y Personas (Identity & Profile)
Este dominio gestiona las identidades y los perfiles extendidos (para individuos naturales):
- `user_profiles`: El perfil raíz, enlazado directamente con el sistema de autenticación, determinando el rol del usuario (USER, ADMIN, STAFF, REVIEWER).
- `people`: Perfil extendido de clientes individuales, su información de contacto e identificación fiscal.
- `customer_settings`: Ajustes financieros específicos del cliente (como `payment_route_developer_fee_percent`).

### 2. Dominio de Negocios y KYC/KYB (Compliance)
Todo el flujo de vida organizacional y de cumplimiento:
- `businesses`, `business_directors`, `business_ubos`: Modelan a los clientes empresariales, sus directores y beneficiarios finales.
- `kyc_applications`, `kyb_applications`: Rastrea las solicitudes de "Conoce a tu Cliente" y "Conoce a tu Negocio", con flujos de aprobación (SUBMITTED, IN_REVIEW, APPROVED, REJECTED).
- `reviews`, `review_comments`, `review_events`: Sistema de revisión donde el STAFF discute y aprueba/rechaza el KYC/KYB o la creación de cuentas.

### 3. Dominio Financiero (Operacional Básico)
Define los recursos financieros del cliente:
- `wallets`: Billeteras digitales (Cripto).
- `external_accounts`: Cuentas bancarias o virtuales de terceros (Ej. destino de un Withdrawal).
- `balances`: Saldo local o "virtual" contabilizado a nivel interno.

### 4. Transaccional e Intenciones (Orchestration Flows)
Tablas que representan la creación de "órdenes" y flujos financieros (relacionado con el concepto principal de Guira, validar y orquestar transacciones).
- `transactions`: Representa depósitos o retiros (Deposit, Withdrawal). Es el "Ledger" básico.
- `fiat_deposit_intents`: Intención de depósito fiat (ej. mediante un QR PSAV).
- `manual_deposit_requests`: Peticiones manuales de depósito que requieren intervención del staff.
- `withdrawal_requests`: Representa el momento en que un usuario quiere retirar sus fondos hacia una cuenta externa.
- `supplier_payment_requests`: Órdenes para pagar a proveedores mediante Swift u otros.

### 5. Documentos y Evidencias
De acuerdo con las reglas de negocio de Guira (no confirmar órdenes completadas sin comprobante):
- `documents`, `document_versions`: Documentación genérica adjuntada por usuarios (IDs corporativas, etc.).
- `transaction_documents`, `supplier_payment_documents`: Comprobantes adjuntados a las transacciones.
- `certificates`, `receipts`: Generación de recibos comprobantes de las transacciones procesadas (PDF y base64).

### 6. Bridge API (Infraestructura Externa)
Tablas sincronizadas u orientadas a comunicarse con la API de "Bridge" (proveedor externo para cuentas virtuales o liquidación).
- `bridge_countries`, `bridge_subdivisions`: Lista de países y estados soportados por Bridge.
- `bridge_virtual_accounts`: Cuentas virtuales generadas en el proveedor y asignadas al usuario.
- `bridge_liquidation_addresses`, `bridge_liquidation_address_drains`: Infraestructura de cripto a fiat proporcionada por Bridge.
- `bridge_transfer_snapshots`, `bridge_pull_jobs`: Para sincronizar y replicar el estado de las transferencias.

### 7. Sistema y Observabilidad
- `event_logs`, `customer_events_log`: Registro inmutable de eventos originados por el cliente y el sistema (audit trail).
- `audit_logs`: Trazabilidad de creación/modificación/borrado.
- `notifications`: Alertas para el usuario final.
- `support_tickets`: Sistema de asistencia para los clientes.
- `webhook_events`: Entradas desde proveedores externos (Bridge, etc.).

---
## Estructura de este Directorio
He preparado archivos `.md` individuales de cada tabla dentro de esta misma carpeta, donde profundizo de manera detallada:
- Qué rol juega la tabla en el negocio.
- Descripción de cada columna.
- Relaciones con otras entidades.
- Ejemplo JSON de cómo se ve el dato que la tabla manipula.
