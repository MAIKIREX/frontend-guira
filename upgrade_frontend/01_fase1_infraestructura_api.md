# Fase 1 — Infraestructura de Comunicación API

> **Duración estimada:** 1 semana  
> **Riesgo:** Bajo  
> **Prerrequisito:** `axios` instalado (✅), Backend desplegado con URL accesible  
> **Objetivo:** Crear la capa de comunicación centralizada entre el frontend y el backend NestJS

---

## 1. Resumen de Entregables

| # | Archivo | Tipo | Descripción |
|---|---|---|---|
| 1.1 | `lib/api/client.ts` | NUEVO | Instancia axios singleton con baseURL y configuración global |
| 1.2 | `lib/api/interceptors.ts` | NUEVO | Request interceptor (JWT), Response interceptor (retry 401, error transform) |
| 1.3 | `lib/api/types.ts` | NUEVO | Tipos genéricos: `ApiResponse<T>`, `PaginatedResponse<T>`, `ApiError` |
| 1.4 | `lib/api/index.ts` | NUEVO | Barrel export |
| 1.5 | `types/api.ts` | NUEVO | Tipos de respuesta API para uso en servicios y componentes |
| 1.6 | `hooks/useApi.ts` | NUEVO | Hook React para manejar loading/error/data states |
| 1.7 | `.env.local` | MODIFICAR | Agregar `NEXT_PUBLIC_API_URL` |

---

## 2. Implementación Detallada

### 2.1 `lib/api/client.ts` — Cliente API Centralizado

**Ubicación:** `m-guira/lib/api/client.ts`

**Responsabilidades:**
- Crear una instancia singleton de axios con `baseURL` del backend
- Configurar headers por defecto (`Content-Type: application/json`)
- Configurar timeout global (30 segundos para operaciones financieras)
- Aplicar interceptores de request y response

**Implementación completa:**

```typescript
import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig } from 'axios'
import { attachAuthToken, handleResponseSuccess, handleResponseError } from './interceptors'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

if (!API_BASE_URL) {
  console.error('[API Client] NEXT_PUBLIC_API_URL no está configurada')
}

/**
 * Instancia singleton de axios configurada para comunicarse con el backend NestJS.
 * 
 * Características:
 * - Inyección automática de JWT de Supabase Auth en cada request
 * - Retry automático en 401 (token expirado) con refresh de sesión
 * - Transform de response: extrae `data` directamente
 * - Error handling centralizado con tipos tipados
 * - Timeout de 30s para operaciones financieras
 */
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

// ── Interceptores ─────────────────────────────────────
api.interceptors.request.use(attachAuthToken, (error) => Promise.reject(error))
api.interceptors.response.use(handleResponseSuccess, handleResponseError)

// ── Helpers tipados ───────────────────────────────────

/**
 * GET tipado — retorna directamente T (no AxiosResponse<T>)
 * Uso: const users = await apiGet<User[]>('/profiles')
 */
export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.get<T>(url, config)
  return response.data
}

/**
 * POST tipado — retorna directamente T
 * Uso: const order = await apiPost<PaymentOrder>('/payment-orders/interbank', payload)
 */
export async function apiPost<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.post<T>(url, data, config)
  return response.data
}

/**
 * PATCH tipado — retorna directamente T
 * Uso: const profile = await apiPatch<Profile>('/profiles/me', { full_name: 'Juan' })
 */
export async function apiPatch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.patch<T>(url, data, config)
  return response.data
}

/**
 * DELETE tipado — retorna directamente T
 * Uso: await apiDelete('/bridge/external-accounts/abc-123')
 */
export async function apiDelete<T = void>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.delete<T>(url, config)
  return response.data
}

/**
 * POST multipart/form-data — para uploads de archivos
 * Uso: await apiUpload('/onboarding/documents/upload', formData)
 */
export async function apiUpload<T>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.post<T>(url, formData, {
    ...config,
    headers: {
      ...config?.headers,
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60_000, // 60s para uploads
  })
  return response.data
}

export { api }
export default api
```

---

### 2.2 `lib/api/interceptors.ts` — Interceptores de Request y Response

**Ubicación:** `m-guira/lib/api/interceptors.ts`

**Responsabilidades:**
1. **Request Interceptor:** Extraer JWT de la sesión Supabase y adjuntarlo como `Authorization: Bearer <token>`
2. **Response Success:** Pasar la response sin transformar (el unwrap se hace en los helpers tipados)
3. **Response Error:** Manejar 401 (refresh + retry), 403 (no autorizado), 422 (validación), 429 (rate limit), 500 (server error)

**Implementación completa:**

```typescript
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
  if (body?.message && typeof body.message === 'string') return body.message

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
```

---

### 2.3 `lib/api/types.ts` — Tipos de la Capa API

**Ubicación:** `m-guira/lib/api/types.ts`

```typescript
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
```

---

### 2.4 `lib/api/index.ts` — Barrel Export

**Ubicación:** `m-guira/lib/api/index.ts`

```typescript
export { api, apiGet, apiPost, apiPatch, apiDelete, apiUpload } from './client'
export type { ApiError, PaginatedResponse, PaginationParams, SuccessResponse } from './types'
export { isApiError } from './types'
```

---

### 2.5 `hooks/useApi.ts` — Hook React para Estado de API

**Ubicación:** `m-guira/hooks/useApi.ts`

**Propósito:** Encapsular el patrón loading/error/data para llamadas API desde componentes React.

```typescript
'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { ApiError } from '@/lib/api/types'
import { isApiError } from '@/lib/api/types'

interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: ApiError | null
}

interface UseApiReturn<T> extends UseApiState<T> {
  /** Ejecuta la función API manualmente */
  execute: (...args: unknown[]) => Promise<T | null>
  /** Resetea el estado a initial */
  reset: () => void
}

/**
 * Hook para ejecutar llamadas API con estado reactivo.
 * 
 * @example
 * // Ejecución manual (para acciones del usuario)
 * const { data, loading, error, execute } = useApi()
 * const handleSubmit = () => execute(() => apiPost('/orders', payload))
 * 
 * @example
 * // Ejecución automática al montar (para lectura de datos)
 * const { data, loading, error } = useApi(
 *   () => apiGet<Profile>('/profiles/me'),
 *   { immediate: true }
 * )
 */
export function useApi<T>(
  apiFn?: () => Promise<T>,
  options?: { immediate?: boolean }
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: options?.immediate ?? false,
    error: null,
  })

  const mountedRef = useRef(true)

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  const execute = useCallback(
    async (overrideFn?: () => Promise<T>): Promise<T | null> => {
      const fn = overrideFn ?? apiFn
      if (!fn) {
        console.warn('[useApi] No API function provided')
        return null
      }

      setState((prev) => ({ ...prev, loading: true, error: null }))

      try {
        const result = await fn()
        if (mountedRef.current) {
          setState({ data: result, loading: false, error: null })
        }
        return result
      } catch (err) {
        const apiError: ApiError = isApiError(err)
          ? err
          : {
              status: 0,
              code: 'UNKNOWN',
              message: err instanceof Error ? err.message : 'Error desconocido',
              timestamp: new Date().toISOString(),
            }

        if (mountedRef.current) {
          setState({ data: null, loading: false, error: apiError })
        }
        return null
      }
    },
    [apiFn]
  )

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  // Ejecución automática al montar si immediate=true
  useEffect(() => {
    if (options?.immediate && apiFn) {
      execute()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { ...state, execute, reset }
}
```

---

### 2.6 `.env.local` — Variable de Entorno

**Modificación:** Agregar la siguiente línea al archivo `.env.local` del proyecto m-guira:

```env
# ── API Backend ──────────────────────────────────────
# URL base del backend NestJS (sin trailing slash)
# Desarrollo local:
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1

# Staging:
# NEXT_PUBLIC_API_URL=https://api-staging.guira.com/api/v1

# Producción:
# NEXT_PUBLIC_API_URL=https://api.guira.com/api/v1
```

---

## 3. Validación de la Fase

### 3.1 Test Manual — Verificar Conexión

Crear un archivo temporal `test-api-connection.ts` para validar:

```typescript
import { apiGet } from '@/lib/api/client'

async function testConnection() {
  try {
    // El backend debería tener un endpoint de health check
    const health = await apiGet<{ status: string }>('/health')
    console.log('✅ Conexión exitosa:', health)
  } catch (error) {
    console.error('❌ Error de conexión:', error)
  }
}

testConnection()
```

### 3.2 Checklist de Validación

| # | Criterio | Verificación |
|---|---|---|
| 1 | `NEXT_PUBLIC_API_URL` configurada | `console.log(process.env.NEXT_PUBLIC_API_URL)` retorna URL válida |
| 2 | JWT se adjunta automáticamente | Inspeccionar Network tab — header `Authorization: Bearer xxx` presente |
| 3 | Refresh automático en 401 | Forzar token expirado → verificar que se reintenta con token nuevo |
| 4 | Error tipado en 422 | Enviar payload inválido → verificar que `error.details` contiene campos |
| 5 | Error tipado en 429 | Forzar rate limit → verificar mensaje "Demasiadas solicitudes" |
| 6 | Network error manejado | Desconectar backend → verificar mensaje "No se pudo conectar" |
| 7 | TypeScript compila sin errores | `npx tsc --noEmit` pasa |
| 8 | Hook `useApi` funciona | Componente de prueba muestra loading → data/error |

---

## 4. Diagrama de Arquitectura Resultante

```
┌──────────────────────────────────────────────────────────────┐
│                    Frontend (m-guira)                         │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │  Componente   │    │  Componente   │    │  Componente   │  │
│  │    React      │    │    React      │    │    React      │  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘   │
│         │                   │                   │            │
│         └───────────────────┼───────────────────┘            │
│                             │                                │
│                    ┌────────▼────────┐                       │
│                    │  useApi() Hook  │                       │
│                    └────────┬────────┘                       │
│                             │                                │
│                    ┌────────▼────────┐                       │
│                    │    Services     │                       │
│                    │ (wallet, etc.)  │                       │
│                    └────────┬────────┘                       │
│                             │                                │
│              ┌──────────────▼───────────────┐                │
│              │     lib/api/client.ts         │                │
│              │  ┌─────────────────────────┐ │                │
│              │  │  interceptors.ts        │ │                │
│              │  │  - attachAuthToken()    │ │                │
│              │  │  - handleResponseError()│ │                │
│              │  └─────────────────────────┘ │                │
│              └──────────────┬───────────────┘                │
│                             │                                │
│                    ┌────────▼────────┐                       │
│                    │  Supabase Auth  │  ← JWT source         │
│                    │  (getSession)   │                       │
│                    └─────────────────┘                       │
└─────────────────────────────┬────────────────────────────────┘
                              │ HTTP + Bearer JWT
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (nest-base-backend)                    │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────┐  ┌────────────────┐    │
│  │SupabaseAuthGuard │  │  RolesGuard  │  │ RateLimitGuard │    │
│  └────────┬─────────┘  └──────┬───────┘  └───────┬────────┘    │
│           │                   │                   │              │
│           └───────────────────┼───────────────────┘              │
│                               ▼                                  │
│                        Controllers → Services → Supabase DB      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Dependencias de Fase 2

Al completar esta fase, los siguientes artefactos estarán disponibles para la Fase 2:

| Artefacto | Usado por |
|---|---|
| `apiGet<T>()` | Todos los servicios de lectura |
| `apiPost<T>()` | Todos los servicios de escritura |
| `apiPatch<T>()` | Actualizaciones parciales |
| `apiDelete<T>()` | Eliminación de recursos |
| `apiUpload<T>()` | Upload de documentos |
| `useApi()` hook | Componentes React |
| `ApiError` tipo | Error handling en servicios y componentes |
| `PaginatedResponse<T>` tipo | Listados paginados |
| `isApiError()` guard | Type-safe error handling |

La Fase 2 podrá comenzar a reescribir servicios usando estos artefactos directamente.
