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
  execute: (overrideFn?: () => Promise<T>) => Promise<T | null>
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
              name: 'ApiError',
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
