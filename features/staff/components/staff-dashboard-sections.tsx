'use client'

import { useDeferredValue, useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { JsonSyntaxHighlight } from '@/components/ui/json-syntax-highlight'
import {
  AlertTriangle,
  ArrowRightLeft,

  CheckCircle2,
  CircleDollarSign,
  ExternalLink,
  FileCheck,
  Loader2,
  Percent,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { OrderDetailDialog, SupportTicketActions } from '@/features/staff/components/staff-action-dialogs'
import { useExchangeRates } from '@/features/payments/hooks/use-exchange-rates'
import {
  AppSettingDialog,
  CreateUserDialog,
  FeeConfigDialog,
  PsavConfigDialogs,
  PsavCreateDialog,
  UserAdminActions,
  RateConfigDialog,
} from '@/features/staff/components/admin-action-dialogs'
import { AdminService } from '@/services/admin.service'
import { interactiveCardClassName, cn } from '@/lib/utils'
import { useProfileStore } from '@/stores/profile-store'
import { useAuditTableStore } from '@/stores/audit-table-store'
import type { StaffDashboardLoadedState } from '@/features/staff/components/staff-dashboard-page'
import type { AppSettingRow, FeeConfigRow, PsavConfigRow } from '@/types/payment-order'
import type { Profile } from '@/types/profile'
import type { StaffActor } from '@/types/staff'
import type { BridgeTransfer } from '@/types/bridge-transfer'
import type { AuditLog } from '@/types/activity-log'
import { useAdminBridgePayouts } from '@/features/staff/hooks/use-admin-bridge-payouts'
import { useAdminBridgeTransfers } from '@/features/staff/hooks/use-admin-bridge-transfers'
import { BridgeAdminService, type AdminBridgePayout } from '@/services/admin/bridge.admin.service'
import { UsersAdminService, type VaFeeDefault } from '@/services/admin/users.admin.service'
import type { AdminBridgeTransfer } from '@/types/bridge-transfer'
import { apiGet, apiPost } from '@/lib/api/client'
import type { OrderReviewRequest, ReviewRequestStatus } from '@/types/payment-order'

export function StaffOverviewPanel({
  snapshot,
  isPrivileged,
  reload,
}: Pick<StaffDashboardLoadedState, 'snapshot' | 'isPrivileged' | 'reload'>) {
  const dollarRates = extractDollarRates(snapshot.appSettings)

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-1">
        <Card className="border-border/80 bg-muted/10">
          <CardHeader className="gap-4 border-b border-border/60 bg-background/95 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Centro de control interno</div>
              <CardTitle className="text-2xl tracking-tight">Panel operativo</CardTitle>
              <CardDescription>
                Vista principal para seguimiento del equipo interno. El detalle operativo se distribuye ahora en rutas dedicadas.
              </CardDescription>
            </div>
            <Button onClick={reload} type="button" variant="outline">
              <RefreshCw />
              Actualizar
            </Button>
          </CardHeader>
          <CardContent className="space-y-5 p-4 sm:p-6">
            <div className="grid gap-3 md:grid-cols-4">
              <MetricCard icon={ShieldCheck} label="Compliance" value={String(snapshot.onboarding.length)} />
              <MetricCard icon={ArrowRightLeft} label="Orders" value={String(snapshot.orders.length)} />
              <MetricCard icon={CircleDollarSign} label="Support" value={String(snapshot.support.length)} />
              <MetricCard icon={Users} label="Users" value={String(snapshot.users.length)} />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <RecentAuditCard logs={snapshot.auditLogs.slice(0, 5)} />
        <DollarRatesCard rates={dollarRates} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <ProcessAlertsCard gaps={snapshot.gaps} />
        <RoleNotesCard isPrivileged={isPrivileged} />
      </section>
    </div>
  )
}

export function StaffOnboardingTable({
  snapshot,
}: Pick<StaffDashboardLoadedState, 'snapshot'>) {
  const records = snapshot.onboarding
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const deferredQuery = useDeferredValue(query)

  // Compliance stats — cast status to string because runtime values from the mapper
  // can include 'open'/'closed' (compliance_review.status fallback) beyond OnboardingStatus.
  const pendingKycs = records.filter((r) => r.type === 'personal' && ((r.status as string) === 'in_review' || (r.status as string) === 'kyc_submitted' || (r.status as string) === 'submitted' || (r.status as string) === 'open')).length
  const pendingKybs = records.filter((r) => r.type === 'company' && ((r.status as string) === 'in_review' || (r.status as string) === 'kyb_submitted' || (r.status as string) === 'submitted' || (r.status as string) === 'open')).length
  const pendingPayouts = records.filter((r) => (r as { subject_type?: string }).subject_type === 'payout_request' && ((r.status as string) === 'open' || (r.status as string) === 'pending')).length

  // Resubmissions: records that have observations from a previous NEEDS_CHANGES decision
  // AND are now back in a review-pending status (the client has corrected and re-submitted).
  const RESUBMIT_STATUSES = ['submitted', 'in_review', 'kyc_submitted', 'kyb_submitted', 'open']
  const isRecordResubmitted = (r: typeof records[number]) =>
    !!r.observations && RESUBMIT_STATUSES.includes(r.status as string)
  const resubmittedCount = records.filter(isRecordResubmitted).length

  const filteredRecords = records.filter((record) => {
    const matchesStatus = matchesFilterValue(record.status, statusFilter)
    const matchesType = matchesFilterValue(record.type, typeFilter)
    const matchesSearch = matchesQuery(deferredQuery, [
      record.id,
      record.user_id,
      record.type,
      record.status,
      record.observations,
      record.profiles?.full_name,
      record.profiles?.email,
    ])

    return matchesStatus && matchesType && matchesSearch
  })
  const hasActiveFilters = query.trim().length > 0 || statusFilter !== 'all' || typeFilter !== 'all'

  return (
    <Card className="overflow-hidden border-0 bg-background shadow-none ring-0">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-3xl tracking-tight">Onboarding & Compliance</CardTitle>
        <CardDescription>Revisión y acciones KYC/KYB con seguimiento de compliance integrado.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-0 pb-0">
        {/* Compliance summary stats */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className={cn('border-border/70 transition-colors', pendingKycs > 0 && 'border-amber-500/40 bg-amber-500/5')}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted/50', pendingKycs > 0 && 'bg-amber-500/15')}>
                <ShieldCheck className={cn('size-5 text-muted-foreground', pendingKycs > 0 && 'text-amber-600')} />
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums">{pendingKycs}</div>
                <div className="text-xs font-medium text-muted-foreground">KYC Pendientes</div>
              </div>
            </CardContent>
          </Card>
          <Card className={cn('border-border/70 transition-colors', pendingKybs > 0 && 'border-blue-500/40 bg-blue-500/5')}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted/50', pendingKybs > 0 && 'bg-blue-500/15')}>
                <FileCheck className={cn('size-5 text-muted-foreground', pendingKybs > 0 && 'text-blue-600')} />
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums">{pendingKybs}</div>
                <div className="text-xs font-medium text-muted-foreground">KYB Pendientes</div>
              </div>
            </CardContent>
          </Card>
          <Card className={cn('border-border/70 transition-colors', pendingPayouts > 0 && 'border-red-500/40 bg-red-500/5')}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted/50', pendingPayouts > 0 && 'bg-red-500/15')}>
                <ShieldAlert className={cn('size-5 text-muted-foreground', pendingPayouts > 0 && 'text-red-600')} />
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums">{pendingPayouts}</div>
                <div className="text-xs font-medium text-muted-foreground">Payouts en Revisión</div>
              </div>
            </CardContent>
          </Card>
          <Card className={cn('border-border/70 transition-colors', resubmittedCount > 0 && 'border-orange-500/40 bg-orange-500/5')}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted/50', resubmittedCount > 0 && 'bg-orange-500/15')}>
                <RefreshCw className={cn('size-5 text-muted-foreground', resubmittedCount > 0 && 'text-orange-600')} />
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums">{resubmittedCount}</div>
                <div className="text-xs font-medium text-muted-foreground">Re-envíos Pendientes</div>
              </div>
            </CardContent>
          </Card>
        </div>
        <TableFilters
          query={query}
          onQueryChange={setQuery}
          searchPlaceholder="Buscar por cliente, correo, estado o ID"
          filters={[
            {
              label: 'Estado',
              value: statusFilter,
              onChange: setStatusFilter,
              options: buildOptions(records, (record) => record.status),
            },
            {
              label: 'Tipo',
              value: typeFilter,
              onChange: setTypeFilter,
              options: buildOptions(records, (record) => record.type),
            },
          ]}
          onReset={() => {
            setQuery('')
            setStatusFilter('all')
            setTypeFilter('all')
          }}
          resultsCount={filteredRecords.length}
          totalCount={records.length}
        />
        <div className="space-y-3 md:hidden">
          {records.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
              No hay registros de onboarding.
            </div>
          ) : hasActiveFilters && filteredRecords.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
              No hay resultados con los filtros actuales.
            </div>
          ) : (
            filteredRecords.map((record) => {
              const resubmitted = isRecordResubmitted(record)
              return (
              <Card key={record.id} className={cn('border-border/70 bg-card/95 shadow-sm', resubmitted && 'border-l-2 border-l-orange-500 bg-orange-500/[0.03]')}>
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="size-11 rounded-xl ring-1 ring-border/70">
                      <AvatarImage
                        alt={record.profiles?.full_name ?? 'Cliente'}
                        src={record.client_photo_url ?? undefined}
                      />
                      <AvatarFallback className="rounded-xl bg-muted/70 text-[0.8rem] font-semibold text-foreground/80">
                        {getInitials(record.profiles?.full_name ?? record.profiles?.email ?? record.user_id)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground">{record.profiles?.full_name ?? 'Sin nombre'}</div>
                      <div className="mt-1 break-all text-xs text-muted-foreground">{record.profiles?.email ?? record.user_id}</div>
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/15 p-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Estado</div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge value={record.status} />
                        {resubmitted && (
                          <Badge className="border-orange-400/40 bg-orange-400/10 text-orange-700 dark:text-orange-300 text-[10px] px-1.5 py-0">
                            Re-envío
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Tipo</div>
                      <div className="text-sm font-medium text-foreground">{record.type}</div>
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Actualizado</div>
                      <div className="text-sm text-foreground">{formatDate(record.updated_at)}</div>
                    </div>
                    {record.observations ? (
                      <div className="space-y-1 sm:col-span-2">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Observaciones</div>
                        <p className="overflow-hidden text-sm leading-6 text-muted-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">
                          {record.observations}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex justify-end">
                    <Link
                      className="inline-flex h-9 items-center justify-center rounded-[min(var(--radius-md),12px)] border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
                      href={`/admin/onboarding/${record.id}`}
                    >
                      Ver detalles
                    </Link>
                  </div>
                </CardContent>
              </Card>
              )
            })
          )}
        </div>

        <div className="hidden md:block">
          <Table className="[&_td]:whitespace-normal [&_td]:px-3 [&_td]:py-3 [&_th]:h-auto [&_th]:px-3 [&_th]:py-3">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[260px]">Cliente</TableHead>
                <TableHead className="w-[120px]">Tipo</TableHead>
                <TableHead className="w-[130px]">Estado</TableHead>
                <TableHead className="w-[150px]">Actualizado</TableHead>
                <TableHead className="hidden xl:table-cell xl:min-w-[260px]">Observaciones</TableHead>
                <TableHead className="w-[130px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 ? (
                <EmptyRow colSpan={6} message="No hay registros de onboarding." />
              ) : hasActiveFilters && filteredRecords.length === 0 ? (
                <EmptyRow colSpan={6} message="No hay resultados con los filtros actuales." />
              ) : (
                filteredRecords.map((record) => {
                  const resubmitted = isRecordResubmitted(record)
                  return (
                  <TableRow key={record.id} className={cn(resubmitted && 'border-l-2 border-l-orange-500 bg-orange-500/[0.03]')}>
                    <TableCell className="min-w-0">
                      <div className="flex items-start gap-3">
                        <Avatar className="size-10 shrink-0 rounded-xl ring-1 ring-border/70">
                          <AvatarImage
                            alt={record.profiles?.full_name ?? 'Cliente'}
                            src={record.client_photo_url ?? undefined}
                          />
                          <AvatarFallback className="rounded-xl bg-muted/70 text-[0.8rem] font-semibold text-foreground/80">
                            {getInitials(record.profiles?.full_name ?? record.profiles?.email ?? record.user_id)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 space-y-1">
                          <div className="font-medium">{record.profiles?.full_name ?? 'Sin nombre'}</div>
                          <div className="break-all text-xs text-muted-foreground">{record.profiles?.email ?? record.user_id}</div>
                          <div className="xl:hidden text-xs text-muted-foreground">
                            {record.observations || 'Sin observaciones'}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <span className="text-sm font-medium text-foreground">{record.type}</span>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge value={record.status} />
                        {resubmitted && (
                          <Badge className="border-orange-400/40 bg-orange-400/10 text-orange-700 dark:text-orange-300 text-[10px] px-1.5 py-0">
                            Re-envío
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="align-top text-sm text-foreground">{formatDate(record.updated_at)}</TableCell>
                    <TableCell className="hidden max-w-[280px] align-top text-sm text-muted-foreground xl:table-cell">
                      <div className="overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                        {record.observations || 'Sin observaciones'}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex justify-end">
                        <Link
                          className="inline-flex h-8 items-center justify-center rounded-[min(var(--radius-md),12px)] border border-border bg-background px-2.5 text-[0.8rem] font-medium transition-colors hover:bg-muted"
                          href={`/admin/onboarding/${record.id}`}
                        >
                          Ver detalles
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

export function StaffOrdersTable({
  snapshot,
  actor,
  replaceOrder,
}: Pick<StaffDashboardLoadedState, 'snapshot' | 'actor' | 'replaceOrder'>) {
  const orders = snapshot.orders
  const userNameMap = new Map(snapshot.users.map((u) => [u.id, u.full_name]))
  const [activeTab, setActiveTab] = useState<'orders' | 'transfers' | 'reviews'>('orders')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [typeFilter, setTypeFilter] = useState('all')
  const deferredQuery = useDeferredValue(query)
  const tabCopy = {
    orders: {
      title: 'Payment orders',
      description:
        'Staff revisa respaldo y comprobante del cliente, valida el deposito y publica la cotizacion final para mover la orden a processing.',
    },
    transfers: {
      title: 'Bridge transfers',
      description:
        'Lectura operativa de `bridge_transfers`. Se mantiene sin acciones por falta de transiciones documentadas.',
    },
    reviews: {
      title: 'Revisión de expedientes',
      description:
        'Cola de solicitudes de clientes que exceden el límite máximo por servicio. Aprueba o rechaza cada caso.',
    },
  } as const
  const filteredOrders = orders.filter((order) => {
    const resolvedType = order.flow_type ?? order.order_type
    const matchesStatus = matchesFilterValue(order.status, statusFilter)
    const matchesType = matchesFilterValue(resolvedType, typeFilter)
    const matchesSearch = matchesQuery(deferredQuery, [
      order.id,
      order.user_id,
      userNameMap.get(order.user_id),
      resolvedType,
      order.status,
      order.currency ?? order.origin_currency,
      order.destination_currency,
      order.metadata?.reference,
    ])

    return matchesStatus && matchesType && matchesSearch
  })
  const hasActiveFilters =
    query.trim().length > 0 || statusFilter !== 'all' || typeFilter !== 'all'

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'orders' | 'transfers')} className="gap-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight break-words">{tabCopy[activeTab].title}</h1>
          <p className="text-sm text-muted-foreground">{tabCopy[activeTab].description}</p>
        </div>
        <TabsList
          variant="line"
          className="w-full flex-wrap justify-start rounded-none border-b bg-transparent p-0"
        >
          <TabsTrigger value="orders" className="rounded-none px-4 py-2">Orders</TabsTrigger>
          <TabsTrigger value="transfers" className="rounded-none px-4 py-2">Transfers</TabsTrigger>
          <TabsTrigger value="reviews" className="rounded-none px-4 py-2">Revisiones</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="orders">
        <Card className="overflow-hidden border-0 bg-background shadow-none ring-0">
          <CardContent className="space-y-4 px-0 pb-0">
            <TableFilters
              query={query}
              onQueryChange={setQuery}
              searchPlaceholder="Buscar por ID, estado, tipo o moneda"
              filters={[
                {
                  label: 'Estado',
                  value: statusFilter,
                  onChange: setStatusFilter,
                  options: buildOptions(orders, (order) => order.status),
                },
                {
                  label: 'Tipo',
                  value: typeFilter,
                  onChange: setTypeFilter,
                  options: buildOptions(orders, (order) => order.flow_type ?? order.order_type),
                },
              ]}
              onReset={() => {
                setQuery('')
                setStatusFilter('all')
                setTypeFilter('all')
              }}
              resultsCount={filteredOrders.length}
              totalCount={orders.length}
            />
            <div className="space-y-3 md:hidden">
              {orders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
                  No hay ordenes disponibles.
                </div>
              ) : hasActiveFilters && filteredOrders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
                  No hay resultados con los filtros actuales.
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <Card key={order.id} className="border-border/70 bg-card/95 shadow-sm">
                    <CardContent className="space-y-4 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-foreground">#{order.id.slice(0, 8)}</div>
                          <div className="text-sm text-foreground/80">{userNameMap.get(order.user_id) ?? '—'}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{formatDate(order.created_at)}</div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <StatusBadge value={order.status} />
                          {order.status === 'deposit_received' ? (
                            <span className="text-[10px] w-24 text-right leading-tight text-muted-foreground">Pendiente cotización</span>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/15 p-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Tipo</div>
                          <div className="text-sm font-medium text-foreground">{order.flow_type ?? order.order_type ?? '—'}</div>
                        </div>

                        <div className="space-y-1 sm:col-span-2">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Monto</div>
                          <div className="text-sm font-medium text-foreground">
                            {order.amount ?? order.amount_origin ?? '—'}{' '}
                            {order.currency ?? order.origin_currency ?? ''}
                          </div>
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Archivos</div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {(order.supporting_document_url ?? order.support_document_url) ? <Badge variant="outline">respaldo</Badge> : null}
                            {(order.deposit_proof_url ?? order.evidence_url) ? <Badge variant="outline">comprobante</Badge> : null}
                            {(order.receipt_url ?? order.staff_comprobante_url) ? <Badge variant="outline">staff</Badge> : null}
                            {!(order.supporting_document_url ?? order.support_document_url) && !(order.deposit_proof_url ?? order.evidence_url) && !(order.receipt_url ?? order.staff_comprobante_url) ? <span className="text-xs text-muted-foreground">Sin archivos</span> : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <OrderDetailDialog actor={actor} onUpdated={replaceOrder} order={order} clientName={userNameMap.get(order.user_id)} />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Archivos</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length === 0 ? (
                    <EmptyRow colSpan={7} message="No hay ordenes disponibles." />
                  ) : hasActiveFilters && filteredOrders.length === 0 ? (
                    <EmptyRow colSpan={7} message="No hay resultados con los filtros actuales." />
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div className="font-medium">#{order.id.slice(0, 8)}</div>
                          <div className="text-xs text-muted-foreground">{formatDate(order.created_at)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{userNameMap.get(order.user_id) ?? '—'}</div>
                          <div className="text-xs text-muted-foreground font-mono">{order.user_id.slice(0, 8)}</div>
                        </TableCell>
                        <TableCell>{order.flow_type ?? order.order_type ?? '—'}</TableCell>

                        <TableCell>
                          {order.amount ?? order.amount_origin ?? '—'}{' '}
                          {order.currency ?? order.origin_currency ?? ''}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <StatusBadge value={order.status} />
                            {order.status === 'deposit_received' ? (
                              <div className="text-xs text-muted-foreground">Pendiente de cotizacion final.</div>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(order.supporting_document_url ?? order.support_document_url) ? <Badge variant="outline">respaldo</Badge> : null}
                            {(order.deposit_proof_url ?? order.evidence_url) ? <Badge variant="outline">comprobante</Badge> : null}
                            {(order.receipt_url ?? order.staff_comprobante_url) ? <Badge variant="outline">staff</Badge> : null}
                            {!(order.supporting_document_url ?? order.support_document_url) && !(order.deposit_proof_url ?? order.evidence_url) && !(order.receipt_url ?? order.staff_comprobante_url) ? <span className="text-xs text-muted-foreground">Sin archivos</span> : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <OrderDetailDialog actor={actor} onUpdated={replaceOrder} order={order} clientName={userNameMap.get(order.user_id)} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>



      <TabsContent value="transfers">
        <StaffTransfersPanel snapshot={snapshot} showHeader={false} />
      </TabsContent>

      <TabsContent value="reviews">
        <StaffReviewsPanel actor={actor} />
      </TabsContent>
    </Tabs>
  )
}



export function StaffTransfersPanel({
  showHeader = true,
}: Pick<StaffDashboardLoadedState, 'snapshot'> & { showHeader?: boolean }) {
  const { transfers, loading, error, reload } = useAdminBridgeTransfers()
  const { profile } = useProfileStore()
  const isSuperAdmin = profile?.role === 'super_admin'

  if (loading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Cargando transferencias Bridge...</div>
  }

  if (error) {
    return (
      <div className="p-8 text-center text-sm text-destructive">
        {error}
        <Button variant="outline" size="sm" onClick={reload} className="mt-4 block mx-auto">Reintentar</Button>
      </div>
    )
  }

  return (
    <AdminBridgeTransfersTable
      transfers={transfers}
      showHeader={showHeader}
      reload={reload}
      isSuperAdmin={isSuperAdmin}
    />
  )
}

export function StaffSupportTable({
  snapshot,
  actor,
  replaceSupportTicket,
}: Pick<StaffDashboardLoadedState, 'snapshot' | 'actor' | 'replaceSupportTicket'>) {
  const tickets = snapshot.support
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const deferredQuery = useDeferredValue(query)
  const filteredTickets = tickets.filter((ticket) => {
    const matchesStatus = matchesFilterValue(ticket.status ?? 'open', statusFilter)
    const matchesSearch = matchesQuery(deferredQuery, [
      ticket.id,
      ticket.user_id,
      ticket.subject,
      ticket.message,
      ticket.contact_email,
      ticket.contact_phone,
      ticket.status,
      ticket.profiles?.full_name,
      ticket.profiles?.email,
    ])

    return matchesStatus && matchesSearch
  })
  const hasActiveFilters = query.trim().length > 0 || statusFilter !== 'all'

  return (
    <Card className="overflow-hidden border-0 bg-background shadow-none ring-0">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-3xl tracking-tight">Support tickets</CardTitle>
        <CardDescription>Bandeja operativa de `support_tickets` con cambio de estado.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-0 pb-0">
        <TableFilters
          query={query}
          onQueryChange={setQuery}
          searchPlaceholder="Buscar por cliente, asunto, correo o telefono"
          filters={[
            {
              label: 'Estado',
              value: statusFilter,
              onChange: setStatusFilter,
              options: buildOptions(tickets, (ticket) => ticket.status ?? 'open'),
            },
          ]}
          onReset={() => {
            setQuery('')
            setStatusFilter('all')
          }}
          resultsCount={filteredTickets.length}
          totalCount={tickets.length}
        />
        <div className="space-y-3 md:hidden">
          {tickets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
              No hay tickets abiertos.
            </div>
          ) : hasActiveFilters && filteredTickets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
              No hay resultados con los filtros actuales.
            </div>
          ) : (
            filteredTickets.map((ticket) => (
              <Card key={ticket.id} className="border-border/70 bg-card/95 shadow-sm">
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground">{ticket.profiles?.full_name ?? 'Sin nombre'}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{ticket.profiles?.email ?? ticket.contact_email}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge value={ticket.status ?? 'open'} />
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/15 p-3 sm:grid-cols-2">
                    <div className="space-y-1 sm:col-span-2">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Asunto</div>
                      <div className="text-sm font-medium text-foreground">{ticket.subject}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Contacto</div>
                      <div className="text-sm font-medium text-foreground">{ticket.contact_phone || ticket.contact_email}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Fecha</div>
                      <div className="text-sm font-medium text-foreground">{formatDate(ticket.created_at)}</div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <SupportTicketActions actor={actor} onUpdated={replaceSupportTicket} ticket={ticket} />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Asunto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.length === 0 ? (
                <EmptyRow colSpan={6} message="No hay tickets abiertos." />
              ) : hasActiveFilters && filteredTickets.length === 0 ? (
                <EmptyRow colSpan={6} message="No hay resultados con los filtros actuales." />
              ) : (
                filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell>
                      <div className="font-medium">{ticket.profiles?.full_name ?? 'Sin nombre'}</div>
                      <div className="text-xs text-muted-foreground">{ticket.profiles?.email ?? ticket.contact_email}</div>
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate">{ticket.subject}</TableCell>
                    <TableCell><StatusBadge value={ticket.status ?? 'open'} /></TableCell>
                    <TableCell>{ticket.contact_phone || ticket.contact_email}</TableCell>
                    <TableCell>{formatDate(ticket.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <SupportTicketActions actor={actor} onUpdated={replaceSupportTicket} ticket={ticket} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

export function StaffAuditTable({
  snapshot,
}: Pick<StaffDashboardLoadedState, 'snapshot'>) {
  return <AuditTable logs={snapshot.auditLogs} />
}

export function StaffUsersTable({
  snapshot,
  isAdmin,
  actor,
  addUser,
}: Pick<StaffDashboardLoadedState, 'snapshot' | 'isAdmin' | 'actor' | 'addUser'>) {
  const users = snapshot.users
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [onboardingFilter, setOnboardingFilter] = useState('all')
  const [archiveFilter, setArchiveFilter] = useState('all')
  const deferredQuery = useDeferredValue(query)
  const filteredUsers = users.filter((user) => {
    const matchesRole = matchesFilterValue(user.role, roleFilter)
    const matchesOnboarding = matchesFilterValue(user.onboarding_status, onboardingFilter)
    const matchesArchive =
      archiveFilter === 'all' ||
      (archiveFilter === 'archived' && user.is_archived) ||
      (archiveFilter === 'active' && !user.is_archived)
    const matchesSearch = matchesQuery(deferredQuery, [
      user.id,
      user.full_name,
      user.email,
      user.role,
      user.onboarding_status,
    ])

    return matchesRole && matchesOnboarding && matchesArchive && matchesSearch
  })
  const hasActiveFilters =
    query.trim().length > 0 ||
    roleFilter !== 'all' ||
    onboardingFilter !== 'all' ||
    archiveFilter !== 'all'

  return (
    <Card className="overflow-hidden border-0 bg-background shadow-none ring-0">
      <CardHeader className="gap-3 px-0 pt-0 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle className="text-3xl tracking-tight">Usuarios</CardTitle>
          <CardDescription>Lectura de `profiles` con herramientas administrativas solo para `admin`.</CardDescription>
        </div>
        {isAdmin ? <CreateUserDialog actor={actor} onUpdated={(profile) => {
          if (profile) addUser(profile)
        }} /> : null}
      </CardHeader>
      <CardContent className="space-y-4 px-0 pb-0">
        {!isAdmin ? <AdminOnlyNotice /> : null}
        <TableFilters
          query={query}
          onQueryChange={setQuery}
          searchPlaceholder="Buscar por nombre, correo, rol o ID"
          filters={[
            {
              label: 'Rol',
              value: roleFilter,
              onChange: setRoleFilter,
              options: buildOptions(users, (user) => user.role),
            },
            {
              label: 'Onboarding',
              value: onboardingFilter,
              onChange: setOnboardingFilter,
              options: buildOptions(users, (user) => user.onboarding_status),
            },
            {
              label: 'Archivado',
              value: archiveFilter,
              onChange: setArchiveFilter,
              options: [
                { label: 'Activos', value: 'active' },
                { label: 'Archivados', value: 'archived' },
              ],
            },
          ]}
          onReset={() => {
            setQuery('')
            setRoleFilter('all')
            setOnboardingFilter('all')
            setArchiveFilter('all')
          }}
          resultsCount={filteredUsers.length}
          totalCount={users.length}
        />
        <div className="space-y-3 md:hidden">
          {users.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
              No hay perfiles disponibles.
            </div>
          ) : hasActiveFilters && filteredUsers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
              No hay resultados con los filtros actuales.
            </div>
          ) : (
            filteredUsers.map((user) => (
              <Card key={user.id} className="border-border/70 bg-card/95 shadow-sm">
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <UserIdentity user={user} avatarClassName="size-11 shadow-sm" />
                    <div className="shrink-0">
                      <Badge variant="outline" className="text-[10px]">{user.role}</Badge>
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/15 p-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Onboarding</div>
                      <StatusBadge value={user.onboarding_status} />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Archivado</div>
                      <div className="text-sm font-medium text-foreground">{user.is_archived ? 'Si' : 'No'}</div>
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Alta</div>
                      <div className="text-sm font-medium text-foreground">{formatDate(user.created_at)}</div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Link href={`/admin/users/${user.id}`}>
                      <Button size="sm" variant="outline" className="gap-1.5">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Gestionar
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Onboarding</TableHead>
                <TableHead>Archivado</TableHead>
                <TableHead>Alta</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <EmptyRow colSpan={6} message="No hay perfiles disponibles." />
              ) : hasActiveFilters && filteredUsers.length === 0 ? (
                <EmptyRow colSpan={6} message="No hay resultados con los filtros actuales." />
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <UserIdentity user={user} />
                    </TableCell>
                    <TableCell><Badge variant="outline">{user.role}</Badge></TableCell>
                    <TableCell><StatusBadge value={user.onboarding_status} /></TableCell>
                    <TableCell>{user.is_archived ? 'Si' : 'No'}</TableCell>
                    <TableCell>{formatDate(user.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Link href={`/admin/users/${user.id}`}>
                          <Button size="sm" variant="outline" className="gap-1.5">
                            <ExternalLink className="h-3.5 w-3.5" />
                            Gestionar
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

export function StaffConfigPanel({
  snapshot,
  actor,
  isPrivileged,
  reload,
  replaceAppSetting,
  replaceFeeConfig,
}: Pick<
  StaffDashboardLoadedState,
  'snapshot' | 'actor' | 'isPrivileged' | 'reload' | 'replaceAppSetting' | 'replaceFeeConfig'
>) {
  return (
    <ConfigPanel
      actor={actor}
      appSettings={snapshot.appSettings}
      feesConfig={snapshot.feesConfig}
      isPrivileged={isPrivileged}
      reload={reload}
      onUpdateAppSetting={replaceAppSetting}
      onUpdateFeeConfig={replaceFeeConfig}
    />
  )
}

export function StaffPsavPanel({
  snapshot,
  actor,
  isPrivileged,
  replacePsavConfig,
  removePsavConfig,
}: Pick<StaffDashboardLoadedState, 'snapshot' | 'actor' | 'isPrivileged' | 'replacePsavConfig' | 'removePsavConfig'>) {
  return (
    <PsavPanel
      actor={actor}
      isPrivileged={isPrivileged}
      onChangeRecord={(record, mode) => {
        if (mode === 'remove' && record) {
          removePsavConfig(record.id)
          return
        }

        if (record) {
          replacePsavConfig(record)
        }
      }}
      records={snapshot.psavConfigs}
    />
  )
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.1em] text-muted-foreground max-w-full">
        <Icon className="size-4" />
        {label}
      </div>
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  )
}

function RoleCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/85 p-4">
      <div className="font-medium text-foreground">{title}</div>
      <div className="mt-2 text-sm text-muted-foreground">{body}</div>
    </div>
  )
}

function RoleNotesCard({ isPrivileged }: { isPrivileged: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <RoleCard title="Notificaciones" body="Los eventos recientes se leen desde auditoria para priorizar expedientes y movimientos que requieren seguimiento." />
      <RoleCard title="Procesos" body="Transfers opera en solo lectura hasta que el contrato documental defina columnas y transiciones seguras." />
      <RoleCard title="Gobernanza" body="Support, Audit y Users ya viven en su propio espacio para evitar saturar el panel principal." />
      <RoleCard title="Herramientas admin" body={isPrivileged ? 'Config y PSAV mantienen acciones de gestion seguras con trazabilidad.' : 'Estas herramientas existen, pero solo se habilitan con rol admin.'} />
    </div>
  )
}

function ProcessAlertsCard({ gaps }: { gaps: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertas de proceso</CardTitle>
        <CardDescription>Notas operativas y brechas documentadas que siguen vigentes en el dashboard.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {gaps.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
            No hay alertas de proceso registradas.
          </div>
        ) : (
          gaps.map((gap) => (
            <div key={gap} className="flex gap-3 rounded-xl border border-border/60 p-3 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
              <span className="text-muted-foreground">{gap}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function DollarRatesCard({
  rates,
}: {
  rates: { buy: string; sell: string; sourceLabel: string }
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dolar compra / venta</CardTitle>
        <CardDescription>Vista de solo lectura para referencia operativa.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Compra</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">{rates.buy}</div>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Venta</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">{rates.sell}</div>
        </div>
        <div className="sm:col-span-2 rounded-2xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
          Fuente: {rates.sourceLabel}
        </div>
      </CardContent>
    </Card>
  )
}

function RecentAuditCard({ logs }: { logs: AuditLog[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Radar de auditoria</CardTitle>
        <CardDescription>Ultimos movimientos registrados en `audit_logs`.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {logs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
            Aun no hay eventos de auditoria recientes.
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="rounded-xl border border-border/60 p-3 text-sm">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-medium">{log.table_name}</span>
                <Badge variant="outline">{log.action}</Badge>
              </div>
              <div className="text-muted-foreground">{log.reason}</div>
              <div className="mt-1 text-xs text-muted-foreground">{formatDate(log.created_at)}</div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function AuditTable({ logs }: { logs: AuditLog[] }) {
  const [query, setQuery] = useState('')
  const [tableFilter, setTableFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')
  const visibleColumns = useAuditTableStore((state) => state.visibleColumns)
  const setColumnVisibility = useAuditTableStore((state) => state.setColumnVisibility)
  const deferredQuery = useDeferredValue(query)
  const filteredLogs = logs.filter((log) => {
    const matchesTable = matchesFilterValue(log.table_name, tableFilter)
    const matchesAction = matchesFilterValue(log.action, actionFilter)
    const matchesSearch = matchesQuery(deferredQuery, [
      log.table_name,
      log.action,
      log.reason,
      log.source,
      log.role,
      log.performed_by,
      log.profiles?.full_name,
      log.profiles?.email,
      log.record_id,
    ])

    return matchesTable && matchesAction && matchesSearch
  })
  const hasActiveFilters = query.trim().length > 0 || tableFilter !== 'all' || actionFilter !== 'all'
  const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length
  const actorLabel = (log: AuditLog) => log.profiles?.full_name?.trim() || log.profiles?.email?.trim() || log.performed_by || 'Sin actor'
  const actorSubLabel = (log: AuditLog) => {
    if (log.profiles?.full_name?.trim() && log.profiles?.email?.trim()) return log.profiles.email
    if ((log.profiles?.full_name?.trim() || log.profiles?.email?.trim()) && log.performed_by) return log.performed_by
    return `audit_id: ${log.id}`
  }
  const columnOptions: Array<{ key: keyof typeof visibleColumns; label: string }> = [
    { key: 'user', label: 'Usuario' },
    { key: 'role', label: 'Rol' },
    { key: 'table', label: 'Tabla' },
    { key: 'record', label: 'Registro' },
    { key: 'action', label: 'Accion' },
    { key: 'fields', label: 'Campos' },
    { key: 'reason', label: 'Motivo' },
    { key: 'source', label: 'Fuente' },
    { key: 'date', label: 'Fecha' },
  ]

  return (
    <Card className="overflow-hidden border-0 bg-background shadow-none ring-0">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-3xl tracking-tight">Auditoria completa</CardTitle>
        <CardDescription>Lectura directa de `audit_logs` con actor, registro afectado y campos modificados.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-0 pb-0">
        <TableFilters
          query={query}
          onQueryChange={setQuery}
          searchPlaceholder="Buscar por tabla, accion, motivo, fuente o usuario"
          filters={[
            {
              label: 'Tabla',
              value: tableFilter,
              onChange: setTableFilter,
              options: buildOptions(logs, (log) => log.table_name),
            },
            {
              label: 'Accion',
              value: actionFilter,
              onChange: setActionFilter,
              options: buildOptions(logs, (log) => log.action),
            },
          ]}
          onReset={() => {
            setQuery('')
            setTableFilter('all')
            setActionFilter('all')
          }}
          resultsCount={filteredLogs.length}
          totalCount={logs.length}
        />
        <div className="rounded-xl border border-border/70 bg-muted/15 p-4">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Columnas visibles
          </div>
          <div className="flex flex-wrap gap-3">
            {columnOptions.map((column) => (
              <label
                key={column.key}
                className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm"
              >
                <Checkbox
                  checked={visibleColumns[column.key]}
                  onCheckedChange={(checked) => {
                    if (!checked && visibleColumnCount === 1) return
                    setColumnVisibility(column.key, checked === true)
                  }}
                />
                <span>{column.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-3 md:hidden">
          {logs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
              No hay eventos de auditoria.
            </div>
          ) : hasActiveFilters && filteredLogs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
              No hay resultados con los filtros actuales.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <Card key={log.id} className="border-border/70 bg-card/95 shadow-sm">
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {visibleColumns.user ? (
                        <>
                          <div className="font-medium text-foreground">{actorLabel(log)}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{actorSubLabel(log)}</div>
                        </>
                      ) : (
                        <div className="font-medium text-foreground">Audit ID: {log.id}</div>
                      )}
                    </div>
                    {visibleColumns.action ? (
                      <div className="shrink-0">
                        <Badge variant="outline">{log.action}</Badge>
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/15 p-3 sm:grid-cols-2">
                    {visibleColumns.table ? (
                      <div className="space-y-1">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Tabla</div>
                        <div className="text-sm font-medium text-foreground">{log.table_name}</div>
                      </div>
                    ) : null}
                    {visibleColumns.record ? (
                      <div className="space-y-1">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Registro</div>
                        <div className="text-sm font-mono text-foreground">{log.record_id || '-'}</div>
                      </div>
                    ) : null}
                    {visibleColumns.role ? (
                      <div className="space-y-1">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Rol</div>
                        <div className="text-sm font-medium text-foreground">{log.role || '-'}</div>
                      </div>
                    ) : null}
                    {visibleColumns.source ? (
                      <div className="space-y-1">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Fuente</div>
                        <div className="text-sm font-medium text-foreground">{log.source}</div>
                      </div>
                    ) : null}
                    {visibleColumns.date ? (
                      <div className="space-y-1 sm:col-span-2">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Fecha</div>
                        <div className="text-sm font-medium text-foreground">{formatDate(log.created_at)}</div>
                      </div>
                    ) : null}
                    {visibleColumns.reason ? (
                      <div className="space-y-1 sm:col-span-2">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Motivo</div>
                        <div className="text-sm font-medium text-foreground break-words">{log.reason}</div>
                      </div>
                    ) : null}
                    {visibleColumns.fields ? (
                      <div className="space-y-1 sm:col-span-2">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Campos</div>
                        {log.affected_fields && log.affected_fields.length > 0 ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {log.affected_fields.map((field) => (
                              <Badge key={`${log.id}-${field}`} variant="secondary" className="font-mono text-[10px]">
                                {field}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sin detalle</span>
                        )}
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                {visibleColumns.user ? <TableHead>Usuario</TableHead> : null}
                {visibleColumns.role ? <TableHead>Rol</TableHead> : null}
                {visibleColumns.table ? <TableHead>Tabla</TableHead> : null}
                {visibleColumns.record ? <TableHead>Registro</TableHead> : null}
                {visibleColumns.action ? <TableHead>Accion</TableHead> : null}
                {visibleColumns.fields ? <TableHead>Campos</TableHead> : null}
                {visibleColumns.reason ? <TableHead>Motivo</TableHead> : null}
                {visibleColumns.source ? <TableHead>Fuente</TableHead> : null}
                {visibleColumns.date ? <TableHead>Fecha</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <EmptyRow colSpan={visibleColumnCount} message="No hay eventos de auditoria." />
              ) : hasActiveFilters && filteredLogs.length === 0 ? (
                <EmptyRow colSpan={visibleColumnCount} message="No hay resultados con los filtros actuales." />
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    {visibleColumns.user ? (
                      <TableCell>
                        <div className="min-w-[220px]">
                          <div className="font-medium">{actorLabel(log)}</div>
                          <div className="text-xs text-muted-foreground">{actorSubLabel(log)}</div>
                        </div>
                      </TableCell>
                    ) : null}
                    {visibleColumns.role ? <TableCell>{log.role || '-'}</TableCell> : null}
                    {visibleColumns.table ? <TableCell className="font-medium">{log.table_name}</TableCell> : null}
                    {visibleColumns.record ? <TableCell className="font-mono text-xs">{log.record_id || '-'}</TableCell> : null}
                    {visibleColumns.action ? <TableCell><Badge variant="outline">{log.action}</Badge></TableCell> : null}
                    {visibleColumns.fields ? (
                      <TableCell className="max-w-[260px]">
                        {log.affected_fields && log.affected_fields.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {log.affected_fields.map((field) => (
                              <Badge key={`${log.id}-${field}`} variant="secondary" className="font-mono text-[10px]">
                                {field}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Sin detalle</span>
                        )}
                      </TableCell>
                    ) : null}
                    {visibleColumns.reason ? <TableCell className="max-w-[360px] truncate">{log.reason}</TableCell> : null}
                    {visibleColumns.source ? <TableCell>{log.source}</TableCell> : null}
                    {visibleColumns.date ? <TableCell>{formatDate(log.created_at)}</TableCell> : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function AdminBridgeTransfersTable({
  transfers = [],
  showHeader = true,
  reload,
  isSuperAdmin = false,
}: {
  transfers: AdminBridgeTransfer[]
  showHeader?: boolean
  reload: () => void
  isSuperAdmin?: boolean
}) {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [statusFilter, setStatusFilter] = useState('all')
  const [clientFilter, setClientFilter] = useState('all')
  const [railFilter, setRailFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [rawModalData, setRawModalData] = useState<{ transferId: string; data: Record<string, unknown> } | null>(null)

  const filteredTransfers = transfers.filter((t) => {
    const matchesStatus = matchesFilterValue(t.status, statusFilter)
    const matchesClient = matchesFilterValue(t.user_full_name || t.user_email || t.user_id, clientFilter)
    const matchesRail = matchesFilterValue(t.destination_payment_rail, railFilter)
    const matchesSearch = matchesQuery(deferredQuery, [
      t.bridge_transfer_id,
      t.id,
      t.user_full_name,
      t.user_email,
      t.user_id,
      t.source_payment_rail,
      t.destination_payment_rail,
      t.destination_currency,
      t.status,
      t.bridge_state,
    ])

    // Filtro de fecha
    let matchesDate = true
    if (dateFrom) {
      matchesDate = matchesDate && t.created_at >= dateFrom
    }
    if (dateTo) {
      // Añadir 1 día al dateTo para incluir el día completo
      const toDate = new Date(dateTo)
      toDate.setDate(toDate.getDate() + 1)
      matchesDate = matchesDate && t.created_at < toDate.toISOString()
    }

    return matchesStatus && matchesClient && matchesRail && matchesSearch && matchesDate
  })

  const hasActiveFilters =
    query.trim().length > 0 ||
    statusFilter !== 'all' ||
    clientFilter !== 'all' ||
    railFilter !== 'all' ||
    dateFrom !== '' ||
    dateTo !== ''

  const resetFilters = () => {
    setQuery('')
    setStatusFilter('all')
    setClientFilter('all')
    setRailFilter('all')
    setDateFrom('')
    setDateTo('')
  }

  const colSpan = isSuperAdmin ? 9 : 8

  return (
    <Card className={cn("overflow-hidden", !showHeader && "border-0 bg-background shadow-none ring-0")}>
      {showHeader ? (
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Bridge Transfers</CardTitle>
              <CardDescription>Registro operativo de todas las transferencias ejecutadas a través de Bridge API.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={reload} className="h-8">
              <RefreshCw className="size-3.5" />
            </Button>
          </div>
        </CardHeader>
      ) : null}
      <CardContent className={cn("space-y-4", !showHeader && "px-0 pb-0")}>
        {/* Filtros */}
        <div className="rounded-xl border border-border/70 bg-muted/15 p-4 overflow-hidden">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(auto-fit,minmax(120px,1fr))]">
            <div className="space-y-2 min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground truncate">
                Buscar
              </div>
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ID, usuario, rail, moneda, estado..."
                className="h-10 border-border/70 bg-background/80"
              />
            </div>

            {[
              {
                label: 'Estado',
                value: statusFilter,
                onChange: setStatusFilter,
                options: buildOptions(transfers, (t) => t.status),
              },
              {
                label: 'Cliente',
                value: clientFilter,
                onChange: setClientFilter,
                options: buildOptions(transfers, (t) => t.user_full_name || t.user_email || t.user_id),
              },
              {
                label: 'Rail destino',
                value: railFilter,
                onChange: setRailFilter,
                options: buildOptions(transfers, (t) => t.destination_payment_rail),
              },
            ].map((filter) => (
              <div key={filter.label} className="space-y-2 min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground truncate">
                  {filter.label}
                </div>
                <Select value={filter.value} onValueChange={(value) => filter.onChange(value ?? 'all')}>
                  <SelectTrigger className="h-10 w-full border-border/70 bg-background/80">
                    <SelectValue placeholder={filter.label} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {filter.options.map((option) => (
                      <SelectItem key={`${filter.label}-${option.value}`} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          {/* Rango de fechas */}
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2 min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground truncate">
                Desde
              </div>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-10 border-border/70 bg-background/80"
              />
            </div>
            <div className="space-y-2 min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground truncate">
                Hasta
              </div>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-10 border-border/70 bg-background/80"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              {filteredTransfers.length} de {transfers.length} registros
            </span>
            {hasActiveFilters ? (
              <Button type="button" variant="ghost" onClick={resetFilters} className="justify-center lg:justify-start">
                Limpiar filtros
              </Button>
            ) : null}
          </div>
        </div>

        {/* Vista móvil */}
        <div className="space-y-3 md:hidden">
          {transfers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
              No hay transferencias para mostrar.
            </div>
          ) : hasActiveFilters && filteredTransfers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
              No hay resultados con los filtros actuales.
            </div>
          ) : (
            filteredTransfers.map((t) => (
              <Card key={t.id} className="border-border/70 bg-card/95 shadow-sm">
                <CardContent className="space-y-4 p-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-foreground font-mono text-xs">#{t.bridge_transfer_id?.slice(0, 8) ?? t.id.slice(0, 8)}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{t.user_full_name || t.user_email || t.user_id.slice(0, 8)}</div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground">{formatDate(t.created_at)}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusBadge value={t.status ?? 'unknown'} />
                        {t.bridge_state ? (
                          <span className="text-[10px] text-muted-foreground font-mono">{t.bridge_state}</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/15 p-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Origen</div>
                        <div className="text-sm font-medium text-foreground">{t.source_payment_rail ?? '—'}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Destino</div>
                        <div className="text-sm font-medium text-foreground">{t.destination_payment_rail ?? '—'} {t.destination_currency ? `(${t.destination_currency})` : ''}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Monto</div>
                        <div className="text-sm font-medium text-foreground">{t.amount ?? '—'}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Exchange Fee</div>
                        <div className="text-sm font-medium text-foreground">{t.receipt_exchange_fee ?? '—'}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Developer Fee</div>
                        <div className="text-sm font-medium text-foreground">{t.receipt_developer_fee ?? '—'}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Final Amount</div>
                        <div className="text-sm font-medium text-foreground">{t.receipt_final_amount ?? '—'}</div>
                      </div>
                    </div>

                    {isSuperAdmin && t.bridge_raw_response ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setRawModalData({ transferId: t.bridge_transfer_id ?? t.id, data: t.bridge_raw_response! })}
                        className="text-[10px] h-7 gap-1"
                      >
                        {'{}'} Ver Raw Response
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Vista desktop */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bridge ID / Usuario</TableHead>
                <TableHead>Origen → Destino</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-right">Exchange Fee</TableHead>
                <TableHead className="text-right">Dev Fee</TableHead>
                <TableHead className="text-right">Final Amount</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                {isSuperAdmin ? <TableHead>Raw Response</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.length === 0 ? (
                <EmptyRow colSpan={colSpan} message="No hay transferencias para mostrar." />
              ) : hasActiveFilters && filteredTransfers.length === 0 ? (
                <EmptyRow colSpan={colSpan} message="No hay resultados con los filtros actuales." />
              ) : (
                filteredTransfers.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="font-mono text-xs font-medium">#{t.bridge_transfer_id?.slice(0, 8) ?? t.id.slice(0, 8)}</div>
                      <div className="text-xs text-muted-foreground">{t.user_full_name || t.user_email || t.user_id.slice(0, 8)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <span className="font-medium">{t.source_payment_rail ?? '—'}</span>
                        <span className="mx-1 text-muted-foreground">→</span>
                        <span className="font-medium">{t.destination_payment_rail ?? '—'}</span>
                      </div>
                      {t.destination_currency ? (
                        <div className="text-[10px] text-muted-foreground">{t.destination_currency}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-right">{t.amount ?? '—'}</TableCell>
                    <TableCell className="font-mono text-sm text-right text-muted-foreground">{t.receipt_exchange_fee ?? '—'}</TableCell>
                    <TableCell className="font-mono text-sm text-right text-muted-foreground">{t.receipt_developer_fee ?? '—'}</TableCell>
                    <TableCell className="font-mono text-sm text-right font-medium">{t.receipt_final_amount ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <StatusBadge value={t.status ?? 'unknown'} />
                        <span className="text-[10px] font-mono text-muted-foreground">{t.bridge_state ?? ''}</span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(t.created_at)}</TableCell>
                    {isSuperAdmin ? (
                      <TableCell>
                        {t.bridge_raw_response ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setRawModalData({ transferId: t.bridge_transfer_id ?? t.id, data: t.bridge_raw_response! })}
                            className="text-[10px] h-7 gap-1 font-mono text-muted-foreground hover:text-foreground"
                          >
                            {'{}'} Ver JSON
                          </Button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Modal JSON Raw Response — solo super_admin */}
      <Dialog open={rawModalData !== null} onOpenChange={(open) => { if (!open) setRawModalData(null) }}>
        <DialogContent className="max-w-5xl sm:max-w-5xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/30">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <span className="inline-flex items-center justify-center size-7 rounded-lg bg-amber-500/10 text-amber-500 text-xs font-bold">{'{}'}</span>
                  Bridge Raw Response
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Transfer: <code className="font-mono text-xs bg-muted/40 px-1.5 py-0.5 rounded">{rawModalData?.transferId}</code>
                </DialogDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs shrink-0"
                onClick={() => {
                  if (rawModalData) {
                    navigator.clipboard.writeText(JSON.stringify(rawModalData.data, null, 2))
                    toast.success('JSON copiado al portapapeles')
                  }
                }}
              >
                Copiar JSON
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto px-6 py-4" style={{ maxHeight: 'calc(90vh - 140px)' }}>
            <div className="rounded-xl border border-border/40 bg-card p-5">
              {rawModalData ? (
                <JsonSyntaxHighlight data={rawModalData.data} />
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function AdminBridgePayoutsTable({
  payouts = [],
  showHeader = true,
  reload,
}: {
  payouts?: AdminBridgePayout[]
  showHeader?: boolean
  reload: () => void
}) {
  const [processingId, setProcessingId] = useState<string | null>(null)

  const handleApprove = async (payout: AdminBridgePayout) => {
    if (!window.confirm(`¿Aprobar el pago de ${payout.amount} ${payout.currency} a la cuenta ${payout.external_account_id}? Esta acción liquidará los fondos a través de Bridge.`)) return
    
    setProcessingId(payout.id)
    try {
      await BridgeAdminService.approvePayout(payout.id, { notes: 'Aprobado desde dashboard Staff' })
      toast.success('Payout aprobado con éxito')
      reload()
    } catch (err: unknown) {
      toast.error('Error al aprobar: ' + ((err as { message?: string }).message || 'Desconocido'))
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (payout: AdminBridgePayout) => {
    const reason = window.prompt(`Rechazando el pago de ${payout.amount}. Motivo de rechazo:`)
    if (reason === null) return // Cancelado por el usuario
    if (reason.trim() === '') {
      toast.error('Debes proporcionar un motivo de rechazo')
      return
    }
    
    setProcessingId(payout.id)
    try {
      await BridgeAdminService.rejectPayout(payout.id, { rejection_reason: reason })
      toast.success('Payout rechazado y saldo retornado')
      reload()
    } catch (err: unknown) {
      toast.error('Error al rechazar: ' + ((err as { message?: string }).message || 'Desconocido'))
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <Card className="overflow-hidden">
      {showHeader ? (
        <CardHeader>
          <CardTitle>Bridge Payouts</CardTitle>
          <CardDescription>Bandeja operativa de liquidaciones vía Bridge (PULLs directos y liquidaciones de cuenta de usuario a cuenta externa).</CardDescription>
        </CardHeader>
      ) : null}
      <CardContent>
        <div className="space-y-3 md:hidden">
          {payouts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
              No hay liquidaciones para mostrar.
            </div>
          ) : (
            payouts.map((payout) => (
              <Card key={payout.id} className="border-border/70 bg-card/95 shadow-sm">
                <CardContent className="space-y-4 p-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-foreground">#{payout.id.slice(0, 8)}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{payout.user_full_name || payout.user_email || payout.user_id.slice(0, 8)}</div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground">{formatDate(payout.created_at)}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusBadge value={payout.status} />
                      </div>
                    </div>

                    <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/15 p-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Destino (Rail)</div>
                        <div className="text-sm font-medium text-foreground">{payout.payment_rail}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Cuenta</div>
                        <div className="text-sm font-medium text-foreground">{payout.external_account_id?.slice(0, 10)}...</div>
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Monto</div>
                        <div className="text-sm font-medium text-foreground">{payout.amount} {payout.currency}</div>
                      </div>
                    </div>

                    {payout.status === 'pending_approval' && (
                      <div className="flex gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 bg-success/10 text-success hover:bg-success/15 border-success/20"
                          onClick={() => handleApprove(payout)}
                          disabled={!!processingId}
                        >
                          {processingId === payout.id ? 'Aprobando...' : 'Aprobar'}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 bg-destructive/10 text-destructive hover:bg-destructive/15 border-destructive/20"
                          onClick={() => handleReject(payout)}
                          disabled={!!processingId}
                        >
                          {processingId === payout.id ? '...' : 'Rechazar'}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID / Usuario</TableHead>
                <TableHead>Rail / Destino</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.length === 0 ? (
                <EmptyRow colSpan={6} message="No hay liquidaciones para mostrar." />
              ) : (
                payouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell>
                      <div className="font-medium">#{payout.id.slice(0, 8)}</div>
                      <div className="text-xs text-muted-foreground">{payout.user_full_name || payout.user_email || payout.user_id.slice(0,8)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{payout.payment_rail}</div>
                      <div className="text-xs text-muted-foreground">{payout.external_account_id?.slice(0, 10)}...</div>
                    </TableCell>
                    <TableCell className="font-medium">{payout.amount} {payout.currency}</TableCell>
                    <TableCell><StatusBadge value={payout.status} /></TableCell>
                    <TableCell>{formatDate(payout.created_at)}</TableCell>
                    <TableCell className="text-right">
                      {payout.status === 'pending_approval' && (
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="bg-success hover:bg-success/90 text-success-foreground h-8 text-xs px-3"
                            onClick={() => handleApprove(payout)}
                            disabled={!!processingId}
                          >
                            Aprobar
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="h-8 text-xs px-3"
                            onClick={() => handleReject(payout)}
                            disabled={!!processingId}
                          >
                            Rechazar
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

const OPERATION_LABELS: Record<string, string> = {
  interbank_bo_out: 'Bolivia → Exterior (1.1)',
  interbank_w2w: 'Wallet → Wallet (1.2)',
  interbank_bo_wallet: 'Bolivia → Wallet (1.3)',
  interbank_bo_in: 'Exterior → Bolivia (1.4)',
  ramp_on_fiat_us: 'Fiat US → Wallet (1.5/2.3)',
  ramp_on_bo: 'Fiat BO → Wallet (2.1)',
  ramp_on_crypto: 'Crypto → Wallet (2.2)',
  ramp_off_bo: 'Wallet → Fiat BO (2.4)',
  ramp_off_crypto: 'Wallet → Crypto (2.5)',
  ramp_off_fiat_us: 'Wallet → Fiat US (2.6)',
  wallet_to_fiat_off: 'On-Chain → Fiat (2.7)',
}

const feeDisplay = (r: FeeConfigRow) => {
  if (r.fee_type === 'percent') return `${Number(r.fee_percent || 0)}%`
  if (r.fee_type === 'fixed') return `$${Number(r.fee_fixed || 0)}`
  return `$${Number(r.fee_fixed || 0)} + ${Number(r.fee_percent || 0)}%`
}

function FeeTableView({
  fees,
  actor,
  isPrivileged,
  onUpdateFeeConfig,
}: {
  fees: FeeConfigRow[]
  actor: StaffActor
  isPrivileged: boolean
  onUpdateFeeConfig: (record: FeeConfigRow) => void
}) {
  if (fees.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
        No hay comisiones en esta sección.
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3 p-2 md:hidden">
        {fees.map((record) => (
          <Card key={record.id} className="border-border/70 bg-card/95 shadow-sm">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-foreground/90">
                    {record.operation_type ? (OPERATION_LABELS[record.operation_type] || record.operation_type) : record.type}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">{record.payment_rail || 'N/A'}</Badge>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {record.fee_type === 'percent' ? 'Porcentual' : record.fee_type === 'fixed' ? 'Monto Fijo' : 'Mixto'}
                    </span>
                    {!record.is_active && (
                      <Badge variant="destructive" className="bg-destructive/20 text-destructive text-[9px] px-1 py-0">Desactivado</Badge>
                    )}
                  </div>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span className="inline-flex items-center rounded-md border border-border/40 bg-muted/60 px-2.5 py-1 text-xs font-bold">
                    {feeDisplay(record)}
                  </span>
                  {(Number(record.min_fee) > 0 || Number(record.max_fee) > 0) && (
                    <span className="text-[9px] text-muted-foreground mr-1">
                      {Number(record.min_fee) > 0 ? `Min $${record.min_fee}` : ''}
                      {Number(record.min_fee) > 0 && Number(record.max_fee) > 0 ? ' • ' : ''}
                      {Number(record.max_fee) > 0 ? `Max $${record.max_fee}` : ''}
                    </span>
                  )}
                </div>
              </div>
              {isPrivileged && (
                <div className="flex justify-end pt-1">
                  <FeeConfigDialog actor={actor} onUpdated={onUpdateFeeConfig} record={record} />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="hidden md:block">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="py-3 pl-6 text-[11px] font-bold uppercase tracking-wider">Concepto / Tipo</TableHead>
              <TableHead className="py-3 text-center text-[11px] font-bold uppercase tracking-wider">Valor</TableHead>
              <TableHead className="py-3 pr-6 text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fees.map((record) => (
              <TableRow key={record.id} className={cn('group', interactiveCardClassName, 'hover:bg-muted/30')}>
                <TableCell className="py-4 pl-6">
                  <div className="text-sm font-semibold text-foreground/90 flex items-center gap-2">
                    {record.operation_type ? (OPERATION_LABELS[record.operation_type] || record.operation_type) : record.type}
                    {!record.is_active && (
                      <Badge variant="destructive" className="bg-destructive/20 text-destructive text-[9px] px-1 py-0">Inactivo</Badge>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-wider py-0 rounded-sm">{record.payment_rail || 'N/A'}</Badge>
                    <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                      {record.fee_type === 'percent' ? 'Porcentual' : record.fee_type === 'fixed' ? 'Monto Fijo' : 'Mixto'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="inline-flex items-center rounded-md border border-border/40 bg-muted/60 px-2.5 py-1 text-xs font-bold">
                      {feeDisplay(record)}
                    </span>
                    {(Number(record.min_fee) > 0 || Number(record.max_fee) > 0) && (
                      <span className="text-[9px] text-muted-foreground">
                        {Number(record.min_fee) > 0 ? `Min $${record.min_fee}` : ''}
                        {Number(record.min_fee) > 0 && Number(record.max_fee) > 0 ? ' • ' : ''}
                        {Number(record.max_fee) > 0 ? `Max $${record.max_fee}` : ''}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-4 pr-6 text-right">
                  {isPrivileged && (
                    <div className="flex justify-end opacity-0 transition-opacity group-hover:opacity-100">
                      <FeeConfigDialog actor={actor} onUpdated={onUpdateFeeConfig} record={record} />
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}

function ConfigPanel({
  actor,
  appSettings,
  feesConfig,
  isPrivileged,
  reload,
  onUpdateAppSetting,
  onUpdateFeeConfig,
}: {
  actor: StaffActor
  appSettings: AppSettingRow[]
  feesConfig: FeeConfigRow[]
  isPrivileged: boolean
  reload: () => Promise<void>
  onUpdateAppSetting: (record: AppSettingRow) => void
  onUpdateFeeConfig: (record: FeeConfigRow) => void
}) {
  const [isSyncingRates, setIsSyncingRates] = useState(false)
  const { rates, reload: reloadRates } = useExchangeRates()
  const buyRate = rates.rawRates.find((r) => r.pair === 'BOB_USD')?.rate
  const sellRate = rates.rawRates.find((r) => r.pair === 'USD_BOB')?.rate

  async function handleSyncParallelRates() {
    try {
      setIsSyncingRates(true)
      const result = await AdminService.syncExchangeRates({
        actor,
      })

      toast.success(
        `${result.message}. Compra ${formatRateValue(result.buy_rate_bob_usd)} | Venta ${formatRateValue(result.sell_rate_usd_bob)}`
      )
      await reloadRates()
      await reload()
    } catch (error) {
      console.error('Failed to sync parallel rates', error)
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar las tasas paralelas.')
    } finally {
      setIsSyncingRates(false)
    }
  }

  const interbankFees = feesConfig.filter(r => r.operation_type?.startsWith('interbank'))
  const rampOnFees = feesConfig.filter(r => r.operation_type?.startsWith('ramp_on'))
  const rampOffFees = feesConfig.filter(r => r.operation_type?.startsWith('ramp_off') || r.operation_type === 'wallet_to_fiat_off')
  const otherFees = feesConfig.filter(r => !r.operation_type?.startsWith('interbank') && !r.operation_type?.startsWith('ramp_on') && !r.operation_type?.startsWith('ramp_off') && r.operation_type !== 'wallet_to_fiat_off')

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="overflow-hidden border-border/60 bg-background/95 shadow-sm">
        <CardHeader className="border-b border-border/40 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400">
              <CircleDollarSign className="size-5" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold tracking-tight">Estructura de Comisiones</CardTitle>
              <CardDescription className="text-[13px]">
                Configuracion de tasas para creacion de rutas y pagos a proveedores.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!isPrivileged ? <div className="p-6"><AdminOnlyNotice /></div> : null}
          
          <div className="p-4 md:p-6 w-full">
            <Carousel className="w-full">
              <CarouselContent>
                <CarouselItem>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold tracking-tight">Flujos Interbank</h3>
                      <Badge variant="secondary">{interbankFees.length}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Comisiones para operaciones entre bancos y de/hacia cuentas en el exterior.</p>
                    <Accordion className="w-full mt-4">
                      <AccordionItem value="interbank">
                        <AccordionTrigger className="text-sm font-medium">Ver Configuraciones</AccordionTrigger>
                        <AccordionContent>
                          <FeeTableView fees={interbankFees} actor={actor} isPrivileged={isPrivileged} onUpdateFeeConfig={onUpdateFeeConfig} />
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                </CarouselItem>
                <CarouselItem>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold tracking-tight">Flujos Bridge Wallet</h3>
                      <Badge variant="secondary">{rampOnFees.length + rampOffFees.length}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Comisiones para operaciones on-ramp (depósitos) y off-ramp (retiros).</p>
                    <Accordion multiple className="w-full mt-4">
                      <AccordionItem value="deposits">
                        <AccordionTrigger className="text-sm font-medium">Depósitos (On-Ramp)</AccordionTrigger>
                        <AccordionContent>
                          <FeeTableView fees={rampOnFees} actor={actor} isPrivileged={isPrivileged} onUpdateFeeConfig={onUpdateFeeConfig} />
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="withdrawals">
                        <AccordionTrigger className="text-sm font-medium">Retiros (Off-Ramp)</AccordionTrigger>
                        <AccordionContent>
                          <FeeTableView fees={rampOffFees} actor={actor} isPrivileged={isPrivileged} onUpdateFeeConfig={onUpdateFeeConfig} />
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                </CarouselItem>
                {otherFees.length > 0 && (
                  <CarouselItem>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold tracking-tight">Otras Comisiones</h3>
                        <Badge variant="secondary">{otherFees.length}</Badge>
                      </div>
                      <Accordion className="w-full mt-4">
                        <AccordionItem value="others">
                          <AccordionTrigger className="text-sm font-medium">Ver Configuraciones</AccordionTrigger>
                          <AccordionContent>
                            <FeeTableView fees={otherFees} actor={actor} isPrivileged={isPrivileged} onUpdateFeeConfig={onUpdateFeeConfig} />
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  </CarouselItem>
                )}
              </CarouselContent>
              <div className="flex justify-center gap-2 mt-4">
                <CarouselPrevious className="static translate-y-0 translate-x-0" />
                <CarouselNext className="static translate-y-0 translate-x-0" />
              </div>
            </Carousel>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="overflow-hidden border-border/60 bg-background/95 shadow-sm">
          <CardHeader className="border-b border-border/40 pb-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                <RefreshCw className="size-5" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-lg font-bold tracking-tight">Tasa Paralela USDT</CardTitle>
                <CardDescription className="text-[13px]">
                  Consulta la base de datos central de paridades cambiarias (`exchange_rates_config`).
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            {!isPrivileged ? <AdminOnlyNotice /> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              {rates.rawRates.map((record) => (
                <div key={record.id || record.pair} className="rounded-xl border border-border/70 bg-muted/20 p-4 relative group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      {record.pair === 'BOB_USD' ? 'Compra' : record.pair === 'USD_BOB' ? 'Venta' : record.pair}
                    </div>
                    {isPrivileged && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <RateConfigDialog actor={actor} record={record} onUpdated={() => reloadRates()} />
                      </div>
                    )}
                  </div>
                  <div className="text-2xl font-bold tracking-tight">
                    {formatRateValue(record.rate)}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">Par: `{record.pair}`</div>
                    <div className="inline-flex items-center rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      Spread: {record.spread_percent ?? 0}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Origen de los datos: Servicio interno de Tipos de Cambio.
              </p>
              <Button disabled={!isPrivileged || isSyncingRates} onClick={handleSyncParallelRates} type="button">
                <RefreshCw className={cn(isSyncingRates ? 'animate-spin' : undefined)} />
                {isSyncingRates ? 'Actualizando...' : 'Sincronizar'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/60 bg-background/95 shadow-sm">
          <CardHeader className="border-b border-border/40 pb-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-400/10 text-sky-700 dark:text-cyan-300">
                <ShieldCheck className="size-5" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-lg font-bold tracking-tight">Variables del Sistema</CardTitle>
                <CardDescription className="text-[13px]">
                  Ajustes globales y constantes operativas de la aplicacion.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!isPrivileged ? <div className="p-6"><AdminOnlyNotice /></div> : null}
            {/* Móvil */}
            <div className="space-y-3 p-4 md:hidden">
              {appSettings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
                  Sin variables detectadas.
                </div>
              ) : (
                appSettings.map((record, index) => {
                  const key = String(record.key ?? record.name ?? `setting-${index + 1}`)
                  const value = String(record.value ?? 'sin valor')
                  return (
                    <Card key={String(record.id ?? key)} className="border-border/70 bg-card/95 shadow-sm">
                      <CardContent className="space-y-4 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="font-mono text-[13px] font-bold tracking-tight text-sky-700 dark:text-cyan-300 break-all">{key}</div>
                          </div>
                          {isPrivileged && (
                            <div className="shrink-0">
                              <AppSettingDialog actor={actor} onUpdated={onUpdateAppSetting} record={record} />
                            </div>
                          )}
                        </div>
                        <div className="rounded-xl border border-border/60 bg-muted/15 p-3">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Valor Actual</div>
                          <div className="text-xs font-medium text-foreground break-all">{value}</div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>

            {/* Desktop */}
            <div className="hidden md:block">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-none hover:bg-transparent">
                    <TableHead className="py-3 pl-6 text-[11px] font-bold uppercase tracking-wider">Variable</TableHead>
                    <TableHead className="py-3 text-[11px] font-bold uppercase tracking-wider">Valor Actual</TableHead>
                    <TableHead className="py-3 pr-6 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appSettings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center text-sm italic text-muted-foreground">
                        Sin variables detectadas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    appSettings.map((record, index) => {
                      const key = String(record.key ?? record.name ?? `setting-${index + 1}`)
                      const value = String(record.value ?? 'sin valor')
                      return (
                        <TableRow key={String(record.id ?? key)} className={cn('group', interactiveCardClassName, 'hover:bg-muted/30')}>
                          <TableCell className="py-4 pl-6">
                            <div className="font-mono text-[13px] font-bold tracking-tight text-sky-700 dark:text-cyan-300">{key}</div>
                          </TableCell>
                          <TableCell className="max-w-[200px] py-4">
                            <div className="truncate text-[12px] font-medium text-muted-foreground" title={value}>
                              {value.length > 35 ? `${value.slice(0, 35)}...` : value}
                            </div>
                          </TableCell>
                          <TableCell className="py-4 pr-6 text-right">
                            <div className={tableActionClassName}>
                              {isPrivileged ? <AppSettingDialog actor={actor} onUpdated={onUpdateAppSetting} record={record} /> : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <VaFeeDefaultsCard isPrivileged={isPrivileged} />
      </div>
    </div>
  )
}

function PsavPanel({
  actor,
  isPrivileged,
  onChangeRecord,
  records,
}: {
  actor: StaffActor
  isPrivileged: boolean
  onChangeRecord: (record: PsavConfigRow | null, mode: 'replace' | 'remove') => void
  records: PsavConfigRow[]
}) {
  return (
    <Card className="border-border/60 bg-background/95 shadow-sm">
      <CardHeader className="gap-3 border-b border-border/40 pb-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-xl font-semibold tracking-tight">Canales de Pago (PSAV)</CardTitle>
          <CardDescription className="text-[13px]">
            Configuracion de rutas de deposito directo para usuarios.
          </CardDescription>
        </div>
        {isPrivileged ? (
          <PsavCreateDialog actor={actor} onUpdated={onChangeRecord} />
        ) : null}
      </CardHeader>
      <CardContent className="p-0">
        {!isPrivileged ? <div className="p-6"><AdminOnlyNotice /></div> : null}

        {/* Móvil */}
        <div className="space-y-3 p-4 md:hidden">
          {records.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
              <div className="flex flex-col items-center justify-center space-y-2">
                <CircleDollarSign className="size-8 opacity-20" />
                <p className="font-medium">No hay configuraciones PSAV</p>
              </div>
            </div>
          ) : (
            records.map((record) => (
              <Card key={record.id} className="border-border/70 bg-card/95 shadow-sm">
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {record.qr_url ? (
                        <div className="size-12 shrink-0 overflow-hidden rounded-lg border border-border/80 bg-card p-1 shadow-sm">
                          <img src={record.qr_url} alt="QR" className="size-full object-contain" />
                        </div>
                      ) : (
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/20">
                          <ShieldCheck className="size-5 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground/90 leading-tight">{record.name}</div>
                        <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">ID: {record.id.slice(0, 8)}</div>
                      </div>
                    </div>
                    <Badge
                      variant={record.is_active ? 'default' : 'outline'}
                      className={record.is_active ? 'border-emerald-400/20 bg-emerald-400/15 text-emerald-700 shadow-none dark:text-emerald-300' : 'border-border/60 text-muted-foreground'}
                    >
                      {record.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>

                  <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/15 p-3">
                    <div className="flex justify-between items-center sm:block sm:space-y-1">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Banco y Cuenta</div>
                      <div className="text-right sm:text-left">
                        <div className="text-sm font-medium">{record.bank_name}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">{record.account_number}</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center sm:block sm:space-y-1 pt-2 border-t border-border/40 sm:border-0 sm:pt-0">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Moneda</div>
                      <span className="rounded-md border border-border/40 bg-muted/60 px-2 py-0.5 text-xs font-bold">
                        {record.currency}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <PsavConfigDialogs actor={actor} onUpdated={onChangeRecord} record={record} />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Desktop */}
        <div className="hidden md:block">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[80px] py-4 pl-6">QR</TableHead>
                <TableHead className="py-4">Canal</TableHead>
                <TableHead className="py-4">Banco y Cuenta</TableHead>
                <TableHead className="py-4 text-center">Moneda</TableHead>
                <TableHead className="py-4">Estado</TableHead>
                <TableHead className="py-4 pr-6 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                      <CircleDollarSign className="size-8 opacity-20" />
                      <p className="text-sm font-medium">No hay configuraciones PSAV</p>
                      <p className="text-xs">Usa el boton &quot;Nuevo PSAV&quot; para empezar.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => (
                  <TableRow key={record.id} className={cn('group', interactiveCardClassName, 'hover:bg-muted/30')}>
                    <TableCell className="py-4 pl-6">
                      {record.qr_url ? (
                        <div className="relative size-10 overflow-hidden rounded-lg border border-border/80 bg-card p-1 shadow-sm transition-transform group-hover:scale-110">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={record.qr_url}
                            alt="QR"
                            className="size-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="flex size-10 items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/20">
                          <ShieldCheck className="size-4 text-muted-foreground/40" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="font-semibold text-foreground/90">{record.name}</div>
                      <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">ID: {record.id.slice(0, 8)}</div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="text-sm font-medium">{record.bank_name}</div>
                      <div className="mt-0.5 font-mono text-xs text-muted-foreground">{record.account_number}</div>
                    </TableCell>
                    <TableCell className="py-4 text-center text-xs font-bold">
                      <span className="rounded-md border border-border/40 bg-muted/60 px-2 py-1">
                        {record.currency}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge
                        variant={record.is_active ? 'default' : 'outline'}
                        className={record.is_active ? 'border-emerald-400/20 bg-emerald-400/15 text-emerald-700 shadow-none hover:bg-emerald-400/20 dark:text-emerald-300' : 'border-border/60 text-muted-foreground'}
                      >
                        {record.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 pr-6 text-right">
                      <div className={tableActionClassName}>
                        <PsavConfigDialogs actor={actor} onUpdated={onChangeRecord} record={record} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}



function TableFilters({
  query,
  onQueryChange,
  searchPlaceholder,
  filters,
  onReset,
  resultsCount,
  totalCount,
}: {
  query: string
  onQueryChange: (value: string) => void
  searchPlaceholder: string
  filters: Array<{
    label: string
    value: string
    onChange: (value: string) => void
    options: Array<{ label: string; value: string }>
  }>
  onReset: () => void
  resultsCount: number
  totalCount: number
}) {
  const hasActiveFilters = query.trim().length > 0 || filters.some((filter) => filter.value !== 'all')

  return (
    <div className="rounded-xl border border-border/70 bg-muted/15 p-4 overflow-hidden">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(auto-fit,minmax(140px,1fr))]">
        <div className="space-y-2 min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground truncate">
            Buscar
          </div>
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 border-border/70 bg-background/80"
          />
        </div>
        {filters.map((filter) => (
          <div key={filter.label} className="space-y-2 min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground truncate">
              {filter.label}
            </div>
            <Select value={filter.value} onValueChange={(value) => filter.onChange(value ?? 'all')}>
              <SelectTrigger className="h-10 w-full border-border/70 bg-background/80">
                <SelectValue placeholder={filter.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {filter.options.map((option) => (
                  <SelectItem key={`${filter.label}-${option.value}`} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>
          {resultsCount} de {totalCount} registros
        </span>
        {hasActiveFilters ? (
          <Button type="button" variant="ghost" onClick={onReset} className="justify-center lg:justify-start">
            Limpiar filtros
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function AdminOnlyNotice() {
  return (
    <div className="rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
      Estas acciones estan reservadas para usuarios con rol `admin`.
    </div>
  )
}

function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-8 text-center text-sm text-muted-foreground">{message}</TableCell>
    </TableRow>
  )
}

function StatusBadge({ value }: { value: string }) {
  const variant = value === 'failed' || value === 'rejected' || value === 'closed' ? 'destructive' : value === 'completed' || value === 'verified' || value === 'resolved' ? 'default' : 'outline'
  return <Badge variant={variant}>{value}</Badge>
}

function formatDate(value?: string) {
  if (!value) return 'Sin fecha'
  return format(new Date(value), 'dd/MM/yyyy HH:mm')
}

function getInitials(value?: string | null) {
  if (!value || typeof value !== 'string') return 'CL'
  const words = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0) return 'CL'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase()
}

function UserIdentity({
  user,
  avatarClassName,
}: {
  user: Pick<Profile, 'avatar_url' | 'email' | 'full_name' | 'metadata'> & {
    client_photo_url?: string | null
  }
  avatarClassName?: string
}) {
  const avatarUrl = resolveUserAvatarUrl(user)

  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className={cn('size-10 shrink-0 rounded-xl ring-1 ring-border/70 bg-muted/20', avatarClassName)}>
        <AvatarImage
          alt={user.full_name || 'Usuario'}
          className="object-cover"
          src={avatarUrl ?? undefined}
        />
        <AvatarFallback className="rounded-xl bg-muted/70 text-[0.8rem] font-semibold text-foreground/80">
          {getInitials(user.full_name || user.email)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 space-y-1">
        <div className="truncate text-sm font-semibold leading-none text-foreground">
          {user.full_name || 'Sin nombre'}
        </div>
        <div className="truncate text-xs leading-5 text-muted-foreground">{user.email}</div>
      </div>
    </div>
  )
}

function resolveUserAvatarUrl(
  user?: Pick<Profile, 'avatar_url' | 'metadata'> & {
    client_photo_url?: string | null
  },
) {
  if (!user) return null

  const directAvatar = user.avatar_url?.trim()
  if (directAvatar) return directAvatar

  const cachedAvatar = user.client_photo_url?.trim()
  if (cachedAvatar) return cachedAvatar

  return readProfileAvatarUrl(user.metadata)
}

function readProfileAvatarUrl(metadata?: Record<string, unknown>) {
  if (!metadata) return null

  const candidateKeys = ['avatar_url', 'photo_url', 'image_url', 'profile_picture']
  for (const key of candidateKeys) {
    const value = metadata[key]
    if (typeof value === 'string' && value.trim()) {
      return value
    }
  }

  return null
}

function extractDollarRates(appSettings: AppSettingRow[]) {
  const defaults = {
    buy: 'Pendiente',
    sell: 'Pendiente',
    sourceLabel: 'Sin fuente de cotizacion configurada en app_settings.',
  }

  if (appSettings.length === 0) {
    return defaults
  }

  const normalizedEntries = appSettings.map((record) => {
    const key = String(record.key ?? record.name ?? record.id ?? '').toLowerCase()
    return {
      key,
      value: record.value,
    }
  })

  const buy = normalizedEntries.find((entry) => isDollarRateKey(entry.key, ['buy', 'compra']))
  const sell = normalizedEntries.find((entry) => isDollarRateKey(entry.key, ['sell', 'venta']))

  if (!buy && !sell) {
    return {
      ...defaults,
      sourceLabel: 'No se detectaron claves de compra/venta del dolar en `app_settings`.',
    }
  }

  return {
    buy: formatRateValue(buy?.value),
    sell: formatRateValue(sell?.value),
    sourceLabel: 'Valores leidos desde `app_settings`.',
  }
}

function isDollarRateKey(key: string, operationAliases: string[]) {
  const containsDollarAlias = key.includes('usd') || key.includes('dolar') || key.includes('dollar')
  return containsDollarAlias && operationAliases.some((alias) => key.includes(alias))
}

function formatRateValue(value: unknown) {
  if (typeof value === 'number') return value.toFixed(2)
  if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  return 'Pendiente'
}

function findAppSettingRecord(appSettings: AppSettingRow[], targetKey: string) {
  const normalizedKey = targetKey.trim().toLowerCase()
  return (
    appSettings.find((record) => String(record.key ?? record.name ?? '').trim().toLowerCase() === normalizedKey) ??
    null
  )
}

const tableActionClassName =
  'flex justify-end opacity-100 transition-opacity sm:opacity-65 group-hover:opacity-100 focus-within:opacity-100'

function buildOptions<T>(items: T[], getValue: (item: T) => string | null | undefined) {
  return Array.from(
    new Set(
      items
        .map((item) => normalizeText(getValue(item)))
        .filter((value): value is string => Boolean(value))
    )
  ).map((value) => ({
    label: value,
    value,
  }))
}

function matchesFilterValue(value: unknown, filterValue: string) {
  if (filterValue === 'all') {
    return true
  }

  return normalizeText(value) === normalizeText(filterValue)
}

function matchesQuery(query: string, values: Array<unknown>) {
  const normalizedQuery = normalizeText(query)

  if (!normalizedQuery) {
    return true
  }

  return values.some((value) => normalizeText(value).includes(normalizedQuery))
}

function normalizeText(value: unknown) {
  if (typeof value === 'string') {
    return value.trim().toLowerCase()
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).toLowerCase()
  }

  return ''
}

function VaFeeDefaultsCard({ isPrivileged }: { isPrivileged: boolean }) {
  const [data, setData] = useState<VaFeeDefault[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await UsersAdminService.listVaFeeDefaults()
      setData(res)
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar VA Fee Defaults')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isPrivileged) {
      loadData()
    } else {
      setLoading(false)
    }
  }, [isPrivileged])

  const handleSave = async (record: VaFeeDefault) => {
    try {
      setSaving(true)
      const newValue = parseFloat(editValue)
      if (isNaN(newValue) || newValue < 0 || newValue > 100) {
        toast.error('El fee debe ser un número válido entre 0 y 100.')
        return
      }

      await UsersAdminService.updateVaFeeDefault({
        source_currency: record.source_currency,
        destination_type: record.destination_type,
        fee_percent: newValue,
      })

      toast.success('Fee global actualizado exitosamente.')
      setEditingId(null)
      loadData()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Error al actualizar el fee global.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="overflow-hidden border-border/60 bg-background/95 shadow-sm">
      <CardHeader className="border-b border-border/40 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-400">
            <Percent className="size-5" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold tracking-tight">Fees Cuentas Virtuales (Global)</CardTitle>
            <CardDescription className="text-[13px]">
              Tarifa por defecto si el usuario no tiene un Override configurado.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {!isPrivileged ? <div className="p-6"><AdminOnlyNotice /></div> : null}
        
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <Loader2 className="size-5 animate-spin" />
            Cargando configuración...
          </div>
        ) : data.length === 0 && isPrivileged ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 m-4 py-8 text-center text-sm text-muted-foreground">
            No hay fees configurados para las cuentas virtuales.
          </div>
        ) : isPrivileged ? (
          <div className="p-4 md:p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {data.map((record) => (
                <div key={record.id} className="rounded-xl border border-border/70 bg-card p-4 transition-colors hover:bg-muted/20">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <span className="text-foreground">{record.source_currency}</span>
                        <ArrowRightLeft className="size-3 text-muted-foreground/60" />
                        <span className="text-foreground">
                           {record.destination_type === 'wallet_bridge' ? 'Bridge' : 'Externa'}
                        </span>
                      </div>
                      <div className="text-[9px] text-muted-foreground font-mono">
                        {record.destination_type}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    {editingId === record.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-8 max-w-24 text-sm font-semibold"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave(record)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          disabled={saving}
                        />
                        <span className="text-sm font-bold text-muted-foreground">%</span>
                        <div className="flex ml-auto gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                            onClick={() => handleSave(record)}
                            disabled={saving}
                            title="Guardar"
                          >
                            {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setEditingId(null)}
                            disabled={saving}
                            title="Cancelar"
                          >
                            <XCircle className="size-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="text-2xl font-black tracking-tight text-foreground">
                          {record.fee_percent}%
                        </div>
                        {isPrivileged && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-[11px] h-7 px-2 border-primary/20 text-primary hover:bg-primary/5"
                            onClick={() => {
                              setEditValue(record.fee_percent.toString())
                              setEditingId(record.id)
                            }}
                          >
                            Editar
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground">
               <ShieldCheck className="mt-0.5 size-4 shrink-0 opacity-80" />
               <p className="leading-relaxed">
                 Estos porcentajes se aplican automáticamente a todas las cuentas virtuales.
                 Si un usuario tiene un override configurado (botón &quot;Fee Bridge VA&quot; en usuarios), prevalecerá el override.
               </p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════
//  StaffReviewsPanel — Cola de revisiones por exceso de límite
// ═══════════════════════════════════════════════════════════

const REVIEW_STATUS_CONFIG: Record<ReviewRequestStatus, { label: string; badgeClass: string }> = {
  pending_review:    { label: 'Pendiente',         badgeClass: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  approved:          { label: 'Aprobada',           badgeClass: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  rejected:          { label: 'Rechazada',          badgeClass: 'border-destructive/40 bg-destructive/10 text-destructive' },
  expired:           { label: 'Expirada',           badgeClass: 'border-muted/40 bg-muted/10 text-muted-foreground' },
  cancelled_by_user: { label: 'Cancelada',          badgeClass: 'border-muted/40 bg-muted/10 text-muted-foreground' },
}

const FLOW_TYPE_LABELS: Record<string, string> = {
  bolivia_to_world:           'Bolivia → Mundo',
  bolivia_to_wallet:          'Bolivia → Wallet',
  wallet_to_wallet:           'Wallet → Wallet',
  world_to_bolivia:           'Mundo → Bolivia',
  fiat_bo_to_bridge_wallet:   'Fiat BO → Bridge Wallet',
  crypto_to_bridge_wallet:    'Crypto → Bridge Wallet',
  bridge_wallet_to_fiat_bo:   'Bridge Wallet → Fiat BO',
  bridge_wallet_to_crypto:    'Bridge Wallet → Crypto',
  bridge_wallet_to_fiat_us:   'Bridge Wallet → Fiat US',
}

export function StaffReviewsPanel({ actor }: { actor: StaffActor }) {
  const isPrivileged = ['admin', 'super_admin'].includes(actor.role)

  const [reviews, setReviews] = useState<OrderReviewRequest[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('pending_review')
  const [selected, setSelected] = useState<OrderReviewRequest | null>(null)
  const [staffNotes, setStaffNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const data = await apiGet<{ data: OrderReviewRequest[]; total: number }>(
        `/admin/payment-orders/order-reviews?${params.toString()}`
      )
      setReviews(data.data ?? [])
      setTotal(data.total ?? 0)
    } catch (err) {
      toast.error('No se pudo cargar las solicitudes de revisión')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  async function handleApprove() {
    if (!selected || !isPrivileged) return
    setActionLoading(true)
    try {
      await apiPost(`/admin/payment-orders/order-reviews/${selected.id}/approve`, { staff_notes: staffNotes })
      toast.success('Solicitud aprobada y expediente creado exitosamente')
      setSelected(null)
      setStaffNotes('')
      load()
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al aprobar la solicitud')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleReject() {
    if (!selected || !isPrivileged) return
    if (staffNotes.trim().length < 10) {
      toast.warning('El motivo de rechazo debe tener al menos 10 caracteres')
      return
    }
    setActionLoading(true)
    try {
      await apiPost(`/admin/payment-orders/order-reviews/${selected.id}/reject`, { staff_notes: staffNotes })
      toast.success('Solicitud rechazada')
      setSelected(null)
      setStaffNotes('')
      load()
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al rechazar la solicitud')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="size-5 text-amber-500" />
                Cola de Revisión — Expedientes sobre Límite
              </CardTitle>
              <CardDescription>
                Solicitudes de clientes que exceden el límite máximo por servicio. Aprueba o rechaza cada caso.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'pending_review')}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending_review">Pendientes</SelectItem>
                  <SelectItem value="approved">Aprobadas</SelectItem>
                  <SelectItem value="rejected">Rechazadas</SelectItem>
                  <SelectItem value="expired">Expiradas</SelectItem>
                  <SelectItem value="all">Todas</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={load} disabled={loading}>
                <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-sm">Cargando solicitudes…</span>
            </div>
          ) : reviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <CheckCircle2 className="size-8 opacity-40" />
              <p className="text-sm">No hay solicitudes en este estado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Servicio</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="text-right">Límite</TableHead>
                  <TableHead className="text-right">Exceso</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Expira</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map(r => {
                  const cfg = REVIEW_STATUS_CONFIG[r.status]
                  const profile = r.profiles
                  return (
                    <TableRow key={r.id} className="cursor-pointer hover:bg-muted/40" onClick={() => { setSelected(r); setStaffNotes('') }}>
                      <TableCell>
                        <div className="text-sm font-medium">{profile?.full_name ?? '—'}</div>
                        <div className="text-xs text-muted-foreground">{profile?.email ?? r.user_id.slice(0, 8)}</div>
                      </TableCell>
                      <TableCell className="text-sm">{FLOW_TYPE_LABELS[r.flow_type] ?? r.flow_type}</TableCell>
                      <TableCell className="text-right text-sm font-mono">{r.amount.toLocaleString()} {r.currency}</TableCell>
                      <TableCell className="text-right text-sm font-mono text-amber-600">${r.limit_usd.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm font-mono text-destructive">+${r.excess_usd.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-xs', cfg.badgeClass)}>{cfg.label}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(r.expires_at).toLocaleDateString('es-BO', { dateStyle: 'short' })}
                      </TableCell>
                      <TableCell>
                        {r.status === 'pending_review' && isPrivileged && (
                          <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); setSelected(r); setStaffNotes('') }}>
                            Revisar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
          {total > reviews.length && (
            <p className="p-4 text-xs text-muted-foreground text-center">Mostrando {reviews.length} de {total} solicitudes</p>
          )}
        </CardContent>
      </Card>

      {/* Panel de detalle / acción */}
      {selected && (
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="size-4 text-amber-500" />
              Solicitud #{selected.id.slice(0, 8)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-muted/30 p-3 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Servicio</p>
                <p className="font-medium">{FLOW_TYPE_LABELS[selected.flow_type] ?? selected.flow_type}</p>
              </div>
              <div className="rounded-xl bg-muted/30 p-3 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Monto</p>
                <p className="font-medium font-mono">{selected.amount.toLocaleString()} {selected.currency}</p>
              </div>
              <div className="rounded-xl bg-muted/30 p-3 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Equiv. USD</p>
                <p className="font-medium font-mono">${selected.amount_usd_equiv.toLocaleString()}</p>
              </div>
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Excede el límite en</p>
                <p className="font-semibold text-amber-600 font-mono">+${selected.excess_usd.toLocaleString()} USD</p>
              </div>
            </div>

            {/* Motivo de negocio del expediente original */}
            {Boolean(selected.request_payload?.business_purpose) && (
              <div className="rounded-xl bg-muted/30 p-4 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Motivo de pago (expediente)</p>
                <p className="text-sm leading-relaxed">{String(selected.request_payload.business_purpose)}</p>
              </div>
            )}

            {/* Documento de respaldo adjunto al expediente */}
            {typeof selected.request_payload?.supporting_document_url === 'string' && (
              <div className="rounded-xl bg-muted/30 p-4 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Documento de respaldo</p>
                <a
                  href={selected.request_payload.supporting_document_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary underline break-all"
                >
                  Ver documento adjunto
                </a>
              </div>
            )}

            {/* Motivo por el que el cliente solicita exceder el límite */}
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Justificación para exceder el límite</p>
              <p className="text-sm leading-relaxed">{selected.client_reason}</p>
            </div>

            {selected.status === 'pending_review' && isPrivileged && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Notas del staff</label>
                  <textarea
                    className="w-full rounded-xl border border-input bg-muted/30 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[80px]"
                    placeholder="Opcional para aprobar. Obligatorio (mín. 10 chars) para rechazar…"
                    value={staffNotes}
                    onChange={e => setStaffNotes(e.target.value)}
                  />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setSelected(null)}>
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={actionLoading || staffNotes.trim().length < 10}
                    onClick={handleReject}
                  >
                    {actionLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : <XCircle className="size-4 mr-2" />}
                    Rechazar
                  </Button>
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={actionLoading}
                    onClick={handleApprove}
                  >
                    {actionLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : <CheckCircle2 className="size-4 mr-2" />}
                    Aprobar y Crear Expediente
                  </Button>
                </div>
              </>
            )}

            {selected.status !== 'pending_review' && (
              <div className="rounded-xl bg-muted/30 p-4 space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Revisado por</p>
                <p className="text-sm">{selected.reviewed_by ?? '—'}</p>
                {selected.staff_notes && (
                  <>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mt-2">Notas del staff</p>
                    <p className="text-sm leading-relaxed">{selected.staff_notes}</p>
                  </>
                )}
                {selected.payment_order_id && (
                  <>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mt-2">Expediente generado</p>
                    <p className="text-sm font-mono">{selected.payment_order_id}</p>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

