import { createClient } from '@/lib/supabase/browser'
import type { BridgeTransfer } from '@/types/bridge-transfer'
import type { OrderStatus, PaymentOrder } from '@/types/payment-order'
import type {
  LedgerEntry,
  Wallet,
  WalletDashboardSnapshot,
  WalletMovement,
} from '@/types/wallet'

const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  'created',
  'waiting_deposit',
  'deposit_received',
  'processing',
  'sent',
]

export const WalletService = {
  async getWalletByUserId(userId: string): Promise<Wallet | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error
    return data as Wallet | null
  },

  async getDashboardSnapshot(userId: string): Promise<WalletDashboardSnapshot> {
    const supabase = createClient()
    const wallet = await WalletService.getWalletByUserId(userId)

    const ledgerPromise = wallet
      ? supabase
          .from('ledger_entries')
          .select('*')
          .eq('wallet_id', wallet.id)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null })

    const bridgeTransfersPromise = supabase
      .from('bridge_transfers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    const paymentOrdersPromise = supabase
      .from('payment_orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    const [ledgerResult, bridgeTransfersResult, paymentOrdersResult] =
      await Promise.all([
        ledgerPromise,
        bridgeTransfersPromise,
        paymentOrdersPromise,
      ])

    if (ledgerResult.error) throw ledgerResult.error
    if (bridgeTransfersResult.error) throw bridgeTransfersResult.error
    if (paymentOrdersResult.error) throw paymentOrdersResult.error

    const ledgerEntries = (ledgerResult.data ?? []) as LedgerEntry[]
    const bridgeTransfers = (bridgeTransfersResult.data ?? []) as BridgeTransfer[]
    const paymentOrders = (paymentOrdersResult.data ?? []) as PaymentOrder[]

    const pendingBridgeTransfers = bridgeTransfers.filter(
      (transfer) => transfer.status === 'pending'
    )
    const activePaymentOrders = paymentOrders.filter((order) =>
      ACTIVE_ORDER_STATUSES.includes(order.status)
    )

    const ledgerBalance = ledgerEntries.reduce((total, entry) => {
      const signedAmount = entry.type === 'deposit' ? entry.amount : -entry.amount
      return total + signedAmount
    }, 0)

    const reservedInOrders = activePaymentOrders.reduce(
      (total, order) => total + order.amount_origin,
      0
    )

    const pendingBridgeTotal = pendingBridgeTransfers.reduce(
      (total, transfer) => total + transfer.amount,
      0
    )

    const availableBalance = ledgerBalance - reservedInOrders

    return {
      wallet,
      ledgerEntries,
      bridgeTransfers,
      pendingBridgeTransfers,
      paymentOrders,
      activePaymentOrders,
      movements: buildMovements({
        ledgerEntries,
        bridgeTransfers,
        paymentOrders,
        walletCurrency: wallet?.currency ?? 'USD',
      }),
      ledgerBalance,
      reservedInOrders,
      pendingBridgeTotal,
      availableBalance,
    }
  },
}

function buildMovements({
  ledgerEntries,
  bridgeTransfers,
  paymentOrders,
  walletCurrency,
}: {
  ledgerEntries: LedgerEntry[]
  bridgeTransfers: BridgeTransfer[]
  paymentOrders: PaymentOrder[]
  walletCurrency: string
}): WalletMovement[] {
  const ledgerMovements: WalletMovement[] = ledgerEntries.map((entry) => ({
    id: `ledger-${entry.id}`,
    source: 'ledger_entry',
    title: entry.type === 'deposit' ? 'Ingreso en wallet' : 'Salida de wallet',
    description: entry.description ?? 'Movimiento registrado en ledger',
    status: entry.type,
    amount: entry.amount,
    currency: walletCurrency,
    direction: entry.type === 'deposit' ? 'in' : 'out',
    created_at: entry.created_at,
  }))

  const bridgeMovements: WalletMovement[] = bridgeTransfers.map((transfer) => ({
    id: `bridge-${transfer.id}`,
    source: 'bridge_transfer',
    title: getBridgeTransferTitle(transfer.transfer_kind),
    description: transfer.business_purpose.replace(/_/g, ' '),
    status: transfer.status,
    amount: transfer.amount,
    currency: transfer.currency,
    direction: isInboundTransfer(transfer.transfer_kind) ? 'in' : 'out',
    created_at: transfer.created_at,
  }))

  const paymentOrderMovements: WalletMovement[] = paymentOrders.map((order) => ({
    id: `order-${order.id}`,
    source: 'payment_order',
    title: getPaymentOrderTitle(order.order_type),
    description: order.processing_rail,
    status: order.status,
    amount: order.amount_origin,
    currency: order.origin_currency,
    direction: 'out',
    created_at: order.created_at,
  }))

  return [...ledgerMovements, ...bridgeMovements, ...paymentOrderMovements].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

function isInboundTransfer(transferKind: BridgeTransfer['transfer_kind']) {
  return (
    transferKind === 'virtual_account_to_wallet' ||
    transferKind === 'external_bank_to_wallet'
  )
}

function getBridgeTransferTitle(transferKind: BridgeTransfer['transfer_kind']) {
  switch (transferKind) {
    case 'wallet_to_wallet':
      return 'Transferencia entre wallets'
    case 'wallet_to_external_crypto':
      return 'Salida a wallet externa'
    case 'wallet_to_external_bank':
      return 'Retiro a banco externo'
    case 'virtual_account_to_wallet':
      return 'Fondeo a wallet'
    case 'external_bank_to_wallet':
      return 'Ingreso desde banco'
    default:
      return 'Transferencia bridge'
  }
}

function getPaymentOrderTitle(orderType: PaymentOrder['order_type']) {
  switch (orderType) {
    case 'BO_TO_WORLD':
      return 'Pago Bolivia al exterior'
    case 'WORLD_TO_BO':
      return 'Pago exterior a Bolivia'
    case 'US_TO_WALLET':
      return 'Ingreso USA a wallet'
    case 'CRYPTO_TO_CRYPTO':
      return 'Pago cripto a cripto'
    default:
      return 'Expediente de pago'
  }
}
