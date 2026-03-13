import { ArrowDownLeft, ArrowUpRight, Landmark, Wallet as WalletIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatMoney } from '@/features/wallet/lib/format'
import type { WalletDashboardSnapshot } from '@/types/wallet'

interface WalletSummaryCardsProps {
  snapshot: WalletDashboardSnapshot
}

export function WalletSummaryCards({ snapshot }: WalletSummaryCardsProps) {
  const currency = snapshot.wallet?.currency ?? 'USD'

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        title="Balance disponible"
        description="Calculado desde ledger_entries y expedientes activos."
        value={formatMoney(snapshot.availableBalance, currency)}
        icon={WalletIcon}
      />
      <SummaryCard
        title="Balance en ledger"
        description="Suma de depósitos menos payouts confirmados."
        value={formatMoney(snapshot.ledgerBalance, currency)}
        icon={Landmark}
      />
      <SummaryCard
        title="Fondos comprometidos"
        description="Reservado por payment_orders activos."
        value={formatMoney(snapshot.reservedInOrders, currency)}
        icon={ArrowUpRight}
      />
      <SummaryCard
        title="Pendiente en bridge"
        description="Transferencias con estado pending."
        value={formatMoney(snapshot.pendingBridgeTotal, currency)}
        icon={ArrowDownLeft}
      />
    </div>
  )
}

function SummaryCard({
  title,
  description,
  value,
  icon: Icon,
}: {
  title: string
  description: string
  value: string
  icon: typeof WalletIcon
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/50 p-2 text-muted-foreground">
          <Icon className="size-4" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  )
}
