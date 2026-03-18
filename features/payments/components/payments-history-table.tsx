'use client'

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { format } from 'date-fns'
import { ChevronDown, Download, FileText, FileUp, Search, ShieldAlert, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DepositInstructionCard } from '@/features/payments/components/deposit-instruction-card'
import { buildDepositInstructions } from '@/features/payments/lib/deposit-instructions'
import { generatePaymentPdf } from '@/features/payments/lib/generate-payment-pdf'
import { ACCEPTED_UPLOADS } from '@/lib/file-validation'
import type { ActivityLog } from '@/types/activity-log'
import type { OrderFileField, PaymentOrder, PsavConfigRow } from '@/types/payment-order'
import type { Supplier } from '@/types/supplier'
import type { SupportedPaymentRoute } from '@/features/payments/lib/payment-routes'

const OPEN_ORDER_STATUSES = new Set(['created', 'waiting_deposit'])
const FLOW_STAGES: Array<{ key: PaymentOrder['status']; label: string }> = [
  { key: 'created', label: 'Orden creada' },
  { key: 'waiting_deposit', label: 'Esperando deposito' },
  { key: 'deposit_received', label: 'Deposito validado' },
  { key: 'processing', label: 'Procesando' },
  { key: 'sent', label: 'Enviado' },
  { key: 'completed', label: 'Completado' },
]

interface PaymentsHistoryTableProps {
  orders: PaymentOrder[]
  suppliers: Supplier[]
  psavConfigs: PsavConfigRow[]
  activityLogs: ActivityLog[]
  disabled?: boolean
  onUploadOrderFile: (orderId: string, field: OrderFileField, file: File) => Promise<unknown>
  onCancelOrder: (order: PaymentOrder) => Promise<unknown>
}

export function PaymentsHistoryTable({
  orders,
  suppliers,
  psavConfigs,
  activityLogs,
  disabled,
  onUploadOrderFile,
  onCancelOrder,
}: PaymentsHistoryTableProps) {
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
      orders.forEach((order, index) => {
        if (next[order.id] === undefined) next[order.id] = index === 0
      })
      return next
    })
  }, [orders])

  const filteredOrders = useMemo(
    () =>
      orders.filter((order) => {
        const statusMatches = statusFilter === 'all' || order.status === statusFilter
        const searchMatches = !search || order.id.toLowerCase().includes(search.toLowerCase())
        return statusMatches && searchMatches
      }),
    [orders, search, statusFilter]
  )

  if (orders.length === 0) {
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
    <div className="space-y-4">
      <Card className="border-border/70 bg-background/85">
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por numero de expediente"
              value={search}
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | PaymentOrder['status'])}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="created">created</SelectItem>
              <SelectItem value="waiting_deposit">waiting_deposit</SelectItem>
              <SelectItem value="deposit_received">deposit_received</SelectItem>
              <SelectItem value="processing">processing</SelectItem>
              <SelectItem value="sent">sent</SelectItem>
              <SelectItem value="completed">completed</SelectItem>
              <SelectItem value="failed">failed</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {filteredOrders.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Sin coincidencias</CardTitle>
            <CardDescription>No hay expedientes que coincidan con el filtro actual.</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {filteredOrders.map((order) => {
        const supplier = order.supplier_id ? suppliersById.get(order.supplier_id) : null
        const canCancel = OPEN_ORDER_STATUSES.has(order.status)
        const openUploads = OPEN_ORDER_STATUSES.has(order.status)
        const orderActivity = activityByOrderId.get(order.id) ?? []
        const quotePreparedAt = getMetadataDate(order.metadata, 'quote_prepared_at')
        const isExpanded = expandedOrders[order.id] ?? true
        const route = resolveOrderRoute(order)
        const depositInstructions = route
          ? buildDepositInstructions({
              route,
              psavConfigs,
              selectedSupplier: supplier ?? null,
            })
          : []
        const showFundingInstructions = depositInstructions.length > 0 && OPEN_ORDER_STATUSES.has(order.status)

        return (
          <Card key={order.id} className="overflow-hidden border-border/70 bg-muted/10">
            <CardHeader className="gap-4 border-b border-border/60 bg-background/95">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-xl">Expediente #{order.id.slice(0, 8)}</CardTitle>
                    <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                    <Badge variant="outline">{order.order_type}</Badge>
                    <Badge variant="outline">{order.processing_rail}</Badge>
                  </div>
                  <CardDescription>
                    Creado el {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')} con destino {order.destination_currency}. {isDepositOrder(order) ? 'Este expediente sigue la logica de deposito: orden primero, comprobante despues.' : ''}
                  </CardDescription>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
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
                    <ChevronDown className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    {isExpanded ? 'Colapsar' : 'Expandir'}
                  </Button>
                  <Button
                    disabled={disabled}
                    onClick={() => generatePaymentPdf(order, supplier)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Download />
                    PDF
                  </Button>
                  {canCancel ? (
                    <Button
                      disabled={disabled || busyKey === `${order.id}-cancel`}
                      onClick={() => handleCancel(order)}
                      size="sm"
                      type="button"
                      variant="destructive"
                    >
                      <XCircle />
                      Cancelar
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardHeader>

            {isExpanded ? (
              <CardContent className="grid gap-6 p-6 xl:grid-cols-[1.3fr_0.9fr]">
              <div className="space-y-5">
                <StatusRail order={order} />

                <div className="grid gap-4 md:grid-cols-3">
                  <InfoBlock label="Proveedor" value={supplier?.name ?? 'Sin proveedor'} />
                  <InfoBlock label="Monto origen" value={`${order.amount_origin} ${order.origin_currency}`} />
                  <InfoBlock label="Destino final" value={`${order.amount_converted} ${order.destination_currency}`} />
                </div>

                {showFundingInstructions ? (
                  <div className="space-y-4 rounded-2xl border border-border/70 bg-background/85 p-4">
                    <div>
                      <div className="text-sm font-medium text-foreground">Cuenta para depositar</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Usa estos datos para fondear el expediente y luego adjunta el comprobante desde esta misma vista.
                      </div>
                    </div>
                    <div className="grid gap-4 xl:grid-cols-2">
                      {depositInstructions.map((instruction) => (
                        <DepositInstructionCard key={`${order.id}-${instruction.id}`} instruction={instruction} />
                      ))}
                    </div>
                  </div>
                ) : null}

                <QuoteCard order={order} quotePreparedAt={quotePreparedAt} />

                <div className="grid gap-4 lg:grid-cols-2">
                  <AttachmentPanel
                    busy={busyKey}
                    disabled={disabled}
                    files={files}
                    onFileChange={setFiles}
                    onUpload={handleUpload}
                    openUploads={openUploads}
                    order={order}
                  />
                  <ActivityPanel orderActivity={orderActivity} />
                </div>
              </div>

              <div className="space-y-4">
                <ActionBrief order={order} />
                {order.status === 'deposit_received' && !quotePreparedAt ? (
                  <NoticeCard
                    icon={ShieldAlert}
                    title="Esperando cotizacion final"
                    description="Staff ya valido el deposito y ahora debe publicar la cotizacion final con tasa, fee y monto real para mover la orden a processing."
                  />
                ) : null}
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
  return (
    <div className="rounded-2xl border border-border/70 bg-background/85 p-4">
      <div className="mb-3 text-sm font-medium text-foreground">Linea de proceso</div>
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {FLOW_STAGES.map((stage, index) => {
          const reached = hasReachedStage(order.status, stage.key)
          const current = order.status === stage.key
          return (
            <div key={stage.key} className={`rounded-xl border px-3 py-3 text-sm ${current ? 'border-cyan-400/45 bg-cyan-400/12' : reached ? 'border-emerald-400/30 bg-emerald-400/10' : 'border-border/60 bg-muted/20'}`}>
              <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{String(index + 1).padStart(2, '0')}</div>
              <div className="mt-1 font-medium text-foreground">{stage.label}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function QuoteCard({ order, quotePreparedAt }: { order: PaymentOrder; quotePreparedAt: string | null }) {
  const quoteChanges = getQuoteChanges(order)

  return (
    <div className="rounded-2xl border border-border/70 bg-background/85 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-foreground">Cotizacion final</div>
          <div className="text-xs text-muted-foreground">Valores finales publicados por staff para ejecutar la orden.</div>
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
          highlight={quoteChanges.includes('amount_converted')}
          label="Monto convertido"
          subtitle={readPreviousQuote(order, 'amount_converted')}
          value={`${order.amount_converted ?? 0} ${order.destination_currency}`}
        />
        <InfoBlock
          highlight={quoteChanges.includes('fee_total')}
          label="Fee total"
          subtitle={readPreviousQuote(order, 'fee_total')}
          value={`${order.fee_total ?? 0} ${order.origin_currency}`}
        />
      </div>
      <div className="mt-3 rounded-xl border border-dashed border-border/70 px-3 py-2 text-sm text-muted-foreground">
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

  return (
    <div className="rounded-2xl border border-border/70 bg-background/85 p-4">
      <div className="mb-3 text-sm font-medium text-foreground">Documentos del expediente</div>
      <div className="space-y-3 text-sm">
        {showSupportUploader ? <AttachmentStatus label="Respaldo documental" url={order.support_document_url} /> : null}
        <AttachmentStatus label={depositOrder ? 'Comprobante de deposito' : 'Evidencia'} url={order.evidence_url} />
        <AttachmentStatus label="Comprobante staff" url={order.staff_comprobante_url} />
      </div>

      {openUploads ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {showSupportUploader ? (
            <AttachmentUploader
              accept={ACCEPTED_UPLOADS}
              busy={busy === `${order.id}-support_document_url`}
              disabled={disabled}
              existingUrl={order.support_document_url}
              label="Respaldo"
              onFileChange={(file) =>
                onFileChange((current) => ({
                  ...current,
                  [order.id]: {
                    ...current[order.id],
                    support_document_url: file,
                  },
                }))
              }
              selectedFile={files[order.id]?.support_document_url}
              onUpload={() => onUpload(order, 'support_document_url')}
            />
          ) : null}
          <AttachmentUploader
            accept={ACCEPTED_UPLOADS}
            busy={busy === `${order.id}-evidence_url`}
            disabled={disabled}
            existingUrl={order.evidence_url}
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
  return (
    <div className="rounded-2xl border border-border/70 bg-background/85 p-4">
      <div className="mb-3 text-sm font-medium text-foreground">Bitacora del cliente</div>
      {orderActivity.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 p-3 text-sm text-muted-foreground">
          Aun no hay eventos registrados para esta orden.
        </div>
      ) : (
        <div className="space-y-2">
          {orderActivity.slice(0, 6).map((entry) => (
            <div key={entry.id} className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm">
              <div className="font-medium text-foreground">{humanizeActivity(entry.action)}</div>
              <div className="mt-1 text-xs text-muted-foreground">{format(new Date(entry.created_at), 'dd/MM/yyyy HH:mm')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ActionBrief({ order }: { order: PaymentOrder }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/85 p-4">
      <div className="mb-2 text-sm font-medium text-foreground">Siguiente paso</div>
      <div className="text-sm text-muted-foreground">{getNextActionMessage(order)}</div>
    </div>
  )
}

function NoticeCard({ icon: Icon, title, description }: { icon: typeof ShieldAlert; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-border/60 bg-background/80 p-2 text-muted-foreground">
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

function AttachmentStatus({ label, url }: { label: string; url?: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      {url ? (
        <a className="text-sm font-medium text-primary underline-offset-4 hover:underline" href={url} rel="noreferrer" target="_blank">
          Ver archivo
        </a>
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
  existingUrl?: string
  label: string
  onFileChange: (file: File | undefined) => void
  onUpload: () => void
  selectedFile?: File
}) {
  const previewUrl = useMemo(() => (selectedFile ? URL.createObjectURL(selectedFile) : null), [selectedFile])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  return (
    <div className="rounded-xl border border-border/60 p-3 text-left">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <Input
        accept={accept}
        className="mb-2"
        disabled={disabled || busy}
        onChange={(event) => onFileChange(event.target.files?.[0])}
        type="file"
      />
      <Button disabled={disabled || busy} onClick={onUpload} size="sm" type="button" variant="outline">
        <FileUp />
        {busy ? 'Subiendo...' : `Subir ${label.toLowerCase()}`}
      </Button>
      <div className="mt-3 space-y-2 text-xs text-muted-foreground">
        {existingUrl ? (
          <a className="flex items-center gap-2 text-primary underline-offset-4 hover:underline" href={existingUrl} rel="noreferrer" target="_blank">
            <FileText className="size-3.5" />
            Ver archivo ya entregado
          </a>
        ) : (
          <div>Aun no hay archivo entregado.</div>
        )}
        {selectedFile ? (
          <a className="flex items-center gap-2 text-primary underline-offset-4 hover:underline" href={previewUrl ?? '#'} rel="noreferrer" target="_blank">
            <FileText className="size-3.5" />
            Ver archivo que estas por subir: {selectedFile.name}
          </a>
        ) : null}
      </div>
    </div>
  )
}

function InfoBlock({ label, value, highlight, subtitle }: { label: string; value: string; highlight?: boolean; subtitle?: string | null }) {
  return (
    <div className={`rounded-xl border px-3 py-3 ${highlight ? 'border-cyan-400/45 bg-cyan-400/12' : 'border-border/60 bg-muted/20'}`}>
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
      {subtitle ? <div className="mt-1 text-xs text-muted-foreground">Antes: {subtitle}</div> : null}
    </div>
  )
}

function getStatusVariant(status: PaymentOrder['status']) {
  if (status === 'failed') return 'destructive' as const
  if (status === 'completed') return 'default' as const
  return 'outline' as const
}

function hasReachedStage(currentStatus: PaymentOrder['status'], stage: PaymentOrder['status']) {
  const currentIndex = FLOW_STAGES.findIndex((entry) => entry.key === currentStatus)
  const targetIndex = FLOW_STAGES.findIndex((entry) => entry.key === stage)
  return currentIndex >= 0 && targetIndex >= 0 && currentIndex >= targetIndex
}

function getMetadataDate(metadata: PaymentOrder['metadata'], key: 'quote_prepared_at') {
  if (!metadata || typeof metadata !== 'object' || !(key in metadata)) return null
  const value = metadata[key]
  return typeof value === 'string' && value ? value : null
}

function getNextActionMessage(order: PaymentOrder) {
  switch (order.status) {
    case 'created':
      return isDepositOrder(order)
        ? order.order_type === 'WORLD_TO_BO'
          ? 'El expediente ya fue creado. Puedes dejar un respaldo documental y luego adjuntar el comprobante del deposito para mover la orden a waiting_deposit.'
          : 'El expediente ya fue creado. Falta adjuntar el comprobante del fondeo para mover la orden a waiting_deposit.'
        : 'Sube respaldo y evidencia para mover la orden a waiting_deposit.'
    case 'waiting_deposit':
      return isDepositOrder(order)
        ? 'Tu comprobante ya fue cargado. Staff debe validar el deposito para continuar con la conciliacion y la cotizacion final.'
        : 'Staff debe validar el deposito para liberar la cotizacion final.'
    case 'deposit_received':
      return 'Staff esta preparando la cotizacion final con fee y tipo de cambio reales.'
    case 'processing':
      return 'La orden ya esta autorizada y Guira esta coordinando la ejecucion sobre el riel externo.'
    case 'sent':
      return 'El riel externo ya genero referencia. Falta el comprobante final para cerrar el expediente.'
    case 'completed':
      return 'Operacion cerrada. Puedes descargar el PDF y revisar el comprobante final.'
    case 'failed':
      return 'La orden fue cerrada como fallida. Revisa la razon registrada en metadata o auditoria.'
  }
}

function isDepositOrder(order: PaymentOrder) {
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

function getQuoteChanges(order: PaymentOrder) {
  const previous = getPreviousQuote(order)
  if (!previous) return []

  return (['exchange_rate_applied', 'amount_converted', 'fee_total'] as const).filter((key) => {
    const previousValue = previous[key]
    const currentValue = order[key]
    return Number(previousValue ?? 0) !== Number(currentValue ?? 0)
  })
}

function getPreviousQuote(order: PaymentOrder) {
  const metadata = order.metadata
  if (!metadata || typeof metadata !== 'object' || !('quote_previous' in metadata)) return null
  const previous = metadata.quote_previous
  return previous && typeof previous === 'object'
    ? (previous as Partial<Record<'exchange_rate_applied' | 'amount_converted' | 'fee_total', number>>)
    : null
}

function readPreviousQuote(order: PaymentOrder, key: 'exchange_rate_applied' | 'amount_converted' | 'fee_total') {
  const previous = getPreviousQuote(order)
  if (!previous || previous[key] === undefined || previous[key] === null) return null
  return String(previous[key])
}

function resolveOrderRoute(order: PaymentOrder): SupportedPaymentRoute | null {
  const metadataRoute =
    order.metadata &&
    typeof order.metadata === 'object' &&
    'route' in order.metadata &&
    typeof order.metadata.route === 'string'
      ? order.metadata.route
      : null

  if (
    metadataRoute === 'bolivia_to_exterior' ||
    metadataRoute === 'us_to_bolivia' ||
    metadataRoute === 'us_to_wallet' ||
    metadataRoute === 'crypto_to_crypto'
  ) {
    return metadataRoute
  }

  switch (order.order_type) {
    case 'BO_TO_WORLD':
      return 'bolivia_to_exterior'
    case 'WORLD_TO_BO':
      return 'us_to_bolivia'
    case 'US_TO_WALLET':
      return 'us_to_wallet'
    case 'CRYPTO_TO_CRYPTO':
      return 'crypto_to_crypto'
    default:
      return null
  }
}



