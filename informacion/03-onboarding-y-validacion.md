# Onboarding y Validacion

## Objetivo del modulo

El onboarding resuelve el alta operativa del cliente. No es solo un formulario. Es un flujo KYC/KYB con persistencia de borrador, carga progresiva de documentos, estados y aprobacion interna.

## Tipos de onboarding

- `personal`
- `company`

## Estados detectados

En el frontend aparecen estos estados:

- `draft`
- `submitted`
- `under_review`
- `verified`
- `rejected`
- `needs_changes`
- `waiting_ubo_kyc`

En `src/lib/supabase.ts` el tipo base oficial define:

- `draft`
- `submitted`
- `under_review`
- `verified`
- `rejected`
- `needs_changes`

El frontend tambien usa `waiting_ubo_kyc`, por lo que la reimplementacion debe tratarlo como estado valido del backend aunque no este tipado en un archivo.

## Estructura general del formulario

Campos base identificados en `formData`:

- `email`
- `phone`
- `first_names`
- `last_names`
- `dob`
- `nationality`
- `occupation`
- `purpose`
- `source_of_funds`
- `estimated_monthly_volume`
- `street`
- `city`
- `state_province`
- `postal_code`
- `country`
- `id_number`
- `id_expiry`
- `tax_id`
- `company_legal_name`
- `registration_number`
- `country_of_incorporation`
- `entity_type`
- `incorporation_date`
- `business_description`
- `business_street`
- `business_city`
- `business_country`
- `legal_rep_first_names`
- `legal_rep_last_names`
- `legal_rep_position`
- `legal_rep_id_number`
- `id_document_type`
- `ubos`

## Documentos principales

Archivos principales controlados por el frontend:

- `id_front`
- `id_back`
- `selfie`
- `proof_of_address`
- `company_cert`
- `legal_rep_id`

Documentos por UBO:

- se guardan por indice y tipo,
- el `doc_type` en base de datos toma forma `ubo_{index}_{docKey}`.

## Persistencia de borrador

El onboarding usa dos niveles de persistencia:

### 1. Persistencia local

Se guardan en `localStorage`:

- paso actual,
- tipo de onboarding,
- `onboarding_id`,
- `formData`.

Claves usadas:

- `guira_onboarding_step_{userId}`
- `guira_onboarding_type_{userId}`
- `guira_onboarding_id_{userId}`
- `guira_onboarding_data_{userId}`

### 2. Persistencia remota

Se hace `upsert` o `insert` sobre `onboarding` con estado `draft`.

Ademas, cuando el usuario selecciona archivos, el frontend los sube inmediatamente al bucket `onboarding_docs` y registra referencias en `documents`.

## Flujo real del cliente

### Paso A. Carga de datos existentes

Al entrar:

1. busca ultimo onboarding del usuario,
2. si existe, recupera `status`, `type`, `id` y `data`,
3. busca documentos en tabla `documents`,
4. recompone punteros de archivos.

### Paso B. Guardar borrador

Accion:

- `upsert` en `onboarding`

Payload funcional:

- `id` si ya existe,
- `user_id`,
- `type`,
- `status: 'draft'`,
- `data: formData`,
- `updated_at`.

Tambien registra actividad:

- `guardar_borrador`

### Paso C. Envio inicial

Accion:

- sube archivos faltantes a `onboarding_docs`,
- hace `upsert` en `onboarding` con `status: 'submitted'`,
- actualiza `profiles.onboarding_status = 'submitted'`,
- actualiza `profiles.full_name`.

Actividad registrada:

- `enviar_onboarding`

### Paso D. Documentacion de socios o UBOs

Cuando corresponde:

- sube docs de UBOs,
- actualiza `onboarding.status = 'under_review'`,
- persiste `data.ubos`,
- actualiza `profiles.onboarding_status = 'under_review'`.

Actividad registrada:

- `enviar_docs_socios`

### Paso E. Reintento por observaciones

Si el usuario debe corregir:

- actualiza `onboarding.status = 'needs_changes'`,
- actualiza `profiles.onboarding_status = 'needs_changes'`,
- reinicia el paso visible.

## Validaciones visibles en frontend

Se detectan estas validaciones:

- campos obligatorios por paso,
- trim de textos,
- control basico de fechas,
- numeric inputs sin `e`, `E`, `+`, `-`,
- documentos y datos distintos segun sea persona o empresa.

## Validacion staff

Desde `StaffPanel` el equipo puede:

- revisar registros de `onboarding`,
- cambiar estado,
- exigir motivo para cambios relevantes,
- sincronizar `profiles.onboarding_status`,
- crear `wallet` al verificar,
- notificar al usuario.

## Comportamiento a preservar en Next.js

- El cliente no debe acceder a operaciones si no esta `verified`.
- El borrador debe sobrevivir recargas y cierres.
- La subida de archivos debe ser temprana, no solo al final.
- La UI debe reflejar claramente el estado actual:
  - enviado,
  - en revision,
  - observado,
  - verificado,
  - rechazado.
