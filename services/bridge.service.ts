/**
 * bridge.service.ts — NUEVO SERVICIO
 * 
 * Servicio para todas las operaciones relacionadas con Bridge API
 * que el usuario final puede realizar:
 * 
 * - External Accounts (Cuentas destino internacionales — alias "Proveedores internacionales")
 * - Liquidation Addresses (Direcciones crypto)
 * - Payouts (solicitudes de retiro via Bridge)
 * 
 * External Accounts: GET/POST/DELETE /bridge/external-accounts
 * Liquidation Addr:  GET/POST/DELETE /bridge/liquidation-addresses
 * Payouts (user):    GET /bridge/payouts, POST /bridge/payouts, GET /bridge/payouts/:id
 */
import { apiGet, apiPost, apiDelete } from '@/lib/api/client'

// ── Tipos ─────────────────────────────────────────────────────────

export type PaymentRail = 'ach' | 'wire' | 'sepa' | 'spei' | 'pix'

export interface ExternalAccount {
  id: string
  payment_rail: PaymentRail
  currency: string
  bank_name?: string
  account_number?: string
  routing_number?: string
  iban?: string
  bic?: string
  clabe?: string
  pix_key?: string
  beneficiary_name: string
  beneficiary_address?: string
  is_verified: boolean
  created_at: string
}

export interface CreateExternalAccountDto {
  payment_rail: PaymentRail
  currency: string
  beneficiary_name: string
  beneficiary_address?: string
  // ACH / Wire
  account_number?: string
  routing_number?: string
  account_type?: 'checking' | 'savings'
  // Wire adicional
  swift_code?: string
  bank_name?: string
  bank_address?: string
  // SEPA
  iban?: string
  bic?: string
  // SPEI
  clabe?: string
  // PIX
  pix_key?: string
  pix_key_type?: 'cpf' | 'cnpj' | 'phone' | 'email' | 'random'
  tax_id?: string
  bank_code?: string
  branch_code?: string
}

export interface LiquidationAddress {
  id: string
  chain: string
  currency: string
  address: string
  label?: string
  created_at: string
}

export interface CreateLiquidationAddressDto {
  chain: 'solana' | 'ethereum' | 'polygon' | 'base'
  currency: 'usdc' | 'usdt'
  address: string
  label?: string
}

export interface BridgePayout {
  id: string
  amount: number
  currency: string
  payment_rail: string
  external_account_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  reference?: string
  created_at: string
}

export interface CreatePayoutDto {
  amount: number
  currency: string
  external_account_id: string
  reference?: string
  memo?: string
}

// ── Servicio ─────────────────────────────────────────────────────

export const BridgeService = {

  // ── External Accounts ─────────────────────────────────────────

  /**
   * Lista las cuentas bancarias internacionales registradas por el usuario.
   * Se muestra en la sección "Proveedores" para cuentas internacionales.
   */
  async getExternalAccounts(): Promise<ExternalAccount[]> {
    return apiGet<ExternalAccount[]>('/bridge/external-accounts')
  },

  /**
   * Detalle de una cuenta externa.
   */
  async getExternalAccount(accountId: string): Promise<ExternalAccount> {
    return apiGet<ExternalAccount>(`/bridge/external-accounts/${accountId}`)
  },

  /**
   * Registra una nueva cuenta bancaria internacional.
   * Bridge valida el formato del IBAN, routing number, etc.
   * El formulario de creación es dinámico según el payment_rail seleccionado.
   */
  async createExternalAccount(dto: CreateExternalAccountDto): Promise<ExternalAccount> {
    return apiPost<ExternalAccount>('/bridge/external-accounts', dto)
  },

  /**
   * Elimina una cuenta bancaria internacional.
   */
  async deleteExternalAccount(accountId: string): Promise<void> {
    return apiDelete<void>(`/bridge/external-accounts/${accountId}`)
  },

  // ── Liquidation Addresses ─────────────────────────────────────

  /**
   * Lista las direcciones crypto de liquidación registradas.
   */
  async getLiquidationAddresses(): Promise<LiquidationAddress[]> {
    return apiGet<LiquidationAddress[]>('/bridge/liquidation-addresses')
  },

  /**
   * Registra una nueva dirección crypto para recibir liquidaciones.
   */
  async createLiquidationAddress(dto: CreateLiquidationAddressDto): Promise<LiquidationAddress> {
    return apiPost<LiquidationAddress>('/bridge/liquidation-addresses', dto)
  },

  /**
   * Elimina una dirección de liquidación.
   */
  async deleteLiquidationAddress(addressId: string): Promise<void> {
    return apiDelete<void>(`/bridge/liquidation-addresses/${addressId}`)
  },

  // ── Payouts (solicitudes de retiro Bridge) ────────────────────

  /**
   * Lista los payouts (retiros) del usuario.
   */
  async getPayouts(): Promise<BridgePayout[]> {
    return apiGet<BridgePayout[]>('/bridge/payouts')
  },

  /**
   * Detalle de un payout específico.
   */
  async getPayout(payoutId: string): Promise<BridgePayout> {
    return apiGet<BridgePayout>(`/bridge/payouts/${payoutId}`)
  },

  /**
   * Crea una solicitud de retiro.
   * Los pagos Bridge requieren aprobación admin antes de procesarse.
   */
  async createPayout(dto: CreatePayoutDto): Promise<BridgePayout> {
    return apiPost<BridgePayout>('/bridge/payouts', dto)
  },
}
