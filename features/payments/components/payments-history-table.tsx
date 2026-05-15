'use client'

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction, useCallback } from 'react'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { ChevronDown, ChevronLeft, ChevronRight, Download, FileSpreadsheet, FileText, Loader2, Search, ShieldAlert, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DocumentUploadCard } from '@/components/shared/document-upload-card'
import { Card, CardContent } from '@/components/ui/card'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { DepositInstructionCard } from '@/features/payments/components/deposit-instruction-card'
import { buildDepositInstructionsFromOrder } from '@/features/payments/lib/deposit-instructions'
import { api } from '@/lib/api'
import { ACCEPTED_UPLOADS } from '@/lib/file-validation'
import { cn, interactiveCardClassName, getErrorMessage } from '@/lib/utils'
import { useSignedUrl } from '@/hooks/use-signed-url'
import type { ActivityLog } from '@/types/activity-log'
import type { OrderFileField, PaymentOrder } from '@/types/payment-order'
import type { Supplier } from '@/types/supplier'

const TERMINAL_STATUSES = new Set(['cancelled', 'failed', 'swept_external', 'refunded'])

/** Stages for interbank / deposit-based flows (PSAV, Virtual Accounts, etc.) */
const DEPOSIT_FLOW_STAGES: Array<{ key: PaymentOrder['status']; label: string }> = [
  { key: 'created', label: 'Orden creada' },
  { key: 'waiting_deposit', label: 'Esperando deposito' },
  { key: 'deposit_received', label: 'Deposito validado' },
  { key: 'processing', label: 'Procesando' },
  { key: 'sent', label: 'Enviado' },
  { key: 'completed', label: 'Completado' },
]

/** Stages for VA deposit flows (Bridge virtual account → ledger credit) */
const VA_DEPOSIT_FLOW_STAGES: Array<{ key: PaymentOrder['status']; label: string }> = [
  { key: 'pending', label: 'Fondos recibidos' },
  { key: 'processing', label: 'Procesando pago' },
  { key: 'completed', label: 'Acreditado' },
]

/** Visual config for va_deposit_status badges — Oceanic Trust palette */
const VA_STATUS_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  funds_received: { label: 'Fondos Recibidos', badgeClass: 'border-warning/40 bg-warning/10 text-warning-foreground dark:text-warning' },
  funds_scheduled: { label: 'ACH en Tránsito', badgeClass: 'border-primary/40 bg-primary/10 text-primary dark:text-[#8AB4FF]' },
  payment_submitted: { label: 'Procesando Pago', badgeClass: 'border-accent/40 bg-accent/10 text-accent-foreground dark:text-accent' },
  payment_processed: { label: 'Confirmado', badgeClass: 'border-success/40 bg-success/10 text-success dark:text-success' },
  in_review: { label: 'En Revisión', badgeClass: 'border-warning/40 bg-warning/10 text-warning-foreground dark:text-warning' },
  refund_in_flight: { label: 'Reembolso en Proceso', badgeClass: 'border-destructive/40 bg-destructive/10 text-destructive dark:text-[#FF8080]' },
  refunded: { label: 'Reembolsado', badgeClass: 'border-destructive/40 bg-destructive/10 text-destructive' },
  refund_failed: { label: 'Reembolso Fallido', badgeClass: 'border-destructive/40 bg-destructive/10 text-destructive' },
}

/** Stages for wallet-withdraw flows (Bridge wallet to fiat/crypto — no external deposit needed) */
const WALLET_WITHDRAW_FLOW_STAGES: Array<{ key: PaymentOrder['status']; label: string }> = [
  { key: 'created', label: 'Orden creada' },
  { key: 'processing', label: 'Procesando' },
  { key: 'sent', label: 'Enviado' },
  { key: 'completed', label: 'Completado' },
]

/** Returns the correct flow stages for a given order based on its service type */
function getFlowStages(order: PaymentOrder) {
  if (order.flow_type === 'va_deposit') return VA_DEPOSIT_FLOW_STAGES
  return isDepositOrder(order) ? DEPOSIT_FLOW_STAGES : WALLET_WITHDRAW_FLOW_STAGES
}

/** Returns whether the order is in a state that allows uploads and cancellation */
function isOpenForActions(order: PaymentOrder) {
  if (TERMINAL_STATUSES.has(order.status) || order.status === 'completed') return false
  if (isDepositOrder(order)) {
    return order.status === 'created' || order.status === 'waiting_deposit'
  }
  return order.status === 'created' || order.status === 'processing'
}

const STATUS_FILTER_LABELS: Record<string, string> = {
  all: 'Todos los estados',
  created: 'Orden creada',
  waiting_deposit: 'Esperando deposito',
  deposit_received: 'Deposito validado',
  processing: 'Procesando',
  sent: 'Enviado',
  completed: 'Completado',
  swept_external: 'Liquidado externo',
  pending: 'Pendiente (VA)',
  refunded: 'Reembolsado',
}

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
}

interface PaymentsHistoryTableProps {
  orders: PaymentOrder[]
  suppliers: Supplier[]
  activityLogs: ActivityLog[]
  disabled?: boolean
  pagination?: PaginationProps | null
  onUploadOrderFile: (orderId: string, field: OrderFileField, file: File) => Promise<unknown>
  onCancelOrder: (order: PaymentOrder) => Promise<unknown>
}

export function PaymentsHistoryTable({
  orders,
  suppliers,
  activityLogs,
  disabled,
  pagination,
  onUploadOrderFile,
  onCancelOrder,
}: PaymentsHistoryTableProps) {
  const safeOrders: PaymentOrder[] = Array.isArray(orders) ? orders : []
  const [files, setFiles] = useState<Record<string, Partial<Record<OrderFileField, File>>>>({})
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentOrder['status']>('all')
  const [search, setSearch] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

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
    if (selectedOrderId && !safeOrders.some((o) => o.id === selectedOrderId)) {
      setSelectedOrderId(null)
    }
  }, [safeOrders, selectedOrderId])

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

  const selectedOrder = useMemo(
    () => (selectedOrderId ? safeOrders.find((o) => o.id === selectedOrderId) ?? null : null),
    [safeOrders, selectedOrderId]
  )

  if (safeOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/50 px-8 py-16 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground">
          <FileText className="size-5" />
        </div>
        <p className="text-sm font-semibold text-foreground">Sin expedientes</p>
        <p className="mt-1 text-xs text-muted-foreground">Aún no hay órdenes creadas para este usuario.</p>
      </div>
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
        [order.id]: { ...current[order.id], [field]: undefined },
      }))
    } catch (error: unknown) {
      console.error('Failed to upload order file', error)
      toast.error(`No se pudo subir el archivo: ${getErrorMessage(error)}`)
    } finally {
      setBusyKey(null)
    }
  }

  async function handleCancel(order: PaymentOrder) {
    setBusyKey(`${order.id}-cancel`)
    try {
      await onCancelOrder(order)
      toast.success('Expediente cancelado.')
    } catch (error: unknown) {
      console.error('Failed to cancel order', error)
      toast.error(`No se pudo cancelar el expediente: ${getErrorMessage(error)}`)
    } finally {
      setBusyKey(null)
    }
  }

  async function handleDownloadPdf(order: PaymentOrder) {
    setBusyKey(`${order.id}-pdf`)
    try {
      const response = await api.get(`/payment-orders/${order.id}/pdf`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data as BlobPart]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `payment-order-${order.id.slice(0, 8)}.pdf`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error: unknown) {
      console.error('Failed to download PDF', error)
      toast.error(`No se pudo descargar el comprobante.`)
    } finally {
      setBusyKey(null)
    }
  }

  async function handleExport(exportFormat: 'excel' | 'pdf') {
    setBusyKey(`export-${exportFormat}`)
    try {
      const params = new URLSearchParams({ format: exportFormat })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const response = await api.get(`/payment-orders/export?${params.toString()}`, { responseType: 'blob' })
      const mimeType = exportFormat === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf'
      const ext = exportFormat === 'excel' ? 'xlsx' : 'pdf'
      const dateStr = new Date().toISOString().slice(0, 10)
      const blob = new Blob([response.data as BlobPart], { type: mimeType })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `expedientes-${dateStr}.${ext}`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success(`Reporte ${exportFormat === 'excel' ? 'Excel' : 'PDF'} descargado.`)
    } catch (error: unknown) {
      console.error('Export failed', error)
      toast.error(`No se pudo generar el reporte: ${getErrorMessage(error)}`)
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden flex flex-col">

      {/* ── Toolbar ── */}
      <section className="shrink-0 flex flex-col">
        <div className="flex flex-col gap-4 border-b border-border/50 px-4 py-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.2em] text-muted-foreground mb-1">
              Bitácora operativa
            </p>
            <h3 className="text-xl font-bold tracking-tight text-foreground sm:text-4xl">Expedientes</h3>
            <p className="mt-1 max-w-lg text-xs leading-relaxed text-muted-foreground">
              Consulta el estado, valida documentos y sigue cada tramo de ejecución desde una sola vista.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 lg:flex lg:items-center lg:gap-6 lg:shrink-0">
            <ToolbarMetric
              align="left"
              label="Visibles"
              value={String(filteredOrders.length).padStart(2, '0')}
            />
            <div className="hidden h-8 w-px bg-border/50 lg:block" />
            <ToolbarMetric
              align="left"
              label="En curso"
              value={String(filteredOrders.filter((o) => isOpenForActions(o)).length).padStart(2, '0')}
            />
          </div>
        </div>

        <div className="grid gap-2 border-b border-border/50 bg-muted/[0.02] px-4 py-3 sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(12rem,14rem)_auto] md:items-center md:gap-3">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              className="h-10 rounded-xl border-border/60 bg-background pl-9 text-sm transition-shadow focus-visible:ring-1 focus-visible:ring-primary/50 md:h-9 md:rounded-lg"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por expediente, proveedor o monto…"
              value={search}
            />
          </div>

          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | PaymentOrder['status'])}>
            <SelectTrigger className="h-10 w-full rounded-xl border-border/60 bg-background text-sm focus:ring-1 focus:ring-primary/50 md:h-9 md:rounded-lg px-3">
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
              <SelectItem value="swept_external">Swept external</SelectItem>
              <SelectItem value="pending">Pendiente (VA)</SelectItem>
              <SelectItem value="refunded">Reembolsado</SelectItem>
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  className="h-10 w-full justify-between gap-2 rounded-xl border-border/60 bg-background text-sm font-medium transition-colors hover:bg-muted/50 md:h-9 md:w-auto md:justify-center md:rounded-lg"
                  disabled={!!busyKey?.startsWith('export-')}
                  type="button"
                  variant="outline"
                />
              }
            >
              {busyKey?.startsWith('export-') ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              <span>Exportar</span>
              <ChevronDown className="size-3 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="">
              <DropdownMenuItem className="cursor-pointer hover:bg-muted/50 gap-2 text-sm" onClick={() => handleExport('excel')}>
                <FileSpreadsheet className="size-4 text-emerald-500" />
                Descargar Excel
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer hover:bg-muted/50 gap-2 text-sm" onClick={() => handleExport('pdf')}>
                <FileText className="size-4 text-red-400" />
                Descargar PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </section>

      {/* ── Table ── */}
      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-8 py-14 text-center bg-background">
          <p className="text-sm font-medium text-muted-foreground">No hay resultados con los filtros actuales.</p>
        </div>
      ) : (
        <div className="flex-1 min-w-0 overflow-x-auto bg-background">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent bg-muted/[0.02]">
                <TableHead className="text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-muted-foreground py-3.5 pl-6">Expediente</TableHead>
                <TableHead className="text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-muted-foreground py-3.5">Estado</TableHead>
                <TableHead className="text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-muted-foreground py-3.5">Tipo / Riel</TableHead>
                <TableHead className="text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-muted-foreground py-3.5 text-right">Origen</TableHead>
                <TableHead className="text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-muted-foreground py-3.5 text-right">Destino</TableHead>
                <TableHead className="text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-muted-foreground py-3.5">Fecha</TableHead>
                <TableHead className="text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-muted-foreground py-3.5 text-right pr-6">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => {
                const supplier = order.supplier_id ? (suppliersById.get(order.supplier_id) ?? null) : null
                const canCancel = isOpenForActions(order)
                const statusMeta = getStatusMeta(order.status)
                return (
                  <OrderSummaryRow
                    key={order.id}
                    order={order}
                    supplier={supplier}
                    statusMeta={statusMeta}
                    isSelected={selectedOrderId === order.id}
                    canCancel={canCancel}
                    disabled={disabled}
                    busyKey={busyKey}
                    onSelect={() => setSelectedOrderId(order.id)}
                    onCancel={() => handleCancel(order)}
                    onDownloadPdf={() => handleDownloadPdf(order)}
                  />
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Pagination ── */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border/50 px-6 py-3 bg-muted/[0.02]">
          <p className="text-xs text-muted-foreground">
            Página <span className="font-semibold text-foreground">{pagination.page}</span> de{' '}
            <span className="font-semibold text-foreground">{pagination.totalPages}</span>
            {' '}· <span className="font-semibold text-foreground">{pagination.total}</span> expedientes en total
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              className="h-8 w-8 p-0 rounded-lg border-border/60"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              type="button"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={p === pagination.page ? 'default' : 'outline'}
                className="h-8 w-8 p-0 rounded-lg border-border/60 text-xs font-semibold"
                onClick={() => pagination.onPageChange(p)}
                type="button"
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline"
              className="h-8 w-8 p-0 rounded-lg border-border/60"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              type="button"
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Order Detail Sheet ── */}
      <OrderDetailSheet
        order={selectedOrder}
        supplier={selectedOrder?.supplier_id ? (suppliersById.get(selectedOrder.supplier_id) ?? null) : null}
        orderActivity={selectedOrder ? (activityByOrderId.get(selectedOrder.id) ?? []) : []}
        disabled={disabled}
        busyKey={busyKey}
        files={files}
        onClose={() => setSelectedOrderId(null)}
        onCancel={selectedOrder ? () => handleCancel(selectedOrder) : () => { }}
        onUpload={handleUpload}
        onFileChange={setFiles}
        onDownloadPdf={selectedOrder ? () => handleDownloadPdf(selectedOrder) : () => { }}
      />
    </div>
  )
}

// ── OrderSummaryRow ──────────────────────────────────────────────────────────
function OrderSummaryRow({
  order, supplier, statusMeta, isSelected, canCancel,
  disabled, busyKey,
  onSelect, onCancel, onDownloadPdf,
}: {
  order: PaymentOrder
  supplier: Supplier | null
  statusMeta: ReturnType<typeof getStatusMeta>
  isSelected: boolean
  canCancel: boolean
  disabled?: boolean
  busyKey: string | null
  onSelect: () => void
  onCancel: () => void
  onDownloadPdf: () => void
}) {
  return (
    <TableRow
      className={cn(
        'cursor-pointer transition-colors border-border/40',
        isSelected
          ? 'bg-primary/[0.03] border-l-2 border-l-primary'
          : 'hover:bg-muted/30'
      )}
      onClick={onSelect}
    >
      {/* Expediente */}
      <TableCell className="py-4 pl-6">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-sm font-bold text-foreground tracking-tight">#{order.id.slice(0, 8)}</span>
          {supplier && (
            <span className="text-xs text-muted-foreground truncate max-w-[150px]">{supplier.name}</span>
          )}
        </div>
      </TableCell>

      {/* Estado */}
      <TableCell className="py-4">
        <div className="flex flex-col gap-1">
          <Badge
            className={cn('text-[0.68rem] font-semibold px-2 py-0.5 w-fit', statusMeta.badgeClass)}
            variant={getStatusVariant(order.status)}
          >
            {statusMeta.label}
          </Badge>
          {order.flow_type === 'va_deposit' && order.va_deposit_status && VA_STATUS_CONFIG[order.va_deposit_status] && (
            <Badge
              className={cn('text-[0.65rem] font-medium px-2 py-0.5 w-fit', VA_STATUS_CONFIG[order.va_deposit_status].badgeClass)}
              variant="outline"
            >
              {VA_STATUS_CONFIG[order.va_deposit_status].label}
            </Badge>
          )}
        </div>
      </TableCell>

      {/* Tipo / Riel */}
      <TableCell className="py-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-foreground">{humanizeOrderType(order)}</span>
          <span className="text-[0.68rem] text-muted-foreground">{humanizeRail(order)}</span>
        </div>
      </TableCell>

      {/* Monto Origen */}
      <TableCell className="text-right py-4">
        <div className="flex flex-col items-end gap-0.5">
          <span className="font-mono text-sm font-bold tabular-nums text-foreground">
            {(order.amount_origin ?? order.amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[0.65rem] font-medium text-muted-foreground">{order.origin_currency ?? order.currency ?? ''}</span>
        </div>
      </TableCell>

      {/* Monto Destino */}
      <TableCell className="text-right py-4">
        {order.flow_type === 'va_deposit' ? (
          <div className="flex flex-col items-end gap-0.5">
            <span className="font-mono text-sm font-bold tabular-nums text-foreground">
              {(order.amount_destination ?? order.net_amount ?? order.amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[0.65rem] font-medium text-muted-foreground">
              {order.destination_currency ?? 'USDC'}
              {order.destination_network ? ` · ${order.destination_network}` : ''}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-end gap-0.5">
            <span className="font-mono text-sm font-bold tabular-nums text-foreground">
              {(order.amount_converted ?? order.amount_destination ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[0.65rem] font-medium text-muted-foreground">{order.destination_currency ?? order.currency ?? ''}</span>
          </div>
        )}
      </TableCell>

      {/* Fecha */}
      <TableCell className="py-4">
        <span className="text-xs text-muted-foreground">{format(new Date(order.created_at), 'dd/MM/yyyy')}</span>
      </TableCell>

      {/* Acciones */}
      <TableCell className="text-right py-4 pr-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1.5">
          {(order.status === 'completed' || order.status === 'cancelled') && (
            <Button
              className="h-7 w-7 p-0 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/20 transition-colors"
              disabled={disabled || busyKey === `${order.id}-pdf`}
              onClick={onDownloadPdf}
              size="sm"
              type="button"
              title="Descargar PDF"
              variant="ghost"
            >
              {busyKey === `${order.id}-pdf` ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            </Button>
          )}
          {canCancel && (
            <Button
              className="h-7 w-7 p-0 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground border border-destructive/20 transition-colors"
              disabled={disabled || busyKey === `${order.id}-cancel`}
              onClick={onCancel}
              size="sm"
              type="button"
              title="Cancelar expediente"
              variant="ghost"
            >
              {busyKey === `${order.id}-cancel` ? <Loader2 className="size-3.5 animate-spin" /> : <XCircle className="size-3.5" />}
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

// ── OrderDetailSheet ─────────────────────────────────────────────────────────
function OrderDetailSheet({
  order, supplier, orderActivity,
  disabled, busyKey, files,
  onClose, onCancel, onUpload, onFileChange, onDownloadPdf,
}: {
  order: PaymentOrder | null
  supplier: Supplier | null
  orderActivity: ActivityLog[]
  disabled?: boolean
  busyKey: string | null
  files: Record<string, Partial<Record<OrderFileField, File>>>
  onClose: () => void
  onCancel: () => void
  onUpload: (order: PaymentOrder, field: OrderFileField) => Promise<void>
  onFileChange: React.Dispatch<React.SetStateAction<Record<string, Partial<Record<OrderFileField, File>>>>>
  onDownloadPdf: () => void
}) {
  if (!order) {
    return (
      <Sheet open={false} onOpenChange={() => { }}>
        <SheetContent side="right" className="sm:max-w-xl lg:max-w-2xl w-full p-0" />
      </Sheet>
    )
  }

  const statusMeta = getStatusMeta(order.status)
  const canCancel = isOpenForActions(order)
  const openUploads = isOpenForActions(order)
  const quotePreparedAt = getMetadataDate(order.metadata, 'quote_prepared_at')
  const depositInstructions = buildDepositInstructionsFromOrder(order)
  const primaryDepositInstructions = depositInstructions.filter((i) => i.kind !== 'note')
  const noteDepositInstructions = depositInstructions.filter((i) => i.kind === 'note')
  const hasEvidence = Boolean(order.deposit_proof_url || order.evidence_url)
  const showFundingInstructions = depositInstructions.length > 0 && isOpenForActions(order) && !hasEvidence

  return (
    <Sheet open={!!order} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="sm:max-w-xl lg:max-w-2xl w-full p-0 flex flex-col"
        showCloseButton={false}
      >
        {/* ── Accent stripe ── */}
        <div className="h-[3px] w-full bg-gradient-to-r from-primary via-accent to-primary/30 shrink-0" />

        {/* ── Header ── */}
        <SheetHeader className="shrink-0 border-b border-border/50 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <SheetTitle className="font-mono text-base font-bold tracking-tight">
                  #{order.id.slice(0, 8)}
                </SheetTitle>
                <Badge
                  className={cn('text-[0.68rem] font-semibold px-2 py-0.5', statusMeta.badgeClass)}
                  variant={getStatusVariant(order.status)}
                >
                  {statusMeta.label}
                </Badge>
                {order.flow_type === 'va_deposit' && order.va_deposit_status && VA_STATUS_CONFIG[order.va_deposit_status] && (
                  <Badge
                    className={cn('text-[0.65rem] font-medium px-2 py-0.5', VA_STATUS_CONFIG[order.va_deposit_status].badgeClass)}
                    variant="outline"
                  >
                    {VA_STATUS_CONFIG[order.va_deposit_status].label}
                  </Badge>
                )}
              </div>
              <SheetDescription className="text-xs text-muted-foreground truncate">
                {supplier ? supplier.name : 'Sin proveedor'} · {humanizeOrderType(order)} · {humanizeRail(order)} · {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}
              </SheetDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 h-8 w-8 p-0 rounded-xl text-muted-foreground hover:text-foreground"
              onClick={onClose}
            >
              <XCircle className="size-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* ── Scrollable Content ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="divide-y divide-border/40">

            {/* Progreso */}
            <div className="px-6 py-5">
              <SectionHeading title="Progreso de trazabilidad" />
              <div className="mt-3">
                <StatusRailCompact order={order} />
              </div>
            </div>

            {/* Estado y próximos pasos */}
            <div className="px-6 py-5">
              <ComplianceNote order={order} quotePreparedAt={quotePreparedAt} />
            </div>

            {/* Instrucciones de depósito */}
            {showFundingInstructions && (
              <div className="px-6 py-5">
                <SectionHeading title="Cuenta para depositar" />
                <div className="mt-3 grid gap-3">
                  {primaryDepositInstructions.map((instruction) => (
                    <DepositInstructionCard key={`${order.id}-${instruction.id}`} instruction={instruction} />
                  ))}
                  {noteDepositInstructions.map((instruction) => (
                    <DepositInstructionCard key={`${order.id}-${instruction.id}`} instruction={instruction} />
                  ))}
                </div>
              </div>
            )}

            {/* Cotización */}
            <div className="px-6 py-5">
              <SectionHeading title="Cotización final" />
              <div className="mt-3">
                <QuoteCard order={order} quotePreparedAt={quotePreparedAt} />
              </div>
            </div>

            {/* Mesa de acción */}
            <div className="px-6 py-5 bg-muted/[0.03]">
              <ActionDesk
                busy={busyKey}
                canCancel={canCancel}
                disabled={disabled}
                files={files}
                onCancel={onCancel}
                onFileChange={onFileChange}
                onUpload={onUpload}
                openUploads={openUploads}
                order={order}
              />
            </div>

            {/* Bitácora */}
            <div className="px-6 py-5">
              <SectionHeading title="Bitácora de actividad" />
              <div className="mt-3">
                <ActivityPanel orderActivity={orderActivity} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 border-t border-border/50 px-6 py-4">
          <div className="flex items-center justify-end gap-2.5">
            {(order.status === 'completed' || order.status === 'cancelled') && (
              <Button
                className="h-9 gap-2 rounded-xl bg-primary/8 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/20 transition-colors text-sm font-semibold"
                disabled={disabled || busyKey === `${order.id}-pdf`}
                onClick={onDownloadPdf}
                size="sm"
                type="button"
                variant="outline"
              >
                {busyKey === `${order.id}-pdf` ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                Comprobante PDF
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-xl border-border/60 text-sm"
              onClick={onClose}
            >
              Cerrar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── StatusRail (full view — available for external use) ──────────────────────
function StatusRail({ order }: { order: PaymentOrder }) {
  const stages = getFlowStages(order)
  const isTerminal = TERMINAL_STATUSES.has(order.status)
  const currentIndex = stages.findIndex((stage) => stage.key === order.status)

  if (isTerminal) {
    const meta = getStatusMeta(order.status)
    const bannerStyle = order.status === 'cancelled'
      ? { border: 'border-warning/30 bg-warning/5', circle: 'border-warning/50 bg-warning/10 text-warning' }
      : order.status === 'swept_external'
        ? { border: 'border-accent/30 bg-accent/5', circle: 'border-accent/50 bg-accent/10 text-accent' }
        : { border: 'border-destructive/30 bg-destructive/5', circle: 'border-destructive/50 bg-destructive/10 text-destructive' }
    const bannerMessage = order.status === 'cancelled'
      ? 'Este expediente fue anulado y no continuará en el flujo operativo.'
      : order.status === 'swept_external'
        ? 'Los fondos de esta operación fueron liquidados externamente. El expediente queda cerrado.'
        : 'Este expediente fue marcado como fallido. Consulta la bitácora para más detalles.'
    return (
      <div className="py-2">
        <div className={cn("flex items-center gap-3 rounded-2xl border p-4", bannerStyle.border)}>
          <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold", bannerStyle.circle)}>
            {order.status === 'swept_external' ? '↗' : '✕'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground">{meta.label}</div>
            <div className="text-xs text-muted-foreground">{bannerMessage}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-2">
      <div className="flex flex-col gap-2 md:hidden">
        {stages.map((stage, index) => {
          const isCurrent = stage.key === order.status
          const isReached = currentIndex >= index
          if (!isReached && index > currentIndex + 1) return null
          return (
            <div key={stage.key} className="flex items-center gap-3 rounded-2xl border border-border/40 bg-muted/5 p-3">
              <div className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition-colors",
                isCurrent
                  ? "border-primary/50 bg-primary/10 text-primary shadow-[0_0_8px_rgba(0,85,255,0.15)]"
                  : isReached
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-border/60 bg-muted/20 text-muted-foreground"
              )}>
                {index + 1}
              </div>
              <div className={cn("text-xs font-semibold", isCurrent ? "text-foreground" : "text-muted-foreground")}>
                {stage.label}
              </div>
            </div>
          )
        })}
      </div>
      <div className="hidden md:block overflow-x-auto py-2 pb-4">
        <div className="flex min-w-max items-start justify-center gap-3 md:gap-4 px-2">
          {stages.map((stage, index) => {
            const isCurrent = stage.key === order.status
            const isReached = currentIndex >= index
            const isComplete = currentIndex > index
            const lineFilled = currentIndex > index ? '100%' : '0%'
            return (
              <div
                key={stage.key}
                className={cn(
                  'relative flex min-w-[120px] flex-col items-center text-center sm:min-w-[132px] md:min-w-[144px]',
                  index < stages.length - 1 && 'md:pr-4 lg:pr-6'
                )}
              >
                <motion.div
                  animate={{
                    backgroundColor: isCurrent ? 'rgba(0,85,255,0.14)' : isComplete ? 'rgba(29,184,122,0.14)' : 'rgba(255,255,255,0.04)',
                    borderColor: isCurrent ? 'rgba(0,85,255,0.50)' : isComplete ? 'rgba(29,184,122,0.40)' : 'rgba(148,163,184,0.22)',
                    scale: isCurrent ? 1.06 : 1,
                    boxShadow: isCurrent ? '0 0 0 6px rgba(0,85,255,0.06)' : '0 0 0 0 rgba(0,0,0,0)',
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
                {index < stages.length - 1 ? (
                  <div className="absolute left-[calc(50%+2rem)] top-6 hidden w-[calc(100%-4rem)] -translate-y-1/2 md:block">
                    <div className="relative h-px w-full rounded-full bg-border/70">
                      <motion.div
                        animate={{ width: lineFilled }}
                        className={cn('absolute inset-y-0 left-0 rounded-full', isComplete ? 'bg-success' : 'bg-primary')}
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

// ── StatusRailCompact: polished numbered stepper for the Sheet ───────────────
function StatusRailCompact({ order }: { order: PaymentOrder }) {
  const stages = getFlowStages(order)
  const isTerminal = TERMINAL_STATUSES.has(order.status)
  const currentIndex = stages.findIndex((stage) => stage.key === order.status)

  if (isTerminal) {
    const meta = getStatusMeta(order.status)
    const color = order.status === 'cancelled'
      ? { bg: 'bg-warning/[0.07]', border: 'border-warning/25', text: 'text-warning', dot: 'bg-warning' }
      : order.status === 'swept_external'
        ? { bg: 'bg-accent/[0.07]', border: 'border-accent/25', text: 'text-accent', dot: 'bg-accent' }
        : { bg: 'bg-destructive/[0.07]', border: 'border-destructive/25', text: 'text-destructive', dot: 'bg-destructive' }
    return (
      <div className={cn('flex items-center gap-2.5 rounded-xl border px-4 py-3', color.bg, color.border)}>
        <div className={cn('size-2 shrink-0 rounded-full', color.dot)} />
        <span className={cn('text-xs font-bold', color.text)}>{meta.label}</span>
        <span className="text-[0.65rem] text-muted-foreground">
          — {order.status === 'cancelled' ? 'Anulado' : order.status === 'swept_external' ? 'Liquidado externamente' : 'Marcado como fallido'}
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Numbered step rail */}
      <div className="flex items-center">
        {stages.map((stage, index) => {
          const isCurrent = stage.key === order.status
          const isComplete = currentIndex > index

          return (
            <div key={stage.key} className="flex flex-1 items-center last:flex-none">
              {/* Step circle */}
              <div
                className={cn(
                  'relative flex size-7 shrink-0 items-center justify-center rounded-full border text-[0.6rem] font-bold transition-all duration-200',
                  isCurrent
                    ? 'border-primary/60 bg-primary text-primary-foreground shadow-[0_0_10px_rgba(0,85,255,0.2)]'
                    : isComplete
                      ? 'border-success/50 bg-success/10 text-success'
                      : 'border-border/50 bg-muted/30 text-muted-foreground/50'
                )}
                title={stage.label}
              >
                {isComplete ? '✓' : index + 1}
              </div>
              {/* Connector */}
              {index < stages.length - 1 && (
                <div className={cn(
                  'h-px flex-1 mx-1 transition-colors duration-300',
                  isComplete ? 'bg-success/40' : 'bg-border/40'
                )} />
              )}
            </div>
          )
        })}
      </div>

      {/* Labels row */}
      <div className="flex items-center gap-2">
        <span className="text-[0.62rem] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
          {stages[currentIndex]?.label ?? 'Desconocido'}
        </span>
        <span className="text-[0.62rem] text-muted-foreground/40">·</span>
        <span className="text-[0.62rem] text-muted-foreground">
          Paso {currentIndex + 1} de {stages.length}
        </span>
      </div>
    </div>
  )
}

// ── QuoteCard ────────────────────────────────────────────────────────────────
function QuoteCard({ order, quotePreparedAt }: { order: PaymentOrder; quotePreparedAt: string | null }) {
  const quoteChanges = getQuoteChanges(order)

  return (
    <div className="space-y-3">
      {(quoteChanges.length > 0 || quotePreparedAt) && (
        <div className="flex flex-wrap gap-2">
          {quoteChanges.length > 0 && <Badge variant="default" className="text-[0.65rem]">Actualizado por staff</Badge>}
          {quotePreparedAt && <Badge variant="outline" className="text-[0.65rem]">Lista {format(new Date(quotePreparedAt), 'dd/MM HH:mm')}</Badge>}
        </div>
      )}

      <div className="flex flex-col rounded-xl border border-border/40 bg-card shadow-sm overflow-hidden">
        <QuoteRow
          highlight={quoteChanges.includes('exchange_rate_applied')}
          label="Tasa de cambio"
          subtitle={readPreviousQuote(order, 'exchange_rate_applied')}
          value={String(order.exchange_rate_applied ?? 0)}
        />
        <QuoteRow
          highlight={quoteChanges.includes('amount_converted') || quoteChanges.includes('amount_destination')}
          label="Monto convertido"
          subtitle={readPreviousQuote(order, 'amount_converted') || readPreviousQuote(order, 'amount_destination')}
          value={`${order.amount_converted ?? order.amount_destination ?? 0} ${order.destination_currency ?? order.currency ?? ''}`}
        />
        <QuoteRow
          highlight={quoteChanges.includes('fee_total') || quoteChanges.includes('fee_amount')}
          label="Fee total"
          subtitle={readPreviousQuote(order, 'fee_total') || readPreviousQuote(order, 'fee_amount')}
          value={`${order.fee_total ?? order.fee_amount ?? 0} ${order.origin_currency ?? order.currency ?? ''}`}
        />
      </div>

      <p className="text-[0.65rem] text-muted-foreground/60 leading-relaxed">
        {quotePreparedAt && (order.status === 'processing' || order.status === 'sent' || order.status === 'completed')
          ? 'La cotización final fue publicada por staff y la orden siguió su curso.'
          : quotePreparedAt
            ? 'Cotización final publicada por staff.'
            : 'La cotización final aparecerá después de que staff valide el depósito.'}
      </p>
    </div>
  )
}

// ── AttachmentPanel ──────────────────────────────────────────────────────────
function AttachmentPanel({
  busy, disabled, files, onFileChange, onUpload, openUploads, order,
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
      <div className="rounded-xl border border-border/40 overflow-hidden">
        {showSupportUploader && <AttachmentStatus label="Respaldo documental" url={supportingUrl} />}
        <AttachmentStatus label={depositOrder ? 'Comprobante de depósito' : 'Evidencia'} url={evidenceUrl} />
        <AttachmentStatus label="Comprobante staff" url={staffComprobanteUrl} />
      </div>

      {openUploads && (
        <div className="grid gap-3">
          {showSupportUploader && (
            <AttachmentUploader
              accept={ACCEPTED_UPLOADS}
              busy={busy === `${order.id}-supporting_document_url`}
              disabled={disabled}
              existingUrl={supportingUrl}
              label="Respaldo"
              onFileChange={(file) => onFileChange((current) => ({ ...current, [order.id]: { ...current[order.id], supporting_document_url: file } }))}
              selectedFile={files[order.id]?.supporting_document_url}
              onUpload={() => onUpload(order, 'supporting_document_url')}
            />
          )}
          <AttachmentUploader
            accept={ACCEPTED_UPLOADS}
            busy={busy === `${order.id}-evidence_url`}
            disabled={disabled}
            existingUrl={evidenceUrl}
            label={depositOrder ? 'Comprobante' : 'Evidencia'}
            onFileChange={(file) => onFileChange((current) => ({ ...current, [order.id]: { ...current[order.id], evidence_url: file } }))}
            selectedFile={files[order.id]?.evidence_url}
            onUpload={() => onUpload(order, 'evidence_url')}
          />
        </div>
      )}
    </div>
  )
}

// ── ActivityPanel ─────────────────────────────────────────────────────────────
function ActivityPanel({ orderActivity }: { orderActivity: ActivityLog[] }) {
  const [showAll, setShowAll] = useState(false)
  const visibleActivity = showAll ? orderActivity : orderActivity.slice(0, 6)

  if (orderActivity.length === 0) {
    return (
      <p className="py-2 text-xs text-muted-foreground/60">Aún no hay eventos registrados para esta orden.</p>
    )
  }

  return (
    <div className="space-y-0">
      {visibleActivity.map((entry, index) => (
        <div
          key={entry.id}
          className={cn(
            'flex items-start justify-between gap-4 py-3 text-sm',
            index < visibleActivity.length - 1 && 'border-b border-border/30'
          )}
        >
          <div className="flex items-start gap-3">
            <div className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/40" />
            <div>
              <p className="text-xs font-semibold text-foreground">{humanizeActivity(entry.action)}</p>
              <p className="text-[0.6rem] text-muted-foreground/50 mt-0.5">Evento visible</p>
            </div>
          </div>
          <span className="shrink-0 text-[0.65rem] text-muted-foreground/60 tabular-nums">
            {format(new Date(entry.created_at), 'dd/MM/yy HH:mm')}
          </span>
        </div>
      ))}
      {orderActivity.length > 6 && (
        <button
          className="mt-2 w-full rounded-xl border border-dashed border-border/50 py-2 text-[0.7rem] font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
          onClick={() => setShowAll((prev) => !prev)}
          type="button"
        >
          {showAll ? 'Ver menos' : `Ver ${orderActivity.length - 6} evento${orderActivity.length - 6 === 1 ? '' : 's'} más`}
        </button>
      )}
    </div>
  )
}

// ── ActionDesk ────────────────────────────────────────────────────────────────
function ActionDesk({
  busy, canCancel, disabled, files, onCancel, onFileChange, onUpload, openUploads, order,
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
        <SectionHeading title="Mesa de acción" />
        <Badge className={cn('text-[0.65rem] font-semibold', getUrgencyBadgeClass(order.status))} variant="outline">
          {getUrgencyLabel(order.status)}
        </Badge>
      </div>

      <AttachmentPanel
        busy={busy}
        disabled={disabled}
        files={files}
        onFileChange={onFileChange}
        onUpload={onUpload}
        openUploads={openUploads}
        order={order}
      />

      {order.status === 'deposit_received' && !getMetadataDate(order.metadata, 'quote_prepared_at') && (
        <NoticeCard
          icon={ShieldAlert}
          title="Esperando cotización final"
          description="Staff ya validó el depósito y ahora debe publicar la cotización final con tasa, fee y monto real para mover la orden a procesamiento."
        />
      )}

      {canCancel && (
        <div className="flex justify-end">
          <Button
            className="h-9 rounded-xl gap-2 text-sm font-semibold"
            disabled={disabled || busy === `${order.id}-cancel`}
            onClick={onCancel}
            size="sm"
            type="button"
            variant="destructive"
          >
            {busy === `${order.id}-cancel` ? <Loader2 className="size-3.5 animate-spin" /> : <XCircle className="size-3.5" />}
            Cancelar expediente
          </Button>
        </div>
      )}
    </section>
  )
}

// ── NoticeCard ────────────────────────────────────────────────────────────────
function NoticeCard({ icon: Icon, title, description }: { icon: typeof ShieldAlert; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-warning/25 bg-warning/[0.05] px-4 py-3.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-warning" />
      <div>
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

// ── AttachmentStatus ──────────────────────────────────────────────────────────
function AttachmentStatus({ label, url }: { label: string; url?: string | null }) {
  const resolvedUrl = useSignedUrl(url)

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/30 last:border-0">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {resolvedUrl ? (
        <a
          className="text-xs font-bold text-primary hover:underline underline-offset-4"
          href={resolvedUrl}
          rel="noreferrer"
          target="_blank"
        >
          Ver archivo
        </a>
      ) : url ? (
        <span className="text-[0.65rem] text-muted-foreground/50">Obteniendo enlace…</span>
      ) : (
        <span className="text-[0.65rem] text-muted-foreground/35">Pendiente</span>
      )}
    </div>
  )
}

// ── AttachmentUploader ────────────────────────────────────────────────────────
function AttachmentUploader({
  accept, busy, disabled, existingUrl, label, onFileChange, onUpload, selectedFile,
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
      emptyStateText="Aún no hay archivo entregado."
      existingUrl={resolvedExistingUrl || existingUrl || undefined}
      existingUrlLabel="Ver archivo ya entregado"
      file={selectedFile ?? null}
      helperText={undefined}
      label={label}
      onFileChange={(file) => onFileChange(file ?? undefined)}
      onUpload={onUpload}
      selectedFileLinkLabel={(fileName) => `Ver archivo que estás por subir: ${fileName}`}
      uploading={busy}
      uploadLabel={`Subir ${label.toLowerCase()}`}
    />
  )
}

// ── QuoteRow ─────────────────────────────────────────────────────────────────
function QuoteRow({ label, value, highlight, subtitle }: { label: string; value: string; highlight?: boolean; subtitle?: string | null }) {
  return (
    <div className={cn(
      'flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-4 border-b border-border/30 last:border-0 transition-colors',
      highlight ? 'bg-accent/[0.03]' : 'bg-transparent hover:bg-muted/[0.01]'
    )}>
      <div className="flex flex-col gap-1 pr-2 sm:max-w-[40%] shrink-0">
        <span className="text-[0.62rem] font-extrabold uppercase tracking-[0.15em] text-muted-foreground">{label}</span>
        {highlight && <span className="text-[0.6rem] font-bold text-accent uppercase tracking-wider">Actualizado</span>}
      </div>
      <div className="flex flex-col sm:items-end gap-1 text-left sm:text-right overflow-hidden min-w-0">
        <span className="text-sm sm:text-[0.95rem] font-bold tabular-nums text-foreground break-words max-w-full leading-tight">{value}</span>
        {subtitle && <span className="text-[0.65rem] text-muted-foreground/60 line-through">Antes: {subtitle}</span>}
      </div>
    </div>
  )
}

// ── ComplianceNote ────────────────────────────────────────────────────────────
function ComplianceNote({ order, quotePreparedAt }: { order: PaymentOrder; quotePreparedAt: string | null }) {
  return (
    <div className="space-y-2">
      <SectionHeading title="Estado y próximos pasos" />
      <p className="border-l-2 border-primary/40 pl-4 text-xs leading-[1.8] text-muted-foreground">
        {getConsolidatedStatusMessage(order, quotePreparedAt)}
      </p>
    </div>
  )
}

// ── SectionHeading ────────────────────────────────────────────────────────────
function SectionHeading({ title }: { title: string }) {
  return (
    <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
  )
}

// ── ToolbarMetric ─────────────────────────────────────────────────────────────
function ToolbarMetric({ align = 'right', label, value }: { align?: 'left' | 'right'; label: string; value: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border/45 bg-background/45 px-3 py-2 lg:border-0 lg:bg-transparent lg:p-0',
        align === 'right' ? 'text-right' : 'text-left lg:text-right'
      )}
    >
      <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-xl font-bold tracking-tight text-foreground sm:text-2xl">{value}</p>
    </div>
  )
}

// ── Utility functions (unchanged) ─────────────────────────────────────────────

function getStatusVariant(status: PaymentOrder['status']) {
  if (status === 'failed') return 'destructive' as const
  if (status === 'completed' || status === 'swept_external') return 'default' as const
  if (status === 'cancelled') return 'outline' as const
  return 'outline' as const
}

function getStatusMeta(status: PaymentOrder['status']) {
  switch (status) {
    case 'created':
      return { badgeClass: 'border-muted-foreground/30 bg-muted/40 text-foreground dark:bg-muted/20', eyebrow: 'Preparacion', label: 'Orden creada' }
    case 'waiting_deposit':
      return { badgeClass: 'border-warning/40 bg-warning/12 text-[#8B6914] font-semibold dark:text-warning', eyebrow: 'Fondeo', label: 'Esperando deposito' }
    case 'deposit_received':
      return { badgeClass: 'border-accent/40 bg-accent/12 text-[#007A94] font-semibold dark:text-accent', eyebrow: 'Control', label: 'Deposito validado' }
    case 'processing':
      return { badgeClass: 'border-primary/40 bg-primary/12 text-primary font-semibold dark:text-[#8AB4FF]', eyebrow: 'Ejecucion', label: 'Procesando' }
    case 'sent':
      return { badgeClass: 'border-primary/40 bg-primary/12 text-primary font-semibold dark:text-[#8AB4FF]', eyebrow: 'Liquidacion', label: 'Enviado' }
    case 'completed':
      return { badgeClass: 'border-success/40 bg-success/12 text-[#157A54] font-semibold dark:text-success', eyebrow: 'Cierre', label: 'Completado' }
    case 'failed':
      return { badgeClass: 'border-destructive/40 bg-destructive/12 text-destructive font-semibold', eyebrow: 'Incidencia', label: 'Fallido' }
    case 'cancelled':
      return { badgeClass: 'border-destructive/40 bg-destructive/12 text-destructive font-semibold', eyebrow: 'Anulacion', label: 'Cancelado' }
    case 'swept_external':
      return { badgeClass: 'border-accent/40 bg-accent/12 text-[#007A94] font-semibold dark:text-accent', eyebrow: 'Liquidacion externa', label: 'Liquidado externo' }
    case 'pending':
      return { badgeClass: 'border-warning/40 bg-warning/12 text-[#8B6914] font-semibold dark:text-warning', eyebrow: 'Cuenta Virtual', label: 'Pendiente Bridge' }
    case 'refunded':
      return { badgeClass: 'border-destructive/40 bg-destructive/12 text-destructive font-semibold', eyebrow: 'Reembolso', label: 'Reembolsado' }
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
    case 'swept_external':
      return 'Los fondos de esta operacion fueron liquidados en una cuenta o red externa. El expediente queda cerrado con trazabilidad completa.'
    default:
      return 'Estado no reconocido. Contacta a soporte si necesitas mas informacion sobre este expediente.'
  }
}

function getUrgencyLabel(status: PaymentOrder['status']) {
  switch (status) {
    case 'created': return 'Accion requerida'
    case 'waiting_deposit': return 'En revision'
    case 'deposit_received': return 'Interno'
    case 'processing':
    case 'sent': return 'En curso'
    case 'completed': return 'Cerrado'
    case 'failed': return 'Incidencia'
    case 'cancelled': return 'Cancelado'
    case 'swept_external': return 'Liquidado'
    case 'pending': return 'En proceso'
    case 'refunded': return 'Reembolsado'
    default: return 'Sin estado'
  }
}

function getUrgencyBadgeClass(status: PaymentOrder['status']) {
  switch (status) {
    case 'created': return 'border-warning/40 bg-warning/12 text-[#8B6914] dark:text-warning'
    case 'waiting_deposit': return 'border-accent/40 bg-accent/12 text-[#007A94] dark:text-accent'
    case 'deposit_received': return 'border-primary/40 bg-primary/12 text-primary dark:text-[#8AB4FF]'
    case 'processing':
    case 'sent': return 'border-primary/40 bg-primary/12 text-primary dark:text-[#8AB4FF]'
    case 'completed': return 'border-success/40 bg-success/12 text-[#157A54] dark:text-success'
    case 'failed': return 'border-destructive/40 bg-destructive/12 text-destructive'
    case 'cancelled': return 'border-destructive/40 bg-destructive/12 text-destructive'
    case 'swept_external': return 'border-accent/40 bg-accent/12 text-[#007A94] dark:text-accent'
    default: return 'border-border/35 bg-muted/10 text-muted-foreground'
  }
}

function humanizeOrderType(order: PaymentOrder) {
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
      case 'va_deposit': return 'Depósito Cuenta Virtual'
      case 'wallet_to_fiat': return 'Retiro a Cuenta Bancaria'
      default: return order.flow_type
    }
  }
  switch (order.order_type) {
    case 'BO_TO_WORLD': return 'BO a exterior'
    case 'WORLD_TO_BO': return 'Exterior a BO'
    case 'US_TO_WALLET': return 'US a wallet'
    case 'CRYPTO_TO_CRYPTO': return 'Crypto a crypto'
    default: return order.order_type ?? 'Sin tipo'
  }
}

function humanizeRail(order: PaymentOrder) {
  if (order.flow_category) {
    switch (order.flow_category) {
      case 'interbank': return 'Interbancario'
      case 'wallet_ramp': return 'Wallet ramp'
      default: return order.flow_category
    }
  }
  switch (order.processing_rail) {
    case 'ACH': return 'Rail ACH'
    case 'SWIFT': return 'Rail SWIFT'
    case 'PSAV': return 'Rail PSAV'
    case 'DIGITAL_NETWORK': return 'Rail digital'
    default: return order.processing_rail ?? 'Sin rail'
  }
}

function isDepositOrder(order: PaymentOrder) {
  if (order.psav_deposit_instructions && typeof order.psav_deposit_instructions === 'object' && Object.keys(order.psav_deposit_instructions).length > 0) {
    return true
  }
  if (order.bridge_source_deposit_instructions && typeof order.bridge_source_deposit_instructions === 'object' && Object.keys(order.bridge_source_deposit_instructions).length > 0) {
    return true
  }
  if (order.flow_type) {
    const depositFlows = [
      'bolivia_to_world', 'bolivia_to_wallet',
      'world_to_bolivia', 'world_to_wallet',
      'wallet_to_wallet',
      'fiat_bo_to_bridge_wallet',
      'crypto_to_bridge_wallet',
    ]
    return depositFlows.includes(order.flow_type)
  }
  return order.order_type === 'WORLD_TO_BO' || order.order_type === 'US_TO_WALLET'
}

function humanizeActivity(action: string) {
  switch (action) {
    case 'payment_order_created': return 'Expediente creado'
    case 'payment_order_file_uploaded': return 'Archivo subido'
    case 'payment_order_cancelled': return 'Expediente cancelado'
    default: return action
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
