export interface DocumentRequirement {
  id: string
  title: string
  helperText?: string
  accept?: string
}

export const getRequiredDocumentsForId = (idType: string | undefined): DocumentRequirement[] => {
  const commonDocs: DocumentRequirement[] = []

  switch (idType) {
    case 'passport':
      commonDocs.push(
        { id: 'passport', title: 'Página de Información del Pasaporte', helperText: 'Sube la página de información principal', accept: 'image/*,.pdf' }
      )
      break
    case 'national_id':
      commonDocs.push(
        { id: 'national_id_front', title: 'Anverso Cédula de Identidad', helperText: 'Imagen clara del frente de tu DNI', accept: 'image/*,.pdf' },
        { id: 'national_id_back', title: 'Reverso Cédula de Identidad', helperText: 'Imagen clara de la parte posterior', accept: 'image/*,.pdf' }
      )
      break
    case 'drivers_license':
      commonDocs.push(
        { id: 'drivers_license_front', title: 'Anverso Licencia de Conducir', helperText: 'Imagen clara del frente', accept: 'image/*,.pdf' },
        { id: 'drivers_license_back', title: 'Reverso Licencia de Conducir', helperText: 'Imagen clara de la parte posterior', accept: 'image/*,.pdf' }
      )
      break
    default:
      // Fallback a solo pedir el documento genérico si no reconocemos el caso
      if (idType) {
        commonDocs.push({ id: idType, title: 'Documento de Identidad', helperText: 'Sube tu documento de identidad', accept: 'image/*,.pdf' })
      }
      break
  }

  // Si hay al menos un ID type seleccionado válido y registrado, añadimos selfie por requerimiento general de Onboarding
  if (idType) {
    commonDocs.push({
      id: 'selfie',
      title: 'Fotografía Selfie',
      helperText: 'Selfie del usuario sosteniendo el documento de identidad cerca de su rostro',
      accept: 'image/*'
    })
  }

  return commonDocs
}
