import type { BridgeTransfer } from '@/types/bridge-transfer'
import type { PaymentOrder } from '@/types/payment-order'

export type LedgerEntryType = 'deposit' | 'payout'

export interface Wallet {
  id: string
  user_id: string
  currency: string
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

export interface WalletDashboardSnapshot {
  wallet: Wallet | null
  ledgerEntries: LedgerEntry[]
  bridgeTransfers: BridgeTransfer[]
  pendingBridgeTransfers: BridgeTransfer[]
  paymentOrders: PaymentOrder[]
  activePaymentOrders: PaymentOrder[]
  movements: WalletMovement[]
  ledgerBalance: number
  reservedInOrders: number
  pendingBridgeTotal: number
  availableBalance: number
}
