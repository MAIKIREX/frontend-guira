export const ACCEPTED_UPLOAD_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const

export const ACCEPTED_UPLOADS = ACCEPTED_UPLOAD_MIME_TYPES.join(',')
export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024

export function validateDocumentFile(file: File) {
  if (!ACCEPTED_UPLOAD_MIME_TYPES.includes(file.type as (typeof ACCEPTED_UPLOAD_MIME_TYPES)[number])) {
    throw new Error('Tipo de archivo no permitido. Usa JPEG, PNG, WEBP o PDF.')
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error('El archivo supera el limite de 10 MB permitido por el frontend.')
  }
}

export function safeFileExtension(fileName: string) {
  const extension = fileName.includes('.') ? fileName.split('.').pop() : 'bin'
  return String(extension ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
}
