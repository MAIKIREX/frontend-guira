# Informe de Comparación: Arquitectura de Base de Datos (M-Guira MVP vs Guira V1 MBV)

Este documento realiza un cruce analítico entre la estructura de datos propuesta para la versión inicial (**Guira V1 - MBV**) y la arquitectura actual priorizada (**Wilvelzap's MVP - M-Guira**). Como resultado técnico, se destacan tanto los aciertos que deben conservarse del MVP, como las características avanzadas del MBV que serían muy beneficiosas adoptar para fortalecer el nivel "Enterprise" (institucional) del producto actual.

---

## 1. Puntos de Inflexión Arquitectónica (Lo que el MVP hace mejor)

El MVP actual que tienes tiene decisiones arquitectónicas que son **mejores en agilidad y modernidad** en comparación con el MBV. Estos conceptos **deben** preservarse:

- **Contabilidad Inmutable (Ledger-Based vs Mutación de Saldos):** 
  En el MBV observamos una tabla `balances` donde el saldo cambia como si fuera una simple variable. Sin embargo, en tu MVP actual se usa `ledger_entries` de forma que el saldo de las `wallets` es el resultado matemático de todas las entradas (Depósitos/Retiros). *Esto es un estándar global obligatorio (Fintech Ledger).*
- **Aislamiento Ágil del Cumplimiento (JSON Onboarding):**
  El MBV destriza el "conoce a tu negocio" (KYB) en tablas fuertemente relacionales (`businesses`, `business_directors`, `business_ubos`, `kyb_applications`). En el MVP tienes un campo JSON en la tabla `onboarding`. Para una startup y un MVP, el JSON es **mucho más rápido** de iterar desde el frontend mientras se madura el producto.
- **Protección contra Fuerza Bruta Nativa:**
  Tu MVP introduce una tabla dedicada `auth_rate_limits`, sumamente vital cuando el factor de inicio de sesión no son contraseñas puras sino claves u OTPs. El MBV confía mucho en que Supabase lo maneje todo superficialmente.

---

## 2. Oportunidades Críticas de Mejora para el MVP (Inspiradas en MBV)

El MBV original (`db_guira_mbv`) fue diseñado considerando un nivel de madurez, cumplimiento y observabilidad corporativo altísimo. El MVP actual (`db_guira_mvp`) se beneficiaría enormemente de implementar *(o fusionar)* las siguientes arquitecturas probables en etapas 2 o próximas actualizaciones:

### A. Sistema Trazable de Revisiones Legales (Compliance Reviews)
- **Problema en MVP:** Cuando staff/admins aprueban el onboarding o una transacción (como un pago a proveedor grande), el estado simplemente muta en `profiles.onboarding_status = 'verified'`.
- **Qué tiene el MBV:** Un flujo de *Case Management*. Agrupa solicitudes bajo entidades rastreables en las tablas `reviews`, `review_events`, y `review_comments`.
- **Por qué implementarlo en MVP:** Los reguladores de EE.UU. u otros requieren ver **quién de tus empleados aprobó a qué usuario, cuándo, e idealmente el porqué (comentarios manuales).** No basta con un simple estado booleano afirmativo, se requiere un "log" inmutable del área de Cumplimiento Legal.

### B. Fiabilidad Robusta usando Tablas de Webhooks y Gaps Pull (Infraestructura Externa)
- **Problema en MVP:** El MVP captura eventos del banco a través de `bridge_virtual_account_events` en tiempo real; pero está fuertemente acoplado. Si el servidor (backend) se cae o la Base de Datos transacciona con errores de concurrencia, el evento de Bridge (ej: Wire Received) se puede perder para siempre.
- **Qué tiene el MBV:**
  1. Utiliza **Logs de Webhook Crudos (`webhook_events`)**: En vez de procesar el pago directamente, guarda el JSON gigantesco en crudo para ser consumido mediante un CRON asíncrono.
  2. Tiene **Pull Jobs (`bridge_pull_jobs`)** y resguardos ("Snapshots"): Un script que asiduamente "arrastra" transferencias históricas de la plataforma (Bridge API) para detectar discrepancias y huecos temporales que nunca llegaron por el Webhook.
- **Por qué implementarlo en MVP:** Los Webhooks siempre fallan, al menos un 1%. Añadir estas tablas del MBV brindaría absoluta fiabilidad en que a tu cliente no le faltará un centavo en saldo contable. 

### C. Certificados Transaccionales con Grado Legal (Recibos y Acreditación Documentada)
- **Brecha:** El MVP ata documentos (Identidad, Facturas aduaneros) polimórficamente a `user_id` u órden general; y detalla las confirmaciones en simple texto.
- **La Solución (MBV):** 
  - Generación obligatoria mediante tablas formales como `certificates` (Almacenando PDFs inquebrantables u Hashes de los comprobantes) para las órdenes de Retiro o Pagos B2B terminados.
  - Tablas transaccionales exclusivas pivote como `transaction_documents` / `supplier_payment_documents` para asegurar fuertemente que la plata que sale o entra esté unida estrictamente a una proforma/factura (Evitando el lavado o problemas aduaneros).

### D. Ajustes Customizados por Cliente (Tarifas Variables)
- **Brecha en MVP:** El manejo se concentra a nivel de constantes (Cachés o un `fees_config` global). 
- **La Solución (MBV):** Posee la tabla `customer_settings`. 
- **Por qué adoptarlo:** Guira en una etapa productiva B2B forzosamente negociará tarifas (Fees porcentuales y fijos) de transferencia más bajas o altas dependiendo el cliente y su volumen mensual. El MVP debería prever que una tarifa puede ser reemplazada a nivel cuenta-perfil individual.

---

## 3. Conclusión de Síntesis para Fusión

Para no perjudicar la velocidad actual pero elevar exponencialmente la solidez financiera de **Wilvelzap's MVP**, te recomiendo:

1. **Conservar tu arquitectura actual Financiera (Ledger Entries).**
2. **Ampliar MVP con el Módulo de Fiabilidad Base de MBV:** Prioritario añadir `webhook_events_log` crudo como zona de aterrizaje de APIs bancarias externas (Bridge).
3. **Escalar Cumplimiento Post-MVP:** Expandir la aprobación de estados hacia tablas `reviews` de historial Inmutable que documenten las decisiones del Staff.
4. **Acoplar Regímenes Customizados:** Permitir variaciones en los límites y peajes (Fees) incrustando propiedades específicas ligadas al `profile`.
