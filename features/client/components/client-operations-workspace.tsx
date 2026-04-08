'use client'

import { useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/stores/auth-store'
import { useProfileStore } from '@/stores/profile-store'
import { usePaymentsModule } from '@/features/payments/hooks/use-payments-module'
import { CreatePaymentOrderForm } from '@/features/payments/components/create-payment-order-form'
import { PaymentsHistoryTable } from '@/features/payments/components/payments-history-table'
import { SuppliersSection } from '@/features/payments/components/suppliers-section'
import type { SupportedPaymentRoute } from '@/features/payments/lib/payment-routes'

const MODE_CONFIG: Record<WorkspaceMode, {
  title: string
  description: string
  eyebrow: string
  defaultRoute?: SupportedPaymentRoute
  allowedRoutes?: SupportedPaymentRoute[]
}> = {
  depositar: {
    title: 'Depositar a tus rieles de salida',
    description: 'Aqui se concentran los flujos donde el fondeo viene de EE.UU. o del exterior y termina en wallet o Bolivia.',
    eyebrow: 'Depositar',
    defaultRoute: 'us_to_wallet',
    allowedRoutes: ['us_to_wallet', 'world_to_bolivia'],
  },
  enviar: {
    title: 'Enviar valor a otros destinos',
    description: 'Aqui se crean expedientes para sacar fondos desde Bolivia o moverlos entre redes digitales.',
    eyebrow: 'Enviar',
    defaultRoute: 'bolivia_to_exterior',
    allowedRoutes: ['bolivia_to_exterior', 'crypto_to_crypto'],
  },
  proveedores: {
    title: 'Agenda operativa de proveedores',
    description: 'Beneficiarios y destinos reutilizables para tus expedientes.',
    eyebrow: 'Proveedores',
  },
  transacciones: {
    title: 'Seguimiento integral de tus operaciones',
    description: 'Historial, estados, transferencias activas y detalle de expedientes en una sola vista.',
    eyebrow: 'Transacciones',
  },
}

export type WorkspaceMode = 'depositar' | 'enviar' | 'proveedores' | 'transacciones'

export function ClientOperationsWorkspace({ mode }: { mode: WorkspaceMode }) {
  const config = MODE_CONFIG[mode]
  const { user } = useAuthStore()
  const { profile } = useProfileStore()
  const payments = usePaymentsModule()

  const handleCreateOrder = useCallback(async (...args: Parameters<typeof payments.createOrder>) => {
    return payments.createOrder(...args)
  }, [payments])

  const handleUploadOrderFile = useCallback(async (...args: Parameters<typeof payments.uploadOrderFile>) => {
    return payments.uploadOrderFile(...args)
  }, [payments])

  const handleCancelOrder = useCallback(async (...args: Parameters<typeof payments.cancelOrder>) => {
    return payments.cancelOrder(...args)
  }, [payments])

  if (payments.loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user || payments.error || !payments.snapshot) {
    return (
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>No se pudo cargar esta seccion</CardTitle>
          <CardDescription>{payments.error ?? 'No hay una sesion valida o faltan datos para continuar.'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => { payments.reload() }} type="button">Reintentar</Button>
        </CardContent>
      </Card>
    )
  }

  const canOperate = profile?.role === 'client' && profile.onboarding_status === 'approved'

  return (
    <div className="space-y-6">
      {/*<section className="grid gap-4 xl:grid-cols-[1.45fr_0.95fr]">
        <Card className="border-border/80 bg-muted/10">
          <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{config.eyebrow}</div>
              <CardTitle className="text-2xl tracking-tight">{config.title}</CardTitle>
              <CardDescription>{config.description}</CardDescription>
            </div>
            <Button onClick={() => { payments.reload(); wallet.reload() }} type="button" variant="outline">
              <RefreshCw />
              Actualizar
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {!canOperate ? (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-muted-foreground">
                <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                  <ShieldAlert className="size-4" />
                  Operacion restringida
                </div>
                Puedes revisar tus datos, pero no crear ni mutar expedientes mientras el perfil no este verificado.
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-3">
              <MetricTile label="Proveedores" value={String(payments.snapshot.suppliers.length)} icon={WalletCards} />
              <MetricTile label="Expedientes" value={String(payments.snapshot.paymentOrders.length)} icon={Waypoints} />
              <MetricTile label="Actividad" value={String(payments.snapshot.activityLogs.length)} icon={RefreshCw} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contexto de cuenta</CardTitle>
            <CardDescription>El panel conserva el estado operativo del cliente a la vista.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <MetricRow label="Rol" value={profile?.role ?? 'sin rol'} />
            <MetricRow label="Onboarding" value={profile?.onboarding_status ?? 'sin perfil'} />
            <MetricRow label="Wallet" value={wallet.snapshot?.wallet?.currency ?? 'Sin wallet'} />
            <MetricRow label="Ordenes activas" value={String(wallet.snapshot?.activePaymentOrders.length ?? 0)} />
            <MetricRow label="Transferencias activas" value={String(wallet.snapshot?.pendingBridgeTransfers.length ?? 0)} />
          </CardContent>
        </Card>
      </section>*/}

      {mode === 'depositar' || mode === 'enviar' ? (
        <CreatePaymentOrderForm
          appSettings={payments.snapshot.appSettings}
          allowedRoutes={config.allowedRoutes}
          defaultRoute={config.defaultRoute!}
          disabled={!canOperate}
          feesConfig={payments.snapshot.feesConfig}
          onCreateOrder={handleCreateOrder}
          onUploadOrderFile={handleUploadOrderFile}
          psavConfigs={payments.snapshot.psavConfigs}
          suppliers={payments.snapshot.suppliers}
          userId={user.id}
        />
      ) : null}

      {mode === 'proveedores' ? (
        <SuppliersSection
          disabled={!canOperate}
          onCreateSupplier={(input) => payments.createSupplier({ ...input, user_id: user.id } as any)}
          onDeleteSupplier={payments.deleteSupplier}
          onUpdateSupplier={(id, input) => payments.updateSupplier(id, input as any)}
          suppliers={payments.snapshot.suppliers}
          userId={user.id}
        />
      ) : null}

      {mode === 'transacciones' ? (
        <div className="space-y-6">
          <Card className='bg-background ring-0 shadow-none'>
            <CardHeader>
              <CardTitle className='text-2xl font-semibold'>Expedientes</CardTitle>
            </CardHeader>
            <CardContent className='bg-background '>
              <PaymentsHistoryTable
                activityLogs={payments.snapshot.activityLogs}
                disabled={!canOperate}
                onCancelOrder={handleCancelOrder}
                onUploadOrderFile={handleUploadOrderFile}
                orders={payments.snapshot.paymentOrders}
                psavConfigs={payments.snapshot.psavConfigs}
                suppliers={payments.snapshot.suppliers}
              />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
