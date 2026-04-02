/**
 * ledger.service.ts — NUEVO SERVICIO
 * 
 * Servicio dedicado al ledger contable del usuario.
 * Separado de wallet.service.ts para mayor cohesión de responsabilidades.
 * 
 * Endpoint: GET /ledger
 */
import { apiGet } from '@/lib/api/client'
import type { PaginationParams } from '@/lib/api/types'

export interface LedgerEntry {
  id: string
  wallet_id: string
  type: 'credit' | 'debit'
  amount: number
  currency: string
  description: string | null
  reference_id: string | null
  reference_type: string | null
  created_at: string
}

export interface LedgerFilter extends PaginationParams {
  type?: 'credit' | 'debit'
  from?: string       // ISO date string
  to?: string         // ISO date string
  currency?: string
}

export interface LedgerSummary {
  total_credits: number
  total_debits: number
  net_balance: number
  currency: string
}

export const LedgerService = {
  /**
   * Obtiene los movimientos del ledger del usuario autenticado.
   * Reemplaza: supabase.from('ledger_entries').select().eq('wallet_id', walletId)
   * 
   * El backend filtra automáticamente por el wallet del usuario autenticado (JWT).
   */
  async getEntries(params?: LedgerFilter): Promise<LedgerEntry[]> {
    return apiGet<LedgerEntry[]>('/ledger', { params })
  },

  /**
   * Helper: obtiene solo créditos (entradas de dinero)
   */
  async getCredits(params?: Omit<LedgerFilter, 'type'>): Promise<LedgerEntry[]> {
    return LedgerService.getEntries({ ...params, type: 'credit' })
  },

  /**
   * Helper: obtiene solo débitos (salidas de dinero)
   */
  async getDebits(params?: Omit<LedgerFilter, 'type'>): Promise<LedgerEntry[]> {
    return LedgerService.getEntries({ ...params, type: 'debit' })
  },
}
