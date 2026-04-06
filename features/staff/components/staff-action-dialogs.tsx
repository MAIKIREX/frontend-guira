'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useForm, useWatch, type Control, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  ArrowRight,
  Banknote,
  Eye,
  FileCheck2,
  FileText,
  Landmark,
  ReceiptText,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DocumentUploadCard } from '@/components/shared/document-upload-card'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
} from '@/features/staff/schemas/staff-actions.schema'
import { StaffService } from '@/services/staff.service'
import { ACCEPTED_UPLOADS } from '@/lib/file-validation'
import type { StaffActor, StaffOnboardingRecord, StaffSupportTicket } from '@/types/staff'
import type { PaymentOrder } from '@/types/payment-order'

export function OnboardingActions({ actor, record, onUpdated }: { actor: StaffActor; record: StaffOnboardingRecord; onUpdated: (record: StaffOnboardingRecord) => Promise<void> | void }) {
  const availableStatuses = useMemo(() => {
    const statuses: StaffOnboardingActionValues['status'][] = []
    if (record.status !== 'approved') statuses.push('approved')
    if (record.status !== 'in_review') statuses.push('in_review')
    if (record.status !== 'rejected') statuses.push('rejected')
    return statuses
  }, [record.status])

  if (availableStatuses.length === 0) return null

  return (
    <div className="flex flex-wrap justify-end gap-2">
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

  async function submit(values: StaffOnboardingActionValues) {
    try {
      const updatedRecord = await StaffService.updateOnboardingStatus({ actor, record, status: values.status, reason: values.reason })
      toast.success('Onboarding actualizado.')
      setOpen(false)
      form.reset({ status: defaultStatus, reason: '' })
      await onUpdated(updatedRecord)
    } catch (error) {
      console.error('Failed to update onboarding status', error)
      toast.error('No se pudo actualizar el onboarding.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>{getOnboardingActionLabel(defaultStatus)}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{getOnboardingActionLabel(defaultStatus)}</DialogTitle>
          <DialogDescription>Esta accion registra auditoria, sincroniza `profiles.onboarding_status` y notifica al cliente.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
            <FormField control={form.control} name="reason" render={({ field }) => (
              <FormItem>
                <FormLabel>Motivo</FormLabel>
                <FormControl><Textarea {...field} placeholder="Explica el cambio de estado" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button disabled={form.formState.isSubmitting} type="submit">{form.formState.isSubmitting ? 'Guardando...' : 'Confirmar'}</Button>
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
  const blockedDepositReason = !hasClientDepositEvidence(order)
    ? 'No puedes validar el deposito porque el cliente aun no subio su comprobante.'
    : null
  if (actions.size === 0) return null

  return (
    <div className="flex flex-wrap gap-3 xl:justify-end">
      {actions.has('deposit_received') ? (
        <OrderReasonActionDialog
          actor={actor}
          action="deposit_received"
          blockedReason={blockedDepositReason}
          label="Validar deposito del cliente"
          onUpdated={onUpdated}
          order={order}
        />
      ) : null}
      {actions.has('quote') ? <OrderQuoteDialog actor={actor} onUpdated={onUpdated} order={order} /> : null}
      {actions.has('sent') ? <OrderSentDialog actor={actor} onUpdated={onUpdated} order={order} /> : null}
      {actions.has('completed') ? <OrderCompletionDialog actor={actor} onUpdated={onUpdated} order={order} /> : null}
      {actions.has('failed') ? <OrderReasonActionDialog actor={actor} action="failed" label="Marcar failed" onUpdated={onUpdated} order={order} /> : null}
    </div>
  )
}

function getPaymentStatusColor(status: string) {
  if (status === 'created' || status === 'waiting_deposit' || status === 'requires_quote_approval') return 'bg-amber-400/15 text-amber-700 dark:text-amber-300'
  if (status === 'deposit_received' || status === 'processing' || status === 'sent') return 'bg-cyan-400/15 text-sky-700 dark:text-cyan-300'
  if (status === 'completed') return 'bg-emerald-400/15 text-emerald-700 dark:text-emerald-300'
  return 'bg-red-500/15 text-red-700 dark:text-red-300'
}

export function OrderDetailDialog({ actor, onUpdated, order }: { actor: StaffActor; onUpdated: (order: PaymentOrder) => Promise<void> | void; order: PaymentOrder }) {
  const meta = order.metadata as import('@/types/payment-order').PaymentOrderMetadata | undefined
  const destinationInfo = buildOrderDestinationInfo(meta)
  const summaryCards = buildOrderSummaryCards(order)
  const documentItems = buildOrderDocumentItems(order)
  const stepExpectation = getOrderStepExpectation(order)

  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="secondary" />}>Gestionar Orden</DialogTrigger>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1rem)] max-w-none overflow-x-hidden overflow-y-auto border border-border bg-background p-0 shadow-xl sm:max-w-none sm:w-[min(95vw,1100px)] lg:w-[min(92vw,1240px)]">
        <DialogHeader className="gap-4 border-b border-border bg-muted/10 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="flex min-w-0 flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary shadow-sm">
                <ReceiptText className="size-5" />
              </div>
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
                    Gestion de Orden #{order.id.slice(0, 8)}
                  </DialogTitle>
                  <span className={"rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] " + getPaymentStatusColor(order.status)}>
                    {humanizeOrderStatus(order.status)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                  <span>Creada: {formatOrderDate(order.created_at)}</span>
                  <span>Actualizada: {formatOrderDate(order.updated_at)}</span>
                  <span>Rail: {order.processing_rail}</span>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-6 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 2xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,360px)]">
          <div className="min-w-0 space-y-6">
            <section className="space-y-4">
              <SectionHeading
                eyebrow="Detalle transaccional"
                title="Estado operativo de la orden"
                description="La informacion mostrada aqui sale de la orden actual y se mantiene sincronizada con las mismas transiciones ya definidas."
              />
              <div className="grid min-w-0 gap-3 md:grid-cols-2 2xl:grid-cols-3">
                {summaryCards.map((card) => (
                  <SummaryMetricCard
                    key={card.label}
                    accent={card.accent}
                    icon={card.icon}
                    label={card.label}
                    value={card.value}
                  />
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <SectionHeading
                eyebrow="Destino"
                title="Informacion de entrega"
                description="Solo se muestran los campos de destino que esta orden ya tiene cargados en metadata."
              />
              {destinationInfo.length > 0 ? (
                <div className="overflow-hidden rounded-[28px] border border-border bg-card shadow-sm">
                  {destinationInfo.map((item) => (
                    <div
                      key={item.label}
                      className="flex flex-col gap-2 border-b border-border/55 px-4 py-4 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
                    >
                      <span className="block shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:w-48">
                        {item.label}
                      </span>
                      <span className="block break-words text-sm font-medium leading-6 text-foreground sm:text-right">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyPanel message="Esta orden todavia no tiene informacion de destino registrada en metadata." />
              )}
            </section>

          </div>

          <aside className="min-w-0 space-y-4">
            <section className="rounded-[28px] bg-transparent p-4">
              <SectionHeading
                eyebrow="Documentos"
                title="Respaldo y comprobantes"
              />
              <div className="mt-4 space-y-3">
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
            </section>

            <section className="rounded-[28px] bg-transparent p-4">
              <SectionHeading
                eyebrow="Paso actual"
                title="Que se espera realizar"
              />
              <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/[0.05] px-4 py-4">
                <div className="text-sm font-medium text-foreground">
                  {stepExpectation.title}
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {stepExpectation.description}
                </p>
              </div>
            </section>

            <section className="rounded-[28px] bg-transparent p-4">
              <SectionHeading eyebrow="Acciones" title="Gestion operativa" />
              <div className="mt-4">
                <div className="flex flex-col gap-3">
                  <OrderActions actor={actor} onUpdated={onUpdated} order={order} />
                </div>
              </div>
            </section>
          </aside>
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
            aria-label={`Ver ${label}`}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-primary transition-colors hover:bg-muted"
            href={href}
            rel="noreferrer"
            target="_blank"
          >
            <Eye className="size-4" />
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

function buildOrderDestinationInfo(meta?: import('@/types/payment-order').PaymentOrderMetadata) {
  if (!meta) return []

  const items: Array<{ label: string; value: string }> = []
  const push = (label: string, value: unknown) => {
    if (typeof value !== 'string') return
    const normalized = value.trim()
    if (!normalized) return
    items.push({ label, value: normalized })
  }

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

  return items
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
  const cards: Array<{
    accent: 'primary' | 'success' | 'warning'
    icon: typeof ReceiptText
    label: string
    value: string
  }> = [
      {
        label: 'Monto origen',
        value: `${formatNumericValue(order.amount_origin)} ${order.origin_currency}`,
        icon: Banknote,
        accent: 'warning',
      },
      {
        label: 'Tipo de orden',
        value: order.order_type,
        icon: ReceiptText,
        accent: 'primary',
      },
      {
        label: 'Rail operativo',
        value: order.processing_rail,
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
        value: `${formatNumericValue(order.fee_total)} ${order.origin_currency}`,
        icon: Wallet,
        accent: 'warning',
      },
    ]

  if (order.amount_converted > 0) {
    cards.splice(3, 0, {
      label: 'Monto convertido',
      value: `${formatNumericValue(order.amount_converted)} ${order.destination_currency}`,
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
      href: order.evidence_url,
      emptyMessage: 'El cliente aun no subio comprobante de deposito.',
      tone: 'default' as const,
    },
    {
      label: 'Documento de respaldo',
      href: order.support_document_url,
      emptyMessage: 'No existe respaldo documental adjunto.',
      tone: 'default' as const,
    },
    {
      label: 'Comprobante final staff',
      href: order.staff_comprobante_url,
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
      return {
        title: 'Preparar y publicar la cotizacion final.',
        description:
          'Aqui se espera definir la tasa real, la fee total y confirmar el monto convertido final antes de mover la orden a processing.',
      }
    case 'processing':
      return {
        title: 'Registrar la salida de la operacion.',
        description:
          'Cuando la transferencia o envio ya fue ejecutado, registra la referencia correspondiente para mover la orden a sent.',
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
function OrderReasonActionDialog({ actor, action, blockedReason, label, onUpdated, order }: { actor: StaffActor; action: 'deposit_received' | 'failed'; blockedReason?: string | null; label: string; onUpdated: (order: PaymentOrder) => Promise<void> | void; order: PaymentOrder }) {
  const [open, setOpen] = useState(false)
  const form = useForm<{ reason: string }>({ resolver: zodResolver(staffReasonSchema), defaultValues: { reason: '' } })

  async function submit(values: { reason: string }) {
    try {
      if (action === 'deposit_received') {
        const updatedOrder = await StaffService.advancePaymentOrderToDepositReceived({ actor, order, reason: values.reason })
        toast.success('Orden actualizada.')
        setOpen(false)
        form.reset({ reason: '' })
        await onUpdated(updatedOrder)
      } else {
        const updatedOrder = await StaffService.failPaymentOrder({ actor, order, reason: values.reason })
        toast.success('Orden actualizada.')
        setOpen(false)
        form.reset({ reason: '' })
        await onUpdated(updatedOrder)
      }
    } catch (error) {
      console.error('Failed to update payment order', error)
      toast.error('No se pudo actualizar la orden.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="min-h-12 w-full justify-center px-4 text-sm font-semibold sm:w-auto" disabled={Boolean(blockedReason)} variant="outline" />}>{label}</DialogTrigger>
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
            <FormField control={form.control} name="reason" render={({ field }) => (
              <FormItem>
                <FormLabel>Motivo</FormLabel>
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
    defaultValues: { exchange_rate_applied: order.exchange_rate_applied, amount_converted: order.amount_converted, fee_total: order.fee_total, reason: '' },
  })
  const exchangeRateApplied = useWatch({ control: form.control, name: 'exchange_rate_applied' })
  const feeTotal = useWatch({ control: form.control, name: 'fee_total' })
  const quotedAmountConverted = calculateQuotedAmountConverted(order.amount_origin, exchangeRateApplied, feeTotal)

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
      <DialogTrigger render={<Button className="min-h-12 w-full justify-center px-4 text-sm font-semibold sm:w-auto" variant="outline" />}>Preparar cotizacion</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publicar cotizacion final</DialogTitle>
          <DialogDescription>Define la tasa real, el monto final y la comision. Al publicarla, la orden pasa inmediatamente a `processing`.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
            <ProcessingNumberField control={form.control} label="Tipo de cambio" name="exchange_rate_applied" />
            <div className="space-y-2">
              <Label>Monto convertido</Label>
              <Input className="bg-muted/40 font-medium" readOnly type="number" value={quotedAmountConverted} />
              <p className="text-xs text-muted-foreground">Se calcula automaticamente segun el monto origen, el tipo de cambio y la fee total. Solo se guarda al publicar la cotizacion.</p>
            </div>
            <ProcessingNumberField control={form.control} label="Fee total" name="fee_total" />
            <FormField control={form.control} name="reason" render={({ field }) => (
              <FormItem>
                <FormLabel>Motivo</FormLabel>
                <FormControl><Textarea {...field} placeholder="Resume la validacion realizada" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter><Button disabled={form.formState.isSubmitting} type="submit">{form.formState.isSubmitting ? 'Guardando...' : 'Publicar cotizacion'}</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function OrderSentDialog({ actor, onUpdated, order }: { actor: StaffActor; onUpdated: (order: PaymentOrder) => Promise<void> | void; order: PaymentOrder }) {
  const [open, setOpen] = useState(false)
  const currentReference = typeof order.metadata === 'object' && order.metadata && 'reference' in order.metadata ? String(order.metadata.reference ?? '') : ''
  const form = useForm<StaffOrderSentValues>({ resolver: zodResolver(staffOrderSentSchema), defaultValues: { reference: currentReference, reason: '' } })

  async function submit(values: StaffOrderSentValues) {
    try {
      const updatedOrder = await StaffService.advancePaymentOrderToSent({ actor, order, reason: values.reason, reference: values.reference })
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
      <DialogTrigger render={<Button className="min-h-12 w-full justify-center px-4 text-sm font-semibold sm:w-auto" variant="outline" />}>Registrar sent</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar referencia</DialogTitle>
          <DialogDescription>La referencia o hash se fusiona dentro de `metadata.reference`.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
            <FormField control={form.control} name="reference" render={({ field }) => (
              <FormItem>
                <FormLabel>Referencia</FormLabel>
                <FormControl><Input {...field} placeholder="Hash o referencia bancaria" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="reason" render={({ field }) => (
              <FormItem>
                <FormLabel>Motivo</FormLabel>
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
      <DialogTrigger render={<Button className="min-h-12 w-full justify-center px-4 text-sm font-semibold sm:w-auto" variant="outline" />}>Completar orden</DialogTrigger>
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
  switch (order.status) {
    case 'created':
      return ['deposit_received', 'failed'] as const
    case 'waiting_deposit':
      return ['deposit_received', 'failed'] as const
    case 'deposit_received':
      return ['quote', 'failed'] as const
    case 'processing':
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
      return 'Aprobar'
    case 'in_review':
      return 'En revision'
    case 'rejected':
      return 'Rechazar'
  }
}

function calculateQuotedAmountConverted(amountOrigin: number, exchangeRateApplied: number, feeTotal: number) {
  const safeAmountOrigin = normalizeNumericValue(amountOrigin)
  const safeExchangeRateApplied = normalizeNumericValue(exchangeRateApplied)
  const safeFeeTotal = normalizeNumericValue(feeTotal)
  const grossConverted = Math.max((safeAmountOrigin - safeFeeTotal) * safeExchangeRateApplied, 0)
  return Math.round(grossConverted * 100) / 100
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

