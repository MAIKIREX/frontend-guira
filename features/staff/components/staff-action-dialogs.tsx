'use client'

import { useMemo, useState } from 'react'
import { useForm, useWatch, type Control, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FileDropzone } from '@/components/shared/file-dropzone'
import { Textarea } from '@/components/ui/textarea'
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
    if (record.status !== 'verified') statuses.push('verified')
    if (record.status !== 'needs_changes') statuses.push('needs_changes')
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
          <div><span className="text-muted-foreground">Estado Actual:</span> <span className={"font-semibold lowercase px-2 py-0.5 rounded-full " + (record.status === 'verified' ? 'bg-emerald-400/15 text-emerald-100' : record.status === 'rejected' ? 'bg-red-500/15 text-red-100' : 'bg-amber-400/15 text-amber-100')}>{record.status}</span></div>
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
                  <select className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm" value={field.value} onChange={(event) => field.onChange(event.target.value)}>
                    <option value="open">open</option>
                    <option value="in_progress">in_progress</option>
                    <option value="resolved">resolved</option>
                    <option value="closed">closed</option>
                  </select>
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
    <div className="flex flex-wrap justify-end gap-2">
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
  if (status === 'created' || status === 'waiting_deposit' || status === 'requires_quote_approval') return 'bg-amber-400/15 text-amber-100'
  if (status === 'deposit_received' || status === 'processing' || status === 'sent') return 'bg-cyan-400/15 text-cyan-100'
  if (status === 'completed') return 'bg-emerald-400/15 text-emerald-100'
  return 'bg-red-500/15 text-red-100'
}

export function OrderDetailDialog({ actor, onUpdated, order }: { actor: StaffActor; onUpdated: (order: PaymentOrder) => Promise<void> | void; order: PaymentOrder }) {
  const meta = order.metadata as import('@/types/payment-order').PaymentOrderMetadata | undefined
  const destinationInfo = buildOrderDestinationInfo(meta)

  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="secondary" />}>Gestionar Orden</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="mb-2">
          <div className="flex items-center justify-between">
            <DialogTitle>Gestion de Orden #{order.id.slice(0, 8)}</DialogTitle>
            <span className={"text-xs px-3 py-1 font-semibold uppercase rounded " + getPaymentStatusColor(order.status)}>
              {order.status}
            </span>
          </div>
          <DialogDescription>Controla el ciclo de vida del expediente y valida respaldo, comprobante del cliente y avance operativo.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2 text-sm">
          <div className="space-y-3">
            <h4 className="font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1 text-xs">Detalle Transaccional</h4>
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-muted-foreground block text-xs">Tipo de Orden</span> <span className="font-medium">{order.order_type}</span></div>
              <div><span className="text-muted-foreground block text-xs">Riel de Proc.</span> <span className="font-medium">{order.processing_rail}</span></div>
              <div>
                <span className="text-muted-foreground block text-xs">Monto Origen</span>
                <span className="font-medium text-lg">{order.amount_origin} {order.origin_currency}</span>
              </div>
              {order.amount_converted > 0 && (
                <div>
                  <span className="text-muted-foreground block text-xs">Monto Convertido</span>
                  <span className="font-medium text-lg text-emerald-400">{order.amount_converted} {order.destination_currency}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1 text-xs">Informacion de Destino</h4>
            {destinationInfo.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {destinationInfo.map((item) => (
                  <div key={item.label} className="rounded-xl border border-border/60 bg-muted/20 px-3 py-3">
                    <span className="text-muted-foreground block text-xs">{item.label}</span>
                    <span className="mt-1 block font-medium break-words">{item.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-3 py-3 text-xs text-muted-foreground">
                Esta orden todavia no tiene informacion de destino registrada en metadata.
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1 text-xs">Respaldo y comprobantes</h4>
            <div className="grid gap-2">
              {order.evidence_url ? (
                <a href={order.evidence_url} target="_blank" rel="noreferrer" className="flex items-center text-cyan-300 hover:underline">
                  Ver Comprobante de Deposito (Cliente)
                </a>
              ) : (
                <span className="text-muted-foreground text-xs">Sin comprobante de deposito.</span>
              )}
              {order.support_document_url ? (
                <a href={order.support_document_url} target="_blank" rel="noreferrer" className="flex items-center text-cyan-300 hover:underline">
                  Ver Documento de Respaldo
                </a>
              ) : (
                <span className="text-muted-foreground text-xs">Sin respaldo documental.</span>
              )}
              {order.staff_comprobante_url ? (
                <a href={order.staff_comprobante_url} target="_blank" rel="noreferrer" className="flex items-center text-emerald-400 hover:underline">
                  Comprobante Final (Staff)
                </a>
              ) : null}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6 border-t pt-4 sm:justify-between items-center">
          <span className="text-xs text-muted-foreground">Acciones Habilitadas:</span>
          <OrderActions actor={actor} onUpdated={onUpdated} order={order} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
      <DialogTrigger render={<Button disabled={Boolean(blockedReason)} size="sm" variant="outline" />}>{label}</DialogTrigger>
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
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Preparar cotizacion</DialogTrigger>
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
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Registrar sent</DialogTrigger>
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
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Completar orden</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Completar orden</DialogTitle>
          <DialogDescription>Sube el comprobante final a `staff_comprobante_url` y cierra el expediente.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
            <div className="space-y-2">
              <Label htmlFor="staff-order-completion-file">Comprobante final</Label>
              <FileDropzone accept={ACCEPTED_UPLOADS} file={file} helperText="Arrastra el comprobante final o haz click para seleccionarlo." onFileSelect={setFile} />
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
    case 'verified':
      return 'Verificar'
    case 'needs_changes':
      return 'Pedir cambios'
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

