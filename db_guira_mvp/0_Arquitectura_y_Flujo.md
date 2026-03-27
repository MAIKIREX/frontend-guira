# Arquitectura y Flujo Funcional de Base de Datos - Wilvelzap's MVP (M-Guira)

Esta sección proporciona una visión arquitectónica, como Full-Stack Engineer, sobre cómo todas las 21 tablas interactúan coreográficamente para generar un motor financiero confiable y sólido, separando claramente los componentes de autenticación, cumplimiento regulatorio, libro mayor contable y conexión API externa (Bridge).

## 1. Módulo de Autenticación y Identidad (`1_Usuarios_y_Autenticacion`)
El viaje del ecosistema siempre inicia con el usuario. 
- **Flujo**:
  1. El cliente se registra e inmediatamente Supabase `auth.users` expide su UUID nativo.
  2. Un trigger (o webhook) crea una fila en cascada en nuestra tabla `profiles`, que es nuestra "Capa de Negocio" (`role: client`, estado de onboarding inicial). 
  3. En simultáneo, cada vez que el usuario intenta ingresar sus credenciales para obtener un OTP (One-Time-Password) o clave, la tabla `auth_rate_limits` rastrea agresivamente la IP/Email para detener ataques de fuerza bruta.

## 2. Módulo de Onboarding y Cumplimiento (KYB) (`2_KYB_y_Documentacion`)
Antes de tocar un solo centavo, el usuario debe desatar su estado "Draft" de onboarding. Esta etapa garantiza nuestro blindaje legal (AML/KYC).
- **Flujo**:
  1. El usuario navega al portal y somete datos personales y de negocio. Esto se almacena dinámicamente en el JSON de la tabla `onboarding`.
  2. En dicho formulario, está forzado a adjuntar certificados y comprobantes. Al subirlos, estos se registran en `documents` enlazados polimórficamente a su `onboarding_id` o `user_id`.
  3. Los Analistas (Staff) o Inteligencia Automática procesan su perfil. Si lo aprueban, su estado en `profiles.onboarding_status` pasa a `verified`.
  4. (Opcional): Si el cliente trabaja B2B transfronterizo frecuentemente con otras empresas, los añade a la tabla `suppliers`, pasando por un micro-perfil KYC como beneficiario verificado recurrente.

## 3. Core Financiero y Motor de Contabilidad (`3_Core_Financiero`)
Una vez el usuario pasa KYC, recibe el permiso para operar el producto. El diseño evita "saldos directos mutables" y se basa ciegamente en sumas de Eventos Financieros. 
- **Flujo de Recepción (Pay-in)**:
  1. Se configura y define la forma permitida de ingresar saldo en `payin_routes`. El usuario (o Guira a nivel corporativo usando `psav_configs`) define vías FIAT/Crypto.
  2. Cuando hay depositos en ruta, el dinero ingresante desencadena `payment_orders` indicando la orden. Adicionalmente, genera transiciones finales en la tabla maestra contable.
  3. Cada divisa (`USD`, `USDC`) del usuario es un registro en `wallets`. Para sumar dinero a este wallet, se inserta una fila en `ledger_entries` (tipo `deposit` con el `amount` correspondiente). *Balance Total = Σ(ledger_entries)*.
- **Flujo de Pago y Conversiones (Payment Orders & Payouts)**:
  1. Si un usuario desea pagar a un proveedor en el extranjero, crea un `payment_order`. Se cotizan las tasas (Fee calculado y leído en tiempo real desde la tabla cacheadora `fees_config`).
  2. Si el usuario decide extraer el dinero hacia su cuenta de banco, crea una orden individual en `payout_requests`, que drena asíncronamente (insertando un `ledger_entry` de tipo `payout`/`fee` con valores negativos) su Billetera.

## 4. Bridge Integration & Cuentas Fiduciarias (`4_Integracion_Bridge`)
Para dotar al ecosistema del poder de interactuar con el mundo bancario real estadounidense, el módulo de Bridge actualiza sus saldos a través de puentes asíncronos y Webhooks.
- **Flujo**:
  1. Cuando un usuario envía información KYB a Bridge y es aprobado, Bridge le da un ID (almacenado en `profiles.bridge_customer_id`).
  2. El banco de EEUU emite una cuenta simulada que atamos a la tabla `bridge_virtual_accounts`. El cliente la ve en la app y sabe que le pertenece.
  3. Si un proveedor le hace wire a esa cuenta sintética en la vida real, Bridge detecta un deposito y envía un "Ping Webhook" a nuestro backend. Este es atrapado textualmente en `bridge_virtual_account_events`. Una función edge inmediatamente procesa este evento y añade el saldo inyectando en su `ledger_entries`.
  4. Para pagos u on-ramps salientes foráneos se ejecutan en `bridge_transfers`. Las cuentas puente registradas a su nombre (o de terceros) se gestionan desde `bridge_external_accounts`.

## 5. Módulo Operacional y Observabilidad (`5_Sistema_y_Soporte`)
Ninguna arquitectura FinTech funciona ciegamente, necesita módulos para gobernar las decisiones y mantener al margen a la gerencia.
- **Flujo y Trazabilidad**:
  1. Cualquier *INSERT, UPDATE o DELETE* efectuado por un "staff/admin" forzosamente genera una fila criptográfica en `audit_logs` que protege el historial por si se cambiaron saldos manuales (Ajustes de Ledger).
  2. Cualquier acción menor pero relevante visualmente del usuario ("Initiated Transfer") cae en `activity_logs` alimentando su Timeline en frontend.
  3. Si un evento en el puente 4 (arriba) falló, el sistema encola fallas a `support_tickets` manuales para que backend/staff lo reponga o el cliente reclame.
  4. Toda transición importante de status (Pagos recibidos, Retiros fondeados, Ticket respondido) dispara una alerta Push a la bandeja de `notifications` para mantener al usuario final in-the-loop.
  5. Entornos, banderas de UI y llaves para testing de ambiente, son regidas por un catálogo simple Key-Value presente en `app_settings`.
