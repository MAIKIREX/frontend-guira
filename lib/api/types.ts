/**
 * Error estandarizado que lanzan los interceptores.
 * Todos los catch blocks de servicios deben tipar contra esto.
 */
export interface ApiError {
  /** HTTP status code (0 = network error) */
  status: number
  /** Código de error interno (e.g., 'VALIDATION_ERROR', 'RATE_LIMITED') */
  code: string
  /** Mensaje legible para el usuario */
  message: string
  /** Detalles de validación por campo (solo en 422) */
  details?: Record<string, string[]>
  /** Timestamp ISO del error */
  timestamp: string
}

/**
 * Respuesta paginada estándar del backend NestJS.
 * Todos los endpoints de listado retornan esta estructura.
 */
export interface PaginatedResponse<T> {
  /** Array de resultados */
  data: T[]
  /** Total de registros que cumplen el filtro */
  total: number
  /** Página actual (1-indexed) */
  page: number
  /** Elementos por página */
  limit: number
}

/**
 * Parámetros de paginación para requests GET de listado.
 */
export interface PaginationParams {
  page?: number
  limit?: number
}

/**
 * Respuesta exitosa simple del backend (para operaciones de escritura).
 */
export interface SuccessResponse {
  message: string
}

/**
 * Helper type guard para verificar si un error es un ApiError.
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    'code' in error &&
    'message' in error
  )
}
