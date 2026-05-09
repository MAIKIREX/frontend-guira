export type LedgerEntryType = 'deposit' | 'payout'

export interface Wallet {
  id: string
  user_id: string
  provider_wallet_id?: string | null
}

export interface LedgerEntry {
  id: string
  wallet_id: string
  bridge_transfer_id?: string | null
  type: LedgerEntryType
  amount: number
  description?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
}

export interface WalletMovement {
  id: string
  source: 'ledger_entry' | 'bridge_transfer' | 'payment_order'
  title: string
  description: string
  status: string
  amount: number
  currency: string
  direction: 'in' | 'out'
  created_at: string
}
