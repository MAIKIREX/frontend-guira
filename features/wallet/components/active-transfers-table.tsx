import { Badge } from '@/components/ui/badge'
import { formatDateTime, formatMoney } from '@/features/wallet/lib/format'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { BridgeTransfer } from '@/types/bridge-transfer'
import type { PaymentOrder } from '@/types/payment-order'

interface ActiveTransfersTableProps {
  bridgeTransfers: BridgeTransfer[]
  paymentOrders: PaymentOrder[]
}

// ── G-5: Traducciones amigables para flow_type ──────────────────────
const FLOW_TYPE_LABELS: Record<string, string> = {
  va_deposit: 'Depósito Cuenta Virtual',
  wallet_to_wallet: 'Transferencia entre Wallets',
  wallet_to_fiat: 'Retiro a Cuenta Bancaria',
  bolivia_to_world: 'Envío al Exterior',
  world_to_bolivia: 'Recepción del Exterior',
  bolivia_to_wallet: 'Bolivia → Wallet',
  world_to_wallet: 'Exterior → Wallet',
  fiat_bo_to_bridge_wallet: 'BOB → Bridge Wallet',
  crypto_to_bridge_wallet: 'Crypto → Bridge Wallet',
  fiat_us_to_bridge_wallet: 'USD → Bridge Wallet',
  bridge_wallet_to_fiat_bo: 'Retiro a Cuenta BOB',
  bridge_wallet_to_crypto: 'Retiro a Crypto',
  bridge_wallet_to_fiat_us: 'Retiro a Cuenta USD',
}

// ── G-3: Badge visual para va_deposit_status ────────────────────────
const VA_STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  funds_received: { label: 'Fondos Recibidos', variant: 'secondary' },
  funds_scheduled: { label: 'ACH en Tránsito', variant: 'secondary' },
  payment_submitted: { label: 'Procesando Pago', variant: 'default' },
  payment_processed: { label: 'Confirmado', variant: 'default' },
  in_review: { label: 'En Revisión', variant: 'outline' },
  refund_in_flight: { label: 'Reembolso en Proceso', variant: 'destructive' },
  refunded: { label: 'Reembolsado', variant: 'destructive' },
  refund_failed: { label: 'Reembolso Fallido', variant: 'destructive' },
}

function getOrderFlowLabel(order: PaymentOrder): string {
  const flowType = order.flow_type || order.order_type || ''
  return FLOW_TYPE_LABELS[flowType] || flowType.replace(/_/g, ' ')
}

function VaStatusBadge({ status }: { status?: string }) {
  if (!status) return null
  const config = VA_STATUS_CONFIG[status]
  if (!config) return <Badge variant="outline">{status}</Badge>
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export function ActiveTransfersTable({
  bridgeTransfers,
  paymentOrders,
}: ActiveTransfersTableProps) {
  const hasRows = bridgeTransfers.length > 0 || paymentOrders.length > 0

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tipo</TableHead>
          <TableHead>Detalle</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Monto</TableHead>
          <TableHead>Fecha</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {!hasRows ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground">
              No hay transferencias activas ni expedientes abiertos.
            </TableCell>
          </TableRow>
        ) : null}

        {bridgeTransfers.map((transfer) => (
          <TableRow key={`bridge-${transfer.id}`}>
            <TableCell className="font-medium">Bridge</TableCell>
            <TableCell>{(transfer.transfer_kind ?? '').replace(/_/g, ' ')}</TableCell>
            <TableCell>
              <Badge variant="secondary">{transfer.status}</Badge>
            </TableCell>
            <TableCell>{formatMoney(transfer.amount ?? 0, transfer.destination_currency ?? '')}</TableCell>
            <TableCell>{formatDateTime(transfer.created_at)}</TableCell>
          </TableRow>
        ))}

        {paymentOrders.map((order) => (
          <TableRow key={`order-${order.id}`}>
            <TableCell className="font-medium">
              {order.flow_type === 'va_deposit' ? 'Cuenta Virtual' : 'Expediente'}
            </TableCell>
            <TableCell>
              <div className="space-y-1">
                <p>{getOrderFlowLabel(order)}</p>
                {order.sender_name && (
                  <p className="text-xs text-muted-foreground">
                    De: {order.sender_name}
                  </p>
                )}
              </div>
            </TableCell>
            <TableCell>
              {/* G-3: Si es un depósito VA, mostrar el estado detallado del ciclo de vida */}
              {order.flow_type === 'va_deposit' && order.va_deposit_status ? (
                <VaStatusBadge status={order.va_deposit_status} />
              ) : (
                <Badge variant="outline">{order.status}</Badge>
              )}
            </TableCell>
            <TableCell>{formatMoney(order.amount_origin ?? order.amount ?? 0, order.origin_currency ?? order.currency ?? '')}</TableCell>
            <TableCell>{formatDateTime(order.created_at)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
