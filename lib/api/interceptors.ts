import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { createClient } from '@/lib/supabase/browser'
import type { ApiError } from './types'

// ── Flag para evitar loops infinitos de refresh ──────
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token!)
    }
  })
  failedQueue = []
}

/**
 * REQUEST INTERCEPTOR
 * Extrae el JWT de la sesión activa de Supabase y lo adjunta al header Authorization.
 * 
 * Flujo:
 * 1. Obtener sesión actual de Supabase
 * 2. Si hay access_token, adjuntarlo como Bearer
 * 3. Si no hay sesión, enviar request sin token (el backend devolverá 401)
 */
export async function attachAuthToken(
  config: InternalAxiosRequestConfig,
): Promise<InternalAxiosRequestConfig> {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.access_token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${session.access_token}`
    }
  } catch (error) {
    console.warn('[API Interceptor] No se pudo obtener sesión Supabase:', error)
    // Continuar sin token — el backend rechazará si es requerido
  }

  return config
}

/**
 * RESPONSE SUCCESS INTERCEPTOR
 * Pasa la respuesta sin modificar. El unwrap de `.data` se hace en los helpers tipados.
 */
export function handleResponseSuccess(response: AxiosResponse): AxiosResponse {
  return response
}

/**
 * RESPONSE ERROR INTERCEPTOR
 * Maneja errores de forma centralizada:
 * 
 * - 401 Unauthorized: Intenta refresh de sesión y retry del request original
 * - 403 Forbidden: Usuario no tiene permisos (rol insuficiente)
 * - 422 Unprocessable: Errores de validación del backend (DTOs)
 * - 429 Too Many Requests: Rate limit alcanzado
 * - 500+ Server Error: Error interno del backend
 * - Network Error: Sin conexión al backend
 */
export async function handleResponseError(error: unknown): Promise<never> {
  // Import dinámico de axios para acceder a isAxiosError
  const axios = (await import('axios')).default

  if (!axios.isAxiosError(error) || !error.response) {
    // Error de red o timeout
    const apiError: ApiError = {
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'No se pudo conectar con el servidor. Verifica tu conexión a internet.',
      timestamp: new Date().toISOString(),
    }
    throw apiError
  }

  const { response, config: originalConfig } = error
  const status = response.status

  // ── 401: Token expirado → Refresh + Retry ──────────
  if (status === 401 && originalConfig && !(originalConfig as any).__isRetry) {
    if (isRefreshing) {
      // Ya hay un refresh en curso, encolar este request
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((token) => {
        originalConfig.headers = originalConfig.headers || {}
        originalConfig.headers.Authorization = `Bearer ${token}`
        return axios.request(originalConfig)
      })
    }

    isRefreshing = true
    ;(originalConfig as any).__isRetry = true

    try {
      const supabase = createClient()
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession()

      if (refreshError || !session?.access_token) {
        processQueue(refreshError, null)
        // Sesión no recuperable — redirigir a login
        window.location.href = '/login?reason=session_expired'
        throw refreshError
      }

      const newToken = session.access_token
      processQueue(null, newToken)

      // Reintentar el request original con el nuevo token
      originalConfig.headers = originalConfig.headers || {}
      originalConfig.headers.Authorization = `Bearer ${newToken}`
      return axios.request(originalConfig)
    } catch (refreshError) {
      processQueue(refreshError, null)
      throw refreshError
    } finally {
      isRefreshing = false
    }
  }

  // ── Construir error tipado para el resto de códigos ──
  const backendError = response.data as Record<string, unknown> | undefined
  const apiError: ApiError = {
    status,
    code: getErrorCode(status, backendError),
    message: getErrorMessage(status, backendError),
    details: backendError?.details as Record<string, string[]> | undefined,
    timestamp: new Date().toISOString(),
  }

  throw apiError
}

// ── Helpers internos ─────────────────────────────────────

function getErrorCode(status: number, body?: Record<string, unknown>): string {
  if (body?.code && typeof body.code === 'string') return body.code

  switch (status) {
    case 400: return 'BAD_REQUEST'
    case 401: return 'UNAUTHORIZED'
    case 403: return 'FORBIDDEN'
    case 404: return 'NOT_FOUND'
    case 409: return 'CONFLICT'
    case 422: return 'VALIDATION_ERROR'
    case 429: return 'RATE_LIMITED'
    default:  return status >= 500 ? 'SERVER_ERROR' : 'UNKNOWN_ERROR'
  }
}

function getErrorMessage(status: number, body?: Record<string, unknown>): string {
  if (body?.message) {
    if (typeof body.message === 'string') return body.message
    if (Array.isArray(body.message)) return body.message.join(', ')
  }

  switch (status) {
    case 400: return 'Solicitud inválida'
    case 403: return 'No tienes permisos para realizar esta acción'
    case 404: return 'Recurso no encontrado'
    case 409: return 'Conflicto: el recurso ya existe o fue modificado'
    case 422: return 'Datos de entrada inválidos. Revisa los campos marcados.'
    case 429: return 'Demasiadas solicitudes. Espera un momento antes de intentar de nuevo.'
    default:  return status >= 500 ? 'Error interno del servidor. Intenta de nuevo más tarde.' : 'Error desconocido'
  }
}
