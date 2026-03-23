# Reorganización del Navbar en el modo Admin / Staff

## Objetivo

Reestructurar la navegación del modo **Admin / Staff** para dividir el contenido actual de la pestaña **Panel** en nuevas secciones más claras y escalables.

La intención es mejorar la organización del sistema sin alterar la lógica existente de cada módulo.

## Alcance general

- Reorganizar la navegación principal del modo **Admin / Staff**.
- Dividir el contenido actual en **tres secciones principales**:
  - **Operaciones**
  - **Gobernanza**
  - **Sistema**
- Mover las vistas actuales a sus nuevas pestañas correspondientes.
- **No modificar la lógica interna** de los módulos que ya existen.
- Crear e implementar estos cambios en **una nueva rama**.

---

## Nueva estructura de navegación

### 1. Sección: Operaciones

Esta sección debe agrupar los módulos operativos del día a día.

#### Pestañas dentro de Operaciones

- **Panel**
- **Onboarding**
- **Orders**
- **Payins**
- **Transfers**

#### Contenido de cada pestaña

##### Panel

La nueva pestaña **Panel** debe mostrar únicamente:

- KPIs de operación
- Notificaciones
- Indicadores o alertas de procesos
- Vista del precio del dólar en:
  - compra
  - venta

#### Restricción

La vista del dólar debe ser **solo lectura**.

##### Onboarding

Debe mostrar los registros de **Onboarding** tal como funcionan actualmente dentro del Panel.

#### Instrucción

Mover la sección actual de **Onboarding** desde el Panel hacia esta nueva pestaña, **sin alterar su lógica, comportamiento, componentes ni flujos**.

##### Orders

Debe mostrar las **órdenes** tal como funcionan actualmente dentro del Panel.

#### Instrucción

Mover la sección actual de **Orders** desde el Panel hacia esta nueva pestaña, **sin alterar su lógica, comportamiento, componentes ni flujos**.

##### Payins

Debe incorporarse dentro de **Operaciones**, ubicada al lado de **Orders** en la navegación de esta sección.

##### Transfers

Debe incorporarse dentro de **Operaciones**, ubicada al lado de **Orders** en la navegación de esta sección.

#### Nota importante

Las pestañas **Payins** y **Transfers** también deben quedar dentro de esta sección operativa y formar parte de la nueva estructura del navbar.

---

### 2. Sección: Gobernanza

Esta sección debe agrupar los módulos relacionados con control, soporte y administración de usuarios.

#### Pestañas dentro de Gobernanza

- **Support**
- **Audit**
- **Users**

#### Contenido de cada pestaña

##### Support

Debe mostrar los tickets de soporte tal como funcionan actualmente dentro del Panel.

#### Instrucción

Mover la sección actual de **Support** desde el Panel hacia esta nueva pestaña, **sin alterar su lógica, comportamiento, componentes ni flujos**.

##### Audit

Debe mostrar los logs de auditoría tal como funcionan actualmente dentro del Panel.

#### Instrucción

Mover la sección actual de **Audit** desde el Panel hacia esta nueva pestaña, **sin alterar su lógica, comportamiento, componentes ni flujos**.

##### Users

Debe mostrar la gestión de usuarios tal como funciona actualmente dentro del Panel.

#### Instrucción

Mover la sección actual de **Users** desde el Panel hacia esta nueva pestaña, **sin alterar su lógica, comportamiento, componentes ni flujos**.

---

### 3. Sección: Sistema

Esta sección debe agrupar configuraciones y módulos técnicos del sistema.

#### Pestañas dentro de Sistema

- **Config**
- **PSAV**

#### Contenido de cada pestaña

##### Config

Debe mostrar la configuración actual tal como funciona hoy dentro del Panel.

#### Instrucción

Mover la sección actual de **Config** desde el Panel hacia esta nueva pestaña, **sin alterar su lógica, comportamiento, componentes ni flujos**.

##### PSAV

Debe mostrar la sección de **PSAV** tal como funciona actualmente dentro del Panel.

#### Instrucción

Mover la sección actual de **PSAV** desde el Panel hacia esta nueva pestaña, **sin alterar su lógica, comportamiento, componentes ni flujos**.

---

## Reglas de implementación

- La reorganización debe ser principalmente **estructural y de navegación**.
- No se deben romper flujos existentes.
- No se debe reescribir la lógica actual de cada módulo salvo que sea estrictamente necesario para adaptarlo a la nueva ubicación.
- Si algún módulo depende del estado del Panel actual, se debe conservar ese comportamiento después del traslado.
- Mantener consistencia visual y de naming en todo el navbar y en las pestañas internas.

---

## Resultado esperado

Al finalizar, el modo **Admin / Staff** debe dejar de concentrar todos los módulos dentro de una sola pestaña principal y pasar a una navegación organizada en:

- **Operaciones**
- **Gobernanza**
- **Sistema**

Cada sección debe contener sus respectivas pestañas y reutilizar las vistas actuales ya existentes, moviéndolas a su nuevo lugar sin alterar su lógica.

---

## Requisito adicional

Realizar esta implementación en **una nueva rama**.
