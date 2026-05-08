/**
 * ledger.service.ts — NUEVO SERVICIO
 * 
 * Servicio dedicado al ledger contable del usuario.
 * Separado de wallet.service.ts para mayor cohesión de responsabilidades.
 * 
 * Endpoint: GET /ledger
 * 
 * El backend retorna: { entries: LedgerEntry[], pagination: { page, limit, total, totalPages } }
 */
import { apiGet } from '@/lib/api/client'
import type { PaginationParams } from '@/lib/api/types'

export interface LedgerEntry {
  id: string
  wallet_id: string
  type: 'credit' | 'debit'
  amount: number
  currency: string
  status?: 'pending' | 'settled' | 'failed' | 'reversed'
  description: string | null
  reference_id: string | null
  reference_type: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
}

export interface LedgerFilter extends PaginationParams {
  type?: 'credit' | 'debit'
  from?: string       // ISO date string
  to?: string         // ISO date string
  currency?: string
  status?: 'pending' | 'settled' | 'failed' | 'reversed'
}

export interface LedgerSummary {
  total_credits: number
  total_debits: number
  net_balance: number
  currency: string
}

/** Shape of the paginated response from the backend */
interface LedgerPaginatedResponse {
  entries: LedgerEntry[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export const LedgerService = {
  /**
   * Obtiene los movimientos del ledger del usuario autenticado.
   * 
   * El backend retorna { entries: [...], pagination: {...} }.
   * Este método extrae y retorna el wrapper completo.
   */
  async getEntries(params?: LedgerFilter): Promise<LedgerPaginatedResponse> {
    const raw = await apiGet<LedgerPaginatedResponse>('/ledger', { params })
    
    // Defensive: handle both array (unlikely) and paginated object shapes
    if (Array.isArray(raw)) {
      return {
        entries: raw,
        pagination: { page: 1, limit: raw.length, total: raw.length, totalPages: 1 },
      }
    }
    
    return {
      entries: Array.isArray(raw?.entries) ? raw.entries : [],
      pagination: raw?.pagination ?? { page: 1, limit: 0, total: 0, totalPages: 0 },
    }
  },

  /**
   * Helper: obtiene solo créditos (entradas de dinero)
   */
  async getCredits(params?: Omit<LedgerFilter, 'type'>): Promise<LedgerPaginatedResponse> {
    return LedgerService.getEntries({ ...params, type: 'credit' })
  },

  /**
   * Helper: obtiene solo débitos (salidas de dinero)
   */
  async getDebits(params?: Omit<LedgerFilter, 'type'>): Promise<LedgerPaginatedResponse> {
    return LedgerService.getEntries({ ...params, type: 'debit' })
  },
}
