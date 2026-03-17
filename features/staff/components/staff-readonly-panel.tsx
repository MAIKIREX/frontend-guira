'use client'

import { format } from 'date-fns'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRightLeft,
  Bell,
  CircleDollarSign,  Loader2,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuthStore } from '@/stores/auth-store'
import { useProfileStore } from '@/stores/profile-store'
import { useStaffDashboard } from '@/features/staff/hooks/use-staff-dashboard'
import { OrderDetailDialog, SupportTicketActions } from '@/features/staff/components/staff-action-dialogs'
import {
  AppSettingDialog,
  CreateUserDialog,
  FeeConfigDialog,
  PsavConfigDialogs,
  PsavCreateDialog,
  UserAdminActions,
} from '@/features/staff/components/admin-action-dialogs'
import type { AppSettingRow, FeeConfigRow, PaymentOrder, PsavConfigRow } from '@/types/payment-order'
import type { Profile } from '@/types/profile'
import type { StaffActor, StaffOnboardingRecord, StaffSupportTicket } from '@/types/staff'
import type { BridgeTransfer } from '@/types/bridge-transfer'
import type { AuditLog } from '@/types/activity-log'

const PANEL_TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'orders', label: 'Orders' },
  { value: 'support', label: 'Support' },
  { value: 'audit', label: 'Audit' },
  { value: 'payins', label: 'Payins' },
  { value: 'transfers', label: 'Transfers' },
  { value: 'users', label: 'Users' },
  { value: 'config', label: 'Config' },
  { value: 'psav', label: 'PSAV' },
] as const

export function StaffReadonlyPanel() {
  const { user } = useAuthStore()
  const { profile } = useProfileStore()
  const {
    snapshot,
    loading,
    error,
    reload,
    replaceOrder,
    replaceSupportTicket,
    addUser,
    replaceUser,
    removeUser,
    replaceFeeConfig,
    replaceAppSetting,
    replacePsavConfig,
    removePsavConfig,
  } = useStaffDashboard()

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !snapshot || !user || !profile || (profile.role !== 'staff' && profile.role !== 'admin')) {
    return (
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>No se pudo cargar el Staff Panel</CardTitle>
          <CardDescription>{error ?? 'No hay permisos o datos disponibles para el panel interno.'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={reload} type="button">Reintentar</Button>
        </CardContent>
      </Card>
    )
  }

  const actor: StaffActor = { userId: user.id, role: profile.role }
  const isAdmin = actor.role === 'admin'

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.65fr_0.95fr]">
        <Card className="border-border/80 bg-muted/10">
          <CardHeader className="gap-4 border-b border-border/60 bg-background/95 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Centro de control interno</div>
              <CardTitle className="text-2xl tracking-tight">Staff valida, cliente autoriza, admin gobierna</CardTitle>
              <CardDescription>
                Este panel concentra revisiones, cambios de estado y auditoria. El paso a `processing` ahora depende de aceptacion explicita del cliente.
              </CardDescription>
            </div>
            <Button onClick={reload} type="button" variant="outline">
              <RefreshCw />
              Actualizar
            </Button>
          </CardHeader>
          <CardContent className="space-y-5 p-6">
            {snapshot.gaps.length > 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 p-4 text-sm">
                <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                  <AlertTriangle className="size-4" />
                  Limites documentales detectados
                </div>
                <ul className="space-y-1 text-muted-foreground">
                  {snapshot.gaps.map((gap) => (
                    <li key={gap}>{gap}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-4">
              <MetricCard icon={ShieldCheck} label="Onboarding" value={String(snapshot.onboarding.length)} />
              <MetricCard icon={ArrowRightLeft} label="Orders" value={String(snapshot.orders.length)} />
              <MetricCard icon={CircleDollarSign} label="Support" value={String(snapshot.support.length)} />
              <MetricCard icon={Users} label="Users" value={String(snapshot.users.length)} />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <RoleCard
                title="Staff"
                body="Valida onboards, confirma depositos, publica cotizaciones, registra sent/completed y mueve soporte."
              />
              <RoleCard
                title="Cliente"
                body="Acepta la cotizacion final desde su panel; sin ese paso la orden no entra a processing."
              />
              <RoleCard
                title="Admin"
                body="Ademas de operar, gestiona usuarios, fees, app settings y PSAV desde las tabs dedicadas."
              />
            </div>
          </CardContent>
        </Card>

        <RecentAuditCard logs={snapshot.auditLogs.slice(0, 8)} />
      </section>

      <Tabs defaultValue="overview" className="gap-4">
        <TabsList variant="line" className="w-full flex-wrap justify-start rounded-none border-b bg-transparent p-0">
          {PANEL_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="rounded-none px-4 py-2">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview">
          <OverviewPanel auditCount={snapshot.auditLogs.length} isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="onboarding">
          <OnboardingTable records={snapshot.onboarding} />
        </TabsContent>
        <TabsContent value="orders">
          <OrdersTable actor={actor} onUpdated={replaceOrder} orders={snapshot.orders} />
        </TabsContent>
        <TabsContent value="support">
          <SupportTable actor={actor} onUpdated={replaceSupportTicket} tickets={snapshot.support} />
        </TabsContent>
        <TabsContent value="audit">
          <AuditTable logs={snapshot.auditLogs} />
        </TabsContent>
        <TabsContent value="payins">
          <GenericRecordsCard
            title="Payin routes"
            description="Lectura generica de `payin_routes` hasta documentar sus columnas funcionales."
            records={snapshot.payinRoutes}
          />
        </TabsContent>
        <TabsContent value="transfers">
          <TransfersTable transfers={snapshot.transfers} />
        </TabsContent>
        <TabsContent value="users">
          <UsersTable actor={actor} isAdmin={isAdmin} onAddUser={addUser} onChangeUser={replaceUser} onRemoveUser={removeUser} users={snapshot.users} />
        </TabsContent>
        <TabsContent value="config">
          <ConfigPanel actor={actor} appSettings={snapshot.appSettings} feesConfig={snapshot.feesConfig} isAdmin={isAdmin} onUpdateAppSetting={replaceAppSetting} onUpdateFeeConfig={replaceFeeConfig} />
        </TabsContent>
        <TabsContent value="psav">
          <PsavPanel actor={actor} isAdmin={isAdmin} onChangeRecord={(record, mode) => {
            if (mode === 'remove' && record) {
              removePsavConfig(record.id)
              return
            }

            if (record) {
              replacePsavConfig(record)
            }
          }} records={snapshot.psavConfigs} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
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

function OverviewPanel({ auditCount, isAdmin }: { auditCount: number; isAdmin: boolean }) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <RoleCard title="1. Onboarding" body="Aqui se verifica, rechaza o pide cambios al KYC/KYB antes de operar." />
      <RoleCard title="2. Orders" body="Aqui staff valida depositos y publica cotizacion final; luego el cliente aprueba y staff solo continua con sent/completed." />
      <RoleCard title="3. Audit" body={`La auditoria ya no queda escondida: tienes ${auditCount} eventos visibles en la tab Audit para seguimiento.`} />
      <RoleCard title="4. Support" body="Los tickets se mueven con motivo y notificacion al cliente desde su tab dedicada." />
      <RoleCard title="5. Admin tools" body={isAdmin ? 'Tienes disponibles Users, Config y PSAV para gobierno del sistema.' : 'Estas herramientas existen, pero solo se habilitan con rol admin.'} />
      <RoleCard title="6. Rieles no cerrados" body="Payins y Transfers siguen en solo lectura hasta que el contrato documental defina columnas y transiciones seguras." />
    </div>
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Auditoria completa</CardTitle>
        <CardDescription>Seguimiento de cambios con tabla, motivo y momento exacto.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tabla</TableHead>
              <TableHead>Accion</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Fuente</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <EmptyRow colSpan={5} message="No hay eventos de auditoria." />
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.table_name}</TableCell>
                  <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                  <TableCell className="max-w-[360px] truncate">{log.reason}</TableCell>
                  <TableCell>{log.source}</TableCell>
                  <TableCell>{formatDate(log.created_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function OnboardingTable({ records }: { records: StaffOnboardingRecord[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Onboarding</CardTitle>
        <CardDescription>Revision y acciones KYC/KYB con join a `profiles`.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Actualizado</TableHead>
              <TableHead>Observaciones</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <EmptyRow colSpan={6} message="No hay registros de onboarding." />
            ) : (
              records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <div className="font-medium">{record.profiles?.full_name ?? 'Sin nombre'}</div>
                    <div className="text-xs text-muted-foreground">{record.profiles?.email ?? record.user_id}</div>
                  </TableCell>
                  <TableCell>{record.type}</TableCell>
                  <TableCell><StatusBadge value={record.status} /></TableCell>
                  <TableCell>{formatDate(record.updated_at)}</TableCell>
                  <TableCell className="max-w-[280px] truncate">{record.observations || 'Sin observaciones'}</TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Link
                        className="inline-flex h-7 items-center justify-center rounded-[min(var(--radius-md),12px)] border border-border bg-background px-2.5 text-[0.8rem] font-medium transition-colors hover:bg-muted"
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
      </CardContent>
    </Card>
  )
}

function TransfersTable({ transfers }: { transfers: BridgeTransfer[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bridge transfers</CardTitle>
        <CardDescription>Lectura operativa de `bridge_transfers`. Se mantiene sin acciones por falta de transiciones documentadas.</CardDescription>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  )
}

function OrdersTable({ actor, onUpdated, orders }: { actor: StaffActor; onUpdated: (order: PaymentOrder) => Promise<void> | void; orders: PaymentOrder[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment orders</CardTitle>
        <CardDescription>Staff revisa respaldo y comprobante del cliente, valida el deposito y luego publica la cotizacion final.</CardDescription>
      </CardHeader>
      <CardContent>
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
            ) : (
              orders.map((order) => (
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
                        <div className="text-xs text-muted-foreground">Pendiente de cotizacion o aprobacion del cliente.</div>
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
                  <TableCell><div className="flex justify-end"><OrderDetailDialog actor={actor} onUpdated={onUpdated} order={order} /></div></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function UsersTable({
  actor,
  isAdmin,
  onAddUser,
  onChangeUser,
  onRemoveUser,
  users,
}: {
  actor: StaffActor
  isAdmin: boolean
  onAddUser: (user: Profile) => void
  onChangeUser: (user: Profile) => void
  onRemoveUser: (userId: string) => void
  users: Profile[]
}) {
  const handleUserUpdated = async (user: Profile | null, mode: 'replace' | 'remove' | 'noop') => {
    if (mode === 'remove' && user) {
      onRemoveUser(user.id)
      return
    }

    if (mode === 'replace' && user) {
      onChangeUser(user)
    }
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle>Usuarios</CardTitle>
          <CardDescription>Lectura de `profiles` con herramientas administrativas solo para `admin`.</CardDescription>
        </div>
        {isAdmin ? <CreateUserDialog actor={actor} onUpdated={(profile) => {
          if (profile) onAddUser(profile)
        }} /> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {!isAdmin ? <AdminOnlyNotice /> : null}
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
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium">{user.full_name || 'Sin nombre'}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
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
      </CardContent>
    </Card>
  )
}

function SupportTable({ actor, onUpdated, tickets }: { actor: StaffActor; onUpdated: (ticket: StaffSupportTicket) => Promise<void> | void; tickets: StaffSupportTicket[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Support tickets</CardTitle>
        <CardDescription>Bandeja operativa de `support_tickets` con cambio de estado.</CardDescription>
      </CardHeader>
      <CardContent>
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
            ) : (
              tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell>
                    <div className="font-medium">{ticket.profiles?.full_name ?? 'Sin nombre'}</div>
                    <div className="text-xs text-muted-foreground">{ticket.profiles?.email ?? ticket.contact_email}</div>
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate">{ticket.subject}</TableCell>
                  <TableCell><StatusBadge value={ticket.status ?? 'open'} /></TableCell>
                  <TableCell>{ticket.contact_phone || ticket.contact_email}</TableCell>
                  <TableCell>{formatDate(ticket.created_at)}</TableCell>
                  <TableCell><div className="flex justify-end"><SupportTicketActions actor={actor} onUpdated={onUpdated} ticket={ticket} /></div></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function ConfigPanel({
  actor,
  appSettings,
  feesConfig,
  isAdmin,
  onUpdateAppSetting,
  onUpdateFeeConfig,
}: {
  actor: StaffActor
  appSettings: AppSettingRow[]
  feesConfig: FeeConfigRow[]
  isAdmin: boolean
  onUpdateAppSetting: (record: AppSettingRow) => void
  onUpdateFeeConfig: (record: FeeConfigRow) => void
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Fees config</CardTitle>
          <CardDescription>Ajustes documentados sobre `route_creation` y `supplier_payment`.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!isAdmin ? <AdminOnlyNotice /> : null}
          {feesConfig.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 p-6 text-sm text-muted-foreground">No hay fees config disponibles.</div>
          ) : (
            feesConfig.map((record) => (
              <div key={record.id} className="rounded-xl border border-border/70 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{record.type}</div>
                    <div className="text-xs text-muted-foreground">{record.fee_type}</div>
                  </div>
                  {isAdmin ? <FeeConfigDialog actor={actor} onUpdated={onUpdateFeeConfig} record={record} /> : null}
                </div>
                <div className="text-sm text-muted-foreground">{record.value} {record.currency}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>App settings</CardTitle>
          <CardDescription>Edicion conservadora del valor, preservando el resto del registro.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!isAdmin ? <AdminOnlyNotice /> : null}
          {appSettings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 p-6 text-sm text-muted-foreground">No hay app settings disponibles.</div>
          ) : (
            appSettings.map((record, index) => (
              <div key={String(record.id ?? record.key ?? record.name ?? index)} className="rounded-xl border border-border/70 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{String(record.key ?? record.name ?? `setting-${index + 1}`)}</div>
                    <div className="text-xs text-muted-foreground">Valor actual</div>
                  </div>
                  {isAdmin ? <AppSettingDialog actor={actor} onUpdated={onUpdateAppSetting} record={record} /> : null}
                </div>
                <div className="text-sm text-muted-foreground">{String(record.value ?? 'sin valor')}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function PsavPanel({ actor, isAdmin, onChangeRecord, records }: { actor: StaffActor; isAdmin: boolean; onChangeRecord: (record: PsavConfigRow | null, mode: 'replace' | 'remove') => void; records: PsavConfigRow[] }) {
  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle>PSAV configs</CardTitle>
          <CardDescription>Gestion generica con `upsert` y `delete` porque el contrato no expone columnas exactas.</CardDescription>
        </div>
        {isAdmin ? <PsavCreateDialog actor={actor} onUpdated={onChangeRecord} /> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {!isAdmin ? <AdminOnlyNotice /> : null}
        {records.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 p-6 text-sm text-muted-foreground">No hay PSAV configs disponibles.</div>
        ) : (
          records.map((record) => (
            <div key={record.id} className="rounded-xl border border-border/70 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{record.id}</div>
                  <div className="text-xs text-muted-foreground">{record.is_active === false ? 'inactive' : 'active'}</div>
                </div>
                {isAdmin ? <PsavConfigDialogs actor={actor} onUpdated={onChangeRecord} record={record} /> : null}
              </div>
              <pre className="overflow-x-auto text-xs leading-5 text-foreground/85">{JSON.stringify(record, null, 2)}</pre>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function GenericRecordsCard({ title, description, records }: { title: string; description: string; records: Array<Record<string, unknown>> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {records.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 p-6 text-sm text-muted-foreground">No hay registros disponibles.</div>
        ) : (
          records.map((record, index) => (
            <div key={String(record.id ?? index)} className="rounded-xl border border-border/70 bg-muted/20 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <Bell className="size-3.5" />
                Registro {index + 1}
              </div>
              <pre className="overflow-x-auto text-xs leading-5 text-foreground/85">{JSON.stringify(record, null, 2)}</pre>
            </div>
          ))
        )}
      </CardContent>
    </Card>
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

