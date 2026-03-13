# Guira MVP: Guía Detallada de Flujos y Propuesta de Valor

Este reporte explica paso a paso cómo interactúas con Guira, desde la creación de tu cuenta hasta la finalización de una operación, y por qué Guira es diferente a otras soluciones financieras.

---

## 1. El Inicio: Registro y Onboarding
Cuando te unes a Guira, el proceso no es solo crear un usuario, sino preparar tu infraestructura para mover fondos.

1.  **Registro**: Creas tu cuenta en la `AuthPage`.
2.  **Configuración de Perfil (Onboarding)**: La aplicación te guía para completar tus datos. Aquí es donde decides qué tipo de operaciones harás con más frecuencia.
3.  **Seguridad**: Tus datos están vinculados a Supabase, asegurando que solo tú y el equipo administrativo autorizado puedan ver la trazabilidad de tus fondos.

---

## 2. Flujo Operativo Paso a Paso (Ejemplo: Bolivia → Exterior)

Imagina que quieres enviar dinero desde Bolivia a una cuenta en el extranjero. Así interviene la aplicación en cada paso:

### Paso 1: Creación de la Orden (`PaymentOrder`)
*   **Tú haces**: Seleccionas "Nueva Orden", ingresas el monto en Bs. y los datos del beneficiario.
*   **La App hace**: Crea un registro único (`id` de orden) y pone el estado en `created`. **Valor**: Nada se mueve sin un registro previo que garantice orden.

### Paso 2: Instrucciones y Fondeo
*   **App hace**: Te muestra un QR o datos de cuenta **PSAV** específicos para esa orden.
*   **Tú haces**: Realizas la transferencia desde tu banco boliviano y **subes el comprobante** a la plataforma. El estado cambia a `waiting_deposit`.

### Paso 3: Validación de Staff (Intervención Humana/Sistema)
*   **App/Staff hace**: El equipo de Guira ve tu comprobante en su panel. Verifican que los fondos llegaron al riel.
*   **App hace**: El estado cambia a `deposit_received`. Guira ahora "reconoce" que tiene la capacidad de ejecutar tu envío.

### Paso 4: Confirmación Final (Control Total)
*   **App hace**: Te muestra el tipo de cambio aplicado y la comisión final exacta.
*   **Tú haces**: Debes dar un "Aceptar" explícito.
*   **App hace**: El estado cambia a `processing`. Aquí es donde Guira coordina con el riel externo (SWIFT o Blockchain).

### Paso 5: Ejecución y Cierre
*   **App hace**: Una vez que el riel externo confirma el envío, el Staff sube la evidencia (Hash cripto o comprobante bancario).
*   **App hace**: Estado `completed`. Se genera automáticamente un **Recibo PDF** con validez de documentación financiera.

---

### 2.2 Flujo: EE.UU. (ACH) → Wallet (Cripto)
Ideal para quienes reciben pagos en EE.UU. y desean liquidez digital (USDC/USDT).

*   **Paso 1: Configuración**
    *   **Tú haces**: Ingresas el monto en USD y pegas la dirección de tu billetera (Wallet) especificando la red (ej. Polygon).
    *   **App hace**: Calcula el fee de red y la comisión de servicio. Registra la orden como `created`.
*   **Paso 2: Generación de Instrucciones**
    *   **App hace**: Te muestra los datos bancarios del riel **ACH** (Número de cuenta y ruta) exclusivos para tu operación.
*   **Paso 3: Transferencia y Notificación**
    *   **Tú haces**: Realizas la transferencia desde tu banco en EE.UU. y notificas en la App (opcionalmente subes captura). El estado pasa a `waiting_deposit`.
*   **Paso 4: Validación y Ejecución**
    *   **Staff hace**: Confirma la recepción de los fondos en el riel de EE.UU.
    *   **App/Staff hace**: Ejecuta la compra de cripto y el envío a tu wallet. Registra el Hash de la transacción.
*   **Valor**: Convierte saldo bancario bloqueado en EE.UU. en liquidez digital global en minutos/horas.

---

### 2.3 Flujo: Cripto → Cripto (Puente Supervisado)
Para mover valor entre redes (ej. de Solana a Ethereum) evitando errores técnicos.

*   **Paso 1: Selección de Redes**
    *   **Tú haces**: Eliges moneda de origen y moneda/red de destino.
    *   **App hace**: Te obliga a pasar por un "Checklist de Seguridad" para confirmar que la red de destino es compatible.
*   **Paso 2: Depósito en Riel Digital**
    *   **App hace**: Te muestra la dirección de depósito de Guira.
    *   **Tú haces**: Envías los fondos y pegas el **Hash de origen** en la App. Estado: `waiting_deposit`.
*   **Paso 3: Verificación y Envío**
    *   **App/Staff hace**: Verifica el Hash en el explorador de bloques. Una vez confirmado, ejecuta el envío a tu dirección de destino.
*   **Valor**: Actúa como un *Escrow* humano/técnico que previene la pérdida de fondos por errores de red.

---

### 2.4 Flujo: Exterior → Bolivia (Retorno de Capital)
Para traer fondos del mundo directamente a tu cuenta bancaria boliviana.

*   **Paso 1: Declaración y Datos Locales**
    *   **Tú haces**: Indicas cuánto envías desde el exterior. **Obligatorio**: Subes la imagen de tu **QR Bancario** de Bolivia o datos de cuenta.
    *   **App hace**: Crea la orden vinculando tu cuenta local como destino final.
*   **Paso 2: Fondeo Externo**
    *   **Tú haces**: Envías el dinero al riel internacional que te indica la App (SWIFT o Digital). Subes el comprobante de origen.
*   **Paso 3: Validación de Origen**
    *   **Staff hace**: Verifica que los fondos llegaron al riel internacional. Cambia estado a `processing`.
*   **Paso 4: Desembolso y Cierre**
    *   **Staff hace**: Utiliza tu QR/datos para realizar el depósito en Bs. desde el riel local. Suben la foto del comprobante bancario boliviano.
    *   **App hace**: Estado `completed` y genera el PDF de respaldo.
*   **Valor**: Los fondos nunca quedan "volando"; Guira asegura que aterricen directamente en tu cuenta personal en Bolivia con un respaldo legal.

---

## 3. ¿Cómo interviene Guira en tus flujos?

Guira no es un espectador, es el **controlador de tráfico**:

*   **Validador**: Asegura que los datos de destino sean correctos antes de enviar dinero real.
*   **Calculador**: Aplica las reglas de comisiones (`fees.ts`) de forma automática para que no haya sorpresas.
*   **Documentador**: Archiva cada comprobante, fotografía y mensaje de log en `activity_logs` para futuras auditorías o reclamos.
*   **Notificador**: Te avisa por correo o notificaciones internas (`NotificationBell`) en cada cambio de estado.

---

## 4. Diferenciación y Valor Agregado

¿Por qué usar Guira frente a un banco tradicional o una casa de cambio informal?

| Característica | Guira | Banco Tradicional | Informal / "P2P" |
| :--- | :--- | :--- | :--- |
| **Velocidad** | Horas / Mismo día (según riel) | 3-5 días hábiles | Rápido pero arriesgado |
| **Documentación** | PDF detallado con validez legal | Extracto genérico | Ninguna |
| **Transparencia** | Trazabilidad estado por estado | Caja negra hasta que llega | Confianza en la palabra |
| **Costos** | Comisiones competitivas y claras | Comisiones ocultas y mal FX | Tasas arbitrarias |
| **Flexibilidad** | Combina Bancos con Crypto | Solo bancario | Solo efectivo/Inseguro |

### El Valor Único de Guira:
1.  **Cero Custodia Real**: Al no ser un banco, Guira reduce riesgos sistémicos. Es una capa de software que orquesta rieles financieros ya existentes y confiables.
2.  **Multicanalidad Híbrida**: Puedes entrar por un banco boliviano y salir por una billetera de USDT, o entrar por ACH (EE.UU.) y salir por QR en Bolivia. Guira borra las fronteras de los rieles.
3.  **Arquitectura de Orden Primero**: El sistema prohíbe el envío de dinero sin una orden previa, eliminando errores de "depósitos huérfanos" que son comunes en otros sistemas.
