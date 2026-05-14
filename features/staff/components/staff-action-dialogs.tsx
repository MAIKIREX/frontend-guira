'use client'

import { useEffect, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { format } from 'date-fns'
import { useForm, useWatch, type Control, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck2,
  FileText,
  Landmark,
  ReceiptText,
  Wallet,
  Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DocumentUploadCard } from '@/components/shared/document-upload-card'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  staffOnboardingActionSchema,
  staffOrderCompletionSchema,
  staffOrderProcessingSchema,
  staffOrderSentSchema,
  staffReasonSchema,
  staffSupportActionSchema,
  type StaffOnboardingActionValues,
  type StaffOrderCompletionValues,
  type StaffOrderProcessingValues,
  type StaffOrderSentValues,
  type StaffSupportActionValues,
  type StaffReasonValues,
} from '@/features/staff/schemas/staff-actions.schema'
import { StaffService } from '@/services/staff.service'
import { ComplianceAdminService } from '@/services/admin/compliance.admin.service'
import { RejectionTemplatesService } from '@/services/admin/rejection-templates.service'
import { ACCEPTED_UPLOADS } from '@/lib/file-validation'
import type { StaffActor, StaffOnboardingRecord, StaffSupportTicket } from '@/types/staff'
import type { PaymentOrder } from '@/types/payment-order'

/**
 * Hook that fetches quick-comment templates from the API, cached in-memory.
 * Falls back to an empty array on error so the UI never breaks.
 */
function useDynamicQuickComments(category: string) {
  const [comments, setComments] = useState<string[]>([])
  useEffect(() => {
    let cancelled = false
    RejectionTemplatesService.getQuickComments(category)
      .then((data) => { if (!cancelled) setComments(data) })
      .catch(() => { /* silently fallback to empty */ })
    return () => { cancelled = true }
  }, [category])
  return comments
}

export function OnboardingActions({ actor, record, onUpdated }: { actor: StaffActor; record: StaffOnboardingRecord; onUpdated: (record: StaffOnboardingRecord) => Promise<void> | void }) {
  const availableStatuses = useMemo(() => {
    if (record.status === 'pending_bridge') return []

    const statuses: StaffOnboardingActionValues['status'][] = []
    if (record.status !== 'approved') statuses.push('approved')
    // "Solicitar Correcciones" siempre visible para que el staff pueda pedir
    // cambios al cliente, incluso cuando el status actual ya es 'in_review'.
    statuses.push('in_review')
    if (record.status !== 'rejected') statuses.push('rejected')
    return statuses
  }, [record.status])

  if (record.status === 'pending_bridge') {
    return (
      <div className="flex items-center gap-2 rounded-md border border-muted bg-muted/40 px-3 py-2 text-sm text-muted-foreground shadow-sm">
        <Clock className="size-4 opacity-70" />
        Esperando respuesta de Bridge
      </div>
    )
  }

  if (availableStatuses.length === 0) return null

  return (
    <div className="flex flex-wrap gap-3">
      {availableStatuses.map((status) => (
        <OnboardingActionDialog key={status} actor={actor} defaultStatus={status} onUpdated={onUpdated} record={record} />
      ))}
    </div>
  )
}

export function OnboardingDetailDialog({ actor, record, onUpdated }: { actor: StaffActor; record: StaffOnboardingRecord; onUpdated: (record: StaffOnboardingRecord) => Promise<void> | void }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="secondary" />}>Ver Detalles</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle de Onboarding</DialogTitle>
          <DialogDescription>Revisión multinivel de datos y documentos (KYC/KYB).</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">Nivel 1: Datos Generales</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Nombre:</span> {record.profiles?.full_name ?? 'Sin nombre'}</div>
              <div><span className="text-muted-foreground">Email:</span> {record.profiles?.email ?? 'Sin email'}</div>
              <div><span className="text-muted-foreground">Tipo:</span> <span className="uppercase">{record.type}</span></div>
              <div><span className="text-muted-foreground">Estado Actual:</span> <span className={"font-semibold lowercase px-2 py-0.5 rounded-full " + (record.status === 'approved' ? 'bg-emerald-400/15 text-emerald-700 dark:text-emerald-300' : record.status === 'rejected' ? 'bg-red-500/15 text-red-700 dark:text-red-300' : 'bg-amber-400/15 text-amber-700 dark:text-amber-300')}>{record.status}</span></div>
            </div>

            <div className="mt-3">
              <span className="text-muted-foreground text-sm">Objeto Data:</span>
              <pre className="mt-1 p-3 bg-muted/30 rounded-lg overflow-x-auto text-xs">{JSON.stringify(record.data, null, 2)}</pre>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">Nivel 2: Verificación Documental</h4>
            <p className="text-xs text-muted-foreground">Los documentos se cargan en el bucket `onboarding`. Puedes previsualizarlos o descargarlos accediendo a la URL pública/firmada de cada path almacenado aquí.</p>
            {/* Aquí a futuro se pueden buscar los documentos en storage, pero por ahora mostramos los IDs/metadata adjuntos si existen en record.data o en la tabla documents */}
          </div>
        </div>

        <DialogFooter className="mt-6 border-t pt-4 sm:justify-between items-center">
          <span className="text-xs text-muted-foreground">Acciones Rápidas:</span>
          <OnboardingActions actor={actor} onUpdated={onUpdated} record={record} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function OnboardingActionDialog({ actor, defaultStatus, onUpdated, record }: { actor: StaffActor; defaultStatus: StaffOnboardingActionValues['status']; onUpdated: (record: StaffOnboardingRecord) => Promise<void> | void; record: StaffOnboardingRecord }) {
  const [open, setOpen] = useState(false)
  const form = useForm<StaffOnboardingActionValues>({
    resolver: zodResolver(staffOnboardingActionSchema),
    defaultValues: { status: defaultStatus, reason: '' },
  })

  const quickComments = useDynamicQuickComments(defaultStatus)

  async function submit(values: StaffOnboardingActionValues) {
    try {
      const updatedRecord = await ComplianceAdminService.updateOnboardingStatus({
        actor, record,
        status: values.status,
        reason: values.reason,
      })
      toast.success('Onboarding actualizado.')
      setOpen(false)
      form.reset({ status: defaultStatus, reason: '' })
      await onUpdated(updatedRecord)
    } catch (error) {
      console.error('Failed to update onboarding status', error)
      toast.error('No se pudo actualizar el onboarding.')
    }
  }

  const triggerVariant = defaultStatus === 'rejected' ? 'destructive' : defaultStatus === 'approved' ? 'default' : 'outline'
  const confirmVariant = defaultStatus === 'rejected' ? 'destructive' : 'default'

  const triggerClassName = defaultStatus === 'approved' 
    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md' 
    : defaultStatus === 'in_review'
      ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 font-medium shadow-sm dark:text-amber-400 dark:hover:bg-amber-500/30'
      : 'shadow-md font-medium'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className={`h-10 px-5 text-sm ${triggerClassName}`} variant={triggerVariant} />}>{getOnboardingActionLabel(defaultStatus)}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{getOnboardingActionLabel(defaultStatus)}</DialogTitle>
          <DialogDescription>{getOnboardingActionDescription(defaultStatus)}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
            <FormField control={form.control} name="reason" render={({ field }) => (
              <FormItem>
                <FormLabel>Motivo / Mensaje al cliente</FormLabel>
                {quickComments.length > 0 && (
                  <QuickCommentsList comments={quickComments} onSelect={(c) => form.setValue('reason', c, { shouldValidate: true })} />
                )}
                <FormControl><Textarea {...field} placeholder={getOnboardingActionPlaceholder(defaultStatus)} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter>
              <Button disabled={form.formState.isSubmitting} type="submit" variant={confirmVariant}>
                {form.formState.isSubmitting ? 'Guardando...' : getOnboardingActionLabel(defaultStatus)}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export function SupportTicketActions({ actor, onUpdated, ticket }: { actor: StaffActor; onUpdated: (ticket: StaffSupportTicket) => Promise<void> | void; ticket: StaffSupportTicket }) {
  const [open, setOpen] = useState(false)
  const form = useForm<StaffSupportActionValues>({
    resolver: zodResolver(staffSupportActionSchema),
    defaultValues: { status: ticket.status ?? 'open', reason: '' },
  })

  async function submit(values: StaffSupportActionValues) {
    try {
      const updatedTicket = await StaffService.updateSupportTicketStatus({ actor, ticket, status: values.status, reason: values.reason })
      toast.success('Ticket actualizado.')
      setOpen(false)
      form.reset({ status: values.status, reason: '' })
      await onUpdated(updatedTicket)
    } catch (error) {
      console.error('Failed to update support ticket', error)
      toast.error('No se pudo actualizar el ticket.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Cambiar estado</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Actualizar ticket</DialogTitle>
          <DialogDescription>Cambia el estado del ticket con motivo y notificacion al cliente.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>Nuevo estado</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona un estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">open</SelectItem>
                      <SelectItem value="in_progress">in_progress</SelectItem>
                      <SelectItem value="resolved">resolved</SelectItem>
                      <SelectItem value="closed">closed</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="reason" render={({ field }) => (
              <FormItem>
                <FormLabel>Motivo</FormLabel>
                <FormControl><Textarea {...field} placeholder="Explica el cambio de estado" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button disabled={form.formState.isSubmitting} type="submit">{form.formState.isSubmitting ? 'Guardando...' : 'Actualizar ticket'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export function OrderActions({ actor, onUpdated, order }: { actor: StaffActor; onUpdated: (order: PaymentOrder) => Promise<void> | void; order: PaymentOrder }) {
  const actions = new Set(getOrderActions(order))
  if (actions.size === 0) return null

  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2">
        {actions.has('failed') ? <OrderReasonActionDialog actor={actor} action="failed" label="Rechazar Orden" onUpdated={onUpdated} order={order} /> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.has('quote') ? <OrderQuoteDialog actor={actor} onUpdated={onUpdated} order={order} /> : null}
        {actions.has('sent') ? <OrderSentDialog actor={actor} onUpdated={onUpdated} order={order} /> : null}
        {actions.has('completed') ? <OrderCompletionDialog actor={actor} onUpdated={onUpdated} order={order} /> : null}
      </div>
    </div>
  )
}

function getPaymentStatusColor(status: string) {
  if (status === 'created' || status === 'waiting_deposit') return 'bg-amber-400/15 text-amber-700 dark:text-amber-300'
  if (status === 'deposit_received' || status === 'processing' || status === 'sent') return 'bg-cyan-400/15 text-sky-700 dark:text-cyan-300'
  if (status === 'completed') return 'bg-emerald-400/15 text-emerald-700 dark:text-emerald-300'
  if (status === 'failed' || status === 'cancelled' || status === 'swept_external') return 'bg-red-500/15 text-red-700 dark:text-red-300'
  return 'bg-red-500/15 text-red-700 dark:text-red-300'
}

export function OrderDetailDialog({ actor, onUpdated, order, clientName }: { actor: StaffActor; onUpdated: (order: PaymentOrder) => Promise<void> | void; order: PaymentOrder; clientName?: string }) {
  const destinationInfo = buildOrderDestinationInfo(order)
  const summaryCards = buildOrderSummaryCards(order)
  const documentItems = buildOrderDocumentItems(order)
  const stepExpectation = getOrderStepExpectation(order)

  const liquidationQR = useMemo(() => {
    if (!['fiat_bo_to_bridge_wallet', 'bolivia_to_wallet', 'bolivia_to_world'].includes(order.flow_type ?? '')) return null
    const instr = order.bridge_source_deposit_instructions as Record<string, string> | undefined
    if (instr?.type !== 'liquidation_address') return null
    const address = instr.to_address ?? instr.deposit_address
    if (!address) return null
    const network = instr.payment_rail ?? instr.chain ?? 'solana'
    return {
      qrValue: buildLiquidationQRValue(network, address),
      address,
      network,
      currency: instr.currency?.toUpperCase() ?? 'USDC',
    }
  }, [order.bridge_source_deposit_instructions, order.flow_type])

  const boliviaToWorldInstr = useMemo(() => {
    if (!['bolivia_to_world', 'bolivia_to_wallet'].includes(order.flow_type ?? '')) return null
    if (order.status !== 'processing') return null
    const instr = order.bridge_source_deposit_instructions as Record<string, string> | undefined
    const addr = instr?.to_address ?? instr?.deposit_address
    if (!addr) return null
    return {
      address: addr,
      network: (instr.payment_rail ?? instr.chain ?? 'solana').toUpperCase(),
      currency: (instr.currency ?? 'USDC').toUpperCase(),
      bridgeTransferId: order.bridge_transfer_id as string | undefined,
      amountToDeposit: instr.amount_to_deposit ?? null,
    }
  }, [order.bridge_source_deposit_instructions, order.flow_type, order.status, order.bridge_transfer_id])

  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="secondary" />}>Gestionar Orden</DialogTrigger>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1rem)] max-w-none overflow-x-hidden overflow-y-auto border-0 bg-background p-0 shadow-2xl sm:max-w-none sm:w-[min(95vw,1100px)] lg:w-[min(92vw,1240px)] rounded-2xl">
        {/* ── Header ── */}
        <DialogHeader className="gap-0 border-b border-border/40 px-5 py-4 sm:px-7 sm:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ReceiptText className="size-[18px]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <DialogTitle className="text-base font-semibold tracking-tight sm:text-lg">
                  OrderDetailDialog
                </DialogTitle>
                <span className={"rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] " + getPaymentStatusColor(order.status)}>
                  {humanizeOrderStatus(order.status)}
                </span>
              </div>
              <DialogDescription className="mt-0.5 text-xs text-muted-foreground">
                ORDEN ID: {order.id.slice(0, 8).toUpperCase()} · {humanizeFlowType(order.flow_type) || order.flow_type || order.processing_rail}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* ── Body ── */}
        <div className="grid gap-0 2xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,340px)]">
          {/* Left column */}
          <div className="min-w-0 space-y-0">

            {/* Metrics strip */}
            <div className="grid grid-cols-2 gap-px border-b border-border/30 bg-border/30 sm:grid-cols-3">
              {summaryCards.slice(0, 3).map((card) => (
                <div key={card.label} className="bg-background px-5 py-4 sm:py-5">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{card.label}</div>
                  <div className="mt-1.5 text-lg font-bold tracking-tight text-foreground">{card.value}</div>
                </div>
              ))}
            </div>
            {summaryCards.length > 3 && (
              <div className="grid grid-cols-2 gap-px border-b border-border/30 bg-border/30 sm:grid-cols-3">
                {summaryCards.slice(3).map((card) => (
                  <div key={card.label} className="bg-background px-5 py-4 sm:py-5">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{card.label}</div>
                    <div className="mt-1.5 text-lg font-bold tracking-tight text-foreground">{card.value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Originator row */}
            <div className="flex items-center gap-x-8 gap-y-3 border-b border-border/30 px-5 py-4 sm:px-7 flex-wrap">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Cliente</div>
                {clientName && <div className="mt-1 text-sm font-semibold text-foreground">{clientName}</div>}
                <div className={clientName ? 'text-xs text-muted-foreground font-mono' : 'mt-1 text-sm font-medium text-foreground font-mono'}>{order.user_id?.slice(0, 12)}…</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Fecha de solicitud</div>
                <div className="mt-1 text-sm font-medium text-foreground">{formatOrderDate(order.created_at)}</div>
              </div>
            </div>

            {/* Destination info */}
            <div className="px-5 py-5 sm:px-7 space-y-4">
              <h3 className="text-sm font-semibold text-primary">Información de Destino</h3>
              {destinationInfo.length > 0 ? (
                <div className="space-y-0 divide-y divide-border/30">
                  {destinationInfo.map((item) => (
                    <div
                      key={item.label}
                      className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
                    >
                      <span className="text-[11px] font-medium text-muted-foreground sm:w-44 shrink-0">
                        {item.label}
                      </span>
                      <span className="break-all text-sm font-medium text-foreground sm:text-right font-mono">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin información de destino registrada.</p>
              )}
            </div>

            {/* PSAV Instructions (conditional) */}
            {boliviaToWorldInstr && (
              <div className="border-t border-border/30 px-5 py-5 sm:px-7 space-y-3">
                <h3 className="text-sm font-semibold text-primary">Instrucciones PSAV</h3>
                <div className="flex items-center justify-between rounded-lg bg-blue-500/8 px-4 py-2.5">
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Red · Moneda</span>
                  <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                    {boliviaToWorldInstr.network} · {boliviaToWorldInstr.currency}
                  </span>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1">Dirección destino</div>
                  <p className="break-all rounded-lg bg-muted/50 px-3 py-2 font-mono text-[11px] text-foreground">
                    {boliviaToWorldInstr.address}
                  </p>
                </div>
                {boliviaToWorldInstr.bridgeTransferId && (
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1">Bridge Transfer ID</div>
                    <p className="break-all rounded-lg bg-muted/50 px-3 py-2 font-mono text-[11px] text-foreground">
                      {boliviaToWorldInstr.bridgeTransferId}
                    </p>
                  </div>
                )}
                {boliviaToWorldInstr.amountToDeposit ? (
                  <div className="flex items-center justify-between rounded-lg bg-emerald-500/8 px-4 py-2.5">
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Monto a depositar</span>
                    <span className="text-base font-bold text-emerald-700 dark:text-emerald-300">
                      {boliviaToWorldInstr.amountToDeposit} {boliviaToWorldInstr.currency}
                    </span>
                  </div>
                ) : (
                  <div className="rounded-lg bg-amber-500/8 px-4 py-2.5">
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Depositar el equivalente en {boliviaToWorldInstr.currency} según tipo de cambio.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <aside className="min-w-0 border-l border-border/30 2xl:border-l">

            {/* Step expectation */}
            <div className="border-b border-border/30 px-5 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5" />
                Paso actual
              </div>
              <div className="mt-2 text-sm font-medium text-foreground">{stepExpectation.title}</div>
            </div>

            {/* Documents */}
            <div className="border-b border-border/30 px-5 py-4 space-y-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Documentos</div>
              {documentItems.map((item) => (
                <DocumentStatusCard
                  key={item.label}
                  emptyMessage={item.emptyMessage}
                  href={item.href}
                  label={item.label}
                  tone={item.tone}
                />
              ))}
            </div>

            {/* QR (conditional) — only visible once order reaches processing to avoid premature deposits */}
            {liquidationQR && ['processing', 'sent', 'completed'].includes(order.status) && (
              <div className="border-b border-border/30 px-5 py-4">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-full rounded-lg bg-amber-500/8 px-3 py-2 text-center">
                    <p className="text-sm font-bold tracking-tight text-amber-700 dark:text-amber-300">
                      {liquidationQR.network.toUpperCase()} · {liquidationQR.currency}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white p-2.5">
                    <QRCodeSVG value={liquidationQR.address} size={160} level="M" includeMargin={false} />
                  </div>
                  <p className="break-all text-center text-[10px] font-mono text-muted-foreground">{liquidationQR.address}</p>
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* ── Sticky bottom action bar ── */}
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-border/40 bg-background/95 backdrop-blur-sm px-5 py-3.5 sm:px-7">
          <OrderActions actor={actor} onUpdated={onUpdated} order={order} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SectionHeading({
  description,
  eyebrow,
  title,
}: {
  description?: string
  eyebrow: string
  title: string
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {eyebrow}
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
      {description ? <p className="text-sm leading-6 text-muted-foreground">{description}</p> : null}
    </div>
  )
}

function SummaryMetricCard({
  accent,
  icon: Icon,
  label,
  value,
}: {
  accent: 'primary' | 'success' | 'warning'
  icon: typeof ReceiptText
  label: string
  value: string
}) {
  const accentClassName =
    accent === 'success'
      ? 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-700 dark:text-emerald-300'
      : accent === 'warning'
        ? 'border-amber-500/20 bg-amber-500/[0.06] text-amber-700 dark:text-amber-300'
        : 'border-primary/20 bg-primary/[0.06] text-primary'

  return (
    <div className="min-w-0 rounded-[24px] border border-border bg-card px-4 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </div>
          <div className="break-words text-base font-semibold tracking-tight text-foreground sm:text-lg">{value}</div>
        </div>
        <div className={'flex size-10 shrink-0 items-center justify-center rounded-2xl border ' + accentClassName}>
          <Icon className="size-4" />
        </div>
      </div>
    </div>
  )
}

function DocumentStatusCard({
  emptyMessage,
  href,
  label,
  tone,
}: {
  emptyMessage: string
  href?: string
  label: string
  tone: 'default' | 'success'
}) {
  const toneClassName =
    tone === 'success'
      ? 'bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300'
      : 'bg-background/80 text-primary'
  const uploadedCardClassName = href
    ? tone === 'success'
      ? 'border-emerald-500/40 bg-emerald-500/[0.045]'
      : 'border-sky-500/34 bg-sky-500/[0.035] dark:border-cyan-400/36 dark:bg-cyan-400/[0.04]'
    : 'border-border bg-background/90'
  const interactionClassName = href
    ? 'hover:-translate-y-0.5 hover:border-primary/20 hover:bg-background hover:shadow-sm'
    : ''

  const [loading, setLoading] = useState(false)

  async function handleOpen(e: React.MouseEvent) {
    if (!href) return
    if (href.startsWith('http://') || href.startsWith('https://')) {
      return
    }

    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient()
      const parts = href.split('/')
      const bucket = parts[0]
      const path = parts.slice(1).join('/')

      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600)
      if (error || !data?.signedUrl) {
        throw new Error(error?.message || 'Error generating signed URL')
      }

      window.open(data.signedUrl, '_blank')
    } catch (err) {
      console.error('Error resolviendo URL privada:', err)
      toast.error('No se pudo abrir el documento. Es posible que no tengas permisos para ver este archivo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-w-0 rounded-2xl border px-3 py-3 transition-all duration-200 ${uploadedCardClassName} ${interactionClassName}`}>
      <div className="flex min-h-12 items-center justify-between gap-3">
        <div className="min-w-0 flex items-center gap-3">
          <div className={'flex size-9 shrink-0 items-center justify-center rounded-xl ' + toneClassName}>
            {href ? <FileCheck2 className="size-4" /> : <FileText className="size-4" />}
          </div>
          <div className="min-w-0">
            <div className="break-words text-sm font-medium leading-5 text-foreground">{label}</div>
          </div>
        </div>
        {href ? (
          <a
            href={href.startsWith('http') ? href : '#'}
            target={href.startsWith('http') ? '_blank' : undefined}
            rel="noopener noreferrer"
            onClick={href.startsWith('http') ? undefined : handleOpen}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
          </a>
        ) : (
          <span
            aria-label={emptyMessage}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-border bg-muted/15 text-muted-foreground"
          >
            <Eye className="size-4" />
          </span>
        )}
      </div>
    </div>
  )
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-border bg-muted/10 px-4 py-5 text-sm leading-6 text-muted-foreground">
      {message}
    </div>
  )
}

function buildLiquidationQRValue(payment_rail: string, to_address: string): string {
  const rail = payment_rail.toLowerCase()
  if (rail === 'solana') return `solana:${to_address}`
  if (rail === 'polygon') return `ethereum:${to_address}@137`
  if (rail === 'tron') return `tron:${to_address}`
  // ethereum y cualquier otro EVM
  return `ethereum:${to_address}`
}

function buildOrderDestinationInfo(order: PaymentOrder) {
  const meta = order.metadata as import('@/types/payment-order').PaymentOrderMetadata | undefined
  const items: Array<{ label: string; value: string }> = []
  const push = (label: string, value: unknown) => {
    if (typeof value !== 'string') return
    const normalized = value.trim()
    if (!normalized) return
    items.push({ label, value: normalized })
  }

  // 1. Campos directos del nuevo backend (prioridad)
  push('Flujo', humanizeFlowType(order.flow_type))
  push('Categoría', order.flow_category === 'interbank' ? 'Interbancario' : order.flow_category === 'wallet_ramp' ? 'Wallet Ramp' : undefined)

  if (order.flow_category === 'wallet_ramp') {
    push('Wallet Bridge', order.wallet_id)

    // ── Proveedor (si la orden tiene supplier embebido por el JOIN del admin endpoint) ──
    const supplierName = order.suppliers?.name
    if (supplierName) push('Proveedor', supplierName)

    const instr = order.bridge_source_deposit_instructions as Record<string, string> | undefined
    if (instr?.type === 'virtual_account') {
      push('Banco VA', instr.bank_name)
      push('Cuenta VA', instr.account_number)
      push('Routing Number', instr.routing_number)
      push('Titular VA', instr.account_name ?? instr.beneficiary_name)
    }
    // Instrucciones para fiat_bo_to_bridge_wallet: el PSAV debe depositar crypto en esta dirección
    if (instr?.type === 'liquidation_address') {
      push('Red (PSAV debe usar)', instr.payment_rail ?? instr.chain)
      push('Token (PSAV debe enviar)', instr.currency?.toUpperCase())
      push('Dirección de liquidación Bridge', instr.to_address ?? instr.deposit_address)
      push('Monto a depositar (bruto)', instr.amount_to_deposit ? `${instr.amount_to_deposit} ${instr.currency?.toUpperCase() ?? ''}`.trim() : undefined)
      push('Instrucción PSAV', instr.label)
    }

    // ── bridge_wallet_to_fiat_us: destino es cuenta bancaria del proveedor en Bridge ──
    if (order.flow_type === 'bridge_wallet_to_fiat_us') {
      push('Moneda de destino', order.destination_currency)
      push('Ref. cuenta Bridge', order.external_account_id)
      if (!supplierName && order.supplier_id) push('Proveedor ID', order.supplier_id.slice(0, 8))
    }

    // ── bridge_wallet_to_fiat_bo: destino es cuenta bancaria boliviana del cliente ──
    if (order.flow_type === 'bridge_wallet_to_fiat_bo') {
      push('Banco destino (cliente)', order.destination_bank_name)
      push('Cuenta destino', order.destination_account_number)
      push('Titular', order.destination_account_holder)
    }

    // ── bridge_wallet_to_crypto: dirección de crypto externa ──
    if (order.flow_type === 'bridge_wallet_to_crypto') {
      push('Dirección destino', order.destination_address)
      push('Red destino', order.destination_network)
    }

    // ── crypto_to_bridge_wallet: dirección de origen externa ──
    if (order.flow_type === 'crypto_to_bridge_wallet') {
      push('Dirección origen', order.source_address)
      push('Red origen', order.source_network)
    }
  }

  // Campos genéricos (se aplican a interbank y flujos no cubiertos arriba)
  if (order.flow_category !== 'wallet_ramp') {
    push('Banco destino', order.destination_bank_name)
    push('Cuenta destino', order.destination_account_number)
    push('Titular destino', order.destination_account_holder)
    push('Dirección destino', order.destination_address)
    push('Red destino', order.destination_network)
    push('Dirección origen', order.source_address)
    push('Red origen', order.source_network)
  }

  push('Motivo', order.business_purpose)
  push('Notas', order.notes)
  push('Remitente (VA)', order.sender_name)
  push('Referencia', order.tx_hash ?? order.provider_reference)
  if (order.failure_reason) push('Motivo de fallo', order.failure_reason)

  // 2. Fallback a metadata legacy
  if (items.length <= 4 && meta) {
    push('Ruta', humanizeOrderRoute(meta.route))
    push('Metodo de entrega', humanizeDeliveryMethod(meta.delivery_method))
    push('Variante de recepcion', humanizeReceiveVariant(meta.receive_variant))
    push('Canal de salida', humanizeUiMethodGroup(meta.ui_method_group))
    push('Destino declarado', meta.destination_address)
    push('Motivo del pago', meta.payment_reason)
    push('Funding method', humanizeFundingMethod(meta.funding_method))
    push('Fuente de instrucciones', humanizeInstructionSource(meta.instructions_source))
    push('Stablecoin', meta.stablecoin)
    push('Wallet destino', meta.crypto_destination?.address)
    push('Red', meta.crypto_destination?.network)
    push('Banco destino', meta.ach_details?.bankName ?? meta.swift_details?.bankName)
    push('Cuenta / IBAN', meta.swift_details?.iban ?? meta.ach_details?.accountNumber)
    push('Routing number', meta.ach_details?.routingNumber)
    push('Codigo SWIFT', meta.swift_details?.swiftCode)
    push('Pais del banco', meta.swift_details?.country)
    push('Direccion del banco', meta.swift_details?.bankAddress)
  }

  return items
}

function humanizeFlowType(flowType?: string) {
  switch (flowType) {
    case 'bolivia_to_world':
      return 'Bolivia al Mundo'
    case 'wallet_to_wallet':
      return 'Wallet a Wallet'
    case 'world_to_wallet':
      return 'Mundo a Wallet'
    case 'world_to_bolivia':
      return 'Mundo a Bolivia'
    case 'bolivia_to_wallet':
      return 'Bolivia a Wallet'

    case 'fiat_bo_to_bridge_wallet':
      return 'Fondeo Wallet (Bolivia)'
    case 'crypto_to_bridge_wallet':
      return 'Fondeo Wallet (Crypto)'
    case 'fiat_us_to_bridge_wallet':
      return 'Fondeo Wallet (USA)'
    case 'bridge_wallet_to_fiat_bo':
      return 'Retiro Wallet (Bolivia)'
    case 'bridge_wallet_to_crypto':
      return 'Retiro Wallet (Crypto)'
    case 'bridge_wallet_to_fiat_us':
      return 'Retiro Wallet (USA)'

    default: return flowType ?? ''
  }
}

function humanizeOrderRoute(route?: import('@/types/payment-order').PaymentOrderMetadata['route']) {
  switch (route) {
    case 'bolivia_to_exterior':
      return 'Bolivia al exterior'
    case 'us_to_bolivia':
      return 'Exterior a Bolivia'
    case 'us_to_wallet':
      return 'USA a wallet'
    case 'crypto_to_crypto':
      return 'Crypto a crypto'
    default:
      return ''
  }
}

function humanizeDeliveryMethod(method?: import('@/types/payment-order').DeliveryMethod) {
  switch (method) {
    case 'swift':
      return 'SWIFT'
    case 'ach':
      return 'ACH'
    case 'crypto':
      return 'Crypto'
    default:
      return ''
  }
}

function humanizeReceiveVariant(variant?: import('@/types/payment-order').ReceiveVariant) {
  switch (variant) {
    case 'bank_account':
      return 'Cuenta bancaria'
    case 'bank_qr':
      return 'QR bancario'
    case 'wallet':
      return 'Wallet'
    default:
      return ''
  }
}

function humanizeUiMethodGroup(group?: import('@/types/payment-order').UiMethodGroup) {
  switch (group) {
    case 'bank':
      return 'Banco'
    case 'crypto':
      return 'Crypto'
    default:
      return ''
  }
}

function humanizeFundingMethod(method?: import('@/types/payment-order').FundingMethod) {
  switch (method) {
    case 'bs':
      return 'Bolivianos'
    case 'crypto':
      return 'Crypto'
    case 'ach':
      return 'ACH'
    case 'wallet':
      return 'Wallet'
    default:
      return ''
  }
}

function humanizeInstructionSource(source?: import('@/types/payment-order').PaymentOrderMetadata['instructions_source']) {
  switch (source) {
    case 'psav':
      return 'PSAV'
    case 'guira_hardcoded':
      return 'Guira'
    case 'supplier':
      return 'Proveedor'
    default:
      return ''
  }
}

function buildOrderSummaryCards(order: PaymentOrder) {
  // Compatibilidad: campos nuevos con fallback a legacy
  const amountOrigin = order.amount ?? order.amount_origin ?? 0
  const originCurrency = order.currency ?? order.origin_currency ?? ''
  const feeTotal = order.fee_amount ?? order.fee_total ?? 0
  const orderLabel = humanizeFlowType(order.flow_type) || order.order_type || 'N/A'
  const rail = order.requires_psav ? 'PSAV' : order.flow_category === 'wallet_ramp' ? 'BRIDGE' : order.processing_rail || 'N/A'
  const amountConverted = order.amount_destination ?? order.amount_converted ?? 0
  const destCurrency = order.destination_currency ?? ''

  const cards: Array<{
    accent: 'primary' | 'success' | 'warning'
    icon: typeof ReceiptText
    label: string
    value: string
  }> = [
      {
        label: 'Monto origen',
        value: `${formatNumericValue(amountOrigin)} ${originCurrency}`,
        icon: Banknote,
        accent: 'warning',
      },
      {
        label: 'Tipo de orden',
        value: orderLabel,
        icon: ReceiptText,
        accent: 'primary',
      },
      {
        label: 'Rail operativo',
        value: rail,
        icon: Landmark,
        accent: 'primary',
      },
      {
        label: 'Tipo de cambio',
        value: formatNumericValue(order.exchange_rate_applied),
        icon: ArrowRight,
        accent: 'primary',
      },
      {
        label: 'Fee total',
        value: `${formatNumericValue(feeTotal)} ${originCurrency}`,
        icon: Wallet,
        accent: 'warning',
      },
    ]

  if (amountConverted > 0) {
    cards.splice(3, 0, {
      label: 'Monto convertido',
      value: `${formatNumericValue(amountConverted)} ${destCurrency}`,
      icon: ReceiptText,
      accent: 'success',
    })
  }

  return cards
}

function buildOrderDocumentItems(order: PaymentOrder) {
  return [
    {
      label: 'Comprobante de deposito',
      href: order.deposit_proof_url ?? order.evidence_url,
      emptyMessage: 'El cliente aun no subio comprobante de deposito.',
      tone: 'default' as const,
    },
    {
      label: 'Documento de respaldo',
      href: order.supporting_document_url ?? order.support_document_url,
      emptyMessage: 'No existe respaldo documental adjunto.',
      tone: 'default' as const,
    },
    {
      label: 'Comprobante final staff',
      href: order.receipt_url ?? order.staff_comprobante_url,
      emptyMessage: 'Todavia no se genero comprobante final del staff.',
      tone: 'success' as const,
    },
  ]
}

function getOrderStepExpectation(order: PaymentOrder) {
  switch (order.status) {
    case 'created':
    case 'waiting_deposit':
      return {
        title: 'Validar el deposito del cliente o detener la orden.',
        description:
          'En este punto se espera revisar si ya existe comprobante de deposito del cliente. Si el respaldo es correcto, procede con la validacion; si la operacion no puede continuar, marca la orden como failed.',
      }
    case 'deposit_received':
      if (order.flow_type === 'fiat_bo_to_bridge_wallet') {
        return {
          title: 'Verificar comprobante BOB y aprobar para instruir al PSAV.',
          description:
            'El cliente ha subido su comprobante de depósito en BOB. Verifica el monto con la cuenta PSAV y aprueba la orden. Al aprobar, la orden pasará a "processing" y deberás comunicar al PSAV la dirección de liquidación Bridge (visible en "Información de entrega") para que envíe el crypto.',
        }
      }
      return {
        title: 'Preparar y publicar la cotizacion final.',
        description:
          'Aqui se espera definir la tasa real, la fee total y confirmar el monto convertido final antes de mover la orden a processing.',
      }
    case 'processing': {
      // Flujos 100% automáticos: Bridge maneja todo, no requiere acción manual
      const fullyAutoFlows = ['bridge_wallet_to_crypto', 'bridge_wallet_to_fiat_us', 'crypto_to_bridge_wallet']
      if (fullyAutoFlows.includes(order.flow_type ?? '') && !order.requires_psav) {
        return {
          title: 'Transferencia en curso vía Bridge.',
          description:
            'Los fondos están siendo transferidos automáticamente por Bridge. El webhook actualizará el estado cuando se complete o falle. No se requiere acción manual.',
        }
      }
      // Flujo híbrido bridge_wallet_to_fiat_bo: Bridge completó el Tramo 1 → PSAV recibió crypto
      if (order.flow_type === 'bridge_wallet_to_fiat_bo' && !order.requires_psav) {
        return {
          title: 'PSAV debe convertir USDC a BOB y depositar al cliente.',
          description:
            'Bridge ya transfirió el crypto al PSAV. Ahora el PSAV debe convertir los fondos a bolivianos y depositarlos en la cuenta bancaria del cliente. Cuando el PSAV confirme el envío, marcar como "Enviado".',
        }
      }
      // fiat_bo_to_bridge_wallet: staff instruye al PSAV dónde depositar; Bridge cierra automáticamente
      if (order.flow_type === 'fiat_bo_to_bridge_wallet') {
        return {
          title: 'Instrucción al PSAV pendiente.',
          description:
            'Comunica al PSAV la dirección de liquidación Bridge (visible en "Información de entrega") para que deposite el crypto. Una vez que Bridge confirme la recepción, la orden se completará automáticamente vía webhook. No es necesaria ninguna acción manual adicional.',
        }
      }
      if (order.flow_type === 'bolivia_to_wallet') {
        return {
          title: 'Depositar crypto en la liquidation address del proveedor.',
          description:
            'El PSAV debe enviar el monto equivalente en crypto a la dirección de la liquidation address mostrada en el QR/datos de la sección "Depósito USDC para Bridge". Bridge confirmará la recepción y la orden se completará automáticamente vía webhook. No se requiere acción manual adicional.',
        }
      }
      return {
        title: 'Registrar la salida de la operacion.',
        description:
          'Cuando la transferencia o envio ya fue ejecutado, registra la referencia correspondiente para mover la orden a sent.',
      }
    }
    case 'sent':
      return {
        title: 'Cerrar el expediente con el comprobante final.',
        description:
          'En esta etapa se espera adjuntar el comprobante final generado por staff para completar la orden y cerrar el proceso.',
      }
    case 'completed':
      return {
        title: 'La orden ya fue completada.',
        description:
          'No se esperan nuevas acciones operativas sobre esta orden desde este modal. Solo queda disponible la consulta de la informacion registrada.',
      }
    case 'failed':
      return {
        title: 'La orden fue detenida.',
        description:
          'Esta orden ya esta marcada como failed. La seccion se mantiene como referencia para entender en que punto quedo el expediente y consultar sus respaldos.',
      }
    case 'cancelled':
      return {
        title: 'La orden fue cancelada.',
        description:
          'El usuario o el sistema ha cancelado esta orden antes de que pudiera progresar.',
      }
    case 'swept_external':
      return {
        title: 'Fondos barridos externamente.',
        description:
          'Los fondos han sido barridos por un servicio externo (como Bridge). Es un estado terminal automático.',
      }
    default:
      return {
        title: 'Sin acciones disponibles.',
        description: 'La orden se encuentra en un estado que no requiere accion operativa.'
      }
  }
}

function humanizeOrderStatus(status: PaymentOrder['status']) {
  switch (status) {
    case 'created':
      return 'Creada'
    case 'waiting_deposit':
      return 'Esperando deposito'
    case 'deposit_received':
      return 'Deposito validado'
    case 'processing':
      return 'Processing'
    case 'sent':
      return 'Sent'
    case 'completed':
      return 'Completada'
    case 'failed':
      return 'Failed'
    case 'cancelled':
      return 'Cancelada'
    case 'swept_external':
      return 'Barrida (Ext)'
    default:
      return status ?? 'Desconocida'
  }
}

function formatOrderDate(value?: string) {
  if (!value) return 'Sin fecha'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return format(date, 'dd/MM/yyyy HH:mm')
}

function formatNumericValue(value: unknown) {
  const normalized = normalizeNumericValue(value)
  return normalized.toLocaleString('en-US', {
    minimumFractionDigits: normalized % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })
}
function OrderReasonActionDialog({ actor, action, blockedReason, label, onUpdated, order }: { actor: StaffActor; action: 'failed'; blockedReason?: string | null; label: string; onUpdated: (order: PaymentOrder) => Promise<void> | void; order: PaymentOrder }) {
  const [open, setOpen] = useState(false)
  const form = useForm<StaffReasonValues>({
    resolver: zodResolver(staffReasonSchema),
    defaultValues: { reason: '', notify_user: true }
  })

  async function submit(values: StaffReasonValues) {
    try {
      const updatedOrder = await StaffService.failPaymentOrder({ actor, order, reason: values.reason, notifyUser: values.notify_user })
      toast.success('Orden actualizada.')
      setOpen(false)
      form.reset({ reason: '', notify_user: true })
      await onUpdated(updatedOrder)
    } catch (error) {
      console.error('Failed to update payment order', error)
      toast.error('No se pudo actualizar la orden.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="h-10 px-4 text-sm font-semibold text-destructive hover:text-destructive hover:bg-destructive/10" disabled={Boolean(blockedReason)} variant="ghost" />}>{label}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>
            {blockedReason
              ? `${blockedReason} Sube o verifica el archivo antes de continuar.`
              : 'La accion usa optimistic lock, registra auditoria y notifica al cliente cuando el deposito queda validado por staff.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
            <FormField control={form.control} name="notify_user" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Notificar al cliente</FormLabel>
                  <DialogDescription>Se enviara un email al cliente indicando el fallo de la orden.</DialogDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="reason" render={({ field }) => (
              <FormItem>
                <FormLabel>Motivo</FormLabel>
                <DynamicQuickComments category="failed" onSelect={(c) => form.setValue('reason', c, { shouldValidate: true })} />
                <FormControl><Textarea {...field} placeholder="Describe la accion realizada" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter><Button disabled={form.formState.isSubmitting} type="submit">{form.formState.isSubmitting ? 'Guardando...' : 'Confirmar'}</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function OrderQuoteDialog({ actor, onUpdated, order }: { actor: StaffActor; onUpdated: (order: PaymentOrder) => Promise<void> | void; order: PaymentOrder }) {
  const [open, setOpen] = useState(false)
  const form = useForm<StaffOrderProcessingValues>({
    resolver: zodResolver(staffOrderProcessingSchema) as Resolver<StaffOrderProcessingValues>,
    defaultValues: {
      exchange_rate_applied: order.exchange_rate_applied ?? 1,
      amount_converted: order.amount_converted ?? order.amount_destination ?? 0,
      fee_total: order.fee_amount ?? order.fee_total ?? 0,
      reason: ''
    },
  })
  const exchangeRateApplied = useWatch({ control: form.control, name: 'exchange_rate_applied' })
  const feeTotal = useWatch({ control: form.control, name: 'fee_total' })
  const quotedAmountConverted = calculateQuotedAmountConverted(order.amount_origin ?? order.amount ?? 0, exchangeRateApplied, feeTotal, order.currency ?? 'BOB')

  async function submit(values: StaffOrderProcessingValues) {
    try {
      const updatedOrder = await StaffService.preparePaymentOrderQuote({
        actor,
        order,
        reason: values.reason,
        exchangeRateApplied: values.exchange_rate_applied,
        amountConverted: quotedAmountConverted,
        feeTotal: values.fee_total,
      })
      toast.success('Cotizacion final publicada y orden movida a processing.')
      setOpen(false)
      await onUpdated(updatedOrder)
    } catch (error) {
      console.error('Failed to prepare order quote', error)
      toast.error('No se pudo preparar la cotizacion final.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="h-10 px-5 text-sm font-semibold" variant="default" />}>Aprobar Parcial</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar cotizacion</DialogTitle>
          <DialogDescription>Verifica que el tipo de cambio, el monto convertido y la comision sean correctos antes de mover la orden a `processing`.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
            <ProcessingNumberField control={form.control} label="Tipo de cambio" name="exchange_rate_applied" readOnly description="Tasa de cambio aplicada al crear la orden." />
            <div className="space-y-2">
              <Label>Monto convertido</Label>
              <Input className="bg-muted/40 font-medium" readOnly type="number" value={quotedAmountConverted} />
              <p className="text-xs text-muted-foreground">Valor derivado automaticamente del monto origen, tipo de cambio y fee.</p>
            </div>
            <ProcessingNumberField control={form.control} label="Fee total" name="fee_total" readOnly description="Comision calculada al crear la orden." />
            <FormField control={form.control} name="reason" render={({ field }) => (
              <FormItem>
                <FormLabel>Motivo</FormLabel>
                <DynamicQuickComments category="quote" onSelect={(c) => form.setValue('reason', c, { shouldValidate: true })} />
                <FormControl><Textarea {...field} placeholder="Resume la validacion realizada" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter><Button disabled={form.formState.isSubmitting} type="submit">{form.formState.isSubmitting ? 'Guardando...' : 'Confirmar cotizacion'}</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function OrderSentDialog({ actor, onUpdated, order }: { actor: StaffActor; onUpdated: (order: PaymentOrder) => Promise<void> | void; order: PaymentOrder }) {
  const [open, setOpen] = useState(false)
  const currentReference = typeof order.metadata === 'object' && order.metadata && 'reference' in order.metadata ? String(order.metadata.reference ?? '') : ''
  const form = useForm<StaffOrderSentValues>({ resolver: zodResolver(staffOrderSentSchema), defaultValues: { reference: currentReference, provider_reference: '', reason: '' } })

  async function submit(values: StaffOrderSentValues) {
    try {
      const updatedOrder = await StaffService.advancePaymentOrderToSent({ actor, order, reason: values.reason, reference: values.reference, providerReference: values.provider_reference })
      toast.success('Orden movida a sent.')
      setOpen(false)
      await onUpdated(updatedOrder)
    } catch (error) {
      console.error('Failed to move order to sent', error)
      toast.error('No se pudo mover la orden a sent.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="h-10 px-5 text-sm font-semibold" variant="default" />}>Registrar sent</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar referencia</DialogTitle>
          <DialogDescription>La referencia o hash se fusiona dentro de `metadata.reference`.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
            <FormField control={form.control} name="reference" render={({ field }) => (
              <FormItem>
                <FormLabel>Hash / TxID (Visible al cliente)</FormLabel>
                <FormControl><Input {...field} placeholder="Identificador publico de la transaccion" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="provider_reference" render={({ field }) => (
              <FormItem>
                <FormLabel>Referencia interna PSAV (Opcional)</FormLabel>
                <FormControl><Input {...field} placeholder="Código o referencia interna provista por el PSAV" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="reason" render={({ field }) => (
              <FormItem>
                <FormLabel>Motivo</FormLabel>
                <DynamicQuickComments category="sent" onSelect={(c) => form.setValue('reason', c, { shouldValidate: true })} />
                <FormControl><Textarea {...field} placeholder="Contexto del envio" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter><Button disabled={form.formState.isSubmitting} type="submit">{form.formState.isSubmitting ? 'Guardando...' : 'Actualizar orden'}</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function OrderCompletionDialog({ actor, onUpdated, order }: { actor: StaffActor; onUpdated: (order: PaymentOrder) => Promise<void> | void; order: PaymentOrder }) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const form = useForm<StaffOrderCompletionValues>({ resolver: zodResolver(staffOrderCompletionSchema), defaultValues: { reason: '' } })

  async function submit(values: StaffOrderCompletionValues) {
    if (!file) {
      toast.error('Adjunta el comprobante final antes de completar la orden.')
      return
    }

    try {
      const updatedOrder = await StaffService.advancePaymentOrderToCompleted({ actor, order, reason: values.reason, comprobanteFile: file })
      toast.success('Orden completada.')
      setOpen(false)
      setFile(null)
      await onUpdated(updatedOrder)
    } catch (error) {
      console.error('Failed to complete order', error)
      toast.error('No se pudo completar la orden.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="h-10 px-5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90" variant="default" />}>Completar Orden</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Completar orden</DialogTitle>
          <DialogDescription>Sube el comprobante final a `staff_comprobante_url` y cierra el expediente.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
            <div className="space-y-2">
              <DocumentUploadCard
                accept={ACCEPTED_UPLOADS}
                className="rounded-2xl"
                file={file}
                helperText="Arrastra el comprobante final o haz click para seleccionarlo."
                label="Comprobante final"
                onFileChange={setFile}
              />
            </div>
            <FormField control={form.control} name="reason" render={({ field }) => (
              <FormItem>
                <FormLabel>Motivo</FormLabel>
                <DynamicQuickComments category="completed" onSelect={(c) => form.setValue('reason', c, { shouldValidate: true })} />
                <FormControl><Textarea {...field} placeholder="Detalle del cierre de expediente" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter><Button disabled={form.formState.isSubmitting} type="submit">{form.formState.isSubmitting ? 'Guardando...' : 'Completar orden'}</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function ProcessingNumberField({
  control,
  description,
  label,
  name,
  readOnly = false,
}: {
  control: Control<StaffOrderProcessingValues>
  description?: string
  label: string
  name: 'exchange_rate_applied' | 'amount_converted' | 'fee_total'
  readOnly?: boolean
}) {
  return (
    <FormField control={control} name={name} render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <FormControl>
          <Input
            {...field}
            className={readOnly ? 'bg-muted/40 font-medium' : undefined}
            min={0}
            readOnly={readOnly}
            step="0.01"
            type="number"
          />
        </FormControl>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        <FormMessage />
      </FormItem>
    )} />
  )
}

function getOrderActions(order: PaymentOrder) {
  // Flujos 100% automatizados por Bridge (no requieren admin pipeline)
  const fullyAutoFlows = ['bridge_wallet_to_crypto', 'bridge_wallet_to_fiat_us', 'wallet_to_wallet', 'crypto_to_bridge_wallet']
  if (fullyAutoFlows.includes(order.flow_type ?? '') && !order.requires_psav) {
    if (['created', 'processing'].includes(order.status)) {
      return ['failed'] as const
    }
    return [] as const
  }

  // bridge_wallet_to_fiat_bo: flujo híbrido (Bridge auto Tramo 1 + PSAV manual Tramo 2)
  // El pipeline sent→completed sigue activo para que staff gestione el payout BOB

  switch (order.status) {
    case 'created':
      // Solo el usuario puede confirmar su depósito (POST /payment-orders/:id/confirm-deposit).
      // Staff solo puede fallar la orden en este estado.
      return ['failed'] as const
    case 'waiting_deposit':
      // El usuario debe confirmar su depósito primero.
      // Staff solo puede fallar la orden en este estado.
      return ['failed'] as const
    case 'deposit_received':
      // Staff valida el depósito y aprueba → pasa a processing.
      return ['quote', 'failed'] as const
    case 'processing':
      // Flujos webhook-driven: la transición a completed la hace Bridge automáticamente
      if (['fiat_bo_to_bridge_wallet', 'bolivia_to_world', 'bolivia_to_wallet'].includes(order.flow_type ?? '')) {
        return ['failed'] as const
      }
      return ['sent', 'failed'] as const
    case 'sent':
      return ['completed', 'failed'] as const
    default:
      return [] as const
  }
}

function hasClientDepositEvidence(order: PaymentOrder) {
  return typeof order.evidence_url === 'string' && order.evidence_url.trim().length > 0
}

function getOnboardingActionLabel(status: StaffOnboardingActionValues['status']) {
  switch (status) {
    case 'approved':
      return 'Enviar a Bridge'
    case 'in_review':
      return 'Solicitar Correcciones'
    case 'rejected':
      return 'Rechazar'
  }
}

function getOnboardingActionDescription(status: StaffOnboardingActionValues['status']) {
  switch (status) {
    case 'approved':
      return 'Los datos serán enviados a Bridge para verificación KYC/KYB. La aprobación final depende de la respuesta de Bridge vía webhook. El review permanece abierto hasta recibir confirmación.'
    case 'in_review':
      return 'El cliente recibirá una notificación con tu mensaje y podrá editar su formulario para corregir los datos. El wizard le mostrará tus observaciones como un banner de alerta. El review permanece abierto.'
    case 'rejected':
      return 'El expediente se cerrará permanentemente. El cliente NO podrá re-enviar su solicitud y recibirá una notificación de rechazo.'
  }
}

function getOnboardingActionPlaceholder(status: StaffOnboardingActionValues['status']) {
  switch (status) {
    case 'approved':
      return 'Describe la validación realizada antes de enviar a Bridge'
    case 'in_review':
      return 'Indica al cliente qué debe corregir. Ej: "Suba nuevamente su documento de identidad en mejor resolución"'
    case 'rejected':
      return 'Explica el motivo del rechazo definitivo'
  }
}

// ONBOARDING_QUICK_COMMENTS: migrated to rejection_templates table (Fase 2)
// Templates are now fetched dynamically via useDynamicQuickComments hook.

function calculateQuotedAmountConverted(amountOrigin: number, exchangeRateApplied: number, feeTotal: number, sourceCurrency: string) {
  const safeAmountOrigin = normalizeNumericValue(amountOrigin)
  const safeExchangeRateApplied = normalizeNumericValue(exchangeRateApplied)
  const safeFeeTotal = normalizeNumericValue(feeTotal)
  const netAmount = Math.max(safeAmountOrigin - safeFeeTotal, 0)
  // La tasa siempre es "BOB por 1 USD" → BOB→USD: dividir; USD→BOB: multiplicar
  const grossConverted = sourceCurrency === 'BOB'
    ? netAmount / Math.max(safeExchangeRateApplied, 0.000001)
    : netAmount * safeExchangeRateApplied
  return Math.round(Math.max(grossConverted, 0) * 100) / 100
}

function normalizeNumericValue(value: unknown) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return 0
    const normalized = Number(trimmed.replace(',', '.'))
    return Number.isFinite(normalized) ? normalized : 0
  }

  return 0
}

// QUICK_COMMENTS: migrated to rejection_templates table (Fase 2)
// Templates are now fetched dynamically via DynamicQuickComments component.

/** Wrapper component that fetches comments dynamically and renders QuickCommentsList */
function DynamicQuickComments({ category, onSelect }: { category: string; onSelect: (comment: string) => void }) {
  const comments = useDynamicQuickComments(category)
  if (comments.length === 0) return null
  return <QuickCommentsList comments={comments} onSelect={onSelect} />
}

function QuickCommentsList({
  comments,
  onSelect,
}: {
  comments: string[]
  onSelect: (comment: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-3 mt-1">
      {comments.map((comment, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onSelect(comment)}
          className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80"
        >
          {comment}
        </button>
      ))}
    </div>
  )
}


