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
      'Content-Type': undefined, // Delete the default application/json so the browser generates the correct boundary
    },
    timeout: 60_000, // 60s para uploads
  })
  return response.data
}

export { api }
export default api
