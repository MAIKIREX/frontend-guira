import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { createClient } from '@/lib/supabase/browser'
import { ApiError } from './types'

// ── Flag para evitar loops infinitos de refresh ──────
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error)
    else prom.resolve(token!)
  })
  failedQueue = []
}

/**
 * REQUEST INTERCEPTOR
 * Adjunta el JWT de Supabase al header Authorization, a menos que el llamador
 * ya haya proporcionado uno (e.g. AuthGuard pasando el token directamente).
 */
export async function attachAuthToken(
  config: InternalAxiosRequestConfig,
): Promise<InternalAxiosRequestConfig> {
  // Early-exit si ya viene Authorization — evita timing issues en el boot
  // .has() en AxiosHeaders 1.x es case-insensitive
  const hasAuth = config.headers?.has
    ? config.headers.has('Authorization')
    : !!config.headers?.Authorization
  if (hasAuth) return config

  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.access_token) {
      config.headers ??= {} as InternalAxiosRequestConfig['headers']
      config.headers.Authorization = `Bearer ${session.access_token}`
    }
  } catch (error) {
    console.warn('[API Interceptor] No se pudo obtener sesión Supabase:', error)
  }

  return config
}

/**
 * RESPONSE SUCCESS INTERCEPTOR
 */
export function handleResponseSuccess(response: AxiosResponse): AxiosResponse {
  return response
}

/**
 * RESPONSE ERROR INTERCEPTOR
 * - 401: Refresca la sesión y reintenta usando la instancia `api` (con interceptores).
 * - Resto de códigos: lanza ApiError tipado.
 */
export async function handleResponseError(error: unknown): Promise<never> {
  const axios = (await import('axios')).default

  if (!axios.isAxiosError(error) || !error.response) {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'No se pudo conectar con el servidor. Verifica tu conexión a internet.',
      undefined,
      new Date().toISOString()
    )
  }

  const { response, config: originalConfig } = error
  const status = response.status
  const retryConfig = originalConfig as unknown as Record<string, unknown>

  // ── 401: Token expirado → Refresh + Retry ──────────
  if (status === 401 && originalConfig && !retryConfig.__isRetry) {
    retryConfig.__isRetry = true

    if (isRefreshing) {
      // Encolar mientras hay un refresh en curso
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then(async (token) => {
        originalConfig.headers.Authorization = `Bearer ${token}`
        // Usar la instancia api (con interceptores) para el reintento
        const { api } = await import('./client')
        return api.request(originalConfig)
      }) as Promise<never>
    }

    isRefreshing = true

    try {
      const supabase = createClient()
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession()

      if (refreshError || !session?.access_token) {
        // Construir error explícito para no hacer throw null
        const sessionError: unknown = refreshError ?? new ApiError(
          401, 'UNAUTHORIZED', 'Sesión expirada', undefined, new Date().toISOString()
        )
        processQueue(sessionError, null)
        if (typeof window !== 'undefined') {
          window.location.href = '/login?reason=session_expired'
        }
        throw sessionError
      }

      const newToken = session.access_token
      processQueue(null, newToken)

      originalConfig.headers.Authorization = `Bearer ${newToken}`
      // Usar la instancia api para que errores del reintento pasen por nuestros interceptores
      const { api } = await import('./client')
      return api.request(originalConfig) as Promise<never>
    } catch (err) {
      processQueue(err, null)
      // Normalizar a ApiError para que los callers siempre reciban un tipo consistente
      if (err instanceof ApiError) throw err
      throw new ApiError(
        401, 'UNAUTHORIZED', 'Sesión expirada o inválida', undefined, new Date().toISOString()
      )
    } finally {
      isRefreshing = false
    }
  }

  // ── Construir error tipado para el resto de códigos ──
  const backendError = response.data as Record<string, unknown> | undefined
  throw new ApiError(
    status,
    getErrorCode(status, backendError),
    getErrorMessage(status, backendError),
    backendError?.details as Record<string, string[]> | undefined,
    new Date().toISOString()
  )
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
