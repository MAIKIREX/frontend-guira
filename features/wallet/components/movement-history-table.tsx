import { ArrowDownLeft, ArrowUpRight, Landmark, ReceiptText } from 'lucide-react'
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
import type { WalletMovement } from '@/types/wallet'

interface MovementHistoryTableProps {
  movements: WalletMovement[]
}

export function MovementHistoryTable({
  movements,
}: MovementHistoryTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Movimiento</TableHead>
          <TableHead>Origen</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Monto</TableHead>
          <TableHead>Fecha</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {movements.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground">
              Todavía no hay movimientos registrados.
            </TableCell>
          </TableRow>
        ) : (
          movements.map((movement) => (
            <TableRow key={movement.id}>
              <TableCell className="min-w-56">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg border border-border/60 bg-muted/50 p-2 text-muted-foreground">
                    <MovementIcon source={movement.source} direction={movement.direction} />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">{movement.title}</p>
                    <p className="whitespace-normal text-xs text-muted-foreground">
                      {movement.description}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>{movement.source.replace(/_/g, ' ')}</TableCell>
              <TableCell>
                <Badge variant="outline">{movement.status}</Badge>
              </TableCell>
              <TableCell className={movement.direction === 'in' ? 'text-emerald-600' : ''}>
                {movement.direction === 'in' ? '+' : '-'}
                {formatMoney(movement.amount, movement.currency)}
              </TableCell>
              <TableCell>{formatDateTime(movement.created_at)}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}

function MovementIcon({
  source,
  direction,
}: Pick<WalletMovement, 'source' | 'direction'>) {
  if (source === 'payment_order') return <ReceiptText className="size-4" />
  if (source === 'bridge_transfer') {
    return direction === 'in' ? (
      <ArrowDownLeft className="size-4" />
    ) : (
      <ArrowUpRight className="size-4" />
    )
  }

  return <Landmark className="size-4" />
}
