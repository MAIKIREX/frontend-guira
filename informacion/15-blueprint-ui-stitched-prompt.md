# Guira - Propuesta de Rediseño de Interfaz (Blueprint para Stitch)

Este documento detalla la estructura actual de las pantallas de Guira y proporciona un prompt detallado para generar una nueva propuesta visual premium utilizando herramientas de IA (Stitch/Gemini).

---

## 1. Descripción de Vistas (Lado del Cliente)

### A. Panel Principal (Dashboard)
- **Función:** Vista general del estado de la cuenta.
- **Elementos:**
  - Resumen de balances (Fiat y Cripto).
  - Accesos rápidos: "Depositar", "Enviar", "Transferir".
  - Feed de actividad reciente (últimos 3-5 movimientos).
  - Tarjeta de estado de onboarding (si está pendiente).

### B. Flujo de Pagos (Depositar / Enviar / Expedientes)
- **Función:** Generación de órdenes de transferencia internacional y fondeos.
- **Etapas (Wizard):**
  1. **Ruta:** Selección de dirección de fondos (Bolivia a Exterior, USA a Bolivia, etc.).
  2. **Método:** Selección de rail (Banco, QR, Crypto).
  3. **Detalle:** Captura de montos con cálculo en tiempo real de tipo de cambio y comisiones. Selección de proveedor/beneficiario.
  4. **Revisión:** Resumen de datos antes de enviar a base de datos.
  5. **Finalización:** Visualización de instrucciones de depósito y carga de comprobante final.

### C. Agenda de Proveedores / Beneficiarios
- **Función:** Gestión de contactos recurrentes.
- **Elementos:**
  - Listado con tarjetas elegantes por proveedor.
  - Indicadores visuales de métodos disponibles (ACH, SWIFT, Crypto).
  - Formulario de edición/creación con validaciones por país.

### D. Historial y Transacciones
- **Función:** Seguimiento del estado de las órdenes.
- **Elementos:**
  - Tabla o lista con estados: `created`, `processing`, `completed`, `failed`.
  - Vista de detalle: Log de actividad por orden, visor de documentos adjuntos.

---

## 2. Descripción de Vistas (Lado Staff / Admin)

### A. Gestión de Órdenes (Cola de Trabajo)
- **Función:** Revisión y procesamiento de solicitudes de clientes.
- **Elementos:**
  - Filtros por estado y tipo de operación.
  - Acciones rápidas: "Aprobar depósito", "Publicar cotización final", "Confirmar envío".
  - Alertas de órdenes estancadas.

### B. Control de Configuraciones (Config Panel)
- **Función:** Ajuste de constantes del sistema.
- **Elementos:**
  - **App Settings:** Gestión de tasas (`parallel_buy_rate`, `parallel_sell_rate`, `bolivia_exchange_rate`).
  - **Fees Config:** Definición de comisiones fijas y variables.
  - **PSAV Config:** Gestión de cuentas bancarias receptoras de Bolivia.

### C. Onboarding y Usuarios
- **Función:** Verificación de identidad (KYC/KYB).
- **Elementos:**
  - Lista de usuarios pendientes.
  - Visor de documentos legales (CI, NIT, etc.).
  - Herramientas de aprobación/rechazo con motivos.

---

## 3. Prompt para Stitch (Rediseño UI Premium)

> **Prompt Sugerido:**
>
> "Genera una propuesta de diseño para una plataforma de banca moderna y remesas cripto llamada **'Guira'**. La interfaz debe sentirse extremadamente premium, utilizando una estética de **Glassmorphism** y **Sleek Dark Mode**.
>
> **Requerimientos de Diseño:**
> - **Paleta de Colores:** Profundos (negros oled, azules medianoche) con acentos vibrantes en verde esmeralda para éxitos y azul cielo para interacciones.
> - **Tipografía:** Moderna y geométrica (tipo Inter o Outfit), con jerarquía clara.
> - **Componentes:**
>   1. Una barra lateral minimalista con iconos de trazo fino.
>   2. Un 'Payment Wizard' (formulario) que use un 'Progress Rail' dinámico y tarjetas de selección táctiles.
>   3. Gráficos de resumen de balance fluidos.
>   4. Una barra de resumen de 'Tipo de Cambio' que se sienta como un ticker financiero, con micro-animaciones cuando cambian los valores.
>   5. Tablas de transacciones con hover effects 'glassy' y etiquetas de estado con degradados suaves.
>
> **Estructura Requerida:**
> El diseño debe contemplar una vista de cliente (enfocada en transaccionalidad rápida) y una vista administrativa (enfocada en gestión de datos y aprobación de documentos). El estilo debe ser responsivo y usar grids modernos. Evita diseños genéricos; busca un look de 'High-Tech Financial Tool'."

---

## 4. Notas para la Implementación
Una vez obtenida la visual de Stitch, utilizaremos **Tailwind CSS** y **Shadcn/UI** personalizados para replicar los gradientes, efectos de desenfoque de fondo (backdrop-blur) y las sombras suaves de profundidad que propone la IA.
