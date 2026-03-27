# Flujo de Funcionamiento Detallado - Guira V1

Este documento expone cómo interactúan exactamente las tablas documentadas a lo largo de los viajes de usuario (User Journeys) principales dentro del ecosistema Guira.

---

## 🏗️ 1. Flujo de Onboarding Buisness (KYB)

Cuando un nuevo cliente corporativo intenta unirse a Guira para operar giros internacionales, atraviesa el siguiente ciclo de base de datos interconectado:

1. **Creación de Identidad Base** (`1_Identidad_y_Perfiles/user_profiles.md`):
   - El cliente se registra usando su Email/Password en Supabase Auth y se le asigna inmediatamente un `user_profiles` con rol `CLIENT`.
   - Si es persona natural para pruebas de verificación, sus datos biográficos se extienden en `people`.

2. **Registro de la Empresa** (`2_Compliance_y_KYB/businesses.md`):
   - El cliente provee los datos de la compañía (Razón Social, País, TAX ID).
   - Se crea un registro en la tabla `businesses`.
   - El cliente asocia a los directivos en `business_directors` y propietarios beneficiarios últimos en `business_ubos`.

3. **Subida de Evidencia Legal** (`2_Compliance_y_KYB/documents.md` y `kyb_applications.md`):
   - Toda acta constitutiva o ID se sube a Supabase Storage y su metadata se aloja en `documents` con polimorfismo apuntando a la empresa, donde el `subject_type`="BUSINESS".
   - Todo este paquete de datos queda englobado dentro de un expediente agrupador `kyb_applications`.

4. **El Proceso de Revisión y Cumplimiento** (`2_Compliance_y_KYB/reviews.md`):
   - La plataforma gatilla automáticamente la creación de un `reviews` atado al `kyb_applications`.
   - Un analista de `STAFF` abre el dashboard, examina, deja apuntes (`review_comments`) y finalmente emite una decisión inmutable (`review_events`) de **"APROBADO"**.

---

## 💸 2. Flujo de Fondeo (Cash-In Local o Cripto)

Guira no tiene acceso a cuentas bancarias directas de Bolivia, sino que recibe giros bajo una estructura de intención manual o cuentas orquestadoras.

1. **Intención de Depósito** (`3_Orquestacion_Financiera/fiat_deposit_intents.md`):
   - El cliente avisa que va a mandar $10,000 USD (A veces convertido en BOB). Se crea la "Intención" y se le emite un QR bancario local (Si aplica según su país).
   - Alternativamente, si deposita vía Cripto On-Chain, deposita hacia las carteras criptográficas guardadas en `wallets.md`.

2. **Acreditación al Ledger** (`3_Orquestacion_Financiera/transactions.md` y `balances.md`):
   - El administrador ve el dinero en el banco real y aprueba el Intent. Ese acto cambia el balance inmutable en `balances` sumando $10,000 USD a su cuenta virtual.
   - De manera inmanente y de forma obligatoria, un script inserta el crédito dentro de `transactions` tipo "DEPOSIT" referenciando el Intent original, y la evidencia u originador del saldo queda guardado relacionalmente usando `transaction_documents`.

---

## 🌍 3. Flujo de Pago de Proveedores Cross-Border (Cash-Out)

El escenario número 1 es el pago a una fábrica asiática o americana partiendo del saldo internalizado del cliente en Guira. Funciona de la siguiente forma:

1. **Orden de Compra / Proforma** (`3_Orquestacion_Financiera/supplier_payment_requests.md` y `supplier_payment_documents.md`):
   - El usuario abre su panel, indica a dónde mandará (Ruta `SWIFT/ACH`) y qué banco extranjero recibirá (Pudiendo añadir a su lista recurrente local en `external_accounts`).
   - Se crea un ID de requerimiento e inmediatamente se le exigen las justificaciones aduaneras (Facturas) cargándose a la tabla `supplier_payment_documents`.

2. **Aprobación del Fideicomiso** (`2_Compliance_y_KYB/reviews.md` y `5_Sistema_y_Operaciones/audit_logs.md`):
   - Al igual que el KYB, este flujo pasa por un ticket de cumplimiento `reviews`. Si el `STAFF` lo aprueba, todo esto queda fotográficamente congelado en un `audit_logs` con un diff garantizando que nadie tocará el Beneficiario por debajo de la mesa.

3. **Orquestación con Bridge y Liquidación** (`4_Integracion_Bridge/bridge_virtual_accounts.md` y `bridge_liquidation_address_drains.md`):
   - Puesto que Guira usa a **Bridge** como proveedor API, el servidor extrae saldo local (`balances`) para mandárselo a Bridge en su moneda nativa u USDC. Estas liquidaciones hacia el exterior interactúan con el webhook `bridge_liquidation_address_drains`.
   - Aquí se graba en Bridge que la suma se envíe desde sus rieles hacia el banco corresponsal. Para asegurarnos localmente, salvaguardarmos el resultado usando `bridge_transfer_snapshots`.
   
4. **Acunación, Recibos y Telemetría** (`3_Orquestacion_Financiera/certificates.md` y `1_Identidad_y_Perfiles/customer_events_log.md`):
   - Cuando se culminan los callbacks desde los proveedores, la salida es restada vía un `transactions` de tipo "WITHDRAWAL".
   - Automáticamente se acuña un PDF con valor legal inquebrantable asimilado en la tabla `certificates`. Y para fines amigables en interfaz gráfica, se renderiza HTML listado en `receipts`.
   - Notificamos al móvil del cliente que su transferencia se envió insertando datos en `notifications`.
   - Se disparan eventos de analítica a `customer_events_log` para indicar "El usuario PAGO_PROVEEDOR".

---

## 🚨 4. Flujo de Telemetría e Infraestructura (Mantenimiento)

La máquina funciona asíncronamente con un sistema robusto preparado a mitigar caídas.

1. **Gestión de Webhooks y Confiabilidad** (`5_Sistema_y_Operaciones/webhook_events.md`):
   - Bridge o Veriff mandan peticiones POST avisando que el Swift fue entregado. En vez de procesar online lo cual expone a caídas por race-conditions, se guarda el Payload puramente crudo en `webhook_events`.
   - Un worker local CRON en NextJS lee esta fila, revisa el Payload, y afecta las tablas operacionales (Por ejemplo marcando el Payout en status COMPLETED y moviendo saldo de `balances`).

2. **Trabajos Manuales (Pull Jobs)** (`4_Integracion_Bridge/bridge_pull_jobs.md`):
   - Si algo falló masivamente a nivel red, el administrador desde el panel puede correr un Job de Sync (sincronizar los 10 expedientes pasados). `bridge_pull_jobs` guarda el historial de estos mantenimientos forzosos o verificaciones masivas, incluyendo en `jsonb` los desfasajes o huecos transaccionales encontrados ("gaps").

Esta estructura conforma un **Ledger Inmutable** seguro, capaz de orquestar capital delegando la custodia a Bridge y la liquidez a pasarelas fiat externas, manteniendo los requerimientos normativos AML vivos y la retención gráfica de comprobantes.
