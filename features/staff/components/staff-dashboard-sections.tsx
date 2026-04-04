'use client'

import { useDeferredValue, useState } from 'react'
import { format } from 'date-fns'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  AlertTriangle,
  ArrowRightLeft,
  Bell,
  CircleDollarSign,
  RefreshCw,
  ShieldCheck,
  Users,
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
import { OrderDetailDialog, SupportTicketActions } from '@/features/staff/components/staff-action-dialogs'
import { useExchangeRates } from '@/features/payments/hooks/use-exchange-rates'
import {
  AppSettingDialog,
  CreateUserDialog,
  FeeConfigDialog,
  PsavConfigDialogs,
  PsavCreateDialog,
  UserAdminActions,
} from '@/features/staff/components/admin-action-dialogs'
import { AdminService } from '@/services/admin.service'
import { interactiveCardClassName, cn } from '@/lib/utils'
import { useAuditTableStore } from '@/stores/audit-table-store'
import type { StaffDashboardLoadedState } from '@/features/staff/components/staff-dashboard-page'
import type { AppSettingRow, FeeConfigRow, PsavConfigRow } from '@/types/payment-order'
import type { Profile } from '@/types/profile'
import type { StaffActor } from '@/types/staff'
import type { BridgeTransfer } from '@/types/bridge-transfer'
import type { AuditLog } from '@/types/activity-log'

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
              <MetricCard icon={ShieldCheck} label="Onboarding" value={String(snapshot.onboarding.length)} />
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
        <CardTitle className="text-3xl tracking-tight">Onboarding</CardTitle>
        <CardDescription>Revision y acciones KYC/KYB con join a `profiles`.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-0 pb-0">
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
            filteredRecords.map((record) => (
              <Card key={record.id} className="border-border/70 bg-card/95 shadow-sm">
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
                      <StatusBadge value={record.status} />
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
            ))
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
                filteredRecords.map((record) => (
                  <TableRow key={record.id}>
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
                    <TableCell className="align-top"><StatusBadge value={record.status} /></TableCell>
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
                ))
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
  const [activeTab, setActiveTab] = useState<'orders' | 'payins' | 'transfers'>('orders')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [railFilter, setRailFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const deferredQuery = useDeferredValue(query)
  const tabCopy = {
    orders: {
      title: 'Payment orders',
      description:
        'Staff revisa respaldo y comprobante del cliente, valida el deposito y publica la cotizacion final para mover la orden a processing.',
    },
    payins: {
      title: 'Payin routes',
      description: 'Lectura generica de `payin_routes` hasta documentar sus columnas funcionales.',
    },
    transfers: {
      title: 'Bridge transfers',
      description:
        'Lectura operativa de `bridge_transfers`. Se mantiene sin acciones por falta de transiciones documentadas.',
    },
  } as const
  const filteredOrders = orders.filter((order) => {
    const matchesStatus = matchesFilterValue(order.status, statusFilter)
    const matchesRail = matchesFilterValue(order.processing_rail, railFilter)
    const matchesType = matchesFilterValue(order.order_type, typeFilter)
    const matchesSearch = matchesQuery(deferredQuery, [
      order.id,
      order.user_id,
      order.order_type,
      order.processing_rail,
      order.status,
      order.origin_currency,
      order.destination_currency,
      order.metadata?.reference,
    ])

    return matchesStatus && matchesRail && matchesType && matchesSearch
  })
  const hasActiveFilters =
    query.trim().length > 0 || statusFilter !== 'all' || railFilter !== 'all' || typeFilter !== 'all'

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'orders' | 'payins' | 'transfers')} className="gap-4">
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
          <TabsTrigger value="payins" className="rounded-none px-4 py-2">Payins</TabsTrigger>
          <TabsTrigger value="transfers" className="rounded-none px-4 py-2">Transfers</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="orders">
        <Card className="overflow-hidden border-0 bg-background shadow-none ring-0">
          <CardContent className="space-y-4 px-0 pb-0">
            <TableFilters
              query={query}
              onQueryChange={setQuery}
              searchPlaceholder="Buscar por ID, estado, rail o moneda"
              filters={[
                {
                  label: 'Estado',
                  value: statusFilter,
                  onChange: setStatusFilter,
                  options: buildOptions(orders, (order) => order.status),
                },
                {
                  label: 'Rail',
                  value: railFilter,
                  onChange: setRailFilter,
                  options: buildOptions(orders, (order) => order.processing_rail),
                },
                {
                  label: 'Tipo',
                  value: typeFilter,
                  onChange: setTypeFilter,
                  options: buildOptions(orders, (order) => order.order_type),
                },
              ]}
              onReset={() => {
                setQuery('')
                setStatusFilter('all')
                setRailFilter('all')
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
                          <div className="text-sm font-medium text-foreground">{order.order_type}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Rail</div>
                          <div className="text-sm font-medium text-foreground">{order.processing_rail}</div>
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Monto</div>
                          <div className="text-sm font-medium text-foreground">{order.amount_origin} {order.origin_currency}</div>
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Archivos</div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {order.support_document_url ? <Badge variant="outline">support</Badge> : null}
                            {order.evidence_url ? <Badge variant="outline">deposit-proof</Badge> : null}
                            {order.staff_comprobante_url ? <Badge variant="outline">staff</Badge> : null}
                            {!order.support_document_url && !order.evidence_url && !order.staff_comprobante_url ? <span className="text-xs text-muted-foreground">Sin archivos</span> : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <OrderDetailDialog actor={actor} onUpdated={replaceOrder} order={order} />
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
                    <TableHead>Tipo</TableHead>
                    <TableHead>Rail</TableHead>
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
                        <TableCell>{order.order_type}</TableCell>
                        <TableCell>{order.processing_rail}</TableCell>
                        <TableCell>{order.amount_origin} {order.origin_currency}</TableCell>
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
                            {order.support_document_url ? <Badge variant="outline">support</Badge> : null}
                            {order.evidence_url ? <Badge variant="outline">deposit-proof</Badge> : null}
                            {order.staff_comprobante_url ? <Badge variant="outline">staff</Badge> : null}
                            {!order.support_document_url && !order.evidence_url && !order.staff_comprobante_url ? <span className="text-xs text-muted-foreground">Sin archivos</span> : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <OrderDetailDialog actor={actor} onUpdated={replaceOrder} order={order} />
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

      <TabsContent value="payins">
        <StaffPayinsPanel snapshot={snapshot} showHeader={false} />
      </TabsContent>

      <TabsContent value="transfers">
        <StaffTransfersPanel snapshot={snapshot} showHeader={false} />
      </TabsContent>
    </Tabs>
  )
}

export function StaffPayinsPanel({
  snapshot,
  showHeader = true,
}: Pick<StaffDashboardLoadedState, 'snapshot'> & { showHeader?: boolean }) {
  return (
    <GenericRecordsCard
      title="Payin routes"
      description="Lectura generica de `payin_routes` hasta documentar sus columnas funcionales."
      records={snapshot.payinRoutes}
      showHeader={showHeader}
    />
  )
}

export function StaffTransfersPanel({
  snapshot,
  showHeader = true,
}: Pick<StaffDashboardLoadedState, 'snapshot'> & { showHeader?: boolean }) {
  return <TransfersTable transfers={snapshot.transfers} showHeader={showHeader} />
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
  actor,
  isAdmin,
  addUser,
  replaceUser,
  removeUser,
}: Pick<StaffDashboardLoadedState, 'snapshot' | 'actor' | 'isAdmin' | 'addUser' | 'replaceUser' | 'removeUser'>) {
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

  const handleUserUpdated = async (user: Profile | null, mode: 'replace' | 'remove' | 'noop') => {
    if (mode === 'remove' && user) {
      removeUser(user.id)
      return
    }

    if (mode === 'replace' && user) {
      replaceUser(user)
    }
  }

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
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="size-10 shrink-0 rounded-xl ring-1 ring-border/70">
                        <AvatarImage
                          alt={user.full_name || 'Usuario'}
                          src={readProfileAvatarUrl(user.metadata) ?? undefined}
                        />
                        <AvatarFallback className="rounded-xl bg-muted/70 text-[0.8rem] font-semibold text-foreground/80">
                          {getInitials(user.full_name || user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">{user.full_name || 'Sin nombre'}</div>
                        <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
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
                    {isAdmin ? <UserAdminActions actor={actor} onUpdated={handleUserUpdated} user={user} /> : <span className="text-xs text-muted-foreground">Solo admin</span>}
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
                      <div className="flex items-center gap-3">
                        <Avatar className="size-10 rounded-xl ring-1 ring-border/70">
                          <AvatarImage
                            alt={user.full_name || 'Usuario'}
                            src={readProfileAvatarUrl(user.metadata) ?? undefined}
                          />
                          <AvatarFallback className="rounded-xl bg-muted/70 text-[0.8rem] font-semibold text-foreground/80">
                            {getInitials(user.full_name || user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-medium">{user.full_name || 'Sin nombre'}</div>
                          <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{user.role}</Badge></TableCell>
                    <TableCell><StatusBadge value={user.onboarding_status} /></TableCell>
                    <TableCell>{user.is_archived ? 'Si' : 'No'}</TableCell>
                    <TableCell>{formatDate(user.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        {isAdmin ? <UserAdminActions actor={actor} onUpdated={handleUserUpdated} user={user} /> : <span className="text-xs text-muted-foreground">Solo admin</span>}
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
      <RoleCard title="Procesos" body="Payins y Transfers siguen en solo lectura hasta que el contrato documental defina columnas y transiciones seguras." />
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

function TransfersTable({
  transfers,
  showHeader = true,
}: {
  transfers: BridgeTransfer[]
  showHeader?: boolean
}) {
  return (
    <Card className="overflow-hidden">
      {showHeader ? (
        <CardHeader>
          <CardTitle>Bridge transfers</CardTitle>
          <CardDescription>Lectura operativa de `bridge_transfers`. Se mantiene sin acciones por falta de transiciones documentadas.</CardDescription>
        </CardHeader>
      ) : null}
      <CardContent>
        <div className="space-y-3 md:hidden">
          {transfers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
              No hay transferencias para mostrar.
            </div>
          ) : (
            transfers.map((transfer) => (
              <Card key={transfer.id} className="border-border/70 bg-card/95 shadow-sm">
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground">#{transfer.id.slice(0, 8)}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{formatDate(transfer.created_at)}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge value={transfer.status} />
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/15 p-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Kind</div>
                      <div className="text-sm font-medium text-foreground">{transfer.transfer_kind}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Business Purpose</div>
                      <div className="text-sm font-medium text-foreground">{transfer.business_purpose || '-'}</div>
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Monto</div>
                      <div className="text-sm font-medium text-foreground">{transfer.amount} {transfer.currency}</div>
                    </div>
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
                <TableHead>Kind</TableHead>
                <TableHead>Business purpose</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.length === 0 ? (
                <EmptyRow colSpan={6} message="No hay transferencias para mostrar." />
              ) : (
                transfers.map((transfer) => (
                  <TableRow key={transfer.id}>
                    <TableCell className="font-medium">#{transfer.id.slice(0, 8)}</TableCell>
                    <TableCell>{transfer.transfer_kind}</TableCell>
                    <TableCell>{transfer.business_purpose}</TableCell>
                    <TableCell>{transfer.amount} {transfer.currency}</TableCell>
                    <TableCell><StatusBadge value={transfer.status} /></TableCell>
                    <TableCell>{formatDate(transfer.created_at)}</TableCell>
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
  const buyRate = rates.rawRates.find((r: any) => r.pair === 'BOB_USD')?.rate
  const sellRate = rates.rawRates.find((r: any) => r.pair === 'USD_BOB')?.rate

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
          {/* Móvil */}
          <div className="space-y-3 p-4 md:hidden">
            {feesConfig.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
                No hay comisiones configuradas.
              </div>
            ) : (
              feesConfig.map((record) => (
                <Card key={record.id} className="border-border/70 bg-card/95 shadow-sm">
                  <CardContent className="space-y-4 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-foreground/90">{record.type}</div>
                        <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          {record.fee_type === 'percentage' ? 'Porcentual' : 'Monto Fijo'}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <span className="inline-flex items-center rounded-md border border-border/40 bg-muted/60 px-2.5 py-1 text-xs font-bold">
                          {record.value}{record.fee_type === 'percentage' ? '%' : ` ${record.currency}`}
                        </span>
                      </div>
                    </div>
                    {isPrivileged && (
                      <div className="flex justify-end pt-1">
                        <FeeConfigDialog actor={actor} onUpdated={onUpdateFeeConfig} record={record} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Desktop */}
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
                {feesConfig.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-sm italic text-muted-foreground">
                      No hay comisiones configuradas.
                    </TableCell>
                  </TableRow>
                ) : (
                  feesConfig.map((record) => (
                    <TableRow key={record.id} className={cn('group', interactiveCardClassName, 'hover:bg-muted/30')}>
                      <TableCell className="py-4 pl-6">
                        <div className="text-sm font-semibold text-foreground/90">{record.type}</div>
                        <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          {record.fee_type === 'percentage' ? 'Porcentual' : 'Monto Fijo'}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <span className="inline-flex items-center rounded-md border border-border/40 bg-muted/60 px-2.5 py-1 text-xs font-bold">
                          {record.value}{record.fee_type === 'percentage' ? '%' : ` ${record.currency}`}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 pr-6 text-right">
                        <div className={tableActionClassName}>
                          {isPrivileged ? <FeeConfigDialog actor={actor} onUpdated={onUpdateFeeConfig} record={record} /> : null}
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
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Compra</div>
                <div className="mt-2 text-2xl font-bold tracking-tight">
                  {formatRateValue(buyRate)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Par: `BOB_USD`</div>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Venta</div>
                <div className="mt-2 text-2xl font-bold tracking-tight">
                  {formatRateValue(sellRate)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Par: `USD_BOB`</div>
              </div>
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

function GenericRecordsCard({
  title,
  description,
  records,
  showHeader = true,
}: {
  title: string
  description: string
  records: Array<Record<string, unknown>>
  showHeader?: boolean
}) {
  const keys = records.length > 0 ? Object.keys(records[0]).filter(k => k !== 'id').slice(0, 5) : []

  return (
    <Card>
      {showHeader ? (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      ) : null}
      <CardContent>
        {/* Móvil */}
        <div className="space-y-3 md:hidden">
          {records.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
              No hay registros disponibles.
            </div>
          ) : (
            records.map((record, index) => (
              <Card key={String(record.id ?? index)} className="border-border/70 bg-card/95 shadow-sm">
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-center gap-2">
                    <Bell className="size-4 text-muted-foreground" />
                    <div className="font-medium text-foreground">Registro #{String(record.id ?? index).slice(0, 8)}</div>
                  </div>
                  <pre className="overflow-x-auto rounded-lg bg-muted/30 p-3 text-xs leading-5 text-foreground/85">
                    {JSON.stringify(record, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Desktop */}
        <div className="hidden md:block">
          {records.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
              No hay registros disponibles.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  {keys.map((key) => (
                    <TableHead key={key} className="capitalize">{key.replace(/_/g, ' ')}</TableHead>
                  ))}
                  <TableHead className="text-right">Detalle Funcional</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record, index) => (
                  <TableRow key={String(record.id ?? index)}>
                    <TableCell className="font-medium">#{String(record.id ?? index).slice(0, 8)}</TableCell>
                    {keys.map((key) => {
                      const val = record[key]
                      const displayVal = typeof val === 'object' && val !== null ? '{...}' : String(val ?? '-')
                      return (
                        <TableCell key={key} className="max-w-[150px] truncate">
                          {displayVal}
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-right">
                      <Badge variant="outline" className="text-[10px]">Pendiente Documentar</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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

function getInitials(value: string) {
  const words = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0) return 'CL'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase()
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
