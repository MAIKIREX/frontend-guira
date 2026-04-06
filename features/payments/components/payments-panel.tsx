'use client'

import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { AlertTriangle, ArrowRightLeft, Loader2, RefreshCw, ShieldAlert, ShieldCheck, WalletCards } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore } from '@/stores/auth-store'
import { useProfileStore } from '@/stores/profile-store'
import { usePaymentsModule } from '@/features/payments/hooks/use-payments-module'
import { CreatePaymentOrderForm } from '@/features/payments/components/create-payment-order-form'
import { PaymentsHistoryTable } from '@/features/payments/components/payments-history-table'
import { SuppliersSection } from '@/features/payments/components/suppliers-section'
import {
  getDefaultRouteForAction,
  unsupportedPaymentRoutes,
} from '@/features/payments/lib/payment-routes'

export function PaymentsPanel() {
  const searchParams = useSearchParams()
  const action = searchParams.get('action')
  const { user } = useAuthStore()
  const { profile } = useProfileStore()
  const {
    snapshot,
    loading,
    error,
    reload,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    createOrder,
    uploadOrderFile,
    cancelOrder,
  } = usePaymentsModule()

  const metrics = useMemo(() => {
    const orders = snapshot?.paymentOrders ?? []
    return {
      active: orders.filter((order) => order.status !== 'completed' && order.status !== 'failed').length,
      waitingDeposit: orders.filter((order) => order.status === 'waiting_deposit').length,
      pendingQuote: orders.filter((order) => order.status === 'deposit_received').length,
      inFlight: orders.filter((order) => order.status === 'processing' || order.status === 'sent').length,
    }
  }, [snapshot?.paymentOrders])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !snapshot || !user) {
    return (
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>No se pudo cargar pagos</CardTitle>
          <CardDescription>{error ?? 'No existe una sesion valida para operar.'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={reload} type="button">
            Reintentar
          </Button>
        </CardContent>
      </Card>
    )
  }

  const canOperate = profile?.role === 'client' && profile.onboarding_status === 'approved'

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.55fr_0.95fr]">
        <Card className="overflow-hidden border-border/80 bg-muted/10">
          <CardHeader className="gap-4 border-b border-border/60 bg-background/95 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Mesa de operaciones</div>
              <CardTitle className="text-2xl tracking-tight">Tu dinero avanza por etapas visibles</CardTitle>
              <CardDescription>
                La orden entra en ejecucion cuando ya existe expediente, staff valida el deposito y publica la cotizacion final.
              </CardDescription>
            </div>
            <Button onClick={reload} type="button" variant="outline">
              <RefreshCw />
              Actualizar
            </Button>
          </CardHeader>
          <CardContent className="space-y-5 p-6">
            {!canOperate ? (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-muted-foreground">
                <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                  <ShieldAlert className="size-4" />
                  Operacion restringida
                </div>
                El usuario puede revisar historial y configuracion cargada, pero no crear ni mutar expedientes mientras el perfil no este verificado.
              </div>
            ) : null}

            {snapshot.gaps.length > 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 p-4 text-sm">
                <div className="mb-2 flex items-center gap-2 font-medium">
                  <AlertTriangle className="size-4" />
                  Huecos documentales detectados
                </div>
                <ul className="space-y-1 text-muted-foreground">
                  {snapshot.gaps.map((gap) => (
                    <li key={gap}>{gap}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-4">
              <MetricCard icon={WalletCards} label="Activas" value={String(metrics.active)} tone="neutral" />
              <MetricCard icon={ArrowRightLeft} label="Esperando deposito" value={String(metrics.waitingDeposit)} tone="warning" />
              <MetricCard icon={ShieldCheck} label="Pendientes de cotizacion" value={String(metrics.pendingQuote)} tone="accent" />
              <MetricCard icon={RefreshCw} label="En ejecucion" value={String(metrics.inFlight)} tone="success" />
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/85 p-4">
              <div className="mb-3 text-sm font-medium text-foreground">Como fluye una orden en Guira</div>
              <div className="grid gap-3 md:grid-cols-5">
                {[
                  'Orden creada',
                  'Fondeo y evidencia',
                  'Deposito validado',
                  'Cotizacion staff',
                  'Ejecucion y cierre',
                ].map((label, index) => (
                  <div key={label} className="rounded-xl border border-border/60 bg-muted/20 px-3 py-3 text-sm">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">0{index + 1}</div>
                    <div className="mt-1 font-medium text-foreground">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>Lecturas auxiliares</CardTitle>
            <CardDescription>Contexto visible para operar sin perder trazabilidad.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <MetricRow label="App settings" value={String(snapshot.appSettings.length)} />
            <MetricRow label="PSAV activos" value={String(snapshot.psavConfigs.length)} />
            <MetricRow label="Actividad reciente" value={String(snapshot.activityLogs.length)} />
            <MetricRow label="Onboarding" value={profile?.onboarding_status ?? 'sin perfil'} />
            <MetricRow label="Rol" value={profile?.role ?? 'sin rol'} />
            <MetricRow label="Ultimo action" value={action ?? 'none'} />
            <div className="rounded-xl border border-dashed border-border/70 p-3 text-xs text-muted-foreground">
              Rutas no habilitadas por falta de mapeo documentado a `order_type`: {unsupportedPaymentRoutes.join(', ')}.
            </div>
          </CardContent>
        </Card>
      </section>

      <Tabs className="gap-4" defaultValue={action === 'send' || action === 'fund' ? 'create' : 'history'}>
        <TabsList variant="line" className="w-full flex-wrap justify-start rounded-none border-b bg-transparent p-0">
          <TabsTrigger value="history" className="rounded-none px-4 py-2">Seguimiento</TabsTrigger>
          <TabsTrigger value="create" className="rounded-none px-4 py-2">Nueva orden</TabsTrigger>
          <TabsTrigger value="suppliers" className="rounded-none px-4 py-2">Proveedores</TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <PaymentsHistoryTable
            activityLogs={snapshot.activityLogs}
            disabled={!canOperate}
            onCancelOrder={cancelOrder}
            onUploadOrderFile={uploadOrderFile}
            orders={snapshot.paymentOrders}
            psavConfigs={snapshot.psavConfigs}
            suppliers={snapshot.suppliers}
          />
        </TabsContent>

        <TabsContent value="create">
          <CreatePaymentOrderForm
            appSettings={snapshot.appSettings}
            defaultRoute={getDefaultRouteForAction(action)}
            disabled={!canOperate}
            feesConfig={snapshot.feesConfig}
            onCreateOrder={createOrder}
            onUploadOrderFile={uploadOrderFile}
            psavConfigs={snapshot.psavConfigs}
            suppliers={snapshot.suppliers}
            userId={user.id}
          />
        </TabsContent>

        <TabsContent value="suppliers">
          <SuppliersSection
            disabled={!canOperate}
            onCreateSupplier={createSupplier}
            onDeleteSupplier={deleteSupplier}
            onUpdateSupplier={updateSupplier}
            suppliers={snapshot.suppliers}
            userId={user.id}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, tone }: { icon: typeof WalletCards; label: string; value: string; tone: 'neutral' | 'warning' | 'accent' | 'success' }) {
  const toneClass =
    tone === 'warning'
      ? 'border-amber-400/35 bg-amber-400/10'
      : tone === 'accent'
        ? 'border-cyan-400/35 bg-cyan-400/10'
        : tone === 'success'
          ? 'border-emerald-400/35 bg-emerald-400/10'
          : 'border-border/70 bg-background/80'

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </div>
      <div className="text-2xl font-semibold tracking-tight text-foreground">{value}</div>
    </div>
  )
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}
