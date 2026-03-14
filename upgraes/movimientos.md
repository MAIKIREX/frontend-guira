En la seccion de Depositar y enviar

tengo observaciones en la primera seccion que es:

Define la ruta y el expediente

en este apartado me salen tres campos

monto destino
Tipo de Cambio
Fee total

estos campos deverian ser solo de lectura por los clientes y no que puedan modificarlo el vlaor de Tipo de cmabio y fee total es debe de colocarlo en el sistema ya sea por el admin o staff y que en la vista del cliente solo vea el calculo de cuando le llegara al destino.

---

ahora vamos a simplificar los datos que mostramos en estas ventanas.

quiero que se enfoque netamente en la logica del sistema en este apartado veremos primero la pestaña de Depositar:

quiero que se divida el formulario por etapas y que en la parte superior se muestre la etapa en la que me encuentro lo dividiremos en 4

en la primera etapa escogere el origen:

me mostrara dos opciones

 Exsterior a Bolivia
 USA a Wallet

---

segunda etapa Detalle (Exterior a Bolivia):

me manda un campo de monto

mandar la direccion de mi cuenta o mandar una imagen de mi qr bancario

la App hace: Calcula el fee de red y la comisión de servicio. Registra la orden como created.

---

tercera etapa (revision)

en esta etapa me muestra un resumen de los atos introducidos y me da la opcion de confirmar con esto ya termina la etapa de la creacion del movimiento

en esta etapa la App hace: Crea la orden vinculando tu cuenta local como destino final

---

cuarta etapa finalizacion

en esta etapa me muestra un campo para añadir el comprobante del deposito y con eso termina el flujo.
pero el usuario peude pasar de esta etapa si no lo tiene en este momento pero peude completar el flujo desde la pestaña de "transacciones".

---

ahora veamos la segunda ruta:
recibir en cripto

segunda etapa 

ingreso el monto en USD
la dereccion de mi billetera
la red

la App hace: Calcula el fee de red y la comisión de servicio. Registra la orden como created.

---

tercera etapa (revision)

en esta etapa me muestra un resumen de los datos introducidos y me da la opcion de confirmar con esto ya termina la etapa de la creacion del movimiento

---

cuarta etapa finalizacion

en esta etapa me muestra un campo para añadir el comprobante del deposito y con eso termina el flujo.
pero el usuario peude pasar de esta etapa si no lo tiene en este momento pero peude completar el flujo desde la pestaña de "transacciones".
El estado pasa a waiting_deposit.

---

## ahora proseguimos la ruta para envios

quiero que se enfoque netamente en la logica del sistema en este apartado veremos primero la pestaña de Depositar:

quiero que se divida el formulario por etapas y que en la parte superior se muestre la etapa en la que me encuentro lo dividiremos en 4

en la primera etapa escogere el origen:

me mostrara dos opciones

 Bolivia a Exterior
 Cripto a Cripto

---

segunda etapa Detalle (Bolivia a Exterior) (Creacion de la orden "PaymentOrder")

introduces el monto en Bolivianos

introdusco los datos del Beneficiario aqui tiene que haber un campo para escoger de los proveedores que ya tengo guardados y si no tengo uno nuevo me de la opcion de añadir uno nuevo.

tengo que introducir el motivo de pago

y el documento de respaldo

La App hace: Crea un registro único (id de orden) y pone el estado en created. 

---

tercera etapa (revision)

en esta etapa me muestra un resumen de los atos introducidos y me da la opcion de confirmar con esto ya termina la etapa de la creacion del movimiento

---

cuarta etapa finalizacion

App hace: Te muestra un QR o datos de cuenta PSAV específicos para esa orden.
pero el usuario puede pasar de esta etapa si no lo tiene en este momento pero peude completar el flujo desde la pestaña de "transacciones".

---

ahora veamos la segunda ruta:
Enviar Cripto a Cripto

segunda etapa 

ingreso el monto en USDC
introdusco los datos del Beneficiario aqui tiene que haber un campo para escoger de los proveedores que ya tengo guardados y si no tengo uno nuevo me de la opcion de añadir uno nuevo.

---

tercera etapa (revision)

en esta etapa me muestra un resumen de los datos introducidos y me da la opcion de confirmar con esto ya termina la etapa de la creacion del movimiento

---

cuarta etapa finalizacion

App hace: Te muestra la dirección de depósito de Guira.
pero el usuario puede pasar de esta etapa si no lo tiene en este momento pero puede completar el flujo desde la pestaña de "transacciones".
El estado pasa a waiting_deposit.

---
---


en esta pestaña quiero que se divida en dos pestañas:

transferencias y movimientos
expedientes

En la pestaña de transferencias y movimientos quiero que se muestren todas las transacciones que se han realizado en la cuenta, ya sean depositos o envios.

En la pestaña de expedientes quiero que se muestren todos los expedientes que se han creado en la cuenta.

estos campos ya los tiene la aplicacion solo que quiero que se muestren en dos pestañas separadas.

en el apartado de expedientes quiero que tenga la opcion de colapzar los expedientes ya que en esta seccion se podra completar los procesos.

que tambien haya un filtro por estado de los expedientes y que tenga un buscador por numero de expediente.
