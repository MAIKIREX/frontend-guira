export type BridgeTransferKind =
  | 'wallet_to_wallet'
  | 'wallet_to_external_crypto'
  | 'wallet_to_external_bank'
  | 'virtual_account_to_wallet'
  | 'external_bank_to_wallet'

export type BridgeBusinessPurpose =
  | 'supplier_payment'
  | 'client_withdrawal'
  | 'funding'
  | 'liquidation'
  | 'internal'

export type BridgeDestinationType =
  | 'wallet'
  | 'external_account'
  | 'external_crypto_address'

export interface BridgeTransfer {
  id: string
  user_id: string
  idempotency_key?: string
  transfer_kind: BridgeTransferKind
  business_purpose: BridgeBusinessPurpose
  amount: number
  currency: string
  status: string
  destination_type: BridgeDestinationType
  destination_id?: string | null
  fee_amount?: number | null
  net_amount?: number | null
  exchange_rate?: number | null
  metadata?: Record<string, unknown> | null
  created_at: string
  updated_at?: string
}
