'use client'

import Link from 'next/link'
import { ArrowRightLeft, Loader2, PlusCircle, RefreshCw, ShieldAlert, Wallet } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { useProfileStore } from '@/stores/profile-store'
import { useWalletDashboard } from '@/features/wallet/hooks/use-wallet-dashboard'
import { WalletSummaryCards } from '@/features/wallet/components/wallet-summary-cards'
import { ActiveTransfersTable } from '@/features/wallet/components/active-transfers-table'
import { MovementHistoryTable } from '@/features/wallet/components/movement-history-table'

export function ClientDashboard() {
  const { user } = useAuthStore()
  const { profile } = useProfileStore()
  const { snapshot, loading, error, reload } = useWalletDashboard(user?.id)

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !snapshot) {
    return (
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>No se pudo cargar el dashboard</CardTitle>
          <CardDescription>
            Revisa la sesión y la disponibilidad de Supabase antes de intentar otra vez.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={reload}>Reintentar</Button>
        </CardContent>
      </Card>
    )
  }

  const canOperate = profile?.role === 'client' && profile.onboarding_status === 'verified'

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.5fr_0.9fr]">
        <Card className="border-border/70">
          <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Wallet className="size-4" />
                Dashboard del cliente
              </CardTitle>
              <CardDescription>
                Resumen operativo calculado sobre `wallets`, `ledger_entries`,
                `bridge_transfers` y `payment_orders`.
              </CardDescription>
            </div>
            <Button variant="outline" onClick={reload}>
              <RefreshCw />
              Actualizar
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <QuickAction
                href="/pagos?action=send"
                icon={ArrowRightLeft}
                title="Enviar pago"
                description="Ir al módulo de pagos para iniciar un expediente."
                disabled={!canOperate}
              />
              <QuickAction
                href="/pagos?action=fund"
                icon={PlusCircle}
                title="Agregar fondos"
                description="Abrir pagos con foco en fondeo hacia la wallet."
                disabled={!canOperate}
              />
            </div>

            {!snapshot.wallet ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-muted-foreground">
                No se encontró una wallet asociada al usuario. El dashboard seguirá
                mostrando expedientes y transferencias, pero no habrá balance derivado
                hasta que exista `wallets`.
              </div>
            ) : null}

            {!canOperate ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-muted-foreground">
                <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                  <ShieldAlert className="size-4" />
                  Operación restringida
                </div>
                El acceso visual al panel se mantiene, pero las acciones rápidas quedan
                deshabilitadas mientras el perfil no esté verificado como cliente.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estado actual</CardTitle>
            <CardDescription>Indicadores principales del módulo wallet.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Metric label="Wallet" value={snapshot.wallet?.currency ?? 'Sin wallet'} />
            <Metric
              label="Transferencias pending"
              value={String(snapshot.pendingBridgeTransfers.length)}
            />
            <Metric
              label="Expedientes activos"
              value={String(snapshot.activePaymentOrders.length)}
            />
            <Metric
              label="Movimientos históricos"
              value={String(snapshot.movements.length)}
            />
          </CardContent>
        </Card>
      </section>

      <WalletSummaryCards snapshot={snapshot} />

      <Card>
        <CardHeader>
          <CardTitle>Wallet y actividad operativa</CardTitle>
          <CardDescription>
            Separamos transferencias activas del histórico consolidado para evitar mezclar
            pendientes con movimientos ya registrados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active" className="gap-4">
            <TabsList>
              <TabsTrigger value="active">Transferencias activas</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              <ActiveTransfersTable
                bridgeTransfers={snapshot.pendingBridgeTransfers}
                paymentOrders={snapshot.activePaymentOrders}
              />
            </TabsContent>

            <TabsContent value="history">
              <MovementHistoryTable movements={snapshot.movements} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
  disabled,
}: {
  href: string
  icon: typeof Wallet
  title: string
  description: string
  disabled?: boolean
}) {
  if (disabled) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-4 opacity-70">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Icon className="size-4" />
          {title}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    )
  }

  return (
    <Link href={href} className="rounded-xl border border-border/80 bg-card p-4 transition-colors hover:bg-muted/40">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4" />
        {title}
      </div>
      <p className="mb-4 text-sm text-muted-foreground">{description}</p>
      <span className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
        Abrir
      </span>
    </Link>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
