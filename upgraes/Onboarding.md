## Mejora de funcionalidad – Vista de Admin y Staff

### Ubicación

**Ruta dentro del sistema:**

```
Panel → Onboarding
```

### Objetivo

Modificar la acción **“Ver detalles”** de cada registro de onboarding para que **redirija a una nueva vista de detalle** donde el administrador o staff pueda revisar toda la información relacionada con la transacción y la verificación del usuario.

Esta nueva vista debe mostrar la información organizada mediante **pestañas (tabs)** para facilitar la revisión.

---

# Estructura de la nueva vista de detalle

La ventana debe contener las siguientes **tres pestañas principales**:

1. **Información personal**
2. **Documentos**
3. **Verificación**

---

# 1. Pestaña: Información personal

En esta sección se deben mostrar todos los datos personales disponibles del usuario registrados en la base de datos.

### Campos mínimos a mostrar

* **Nombre**
* **Apellido**
* **Fecha de nacimiento**

### Requisitos adicionales

* Mostrar **todos los campos adicionales disponibles en la base de datos** relacionados con la información personal del usuario.
* Los datos deben mostrarse en **modo solo lectura**.
* La información debe estar organizada en un layout claro (por ejemplo grid de 2 columnas).

---

# 2. Pestaña: Documentos

En esta sección se deben mostrar **todos los documentos que el usuario haya cargado durante el proceso de onboarding/KYC/KYB**.

### Información a mostrar por documento

Para cada documento mostrar:

* **Tipo de documento**
* **Número de documento**
* **Fecha de creación o subida**
* **Vista previa del documento (si es posible)**

### Acciones administrativas

Para cada documento agregar los siguientes **botones de acción**:

* **Aprobar documento**
* **Rechazar documento**
* **Solicitar cambios**

### Comportamiento esperado

* Las acciones deben **actualizar el estado del documento en el sistema**.
* Si se selecciona **Solicitar cambios**, permitir agregar un **comentario o motivo** para que el usuario pueda corregir el documento.

---

# 3. Pestaña: Verificación

Esta sección debe mostrar el **estado actual del proceso de verificación del usuario**.

### Información sugerida

* Estado del KYC/KYB
* Fecha de envío
* Fecha de revisión
* Historial de cambios de estado
* Comentarios del revisor

---

# Consideraciones de UI/UX

* Usar **tabs o secciones claramente diferenciadas**.
* Mantener la navegación simple para **facilitar el trabajo del staff de revisión**.
* Las acciones administrativas deben ser **claras y visibles**.
