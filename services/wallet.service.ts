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
 *   GET /wallets/payin-routes  → rutas para "Depositar" (Virtual Accounts, PSAV, etc.)
 *   GET /wallets/:id           → detalle de wallet
 *   GET /ledger                → movimientos del ledger
 */
import { apiGet } from '@/lib/api/client'
import type { PaginationParams } from '@/lib/api/types'

// ── Tipos retornados por el backend ──────────────────────────────

export interface WalletBalance {
  id: string
  currency: string
  /** Dirección blockchain de la wallet (puede ser null para wallets internas) */
  address: string | null
  /** Red blockchain (ethereum, polygon, solana, etc.) */
  network: string | null
  balance: number
  available_balance: number
  reserved_balance: number
  /** Proveedor: 'bridge' | 'internal' */
  provider: string
  label?: string
  is_active: boolean
  created_at?: string
}

export interface PayinRoute {
  type: 'virtual_account' | 'psav' | 'liquidation_address'
  currency: string
  instructions: Record<string, string>
  /** Para virtual accounts: número de cuenta bancaria, banco, routing number */
  bank_details?: {
    bank_name: string
    account_number: string
    routing_number?: string
    iban?: string
  }
  /** Para PSAV: datos QR y cuenta concentradora */
  psav_details?: {
    account_number: string
    account_name: string
    qr_url?: string
  }
  /** Para liquidation addresses: dirección crypto */
  crypto_address?: string
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
   * Rutas de depósito del usuario (para el flujo "Depositar").
   * El backend retorna dinámicamente:
   *   - Virtual Account USD (Chase, etc.) si el usuario tiene Bridge wallet
   *   - Instrucciones PSAV/QR si opera en BOB
   *   - Liquidation addresses crypto si tiene configuradas
   */
  async getPayinRoutes(): Promise<PayinRoute[]> {
    return apiGet<PayinRoute[]>('/wallets/payin-routes')
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
