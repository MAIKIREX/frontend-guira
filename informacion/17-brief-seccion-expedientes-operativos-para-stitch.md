# Guira - Brief detallado de la seccion de expedientes operativos para Stitch

## Objetivo

Este documento describe con detalle una seccion de interfaz inspirada en una mesa bancaria/crypto moderna para que Stitch pueda generar una propuesta visual de alta calidad.

La seccion corresponde al historial y seguimiento de `payment_orders` del cliente. No debe sentirse como una simple tabla de transacciones ni como un dashboard SaaS generico. Debe parecer un centro de control operativo donde cada orden funciona como un expediente financiero con trazabilidad, documentos, estados y siguiente accion.

---

## 1. Que es esta seccion

Es una vista donde el cliente revisa todas sus ordenes de pago o fondeo.

Cada item no es solo un registro, sino un expediente operativo completo que contiene:

- identificador de orden,
- tipo de operacion,
- rail de procesamiento,
- proveedor o contraparte,
- montos de origen y destino,
- estado actual,
- linea de proceso,
- documentos subidos,
- cotizacion final,
- actividad visible,
- y acciones disponibles.

La idea principal es que el usuario pueda entrar aqui y responder inmediatamente:

- que ordenes siguen abiertas,
- en que etapa esta cada una,
- que tengo que hacer ahora,
- que archivos faltan,
- y si ya existe una cotizacion o comprobante final.

---

## 2. Sensacion visual deseada

La sensacion debe ser:

- formal,
- institucional,
- moderna,
- precisa,
- fintech,
- y con un matiz crypto profesional.

Debe recordar una mezcla entre:

- private banking dashboard,
- operations desk,
- exchange crypto institucional,
- y panel de cumplimiento financiero.

Evitar por completo:

- demasiadas cards dentro de cards,
- look de app de productividad generica,
- exceso de gradientes decorativos,
- layouts juguetones,
- widgets innecesarios,
- exceso de iconos sin funcion.

La prioridad es transmitir control, trazabilidad y sobriedad.

---

## 3. Composicion general de la seccion

La seccion completa se organiza en 2 grandes niveles:

### Nivel 1. Barra superior de control

Arriba existe un bloque horizontal de contexto, no una card tipica.

Este bloque debe incluir:

- un eyebrow o etiqueta superior como `Bitacora operativa`,
- un titulo fuerte como `Expedientes con lectura bancaria y trazabilidad crypto`,
- un subtitulo corto que explique que desde esta vista se puede revisar estado, documentos y flujo,
- dos metricas compactas:
  - `Visibles`
  - `En curso`
- buscador por numero de expediente,
- filtro por estado.

La funcion de este bloque es ubicar al usuario antes de entrar al detalle.

### Nivel 2. Lista de expedientes

Debajo aparece una lista vertical de expedientes.

Cada expediente es un panel expandible de alto valor visual. Debe sentirse como un dossier operativo premium, no como una fila de tabla ni como una card comercial.

---

## 4. Estructura de cada expediente

Cada expediente debe tener dos capas:

### A. Cabecera institucional

Es la parte siempre visible incluso antes de expandir.

Debe contener:

- una pequeña etiqueta superior que clasifique el momento del flujo:
  - `Preparacion`
  - `Fondeo`
  - `Control`
  - `Ejecucion`
  - `Liquidacion`
  - `Cierre`
  - `Incidencia`
- badge de estado principal:
  - `Orden creada`
  - `Esperando deposito`
  - `Deposito validado`
  - `Procesando`
  - `Enviado`
  - `Completado`
  - `Fallido`
- badges secundarios para:
  - tipo de operacion,
  - rail de procesamiento.
- titulo principal:
  - `Expediente #XXXXXXXX`
- descripcion secundaria:
  - fecha de creacion,
  - moneda destino,
  - y una breve explicacion del flujo.
- una linea de metadata rapida:
  - proveedor,
  - monto origen,
  - monto destino.
- acciones a la derecha:
  - expandir o colapsar,
  - descargar PDF,
  - cancelar si aplica.

Esta cabecera debe sentirse elegante y compacta, como un encabezado de expediente financiero real.

### B. Cuerpo expandido

Cuando el expediente se expande, no debe abrir una cascada de cards anidadas. En su lugar debe revelar una composicion de panel dividido en dos columnas.

#### Columna izquierda

Es la zona de lectura operativa principal.

Contiene:

1. Resumen ejecutivo
2. Linea de proceso
3. Cuenta para depositar, si aplica
4. Cotizacion final

#### Columna derecha

Es la zona de accion y soporte documental.

Contiene:

1. Mesa de accion
2. Documentacion
3. Actividad
4. Avisos especiales, si aplica

La separacion entre columnas debe resolverse con divisores, cambios sutiles de superficie o fondos ligeramente distintos, no con tarjetas pesadas.

---

## 5. Descripcion detallada de cada sub-bloque

### 5.1 Resumen ejecutivo

Es un bloque breve al inicio del cuerpo expandido.

Debe contener tres metricas horizontales:

- `Contraparte`
- `Monto origen`
- `Monto destino`

Estas metricas deben verse como modulos compactos y sobrios, con tipografia fuerte y labels en uppercase pequeno.

La metrica de monto destino puede tener un acento mas visible porque representa el resultado final esperado.

El objetivo de este bloque es ofrecer una lectura instantanea de la operacion sin obligar al usuario a bajar.

### 5.2 Linea de proceso

Este es uno de los bloques mas importantes.

Debe mostrar una secuencia horizontal de etapas:

1. Orden creada
2. Esperando deposito
3. Deposito validado
4. Procesando
5. Enviado
6. Completado

Cada etapa debe aparecer como un modulo limpio con:

- numero secuencial,
- nombre de la etapa,
- y una etiqueta secundaria:
  - `Etapa actual`
  - `Etapa completada`
  - `Pendiente`

Visualmente:

- etapa actual: acento cyan o azul tecnico,
- etapa completada: verde controlado,
- etapa pendiente: neutral.

No debe parecer un stepper infantil. Debe parecer timeline operativo de mesa de dinero.

### 5.3 Cuenta para depositar

Este bloque solo aparece en ordenes donde el cliente necesita instrucciones de fondeo.

Aqui Stitch debe entender algo muy importante:

las tarjetas visuales llamativas pueden existir aqui porque representan instrumentos o instrucciones de deposito. En esta zona si se admite un poco mas de expresividad visual.

Debe incluir:

- titulo claro,
- texto corto explicando que estos son los datos para fondear la orden,
- grilla de instrucciones de deposito,
- posibles tarjetas con estilo premium para cuenta bancaria, QR o wallet.

Estas piezas pueden sentirse mas "crypto-financial instrument", pero el resto de la seccion debe mantenerse sobrio para equilibrar.

### 5.4 Cotizacion final

Este bloque muestra el snapshot financiero final que publica staff.

Debe incluir:

- encabezado con titulo y microdescripcion,
- badge opcional de `Actualizado por staff`,
- badge con fecha si la cotizacion ya fue preparada,
- tres metricas comparativas:
  - `Tipo de cambio`
  - `Monto convertido`
  - `Fee total`
- cuando exista cambio respecto al valor anterior, la metrica correspondiente debe resaltarse.
- una nota inferior de estado textual explicando si:
  - la cotizacion aun no existe,
  - ya fue publicada,
  - o ya siguio su curso dentro de la orden.

Este bloque debe sentirse como snapshot de ejecucion, no como una calculadora.

### 5.5 Mesa de accion

Este bloque vive en la columna derecha y responde una sola pregunta:

`Que sigue ahora para esta orden`

Debe verse como una pieza de guidance sobria, con:

- label superior pequeno,
- mensaje principal en texto claro y legible,
- tono institucional.

No debe parecer un warning. Debe parecer una instruccion operativa.

### 5.6 Aviso especial

Este bloque aparece solo en estados particulares.

Ejemplo:

- cuando el deposito ya fue validado pero aun falta la cotizacion final.

Debe verse como un notice elegante con:

- icono pequeno,
- titulo corto,
- descripcion breve,
- borde dashed suave,
- fondo apenas diferenciado.

No debe verse alarmista. Debe comunicar espera operativa.

### 5.7 Documentacion

Este bloque es clave porque el producto no solo mueve dinero, tambien organiza evidencia.

Debe mostrar:

- estado de archivos disponibles:
  - respaldo documental,
  - comprobante o evidencia,
  - comprobante staff.
- cada item debe dejar claro si ya existe archivo o si esta pendiente.
- si la orden sigue abierta, deben existir modulos para subir archivo.

Los uploaders deben verse limpios y profesionales:

- area de dropzone,
- boton de subir,
- estado del archivo ya entregado,
- preview o link del archivo listo para cargar.

Muy importante:

esta parte debe sentirse integrada al expediente, no como un formulario aparte pegado abajo.

### 5.8 Actividad

Debe ser una bitacora visual compacta de eventos visibles para el cliente.

Cada evento debe mostrar:

- nombre del evento humanizado,
- fecha y hora,
- una pequena etiqueta secundaria como `Evento visible`.

El formato ideal no es una tabla, sino una lista vertical limpia, casi como un registro de auditoria resumido.

---

## 6. Sistema visual recomendado

### Paleta

La base puede ser clara o semioscura segun la propuesta de Stitch, pero debe mantener una temperatura fria y financiera.

Sugerencia:

- fondo base: gris muy oscuro, azul pizarra o superficie neutra premium,
- bordes: lineas suaves de bajo contraste,
- texto principal: gris claro o casi blanco,
- texto secundario: gris frio,
- acento primario: cyan tecnico o azul electrico controlado,
- exito: verde suave y profesional,
- warning: ambar discreto,
- fallo: rojo profundo contenido.

### Profundidad

Usar principalmente:

- bordes finos,
- cambios de superficie muy sutiles,
- poco shadow,
- separacion por layout y divisores.

No mezclar demasiadas capas de elevacion.

### Tipografia

Debe sentirse:

- tecnica,
- limpia,
- bancaria,
- moderna.

Ideal para:

- titulos con tracking ajustado,
- labels uppercase pequenos,
- numeros importantes con mayor presencia,
- algunos valores con estilo monospace o financiero si ayuda.

### Densidad

Densidad media-alta.

Debe verse profesional y eficiente, no espaciosa como landing page. Pero tampoco apretada como terminal legacy.

---

## 7. Reglas de UX que Stitch debe respetar

- El usuario debe ubicar su siguiente accion en menos de 3 segundos.
- El estado actual de la orden debe ser obvio.
- El rail y el tipo de operacion deben verse sin abrir detalles complejos.
- La evidencia documental debe sentirse central al flujo.
- El panel expandido debe ser muy escaneable.
- La jerarquia debe depender mas del layout que de meter cajas por todos lados.
- La seccion debe poder escalar a muchos expedientes sin sentirse pesada.

---

## 8. Que evitar

Evitar especificamente:

- cards dentro de cards dentro de cards,
- esquemas tipicos de dashboard B2B generico,
- iconos enormes,
- mucha decoracion glassmorphism,
- acentos morados por defecto en todo,
- modulos demasiado redondeados y juguetones,
- separar cada trozo de informacion en una tarjeta distinta,
- tablas frias sin sentido editorial.

---

## 9. Prompt consolidado para Stitch

Usa este prompt como base:

> Diseña una seccion de seguimiento de expedientes financieros para una plataforma llamada Guira. La interfaz debe sentirse como una mezcla entre mesa bancaria digital, panel de operaciones financieras y dashboard crypto institucional. No es una tabla simple ni una lista de transacciones generica; cada item es un expediente operativo completo con estado, documentos, timeline, cotizacion y siguiente accion.
>
> La seccion debe tener arriba una barra de contexto con titulo, subtitulo, metricas compactas, buscador y filtro. Debajo debe aparecer una lista de expedientes expandibles.
>
> Cada expediente debe tener una cabecera institucional con:
> - etiqueta del momento del flujo,
> - badge de estado,
> - badges de tipo de operacion y rail,
> - titulo tipo `Expediente #XXXX`,
> - descripcion con fecha y contexto,
> - metadata rapida de proveedor, monto origen y monto destino,
> - botones de expandir, PDF y cancelar.
>
> Al expandirse, cada expediente debe abrir un panel de dos columnas:
> - izquierda: resumen ejecutivo, linea de proceso, cuenta para depositar si aplica, cotizacion final
> - derecha: mesa de accion, documentacion, actividad y avisos operativos
>
> La linea de proceso debe mostrar 6 etapas con estados visuales: actual, completada o pendiente.
>
> La documentacion debe mostrar estatus de archivos y modulos de subida integrados.
>
> La actividad debe verse como bitacora limpia de eventos.
>
> El estilo visual debe ser formal, moderno, preciso y premium. Evita demasiadas cards anidadas. Usa bordes suaves, superficies sutiles, layout editorial y acentos tecnicos en cyan, verde y ambar controlado. Debe sentirse mas cercano a una mesa operativa bancaria/crypto que a un dashboard SaaS generico.

---

## 10. Resultado esperado

Si Stitch interpreta bien este brief, deberia proponer una seccion que:

- se vea mas institucional que una tabla,
- se sienta moderna sin perder seriedad,
- comunique claramente el estado y la accion siguiente,
- integre documentos y actividad sin saturar,
- y convierta cada orden en un expediente visualmente claro, premium y operativo.
