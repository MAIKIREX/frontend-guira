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
  payout_request_id?: string | null
  bridge_transfer_id?: string | null
  idempotency_key?: string | null
  transfer_kind?: BridgeTransferKind | null
  business_purpose?: BridgeBusinessPurpose | null
  source_payment_rail?: string | null
  source_currency?: string | null
  source_type?: string | null
  source_id?: string | null
  destination_payment_rail?: string | null
  destination_currency?: string | null
  destination_type?: BridgeDestinationType | null
  destination_id?: string | null
  amount?: number | null
  developer_fee_amount?: number | null
  developer_fee_percent?: number | null
  net_amount?: number | null
  bridge_state?: string | null
  status?: string | null
  source_deposit_instructions?: Record<string, unknown> | null
  deposit_message?: string | null
  receipt_initial_amount?: number | null
  receipt_exchange_fee?: number | null
  receipt_developer_fee?: number | null
  receipt_final_amount?: number | null
  destination_tx_hash?: string | null
  exchange_rate?: number | null
  exchange_rate_at?: string | null
  bridge_raw_response?: Record<string, unknown> | null
  completed_at?: string | null
  created_at: string
  updated_at?: string | null
}

/** Versión admin con datos de usuario aplanados desde el JOIN */
export interface AdminBridgeTransfer extends BridgeTransfer {
  user_email?: string | null
  user_full_name?: string | null
}
