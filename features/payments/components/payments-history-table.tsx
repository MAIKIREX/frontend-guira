'use client'

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { ChevronDown, Download, Search, ShieldAlert, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DocumentUploadCard } from '@/components/shared/document-upload-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DepositInstructionCard } from '@/features/payments/components/deposit-instruction-card'
import { buildDepositInstructionsFromOrder } from '@/features/payments/lib/deposit-instructions'
import { generatePaymentPdf } from '@/features/payments/lib/generate-payment-pdf'
import { ACCEPTED_UPLOADS } from '@/lib/file-validation'
import { cn, interactiveCardClassName } from '@/lib/utils'
import { useSignedUrl } from '@/hooks/use-signed-url'
import type { ActivityLog } from '@/types/activity-log'
import type { OrderFileField, PaymentOrder } from '@/types/payment-order'
import type { Supplier } from '@/types/supplier'

const OPEN_ORDER_STATUSES = new Set(['created', 'waiting_deposit'])
const FLOW_STAGES: Array<{ key: PaymentOrder['status']; label: string }> = [
  { key: 'created', label: 'Orden creada' },
  { key: 'waiting_deposit', label: 'Esperando deposito' },
  { key: 'deposit_received', label: 'Deposito validado' },
  { key: 'processing', label: 'Procesando' },
  { key: 'sent', label: 'Enviado' },
  { key: 'completed', label: 'Completado' },
  { key: 'failed', label: 'Fallido' },
  { key: 'cancelled', label: 'Cancelado' },
]

const STATUS_FILTER_LABELS: Record<string, string> = {
  all: 'Todos los estados',
  created: 'Orden creada',
  waiting_deposit: 'Esperando deposito',
  deposit_received: 'Deposito validado',
  processing: 'Procesando',
  sent: 'Enviado',
  completed: 'Completado',
  failed: 'Fallido',
  cancelled: 'Cancelado',
  swept_external: 'Swept external',
}

interface PaymentsHistoryTableProps {
  orders: PaymentOrder[]
  suppliers: Supplier[]
  /** @deprecated Ya no se usa — las instrucciones se leen de cada orden. Se mantiene como prop opcional para compatibilidad temporal. */
  psavConfigs?: unknown[]
  activityLogs: ActivityLog[]
  disabled?: boolean
  onUploadOrderFile: (orderId: string, field: OrderFileField, file: File) => Promise<unknown>
  onCancelOrder: (order: PaymentOrder) => Promise<unknown>
}

export function PaymentsHistoryTable({
  orders,
  suppliers,
  activityLogs,
  disabled,
  onUploadOrderFile,
  onCancelOrder,
}: PaymentsHistoryTableProps) {
  // Defensive: ensure orders is always an array even if the API returns a wrapped object
  const safeOrders: PaymentOrder[] = Array.isArray(orders) ? orders : []
  const [files, setFiles] = useState<Record<string, Partial<Record<OrderFileField, File>>>>({})
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentOrder['status']>('all')
  const [search, setSearch] = useState('')
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({})
  const suppliersById = useMemo(
    () =>
      new Map(
        suppliers
          .filter((supplier) => supplier.id)
          .map((supplier) => [supplier.id as string, supplier])
      ),
    [suppliers]
  )

  const activityByOrderId = useMemo(() => {
    const grouped = new Map<string, ActivityLog[]>()

    activityLogs.forEach((log) => {
      const orderId = typeof log.metadata?.order_id === 'string' ? log.metadata.order_id : null
      if (!orderId) return
      const bucket = grouped.get(orderId) ?? []
      bucket.push(log)
      grouped.set(orderId, bucket)
    })

    return grouped
  }, [activityLogs])

  useEffect(() => {
    setExpandedOrders((current) => {
      const next = { ...current }
      safeOrders.forEach((order, index) => {
        if (next[order.id] === undefined) next[order.id] = index === 0
      })
      return next
    })
  }, [safeOrders])

  const filteredOrders = useMemo(
    () =>
      safeOrders.filter((order) => {
        const statusMatches = statusFilter === 'all' || order.status === statusFilter
        if (!search) return statusMatches
        const q = search.toLowerCase()
        const idMatches = order.id.toLowerCase().includes(q)
        const supplier = order.supplier_id ? suppliersById.get(order.supplier_id) : null
        const supplierMatches = supplier?.name?.toLowerCase().includes(q) ?? false
        const amountStr = String(order.amount_origin ?? order.amount ?? '')
        const amountMatches = amountStr.includes(q)
        return statusMatches && (idMatches || supplierMatches || amountMatches)
      }),
    [safeOrders, search, statusFilter, suppliersById]
  )

  if (safeOrders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bitacora de expedientes</CardTitle>
          <CardDescription>Aun no hay `payment_orders` creadas para este usuario.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  async function handleUpload(order: PaymentOrder, field: OrderFileField) {
    const file = files[order.id]?.[field]
    if (!file) {
      toast.error('Selecciona un archivo antes de subirlo.')
      return
    }

    setBusyKey(`${order.id}-${field}`)
    try {
      await onUploadOrderFile(order.id, field, file)
      toast.success(field === 'evidence_url' ? 'Comprobante subido.' : 'Respaldo subido.')
      setFiles((current) => ({
        ...current,
        [order.id]: {
          ...current[order.id],
          [field]: undefined,
        },
      }))
    } catch (error) {
      console.error('Failed to upload order file', error)
      toast.error('No se pudo subir el archivo.')
    } finally {
      setBusyKey(null)
    }
  }

  async function handleCancel(order: PaymentOrder) {
    setBusyKey(`${order.id}-cancel`)
    try {
      await onCancelOrder(order)
      toast.success('Expediente cancelado.')
    } catch (error) {
      console.error('Failed to cancel order', error)
      toast.error('No se pudo cancelar el expediente.')
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div className="space-y-4 ">
      <section className="overflow-hidden rounded-[28px]  ">
        <div className="grid gap-5 border-b border-border/60 px-4 py-5 sm:px-6 xl:grid-cols-[1.15fr_0.85fr] xl:items-end">
          <div className="space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Bitacora operativa</div>
            <div className="space-y-1">
              <h3 className="text-xl sm:text-2xl font-semibold tracking-[-0.03em] text-foreground">Expedientes con lectura bancaria y trazabilidad crypto</h3>
              <p className="max-w-2xl text-xs sm:text-sm text-muted-foreground">
                Consulta el estado, valida documentos y sigue cada tramo de ejecucion desde una sola vista, sin bloques visuales innecesarios.
              </p>
            </div>
          </div>

          <div className="grid gap-3 grid-cols-2">
            <ToolbarMetric label="Visibles" value={String(filteredOrders.length).padStart(2, '0')} />
            <ToolbarMetric
              label="En curso"
              value={String(filteredOrders.filter((order) => OPEN_ORDER_STATUSES.has(order.status)).length).padStart(2, '0')}
            />
          </div>
        </div>

        <div className="grid gap-3 px-4 py-4 sm:px-6 md:grid-cols-[1fr_240px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-11 border-border/60 bg-background/80 pl-9"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por expediente, proveedor o monto"
              value={search}
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | PaymentOrder['status'])}>
            <SelectTrigger className="h-11 w-full border-border/60 bg-background/80">
              <SelectValue placeholder="Filtrar por estado">
                {STATUS_FILTER_LABELS[statusFilter] ?? statusFilter}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="created">Orden creada</SelectItem>
              <SelectItem value="waiting_deposit">Esperando deposito</SelectItem>
              <SelectItem value="deposit_received">Deposito validado</SelectItem>
              <SelectItem value="processing">Procesando</SelectItem>
              <SelectItem value="sent">Enviado</SelectItem>
              <SelectItem value="completed">Completado</SelectItem>
              <SelectItem value="failed">Fallido</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {filteredOrders.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Sin coincidencias</CardTitle>
            <CardDescription>No hay expedientes que coincidan con el filtro actual.</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {filteredOrders.map((order) => {
        const supplier = order.supplier_id ? (suppliersById.get(order.supplier_id) ?? null) : null
        const canCancel = OPEN_ORDER_STATUSES.has(order.status)
        const openUploads = OPEN_ORDER_STATUSES.has(order.status)
        const orderActivity = activityByOrderId.get(order.id) ?? []
        const quotePreparedAt = getMetadataDate(order.metadata, 'quote_prepared_at')
        const isExpanded = expandedOrders[order.id] ?? true
        // Leer instrucciones de depósito directamente de la orden (persistidas por backend)
        const depositInstructions = buildDepositInstructionsFromOrder(order)
        const primaryDepositInstructions = depositInstructions.filter((instruction) => instruction.kind !== 'note')
        const noteDepositInstructions = depositInstructions.filter((instruction) => instruction.kind === 'note')
        const hasEvidence = Boolean(order.deposit_proof_url || order.evidence_url)
        const showFundingInstructions = depositInstructions.length > 0 && OPEN_ORDER_STATUSES.has(order.status) && !hasEvidence
        const statusMeta = getStatusMeta(order.status)

        return (
          <Card
            key={order.id}
            className={cn(
              'overflow-hidden rounded-[24px] md:rounded-[30px] border border-primary/20 bg-background shadow-[inset_0_0_0_1px_hsl(var(--border)/0.55),0_0_0_4px_hsl(var(--primary)/0.04)]',
              interactiveCardClassName
            )}
          >
            <CardHeader className="gap-4 p-4 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-4 lg:space-y-3 w-full lg:w-auto flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="rounded-full border border-border/60 px-2 sm:px-3 py-1 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      {statusMeta.eyebrow}
                    </div>
                    <Badge className={cn("text-xs", statusMeta.badgeClass)} variant={getStatusVariant(order.status)}>
                      {statusMeta.label}
                    </Badge>
                    <Badge className="text-xs" variant="outline">{humanizeOrderType(order)}</Badge>
                    <Badge className="text-xs" variant="outline">{humanizeRail(order)}</Badge>
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-xl sm:text-2xl md:text-[1.65rem] tracking-[-0.03em]">Expediente #{order.id.slice(0, 8)}</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Creado el {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')} con destino {order.destination_currency ?? order.currency}. {isDepositOrder(order) ? 'Esta operacion usa un flujo de fondeo previo con validacion posterior.' : 'La orden avanza con soporte documental y evidencia operativa.'}
                    </CardDescription>
                  </div>
                  
                  {/* Responsive Grid for Order Details */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4 mt-2">
                    <div className="flex flex-col gap-1 rounded-xl bg-muted/40 p-3 border border-border/40">
                      <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground">Proveedor</span>
                      <span className="text-xs sm:text-sm font-medium text-foreground truncate">{supplier?.name ?? 'Sin proveedor'}</span>
                    </div>
                    <div className="flex flex-col gap-1 rounded-xl bg-muted/40 p-3 border border-border/40">
                      <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground">Origen</span>
                      <span className="text-xs sm:text-sm font-medium text-foreground truncate">{order.amount_origin ?? order.amount} {order.origin_currency ?? order.currency}</span>
                    </div>
                    <div className="flex flex-col gap-1 rounded-xl bg-muted/40 p-3 border border-border/40 col-span-2 md:col-span-1">
                      <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground">Destino</span>
                      <span className="text-xs sm:text-sm font-medium text-foreground truncate">{order.amount_converted ?? order.amount_destination ?? 0} {order.destination_currency ?? order.currency}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-row flex-wrap lg:flex-nowrap gap-2 w-full lg:w-auto pt-2 lg:pt-0 border-t lg:border-t-0 border-border/40">
                  <Button
                    className="flex-1 lg:flex-none text-xs sm:text-sm h-9 sm:h-10"
                    onClick={() =>
                      setExpandedOrders((current) => ({
                        ...current,
                        [order.id]: !isExpanded,
                      }))
                    }
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <ChevronDown className={`size-4 sm:size-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    <span className="hidden sm:inline">{isExpanded ? 'Colapsar' : 'Expandir'}</span>
                  </Button>
                  <Button
                    className="flex-1 lg:flex-none text-xs sm:text-sm h-9 sm:h-10"
                    disabled={disabled}
                    onClick={() => generatePaymentPdf(order, supplier)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Download className="size-4 sm:size-5" />
                    <span className="hidden sm:inline">PDF</span>
                  </Button>
                  {canCancel ? (
                    <Button
                      className="flex-1 lg:flex-none text-xs sm:text-sm h-9 sm:h-10"
                      disabled={disabled || busyKey === `${order.id}-cancel`}
                      onClick={() => handleCancel(order)}
                      size="sm"
                      type="button"
                      variant="destructive"
                    >
                      <XCircle className="size-4 sm:size-5" />
                      <span className="hidden sm:inline">Cancelar</span>
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardHeader>

            {isExpanded ? (
              <CardContent className="grid border-t border-border/60 gap-0 p-0 xl:grid-cols-[1.18fr_0.82fr] ">
                <div className="space-y-6 sm:space-y-8 p-4 sm:px-6 sm:py-6">
                  {/*<div className="grid gap-4 border-b border-border/60 pb-6 md:grid-cols-3">
                    <SnapshotMetric label="Inicio del flujo" value={format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')} />
                    <SnapshotMetric label="Tiempo operativo" value={getElapsedLabel(order.created_at, order.status)} accent={order.status !== 'completed' && order.status !== 'failed'} />
                    <SnapshotMetric label="Contexto" value={getContextMetric(order, supplier)} />
                  </div>*/}

                  <section className="space-y-4">
                    <SectionHeading
                      description="Lectura rapida del expediente para validar contraparte, monto y etapa actual."
                      title="Progreso de trazabilidad"
                    />
                    <StatusRail order={order} />
                  </section>

                  <ComplianceNote order={order} quotePreparedAt={quotePreparedAt} />

                  {showFundingInstructions ? (
                    <section className="space-y-4 border-t border-border/60 pt-6">
                      <SectionHeading
                        description="Usa estos datos para fondear la orden y luego sube el comprobante desde la mesa de accion."
                        title="Cuenta para depositar"
                      />
                      <div className="grid gap-4 xl:grid-cols-2">
                        {primaryDepositInstructions.map((instruction) => (
                          <DepositInstructionCard key={`${order.id}-${instruction.id}`} instruction={instruction} />
                        ))}
                      </div>
                      {noteDepositInstructions.length > 0 ? (
                        <div className="grid gap-4">
                          {noteDepositInstructions.map((instruction) => (
                            <DepositInstructionCard key={`${order.id}-${instruction.id}`} instruction={instruction} />
                          ))}
                        </div>
                      ) : null}
                    </section>
                  ) : null}

                  <section className="space-y-4 border-t border-border/60 pt-6">
                    <SectionHeading
                      description="Valores finales publicados por mesa para ejecutar la orden con fee y tipo de cambio efectivos."
                      title="Cotizacion final"
                    />
                    <QuoteCard order={order} quotePreparedAt={quotePreparedAt} />
                  </section>
                </div>

                <div className="border-t border-border/60 bg-muted/[0.12] p-4 sm:px-6 sm:py-6 xl:border-l xl:border-t-0">
                  <div className="space-y-6 sm:space-y-8">
                    <ActionDesk
                      busy={busyKey}
                      canCancel={canCancel}
                      disabled={disabled}
                      files={files}
                      onCancel={() => handleCancel(order)}
                      onFileChange={setFiles}
                      onUpload={handleUpload}
                      openUploads={openUploads}
                      order={order}
                    />

                    <section className="space-y-4 border-t border-border/60 pt-6">
                      <SectionHeading
                        description="Registro de eventos visibles para el cliente durante la vida del expediente."
                        title="Bitacora de actividad"
                      />
                      <ActivityPanel orderActivity={orderActivity} />
                    </section>
                  </div>
                </div>
              </CardContent>
            ) : null}
          </Card>
        )
      })}
    </div>
  )
}

function StatusRail({ order }: { order: PaymentOrder }) {
  const isTerminal = order.status === 'cancelled' || order.status === 'failed'
  const currentIndex = FLOW_STAGES.findIndex((stage) => stage.key === order.status)

  // For terminal states (cancelled, failed), show a dedicated banner instead of the rail
  if (isTerminal) {
    const meta = getStatusMeta(order.status)
    return (
      <div className="py-2">
        <div className={cn(
          "flex items-center gap-3 rounded-2xl border p-4",
          order.status === 'cancelled'
            ? "border-orange-400/30 bg-orange-400/5"
            : "border-destructive/30 bg-destructive/5"
        )}>
          <div className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold",
            order.status === 'cancelled'
              ? "border-orange-400/50 bg-orange-400/10 text-orange-400"
              : "border-destructive/50 bg-destructive/10 text-destructive"
          )}>
            ✕
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground">{meta.label}</div>
            <div className="text-xs text-muted-foreground">
              {order.status === 'cancelled'
                ? 'Este expediente fue anulado y no continuará en el flujo operativo.'
                : 'Este expediente fue marcado como fallido. Consulta la bitácora para más detalles.'}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-2">
      {/* Mobile view: compact vertical list */}
      <div className="flex flex-col gap-2 md:hidden">
        {FLOW_STAGES.map((stage, index) => {
          const isCurrent = stage.key === order.status
          const isReached = currentIndex >= index

          if (!isReached && index > currentIndex + 1) return null; // Only show up to next step

          return (
            <div key={stage.key} className="flex items-center gap-3 rounded-2xl border border-border/40 bg-muted/5 p-3">
              <div className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition-colors",
                isCurrent 
                  ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.2)]" 
                  : isReached 
                    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-400" 
                    : "border-border/60 bg-muted/20 text-muted-foreground"
              )}>
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className={cn(
                  "text-xs font-semibold",
                  isCurrent ? "text-foreground" : "text-muted-foreground"
                )}>
                  {stage.label}
                </div>
                {isCurrent && (
                  <div className="text-[10px] font-medium uppercase tracking-wider text-cyan-400/80">Etapa actual</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop view: full horizontal rail */}
      <div className="hidden md:block overflow-x-auto">
        <div className="flex min-w-max items-start justify-center gap-3 md:gap-4">
          {FLOW_STAGES.map((stage, index) => {
            const isCurrent = stage.key === order.status
            const isReached = currentIndex >= index
            const isComplete = currentIndex > index
            const lineFilled = currentIndex > index ? '100%' : '0%'

            return (
              <div
                key={stage.key}
                className={cn(
                  'relative flex min-w-[120px] flex-col items-center text-center sm:min-w-[132px] md:min-w-[144px]',
                  index < FLOW_STAGES.length - 1 && 'md:pr-4 lg:pr-6'
                )}
              >
                <motion.div
                  animate={{
                    backgroundColor: isCurrent
                      ? 'rgba(34,211,238,0.18)'
                      : isComplete
                        ? 'rgba(16,185,129,0.18)'
                        : 'rgba(255,255,255,0.04)',
                    borderColor: isCurrent
                      ? 'rgba(34,211,238,0.55)'
                      : isComplete
                        ? 'rgba(16,185,129,0.45)'
                        : 'rgba(148,163,184,0.22)',
                    scale: isCurrent ? 1.06 : 1,
                    boxShadow: isCurrent ? '0 0 0 6px rgba(34,211,238,0.08)' : '0 0 0 0 rgba(0,0,0,0)',
                  }}
                  className="relative z-10 flex size-12 items-center justify-center rounded-full border text-sm font-semibold text-foreground"
                  initial={false}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                >
                  <motion.span
                    animate={{ opacity: isReached ? 1 : 0.7, y: isCurrent ? -0.5 : 0 }}
                    initial={false}
                    transition={{ duration: 0.2 }}
                  >
                    {index + 1}
                  </motion.span>
                </motion.div>

                <motion.div
                  animate={{ opacity: isCurrent ? 1 : isReached ? 0.92 : 0.7, y: isCurrent ? 0 : 1 }}
                  className="mt-3 w-full px-1 text-center text-xs font-medium leading-4 text-foreground sm:text-sm"
                  initial={false}
                  transition={{ duration: 0.22 }}
                >
                  {stage.label}
                </motion.div>

                <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {isCurrent ? 'Etapa actual' : isReached ? 'Completada' : 'Pendiente'}
                </div>

                {index < FLOW_STAGES.length - 1 ? (
                  <div className="absolute left-[calc(50%+2rem)] top-6 hidden w-[calc(100%-4rem)] -translate-y-1/2 md:block">
                    <div className="relative h-px w-full rounded-full bg-border/70">
                      <motion.div
                        animate={{ width: lineFilled }}
                        className={cn(
                          'absolute inset-y-0 left-0 rounded-full',
                          isComplete ? 'bg-emerald-400' : 'bg-cyan-400'
                        )}
                        initial={false}
                        transition={{ duration: 0.35, ease: 'easeInOut' }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function QuoteCard({ order, quotePreparedAt }: { order: PaymentOrder; quotePreparedAt: string | null }) {
  const quoteChanges = getQuoteChanges(order)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-foreground">Snapshot de ejecucion</div>
          <div className="text-xs text-muted-foreground">Comparativo entre cotizacion previa y valores finales.</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {quoteChanges.length > 0 ? <Badge variant="default">Actualizado por staff</Badge> : null}
          {quotePreparedAt ? <Badge variant="outline">Lista {format(new Date(quotePreparedAt), 'dd/MM HH:mm')}</Badge> : null}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <InfoBlock
          highlight={quoteChanges.includes('exchange_rate_applied')}
          label="Tipo de cambio"
          subtitle={readPreviousQuote(order, 'exchange_rate_applied')}
          value={String(order.exchange_rate_applied ?? 0)}
        />
        <InfoBlock
          highlight={quoteChanges.includes('amount_converted') || quoteChanges.includes('amount_destination')}
          label="Monto convertido"
          subtitle={readPreviousQuote(order, 'amount_converted') || readPreviousQuote(order, 'amount_destination')}
          value={`${order.amount_converted ?? order.amount_destination ?? 0} ${order.destination_currency ?? order.currency ?? ''}`}
        />
        <InfoBlock
          highlight={quoteChanges.includes('fee_total') || quoteChanges.includes('fee_amount')}
          label="Fee total"
          subtitle={readPreviousQuote(order, 'fee_total') || readPreviousQuote(order, 'fee_amount')}
          value={`${order.fee_total ?? order.fee_amount ?? 0} ${order.origin_currency ?? order.currency ?? ''}`}
        />
      </div>
      <div className="rounded-2xl border border-dashed border-border/70 px-4 py-3 text-sm text-muted-foreground">
        {quotePreparedAt && (order.status === 'processing' || order.status === 'sent' || order.status === 'completed')
          ? 'La cotizacion final ya fue publicada por staff y la orden siguio su curso.'
          : quotePreparedAt
            ? 'Cotizacion final publicada por staff.'
            : 'La cotizacion final aparecera despues de que staff valide el deposito.'}
      </div>
    </div>
  )
}

function AttachmentPanel({
  busy,
  disabled,
  files,
  onFileChange,
  onUpload,
  openUploads,
  order,
}: {
  busy: string | null
  disabled?: boolean
  files: Record<string, Partial<Record<OrderFileField, File>>>
  onFileChange: Dispatch<SetStateAction<Record<string, Partial<Record<OrderFileField, File>>>>>
  onUpload: (order: PaymentOrder, field: OrderFileField) => Promise<void>
  openUploads: boolean
  order: PaymentOrder
}) {
  const depositOrder = isDepositOrder(order)
  const showSupportUploader = !depositOrder || order.order_type === 'WORLD_TO_BO'

  const supportingUrl = order.supporting_document_url
  const evidenceUrl = order.evidence_url || order.deposit_proof_url
  const staffComprobanteUrl = order.staff_comprobante_url || order.receipt_url

  return (
    <div className="space-y-4">
      <div className="grid gap-2 text-sm">
        {showSupportUploader ? <AttachmentStatus label="Respaldo documental" url={supportingUrl} /> : null}
        <AttachmentStatus label={depositOrder ? 'Comprobante de deposito' : 'Evidencia'} url={evidenceUrl} />
        <AttachmentStatus label="Comprobante staff" url={staffComprobanteUrl} />
      </div>

      {openUploads ? (
        <div className="grid gap-3">
          {showSupportUploader ? (
            <AttachmentUploader
              accept={ACCEPTED_UPLOADS}
              busy={busy === `${order.id}-supporting_document_url`}
              disabled={disabled}
              existingUrl={supportingUrl}
              label="Respaldo"
              onFileChange={(file) =>
                onFileChange((current) => ({
                  ...current,
                  [order.id]: {
                    ...current[order.id],
                    supporting_document_url: file,
                  },
                }))
              }
              selectedFile={files[order.id]?.supporting_document_url}
              onUpload={() => onUpload(order, 'supporting_document_url')}
            />
          ) : null}
          <AttachmentUploader
            accept={ACCEPTED_UPLOADS}
            busy={busy === `${order.id}-evidence_url`}
            disabled={disabled}
            existingUrl={evidenceUrl}
            label={depositOrder ? 'Comprobante' : 'Evidencia'}
            onFileChange={(file) =>
              onFileChange((current) => ({
                ...current,
                [order.id]: {
                  ...current[order.id],
                  evidence_url: file,
                },
              }))
            }
            selectedFile={files[order.id]?.evidence_url}
            onUpload={() => onUpload(order, 'evidence_url')}
          />
        </div>
      ) : null}
    </div>
  )
}

function ActivityPanel({ orderActivity }: { orderActivity: ActivityLog[] }) {
  const [showAll, setShowAll] = useState(false)
  const visibleActivity = showAll ? orderActivity : orderActivity.slice(0, 6)

  return (
    <div>
      {orderActivity.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
          Aun no hay eventos registrados para esta orden.
        </div>
      ) : (
        <div className="space-y-2">
          {visibleActivity.map((entry) => (
            <div key={entry.id} className="flex items-start justify-between gap-4 rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-sm">
              <div className="space-y-1">
                <div className="font-medium text-foreground">{humanizeActivity(entry.action)}</div>
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Evento visible</div>
              </div>
              <div className="text-right text-xs text-muted-foreground">{format(new Date(entry.created_at), 'dd/MM/yyyy HH:mm')}</div>
            </div>
          ))}
          {orderActivity.length > 6 ? (
            <button
              className="w-full rounded-2xl border border-dashed border-border/60 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              onClick={() => setShowAll((prev) => !prev)}
              type="button"
            >
              {showAll ? 'Ver menos' : `Ver ${orderActivity.length - 6} evento${orderActivity.length - 6 === 1 ? '' : 's'} más`}
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}

function ActionDesk({
  busy,
  canCancel,
  disabled,
  files,
  onCancel,
  onFileChange,
  onUpload,
  openUploads,
  order,
}: {
  busy: string | null
  canCancel: boolean
  disabled?: boolean
  files: Record<string, Partial<Record<OrderFileField, File>>>
  onCancel: () => void
  onFileChange: Dispatch<SetStateAction<Record<string, Partial<Record<OrderFileField, File>>>>>
  onUpload: (order: PaymentOrder, field: OrderFileField) => Promise<void>
  openUploads: boolean
  order: PaymentOrder
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex w-full items-center justify-between gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Mesa de accion</div>
          <Badge className={getUrgencyBadgeClass(order.status)} variant="outline">
            {getUrgencyLabel(order.status)}
          </Badge>
        </div>
      </div>

      <div className="rounded-[26px] border border-border/70 bg-background/88 p-4">
        <AttachmentPanel
          busy={busy}
          disabled={disabled}
          files={files}
          onFileChange={onFileChange}
          onUpload={onUpload}
          openUploads={openUploads}
          order={order}
        />
      </div>

      {order.status === 'deposit_received' && !getMetadataDate(order.metadata, 'quote_prepared_at') ? (
        <NoticeCard
          icon={ShieldAlert}
          title="Esperando cotizacion final"
          description="Staff ya valido el deposito y ahora debe publicar la cotizacion final con tasa, fee y monto real para mover la orden a processing."
        />
      ) : null}

      {canCancel ? (
        <div className="flex justify-end">
          <Button
            disabled={disabled || busy === `${order.id}-cancel`}
            onClick={onCancel}
            size="sm"
            type="button"
            variant="destructive"
          >
            <XCircle />
            Cancelar expediente
          </Button>
        </div>
      ) : null}
    </section>
  )
}

function NoticeCard({ icon: Icon, title, description }: { icon: typeof ShieldAlert; title: string; description: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-border/70 bg-background/60 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-border/60 bg-background/80 p-2 text-muted-foreground">
          <Icon className="size-4" />
        </div>
        <div>
          <div className="font-medium text-foreground">{title}</div>
          <div className="mt-1 text-sm text-muted-foreground">{description}</div>
        </div>
      </div>
    </div>
  )
}

function AttachmentStatus({ label, url }: { label: string; url?: string | null }) {
  const resolvedUrl = useSignedUrl(url)

  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      {resolvedUrl ? (
        <a className="text-sm font-medium text-primary underline-offset-4 hover:underline" href={resolvedUrl} rel="noreferrer" target="_blank">
          Ver archivo
        </a>
      ) : url ? (
        <span className="text-sm text-muted-foreground">Obteniendo enlace...</span>
      ) : (
        <span className="text-sm text-muted-foreground">Pendiente</span>
      )}
    </div>
  )
}

function AttachmentUploader({
  accept,
  busy,
  disabled,
  existingUrl,
  label,
  onFileChange,
  onUpload,
  selectedFile,
}: {
  accept: string
  busy?: boolean
  disabled?: boolean
  existingUrl?: string | null
  label: string
  onFileChange: (file: File | undefined) => void
  onUpload: () => void
  selectedFile?: File
}) {
  const resolvedExistingUrl = useSignedUrl(existingUrl)

  return (
    <DocumentUploadCard
      accept={accept}
      description={undefined}
      disabled={disabled}
      emptyStateText="Aun no hay archivo entregado."
      existingUrl={resolvedExistingUrl || existingUrl || undefined}
      existingUrlLabel="Ver archivo ya entregado"
      file={selectedFile ?? null}
      helperText={`Arrastra ${label.toLowerCase()} o haz click para seleccionarlo.`}
      label={label}
      onFileChange={(file) => onFileChange(file ?? undefined)}
      onUpload={onUpload}
      selectedFileLinkLabel={(fileName) => `Ver archivo que estas por subir: ${fileName}`}
      uploading={busy}
      uploadLabel={`Subir ${label.toLowerCase()}`}
    />
  )
}

function InfoBlock({ label, value, highlight, subtitle }: { label: string; value: string; highlight?: boolean; subtitle?: string | null }) {
  return (
    <div className={cn('rounded-2xl border px-4 py-4', highlight ? 'border-cyan-400/45 bg-cyan-400/10' : 'border-border/60 bg-background/70')}>
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-base font-medium text-foreground">{value}</div>
      {subtitle ? <div className="mt-1 text-xs text-muted-foreground">Antes: {subtitle}</div> : null}
    </div>
  )
}

function ComplianceNote({ order, quotePreparedAt }: { order: PaymentOrder; quotePreparedAt: string | null }) {
  return (
    <div className="rounded-[24px] border border-border/70 bg-muted/[0.14] p-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Estado y proximos pasos</div>
      <div className="mt-3 max-w-3xl border-l-2 border-cyan-500/35 pl-4 text-sm leading-7 text-muted-foreground">
        {getConsolidatedStatusMessage(order, quotePreparedAt)}
      </div>
    </div>
  )
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{title}</div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function ToolbarMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-border/60 bg-background/75 px-4 py-4">
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="mt-2 font-mono text-2xl font-semibold tracking-[-0.03em] text-foreground">{value}</div>
    </div>
  )
}

function getStatusVariant(status: PaymentOrder['status']) {
  if (status === 'failed') return 'destructive' as const
  if (status === 'completed') return 'default' as const
  if (status === 'cancelled') return 'outline' as const
  return 'outline' as const
}

function getStatusMeta(status: PaymentOrder['status']) {
  switch (status) {
    case 'created':
      return { badgeClass: 'border-slate-400/30 bg-slate-500/10 text-foreground', eyebrow: 'Preparacion', label: 'Orden creada' }
    case 'waiting_deposit':
      return { badgeClass: 'border-amber-400/35 bg-amber-400/10 text-amber-700 dark:text-amber-300', eyebrow: 'Fondeo', label: 'Esperando deposito' }
    case 'deposit_received':
      return { badgeClass: 'border-cyan-400/35 bg-cyan-400/10 text-cyan-700 dark:text-cyan-300', eyebrow: 'Control', label: 'Deposito validado' }
    case 'processing':
      return { badgeClass: 'border-sky-400/35 bg-sky-400/10 text-sky-700 dark:text-sky-300', eyebrow: 'Ejecucion', label: 'Procesando' }
    case 'sent':
      return { badgeClass: 'border-violet-400/35 bg-violet-400/10 text-violet-700 dark:text-violet-300', eyebrow: 'Liquidacion', label: 'Enviado' }
    case 'completed':
      return { badgeClass: 'border-emerald-400/35 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300', eyebrow: 'Cierre', label: 'Completado' }
    case 'failed':
      return { badgeClass: 'border-destructive/35 bg-destructive/10', eyebrow: 'Incidencia', label: 'Fallido' }
    case 'cancelled':
      return { badgeClass: 'border-orange-400/35 bg-orange-400/10 text-orange-700 dark:text-orange-300', eyebrow: 'Anulacion', label: 'Cancelado' }
    default:
      return { badgeClass: 'border-border/30 bg-muted/10 text-muted-foreground', eyebrow: 'Desconocido', label: status ?? 'Sin estado' }
  }
}

function getMetadataDate(metadata: PaymentOrder['metadata'], key: 'quote_prepared_at') {
  if (!metadata || typeof metadata !== 'object' || !(key in metadata)) return null
  const value = metadata[key]
  return typeof value === 'string' && value ? value : null
}

function getConsolidatedStatusMessage(order: PaymentOrder, quotePreparedAt: string | null) {
  switch (order.status) {
    case 'created':
      return isDepositOrder(order)
        ? 'Expediente aperturado y a la espera de fondeo. Por favor, realiza el deposito usando las instrucciones proporcionadas y sube tu comprobante en la mesa de accion para que staff pueda validarlo.'
        : 'Expediente aperturado. Para liberar la siguiente etapa del flujo y continuar con la orden, debes subir el respaldo documental y evidencia operativa en la mesa de accion.'
    case 'waiting_deposit':
      return 'La evidencia ya fue reportada y el expediente permanece en espera. Nuestro equipo debe validar el deposito para confirmar la conciliacion y publicar la cotizacion final.'
    case 'deposit_received':
      return quotePreparedAt
        ? 'El deposito fue validado y la cotizacion final ya esta preparada. La orden queda alineada para pasar a ejecucion sobre el rail seleccionado.'
        : 'El deposito ya fue validado por staff. La orden queda en control interno preparandose la cotizacion final con fee y tipo de cambio reales.'
    case 'processing':
      return 'La orden ya esta autorizada y en ejecucion sobre el riel externo. La trazabilidad documental queda congelada y cualquier nuevo evento se reflejara en la bitacora operativa.'
    case 'sent':
      return 'El rail externo ya emitio salida o referencia operativa. Se mantiene la trazabilidad activa a la espera del comprobante final para proceder con el cierre del expediente.'
    case 'completed':
      return 'Operacion cerrada correctamente. Puedes descargar el PDF, revisar el comprobante final y consultar el historial como respaldo operativo del cierre.'
    case 'failed':
      return 'El expediente fue marcado como fallido y la orden ha sido cerrada. Revisa la razon registrada en la metadata o en la bitacora de actividad.'
    case 'cancelled':
      return 'Este expediente fue cancelado. La operacion no se ejecuto y los fondos asociados (si los hubiera) seran devueltos segun la politica operativa vigente.'
    default:
      return 'Estado no reconocido. Contacta a soporte si necesitas mas informacion sobre este expediente.'
  }
}

function getUrgencyLabel(status: PaymentOrder['status']) {
  switch (status) {
    case 'created':
      return 'Accion requerida'
    case 'waiting_deposit':
      return 'En revision'
    case 'deposit_received':
      return 'Interno'
    case 'processing':
    case 'sent':
      return 'En curso'
    case 'completed':
      return 'Cerrado'
    case 'failed':
      return 'Incidencia'
    case 'cancelled':
      return 'Cancelado'
    default:
      return 'Sin estado'
  }
}

function getUrgencyBadgeClass(status: PaymentOrder['status']) {
  switch (status) {
    case 'created':
      return 'border-amber-400/35 bg-amber-400/10 text-amber-700 dark:text-amber-300'
    case 'waiting_deposit':
      return 'border-cyan-400/35 bg-cyan-400/10 text-cyan-700 dark:text-cyan-300'
    case 'deposit_received':
      return 'border-sky-400/35 bg-sky-400/10 text-sky-700 dark:text-sky-300'
    case 'processing':
    case 'sent':
      return 'border-violet-400/35 bg-violet-400/10 text-violet-700 dark:text-violet-300'
    case 'completed':
      return 'border-emerald-400/35 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300'
    case 'failed':
      return 'border-destructive/35 bg-destructive/10 text-destructive'
    case 'cancelled':
      return 'border-orange-400/35 bg-orange-400/10 text-orange-700 dark:text-orange-300'
    default:
      return 'border-border/35 bg-muted/10 text-muted-foreground'
  }
}

function humanizeOrderType(order: PaymentOrder) {
  // V2: use flow_type first
  if (order.flow_type) {
    switch (order.flow_type) {
      case 'bolivia_to_world': return 'BO a exterior'
      case 'bolivia_to_wallet': return 'BO a wallet'
      case 'wallet_to_wallet': return 'Crypto a crypto'
      case 'world_to_bolivia': return 'Exterior a BO'
      case 'world_to_wallet': return 'US a wallet'
      case 'fiat_bo_to_bridge_wallet': return 'BO a Bridge'
      case 'crypto_to_bridge_wallet': return 'Crypto a Bridge'
      case 'fiat_us_to_bridge_wallet': return 'US a Bridge'
      case 'bridge_wallet_to_fiat_bo': return 'Retirar fondos de mi Wallet'
      case 'bridge_wallet_to_crypto': return 'Bridge a crypto'
      case 'bridge_wallet_to_fiat_us': return 'Bridge a US'
      default: return order.flow_type
    }
  }
  // V1: legacy order_type
  switch (order.order_type) {
    case 'BO_TO_WORLD': return 'BO a exterior'
    case 'WORLD_TO_BO': return 'Exterior a BO'
    case 'US_TO_WALLET': return 'US a wallet'
    case 'CRYPTO_TO_CRYPTO': return 'Crypto a crypto'
    default: return order.order_type ?? 'Sin tipo'
  }
}

function humanizeRail(order: PaymentOrder) {
  // V2: use flow_category
  if (order.flow_category) {
    switch (order.flow_category) {
      case 'interbank': return 'Interbancario'
      case 'wallet_ramp': return 'Wallet ramp'
      default: return order.flow_category
    }
  }
  // V1: legacy processing_rail
  switch (order.processing_rail) {
    case 'ACH': return 'Rail ACH'
    case 'SWIFT': return 'Rail SWIFT'
    case 'PSAV': return 'Rail PSAV'
    case 'DIGITAL_NETWORK': return 'Rail digital'
    default: return order.processing_rail ?? 'Sin rail'
  }
}

function isDepositOrder(order: PaymentOrder) {
  // Si la orden tiene instrucciones de depósito persistidas, es un flujo de fondeo
  if (order.psav_deposit_instructions && typeof order.psav_deposit_instructions === 'object' && Object.keys(order.psav_deposit_instructions).length > 0) {
    return true
  }
  if (order.bridge_source_deposit_instructions && typeof order.bridge_source_deposit_instructions === 'object' && Object.keys(order.bridge_source_deposit_instructions).length > 0) {
    return true
  }
  // V2: check flow_type
  if (order.flow_type) {
    const depositFlows = [
      'bolivia_to_world', 'bolivia_to_wallet',
      'world_to_bolivia', 'world_to_wallet',
      'wallet_to_wallet',
      'fiat_us_to_bridge_wallet', 'fiat_bo_to_bridge_wallet',
      'crypto_to_bridge_wallet',
    ]
    return depositFlows.includes(order.flow_type)
  }
  // V1: legacy order_type
  return order.order_type === 'WORLD_TO_BO' || order.order_type === 'US_TO_WALLET'
}

function humanizeActivity(action: string) {
  switch (action) {
    case 'payment_order_created':
      return 'Expediente creado'
    case 'payment_order_file_uploaded':
      return 'Archivo subido'
    case 'payment_order_cancelled':
      return 'Expediente cancelado'
    default:
      return action
  }
}

export type QuoteField = 'exchange_rate_applied' | 'amount_converted' | 'amount_destination' | 'fee_total' | 'fee_amount'

function getQuoteChanges(order: PaymentOrder) {
  const previous = getPreviousQuote(order)
  if (!previous) return []

  const changes: string[] = []
  const keys: QuoteField[] = ['exchange_rate_applied', 'amount_converted', 'amount_destination', 'fee_total', 'fee_amount']
  
  for (const key of keys) {
    if (key in previous) {
      const previousValue = previous[key]
      const currentValue = order[key as keyof PaymentOrder]
      if (Number(previousValue ?? 0) !== Number(currentValue ?? 0)) {
        changes.push(key)
      }
    }
  }

  return changes
}

function getPreviousQuote(order: PaymentOrder) {
  const metadata = order.metadata
  if (!metadata || typeof metadata !== 'object' || !('quote_previous' in metadata)) return null
  const previous = metadata.quote_previous
  return previous && typeof previous === 'object'
    ? (previous as Partial<Record<QuoteField, number>>)
    : null
}

function readPreviousQuote(order: PaymentOrder, key: QuoteField) {
  const previous = getPreviousQuote(order)
  if (!previous || previous[key] === undefined || previous[key] === null) return null
  return String(previous[key])
}


