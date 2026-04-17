/**
 * bridge.service.ts
 * 
 * Servicio para todas las operaciones relacionadas con Bridge API
 * que el usuario final puede realizar:
 * 
 * - Virtual Accounts (Cuentas virtuales para recibir depósitos bancarios)
 * - External Accounts (Cuentas destino internacionales — alias "Proveedores internacionales")
 * - Liquidation Addresses (Direcciones crypto)
 * - Payouts (solicitudes de retiro via Bridge)
 * 
 * Virtual Accounts:   GET/POST/DELETE /bridge/virtual-accounts
 * External Accounts:  GET/POST/DELETE /bridge/external-accounts
 * Liquidation Addr:   GET/POST/DELETE /bridge/liquidation-addresses
 * Payouts (user):     GET /bridge/payouts, POST /bridge/payouts, GET /bridge/payouts/:id
 */
import { apiGet, apiPost, apiDelete } from '@/lib/api/client'

// ── Tipos — Virtual Accounts ─────────────────────────────────────

export type SourceCurrency = 'usd' | 'eur' | 'mxn' | 'brl' | 'gbp' | 'cop'
export type DestinationCurrency = 'usdc' | 'usdt' | 'usdb' | 'pyusd' | 'eurc'
export type DestinationRail =
  | 'base'
  | 'ethereum'
  | 'solana'
  | 'tron'
  | 'polygon'
  | 'stellar'

export interface VirtualAccount {
  id: string
  bridge_virtual_account_id: string
  bridge_customer_id: string
  user_id: string
  source_currency: SourceCurrency
  destination_currency: DestinationCurrency
  destination_payment_rail: DestinationRail
  destination_address: string | null
  destination_wallet_id: string | null
  is_external_sweep: boolean
  external_destination_label: string | null
  // Instrucciones de depósito (varían por moneda)
  bank_name: string | null
  bank_address: string | null
  beneficiary_name: string | null
  beneficiary_address: string | null
  routing_number: string | null
  account_number: string | null
  iban: string | null
  clabe: string | null
  br_code: string | null
  sort_code: string | null
  payment_rails: string[] | null
  /** Titular de la cuenta (EUR/MXN/BRL/GBP/COP) */
  account_holder_name: string | null
  /** Mensaje de referencia obligatorio para depósitos COP/Bre-B */
  deposit_message: string | null
  // Fee
  developer_fee_percent: number | null
  status: 'active' | 'inactive'
  created_at: string
}

export interface CreateVirtualAccountDto {
  source_currency: SourceCurrency
  destination_currency: DestinationCurrency
  destination_payment_rail: DestinationRail
  /** Wallet interna de Guira (fondos se quedan en plataforma) */
  destination_wallet_id?: string
  /** Dirección de wallet externa (Binance, MetaMask, etc.) */
  destination_address?: string
  /** Etiqueta descriptiva para wallet externa */
  destination_label?: string
}

/** Metadatos de monedas para display en el formulario */
export const SOURCE_CURRENCY_OPTIONS: {
  value: SourceCurrency
  label: string
  flag: string
  railLabel: string
}[] = [
  { value: 'usd', label: 'Dólar Estadounidense', flag: '🇺🇸', railLabel: 'ACH / Wire' },
  { value: 'eur', label: 'Euro', flag: '🇪🇺', railLabel: 'SEPA' },
  { value: 'mxn', label: 'Peso Mexicano', flag: '🇲🇽', railLabel: 'SPEI' },
  { value: 'brl', label: 'Real Brasileño', flag: '🇧🇷', railLabel: 'PIX' },
  { value: 'gbp', label: 'Libra Esterlina', flag: '🇬🇧', railLabel: 'Faster Payments' },
  { value: 'cop', label: 'Peso Colombiano', flag: '🇨🇴', railLabel: 'Bre-B' },
]

export const DESTINATION_CURRENCY_OPTIONS: {
  value: DestinationCurrency
  label: string
}[] = [
  { value: 'usdc', label: 'USDC' },
  { value: 'usdt', label: 'USDT' },
  { value: 'usdb', label: 'USDB' },
  { value: 'eurc', label: 'EURC' },
  { value: 'pyusd', label: 'PYUSD' },
]

export const DESTINATION_RAIL_OPTIONS: {
  value: DestinationRail
  label: string
}[] = [
  { value: 'base', label: 'Base' },
  { value: 'ethereum', label: 'Ethereum' },
  { value: 'polygon', label: 'Polygon' },
  { value: 'solana', label: 'Solana' },
  { value: 'stellar', label: 'Stellar' },
  { value: 'tron', label: 'Tron' },
]

// ── Tipos — External Accounts ────────────────────────────────────

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

  // ── Virtual Accounts ──────────────────────────────────────────

  /**
   * Crea una cuenta virtual para recibir depósitos bancarios.
   * Los depósitos recibidos se convierten automáticamente a crypto.
   */
  async createVirtualAccount(dto: CreateVirtualAccountDto): Promise<VirtualAccount> {
    return apiPost<VirtualAccount>('/bridge/virtual-accounts', dto)
  },

  /**
   * Lista las cuentas virtuales activas del usuario.
   */
  async listVirtualAccounts(): Promise<VirtualAccount[]> {
    return apiGet<VirtualAccount[]>('/bridge/virtual-accounts')
  },

  /**
   * Detalle de una cuenta virtual específica.
   */
  async getVirtualAccount(id: string): Promise<VirtualAccount> {
    return apiGet<VirtualAccount>(`/bridge/virtual-accounts/${id}`)
  },

  /**
   * Desactiva una cuenta virtual. La VA deja de aceptar depósitos.
   */
  async deactivateVirtualAccount(id: string): Promise<{ message: string }> {
    return apiDelete<{ message: string }>(`/bridge/virtual-accounts/${id}`)
  },

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
