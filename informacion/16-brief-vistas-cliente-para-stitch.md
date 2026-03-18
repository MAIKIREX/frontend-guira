# Guira - Brief detallado de vistas del cliente para Stitch

## Objetivo

Este documento describe con mucho detalle las ventanas principales que ve un usuario cliente dentro de Guira para que una herramienta de diseño como Stitch de Google pueda generar una propuesta visual coherente, completa y alineada con el producto real.

La meta no es inventar pantallas decorativas, sino traducir el funcionamiento de Guira a una experiencia visual premium, clara, profesional y centrada en operaciones financieras híbridas.

---

## 1. Contexto del producto

Guira es una plataforma de orquestación financiera. No es un banco ni custodia fondos. Su función es coordinar, validar, documentar y dar seguimiento a operaciones que se ejecutan sobre rieles externos como:

- ACH
- SWIFT
- PSAV
- Redes digitales y blockchain como USDC o USDT

La lógica central del sistema es:

1. Toda operación nace como una `PaymentOrder`.
2. Luego el cliente recibe instrucciones de fondeo o entrega.
3. El cliente sube evidencia.
4. Staff valida.
5. Staff publica cotización final cuando aplica.
6. El cliente confirma.
7. La operación avanza por estados hasta completarse.

Esto significa que la interfaz cliente no es una banca tradicional ni una wallet cripto pura. Debe sentirse como una mesa operativa moderna donde el usuario:

- entiende en qué estado está su expediente,
- sabe cuál es la siguiente acción requerida,
- ve con claridad montos, fees, rail y beneficiario,
- y puede confiar en la trazabilidad documental del proceso.

---

## 2. Objetivo de la experiencia cliente

La experiencia del cliente debe resolver estas preguntas con mucha claridad:

- Qué puedo hacer ahora.
- Qué operaciones siguen abiertas.
- Qué dinero está en proceso.
- Qué evidencia falta subir.
- Qué cotización debo aceptar.
- Qué proveedor o beneficiario estoy usando.
- Qué ticket de soporte está abierto.

La sensación general debe ser:

- profesional,
- tecnológica,
- precisa,
- segura,
- operativa,
- y con estética fintech/cripto premium.

No debe verse como un banco tradicional burocrático ni como una landing page de marketing. Debe verse como una herramienta de operación financiera de alto control.

---

## 3. Paleta visual obligatoria

Usar esta paleta como base de la propuesta:

- `Rich Black`: `#0B0E11`
  Uso: fondo general, dark mode principal, canvas.

- `Electric Indigo`: `#6200EE`
  Uso: identidad de marca, botones primarios, tabs activas, selección, indicadores de foco.

- `Cyan Neon`: `#00F3BB`
  Uso: confirmaciones, estados positivos, montos acreditados, progreso favorable, badges de éxito.

- `Vivid Purple`: `#BB86FC`
  Uso: enlaces, etiquetas secundarias, estados intermedios, rutas digitales, elementos de realce.

- `Light Grey`: `#EAECEF`
  Uso: textos principales, números importantes, títulos, montos, labels de valor.

Colores complementarios sugeridos para superficies y contraste:

- gris carbón para cards profundas,
- borde gris frío muy sutil,
- textos secundarios en gris azulado,
- divisores apenas visibles.

---

## 4. Lenguaje visual deseado

El resultado debe parecer una mezcla entre:

- plataforma fintech institucional,
- exchange cripto profesional,
- terminal de operaciones elegante,
- dashboard de control con alto contraste.

Características visuales:

- dark mode dominante,
- superficies profundas con jerarquía clara,
- cards con bordes sutiles,
- micro acentos neón en estados y cifras relevantes,
- iconografía fina y moderna,
- tablas y listas muy legibles,
- tipografía limpia, sobria y contemporánea,
- densidad media-alta, sin sentirse saturado.

Evitar:

- look genérico de dashboard SaaS,
- gradientes exagerados,
- glassmorphism excesivo,
- demasiados colores simultáneos,
- elementos que parezcan marketing en vez de operación.

---

## 5. Estructura global del portal cliente

Antes de describir cada sección, Stitch debe entender la arquitectura general de navegación.

### 5.1 Shell principal

La experiencia del cliente vive dentro de un layout persistente con:

- barra lateral izquierda fija en desktop,
- header superior con contexto de workspace,
- área principal de contenido,
- soporte para responsive.

### 5.2 Sidebar izquierda

La barra lateral debe incluir:

- marca `Guira`,
- título como `Mesa del cliente` o `Workspace del cliente`,
- breve texto contextual,
- navegación vertical con secciones:
  - Panel
  - Depositar
  - Enviar
  - Proveedores
  - Transacciones
  - Configuración
  - Soporte

Comportamiento visual:

- item activo muy claro,
- ícono y label por sección,
- estado activo con `Electric Indigo` y/o borde iluminado,
- resto de items con tono más apagado.

### 5.3 Header superior

El header debe contener:

- nombre del workspace o título contextual,
- breve explicación de la vista actual,
- campana de notificaciones,
- menú de usuario,
- opción de colapsar sidebar.

Debe sentirse técnico y funcional, no ornamental.

---

## 6. Reglas funcionales generales para todas las vistas

Estas reglas deben reflejarse visualmente:

- El usuario puede navegar aunque no esté verificado.
- Si el perfil no está verificado, las acciones de operación pueden verse deshabilitadas.
- Cada operación se maneja como expediente y no como simple transferencia instantánea.
- Los estados operativos importan más que la decoración.
- La evidencia documental y la trazabilidad deben sentirse parte central del producto.

Estados importantes que deben aparecer en varios lugares:

- `created`
- `waiting_deposit`
- `deposit_received`
- `processing`
- `sent`
- `completed`
- `failed`

El diseño debe comunicar que Guira coordina pasos y validaciones. No es una app de “enviar dinero en un clic”.

---

## 7. Vista 1: Panel

### 7.1 Propósito

Es la vista resumen del cliente. Debe responder:

- cuál es mi estado operativo,
- cuánto tengo o cuánto está en movimiento,
- qué expedientes siguen activos,
- cuál es la siguiente acción importante,
- y cómo entrar rápido a las funciones principales.

### 7.2 Jerarquía visual

La pantalla debe tener 3 zonas claras:

1. un hero operacional o bloque principal de resumen,
2. un conjunto de métricas rápidas,
3. un bloque de actividad y expedientes activos.

### 7.3 Secciones internas

#### A. Encabezado de panel

Debe incluir:

- título como `Panel del cliente`,
- subtítulo explicando que resume wallet, órdenes, transferencias y movimientos,
- botón de actualizar.

#### B. Acciones rápidas

Dos accesos prominentes:

- `Enviar pago`
- `Agregar fondos`

Cada acceso debe verse como card o botón grande con:

- ícono,
- título,
- descripción corta,
- CTA de apertura.

Si el usuario no puede operar, estos accesos deben verse deshabilitados.

#### C. Alertas operativas

Debe existir espacio para:

- alerta de wallet inexistente,
- alerta de operación restringida por onboarding incompleto,
- alerta de acciones pendientes.

Estas alertas no deben sentirse como errores críticos, sino como estados del proceso.

#### D. Métricas principales

Mostrar tarjetas con:

- wallet o moneda activa,
- número de transferencias pendientes,
- cantidad de expedientes activos,
- cantidad de movimientos históricos.

Opcionalmente se puede enriquecer con:

- balance utilizable,
- fondos por conciliar,
- valor total movilizado este mes.

#### E. Resumen financiero

Debe existir una franja o bloque de resumen con:

- montos principales,
- indicador de estado,
- separación entre saldo, fondos en tránsito y órdenes activas.

#### F. Tabs de actividad

Dos tabs ideales:

- `Transferencias activas`
- `Histórico`

En `Transferencias activas`:

- cards o tabla compacta con expedientes vivos,
- badge de estado,
- rail,
- monto,
- siguiente acción.

En `Histórico`:

- lista o tabla con movimientos ya cerrados,
- fecha,
- referencia,
- tipo de operación,
- estado final.

### 7.4 Sensación visual

Esta pantalla debe sentirse como un cockpit de operaciones. El usuario entra aquí para ubicarse inmediatamente.

---

## 8. Vista 2: Depositar

### 8.1 Propósito

Es la vista para iniciar operaciones donde el fondeo viene desde afuera y luego se dirige a una wallet o a Bolivia.

Rutas reales:

- `us_to_wallet`
- `us_to_bolivia`

### 8.2 Objetivo de diseño

La experiencia debe reducir ambigüedad. El usuario debe sentir que está creando un expediente estructurado y no llenando un formulario bancario genérico.

### 8.3 Estructura general sugerida

Usar una composición tipo wizard o formulario guiado en varios bloques.

#### A. Header de sección

Debe contener:

- título como `Depositar a tus rieles de salida`,
- texto explicando que aquí se concentran operaciones donde el dinero viene de EE.UU. o del exterior,
- una etiqueta visual con la ruta o rail principal.

#### B. Selector de ruta

Cards o tabs para elegir:

- `EE.UU. -> Wallet`
- `EE.UU. -> Bolivia`

Cada ruta debe indicar:

- moneda origen,
- moneda destino,
- rail esperado,
- tipo de entrega.

#### C. Formulario principal

El formulario debe organizarse en bloques muy claros:

1. Datos de la operación
   - monto origen,
   - moneda origen,
   - moneda destino,
   - motivo de operación,
   - stablecoin de referencia.

2. Ruta y método
   - rail,
   - delivery method,
   - funding method cuando aplique.

3. Destino
   - wallet de destino o datos bancarios de Bolivia,
   - proveedor seleccionado o captura manual.

4. Datos bancarios o cripto específicos
   - ACH si aplica,
   - SWIFT si aplica,
   - datos blockchain si aplica.

5. Documentación opcional
   - soporte inicial,
   - evidencia posterior.

#### D. Sidebar o panel de resumen en vivo

Muy importante para Stitch:

Debe haber una columna o card persistente con:

- monto origen,
- fee calculado,
- tasa aplicada,
- monto estimado destino,
- rail elegido,
- estado inicial del expediente.

Este panel debe sentirse como “resumen financiero en tiempo real”.

#### E. Instrucciones posteriores a crear

Una vez creada la orden, la interfaz debería poder mostrar:

- instrucciones de fondeo,
- referencia o cuenta destino,
- checklist de próximos pasos,
- botón para subir comprobante.

### 8.4 Elementos importantes de confianza

- nota de que toda operación crea primero una `PaymentOrder`,
- nota de que las instrucciones aparecen solo después de crear el expediente,
- claridad sobre qué datos son obligatorios,
- estado visible: `created` y luego `waiting_deposit`.

### 8.5 Sensación visual

Debe verse como un asistente operativo preciso, casi como onboarding de una transacción institucional.

---

## 9. Vista 3: Enviar

### 9.1 Propósito

Es la vista para crear expedientes donde el valor sale desde Bolivia o se mueve entre redes digitales.

Rutas reales:

- `bolivia_to_exterior`
- `crypto_to_crypto`

### 9.2 Diferencia frente a Depositar

Aunque técnicamente comparten motor de `payment_orders`, visualmente `Enviar` debe sentirse más delicado y más enfocado en:

- beneficiario final,
- riesgo de destino,
- confirmación final,
- fee y FX,
- precisión de rails.

### 9.3 Estructura sugerida

#### A. Header de sección

- título como `Enviar valor a otros destinos`,
- descripción sobre salidas desde Bolivia o entre redes,
- indicadores de riesgo o validación.

#### B. Selector de ruta

Opciones:

- `Bolivia -> Exterior`
- `Cripto -> Cripto`

Cada una debe comunicar:

- moneda de salida,
- moneda destino,
- rail,
- tiempo estimado,
- necesidad de validación.

#### C. Wizard o rail de pasos

Esta pantalla se beneficia mucho de un progress rail visible con pasos como:

1. Ruta
2. Destino
3. Montos y fees
4. Confirmación
5. Evidencia

#### D. Bloque de beneficiario / destino

Debe ser prominente y claro.

Puede incluir:

- selección de proveedor guardado,
- resumen del beneficiario,
- datos bancarios o wallet,
- país o red,
- validación visual de compatibilidad.

#### E. Bloque de montos

Sección con:

- monto origen,
- tipo de cambio,
- fee total,
- monto estimado final.

Si la ruta es cripto, mostrar:

- red,
- activo,
- costo de red,
- advertencia de irreversibilidad.

#### F. Bloque de confirmación final

Muy importante:

La interfaz debe enfatizar que no se puede pasar a `processing` sin confirmación expresa de:

- monto,
- FX,
- fee,
- rail,
- beneficiario final.

Visualmente esto debe verse como una tarjeta de “última revisión” de alto peso.

#### G. Estado posterior

Luego de creada la orden, deben aparecer:

- instrucciones de fondeo,
- carga de comprobante,
- estado de aceptación de cotización,
- timeline de expediente.

### 9.4 Sensación visual

Debe sentirse más crítica y precisa que `Depositar`. Menos onboarding y más control.

---

## 10. Vista 4: Proveedores

### 10.1 Propósito

Es la agenda operativa de beneficiarios, contrapartes o destinos reutilizables del cliente.

No es un simple CRUD visual. Debe sentirse como libreta operativa de destinos confiables.

### 10.2 Función real

Aquí el cliente:

- ve proveedores registrados,
- crea nuevos,
- edita,
- elimina,
- y luego reutiliza esos datos en `Enviar` o `Depositar`.

### 10.3 Estructura sugerida

#### A. Header de sección

- título como `Agenda operativa de proveedores`,
- descripción que explique que son destinos reutilizables,
- contador de proveedores,
- filtro o búsqueda.

#### B. Vista principal de listado

Puede resolverse como:

- cards por proveedor,
- o tabla enriquecida,
- o layout maestro-detalle.

Cada proveedor debe mostrar:

- nombre,
- país,
- método de pago principal,
- datos clave resumidos,
- email,
- teléfono,
- tax id,
- estado visual del método.

#### C. Indicadores de método

El diseño debe diferenciar claramente proveedores:

- ACH,
- SWIFT,
- Crypto.

Cada método puede tener:

- badge,
- ícono,
- color acento,
- bloque de detalles.

#### D. Formulario de alta y edición

Debe ser potente y ordenado.

Campos base:

- nombre,
- país,
- método de pago,
- address,
- phone,
- email,
- tax_id.

Campos condicionales:

- ACH:
  - bank name,
  - routing number,
  - account number,
  - bank country.

- SWIFT:
  - bank name,
  - swift code,
  - account number,
  - bank country,
  - iban,
  - bank address.

- Crypto:
  - wallet address,
  - network.

#### E. Acciones sobre proveedor

Cada card o detalle debe permitir:

- editar,
- eliminar,
- reutilizar para nueva orden.

### 10.4 Sensación visual

Debe sentirse como directorio de beneficiarios de alto valor, no como agenda básica.

---

## 11. Vista 5: Transacciones

### 11.1 Propósito

Es la vista de seguimiento integral del cliente.

Debe consolidar:

- transferencias activas,
- movimientos y operaciones,
- expedientes,
- bitácora o actividad relevante.

### 11.2 Objetivo visual

Esta es probablemente la vista más importante después del panel. Debe comunicar estado y trazabilidad con mucha claridad.

### 11.3 Estructura sugerida

#### A. Header de sección

- título como `Seguimiento integral de tus operaciones`,
- subtítulo que explique que aquí conviven transferencias y expedientes,
- filtros de fecha, estado o tipo.

#### B. Tabs principales

Tabs sugeridas según la app real:

- `Transferencias y movimientos`
- `Expedientes`

#### C. Tab 1: Transferencias y movimientos

Debe mostrar:

- operaciones activas,
- movimientos recientes,
- rails implicados,
- fechas,
- monto,
- status,
- referencia.

Esta parte puede usar:

- tabla con badges,
- cards compactas,
- timeline híbrido.

#### D. Tab 2: Expedientes

Debe ser más documental y operativa.

Cada expediente debería poder mostrar:

- order id,
- tipo de operación,
- rail,
- proveedor o destino,
- monto origen,
- monto final estimado,
- estado,
- fecha de creación,
- evidencia cargada o pendiente,
- posibilidad de cancelar si aún está permitido,
- posibilidad de subir archivo.

#### E. Bitácora visual o actividad

Idealmente esta vista debe incluir algún tipo de timeline o lista de eventos:

- expediente creado,
- evidencia subida,
- depósito notificado,
- cotización preparada,
- cotización aceptada,
- operación completada.

### 11.4 Estados y badges

Los estados deben ser un componente clave del diseño:

- `created`: neutro,
- `waiting_deposit`: morado o intermedio,
- `processing`: indigo o estado activo,
- `completed`: cyan/verde neón,
- `failed`: rojo controlado.

### 11.5 Sensación visual

Debe sentirse como el centro de seguimiento y prueba documental del cliente.

---

## 12. Vista 6: Configuración

### 12.1 Propósito

Es una vista de ajustes de perfil y preferencias de experiencia. No crea nuevas tablas de negocio; mezcla datos reales del perfil con preferencias locales del navegador.

### 12.2 Secciones reales

#### A. Ajustes de perfil

Mostrar información real del cliente:

- nombre,
- email,
- rol,
- estado de onboarding.

Cada dato puede vivir en cards informativas.

#### B. Preferencias de cuenta

Estas preferencias se guardan localmente:

- montos compactos,
- foco en transacciones,
- resaltar aprobaciones pendientes.

Visualmente esto puede verse como:

- switches,
- toggles elegantes,
- cards seleccionables,
- o lista de preferencias con descripciones.

#### C. Accesos de cuenta

Atajos a:

- perfil operativo o onboarding,
- transacciones,
- soporte.

### 12.3 Objetivo visual

Esta pantalla debe sentirse más tranquila y menos transaccional, pero seguir dentro del mismo universo visual.

### 12.4 Sensación visual

Más sobria, más administrativa, más orientada a control de preferencias y perfil.

---

## 13. Vista 7: Soporte

### 13.1 Propósito

Es la pantalla donde el cliente puede abrir tickets y revisar su historial de soporte.

### 13.2 Objetivo funcional

Debe hacer fácil:

- abrir un ticket bien contextualizado,
- dejar un asunto claro,
- añadir mensaje y contacto,
- y revisar el estado de tickets anteriores.

### 13.3 Composición ideal

Layout de dos columnas:

- columna izquierda para crear ticket,
- columna derecha para listado e historial.

### 13.4 Columna izquierda: formulario

Campos:

- asunto,
- email de contacto,
- teléfono alternativo opcional,
- descripción del problema.

CTA principal:

- `Enviar Ticket`

El formulario debe sentirse cercano pero serio. No tipo chat informal.

### 13.5 Columna derecha: listado de tickets

Tabla o lista con:

- fecha,
- asunto,
- estado.

Estados:

- abierto,
- en progreso,
- resuelto,
- cerrado.

### 13.6 Mejoras visuales sugeridas

Aunque el frontend actual es funcional y simple, el diseño de Stitch puede elevar esta vista añadiendo:

- tarjeta de caso destacado,
- badges de SLA o tiempo estimado,
- timeline de conversación,
- estados de respuesta.

### 13.7 Sensación visual

Debe transmitir soporte operativo serio y bien trazado, no helpdesk genérico.

---

## 14. Comportamientos y estados transversales que Stitch debe contemplar

Estas condiciones deben poder representarse visualmente en varias pantallas:

### A. Estado de carga

- skeletons,
- loaders discretos,
- cards vacías con shimmer.

### B. Estado vacío

Ejemplos:

- no hay wallet,
- no hay proveedores,
- no hay tickets,
- no hay movimientos,
- no hay expedientes.

### C. Estado de error

- tarjeta de error con posibilidad de reintentar,
- texto claro,
- tono serio pero no alarmista.

### D. Estado restringido

Si el usuario no está verificado:

- puede navegar,
- pero no puede operar.

Esto debe verse con:

- banners,
- acciones deshabilitadas,
- mensajes de contexto.

### E. Estado de confirmación

Especialmente en `Enviar` y `Depositar`, debe existir una sensación de checkpoints y validación explícita.

---

## 15. Reglas de contenido y copy

La propuesta visual debe usar lenguaje:

- directo,
- profesional,
- financiero,
- operativo,
- claro.

Evitar copy:

- demasiado publicitario,
- juvenil,
- exageradamente informal.

Preferir frases como:

- `Orden creada`
- `Esperando comprobante`
- `Cotización pendiente de aceptación`
- `Destino verificado`
- `Rail seleccionado`
- `Evidencia cargada`
- `Operación completada`

---

## 16. Prompt consolidado sugerido para Stitch

Usa este prompt como base:

> Diseña la experiencia completa del portal cliente de una plataforma financiera híbrida llamada Guira. No es un banco ni una wallet cripto simple; es una herramienta de orquestación y trazabilidad de operaciones financieras sobre rails como ACH, SWIFT, PSAV y redes blockchain. El estilo debe ser dark mode premium, profesional, preciso y con estética de terminal fintech/cripto institucional.
>
> Usa esta paleta:
> - Fondo principal `#0B0E11`
> - Color de marca y foco `#6200EE`
> - Confirmación y éxito `#00F3BB`
> - Acento secundario `#BB86FC`
> - Texto principal `#EAECEF`
>
> Diseña estas 7 vistas del cliente:
> 1. Panel
> 2. Depositar
> 3. Enviar
> 4. Proveedores
> 5. Transacciones
> 6. Configuración
> 7. Soporte
>
> La navegación debe tener sidebar izquierda y header superior. La interfaz debe comunicar estados operativos, expediente financiero, evidencia documental, cotización, rail utilizado, destino y siguiente acción requerida.
>
> Requisitos por pantalla:
> - Panel: hero de resumen, métricas, accesos rápidos, actividad y expedientes activos.
> - Depositar: formulario guiado por ruta, rail, datos de destino, resumen financiero en tiempo real e instrucciones posteriores al crear la orden.
> - Enviar: wizard con foco en beneficiario, monto, fee, FX, rail y confirmación final obligatoria.
> - Proveedores: agenda operativa con cards o maestro-detalle, métodos ACH/SWIFT/Crypto, y formulario avanzado de alta/edición.
> - Transacciones: vista de seguimiento con tabs para movimientos y expedientes, estados claros, referencias, actividad y trazabilidad.
> - Configuración: perfil, preferencias de experiencia y accesos rápidos a onboarding, transacciones y soporte.
> - Soporte: layout de dos columnas con formulario para crear ticket y tabla/lista de historial con estados.
>
> El resultado debe evitar un look SaaS genérico. Debe sentirse como un sistema operativo financiero moderno, con alta legibilidad, densidad media-alta, jerarquía fuerte, badges de estado, tablas elegantes, cards profundas y acentos neon sobrios. Prioriza claridad operativa por encima de decoración.

---

## 17. Recomendación de uso

Si vas a pasar este brief a Stitch, lo ideal es:

1. pedir primero el sistema general del portal cliente,
2. luego pedir una iteración por pantalla,
3. después pedir variantes de la vista `Panel` y `Transacciones`,
4. y finalmente bajar a componentes concretos.

Las vistas más importantes para empezar son:

1. `Panel`
2. `Transacciones`
3. `Enviar`

Porque son las que mejor resumen el valor de Guira y su complejidad operativa.
