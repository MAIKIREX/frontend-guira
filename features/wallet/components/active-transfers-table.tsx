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
            <TableCell>{transfer.transfer_kind.replace(/_/g, ' ')}</TableCell>
            <TableCell>
              <Badge variant="secondary">{transfer.status}</Badge>
            </TableCell>
            <TableCell>{formatMoney(transfer.amount, transfer.currency)}</TableCell>
            <TableCell>{formatDateTime(transfer.created_at)}</TableCell>
          </TableRow>
        ))}

        {paymentOrders.map((order) => (
          <TableRow key={`order-${order.id}`}>
            <TableCell className="font-medium">Expediente</TableCell>
            <TableCell>{(order.order_type || order.flow_type || '').replace(/_/g, ' ')}</TableCell>
            <TableCell>
              <Badge variant="outline">{order.status}</Badge>
            </TableCell>
            <TableCell>{formatMoney(order.amount_origin ?? order.amount ?? 0, order.origin_currency ?? order.currency ?? '')}</TableCell>
            <TableCell>{formatDateTime(order.created_at)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
