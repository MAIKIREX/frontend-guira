/**
 * wallet.service.ts
 * 
 * MIGRADO COMPLETO: Supabase direct → REST API
 * 
 * ANTES: 208 líneas calculando balances client-side con 3 queries paralelas
 *        a Supabase (ledger_entries + bridge_transfers + payment_orders)
 * 
 * AHORA: El backend devuelve datos ya calculados y consolidados.
 *        Todo cálculo financiero (balance, reserved, available) ocurre en el servidor.
 *        El frontend es solo un renderizador de datos.
 * 
 * Endpoints:
 *   GET /wallets               → lista de wallets del usuario
 *   GET /wallets/balances      → balances consolidados (todos los wallets)
 *   GET /wallets/balances/:currency → balance de un currency específico

 *   GET /wallets/:id           → detalle de wallet
 *   GET /ledger                → movimientos del ledger
 */
import { apiGet } from '@/lib/api/client'
import type { PaginationParams } from '@/lib/api/types'

// ── Tipos retornados por el backend ──────────────────────────────

/** Balance individual de un token dentro de una wallet multi-token */
export interface TokenBalance {
  currency: string
  balance: number
  available_balance: number
  reserved_balance: number
}

export interface WalletBalance {
  id: string
  currency: string
  /** Dirección blockchain de la wallet (puede ser null para wallets internas) */
  address: string | null
  /** Red blockchain (ethereum, polygon, solana, etc.) */
  network: string | null
  /** Balances individuales por token (multi-stablecoin) */
  token_balances: TokenBalance[]
  /** Balance total agregado (suma de todos los tokens) */
  balance: number
  available_balance: number
  reserved_balance: number
  /** Proveedor: 'bridge' | 'internal' */
  provider: string
  label?: string
  is_active: boolean
  created_at?: string
}



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
  from?: string
  to?: string
  currency?: string
}

// ── Servicio ─────────────────────────────────────────────────────

export const WalletService = {
  /**
   * Lista todos los wallets del usuario autenticado.
   */
  async getWallets(): Promise<WalletBalance[]> {
    return apiGet<WalletBalance[]>('/wallets')
  },

  /**
   * Balances consolidados de todos los wallets del usuario.
   * Reemplaza el cálculo client-side anterior (ledger_entries reducido a balance).
   */
  async getBalances(): Promise<WalletBalance[]> {
    return apiGet<WalletBalance[]>('/wallets/balances')
  },

  /**
   * Balance de un currency específico.
   * Ej: getBalanceByCurrency('USD') → balance en dólares
   */
  async getBalanceByCurrency(currency: string): Promise<WalletBalance> {
    return apiGet<WalletBalance>(`/wallets/balances/${currency}`)
  },



  /**
   * Detalle completo de un wallet específico.
   */
  async getWallet(walletId: string): Promise<WalletBalance> {
    return apiGet<WalletBalance>(`/wallets/${walletId}`)
  },

  /**
   * Movimientos del ledger (reemplaza la lectura directa de ledger_entries).
   * Soporta filtros por tipo, fecha y moneda.
   */
  async getLedger(params?: LedgerFilter): Promise<LedgerEntry[]> {
    return apiGet<LedgerEntry[]>('/ledger', { params })
  },
}
