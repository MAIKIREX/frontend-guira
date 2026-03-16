'use client'

import { useMemo, useState } from 'react'
import { useForm, type Control, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
              <div><span className="text-muted-foreground">Estado Actual:</span> <span className={"font-semibold lowercase px-2 py-0.5 rounded-full " + (record.status === 'verified' ? 'bg-green-100 text-green-800' : record.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800')}>{record.status}</span></div>
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
  const actions = new Set(getOrderActions(order.status))
  if (actions.size === 0) return null

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {actions.has('deposit_received') ? <OrderReasonActionDialog actor={actor} action="deposit_received" label="Validar deposito" onUpdated={onUpdated} order={order} /> : null}
      {actions.has('quote') ? <OrderQuoteDialog actor={actor} onUpdated={onUpdated} order={order} /> : null}
      {actions.has('sent') ? <OrderSentDialog actor={actor} onUpdated={onUpdated} order={order} /> : null}
      {actions.has('completed') ? <OrderCompletionDialog actor={actor} onUpdated={onUpdated} order={order} /> : null}
      {actions.has('failed') ? <OrderReasonActionDialog actor={actor} action="failed" label="Marcar failed" onUpdated={onUpdated} order={order} /> : null}
    </div>
  )
}

function getPaymentStatusColor(status: string) {
  if (status === 'created' || status === 'waiting_deposit' || status === 'requires_quote_approval') return 'bg-yellow-100 text-yellow-800'
  if (status === 'deposit_received' || status === 'processing' || status === 'sent') return 'bg-blue-100 text-blue-800'
  if (status === 'completed') return 'bg-green-100 text-green-800'
  return 'bg-red-100 text-red-800'
}

export function OrderDetailDialog({ actor, onUpdated, order }: { actor: StaffActor; onUpdated: (order: PaymentOrder) => Promise<void> | void; order: PaymentOrder }) {
  const meta = order.metadata as import('@/types/payment-order').PaymentOrderMetadata | undefined
  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="secondary" />}>Gestionar Orden</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="mb-2">
          <div className="flex items-center justify-between">
            <DialogTitle>Gestión de Orden #{order.id.slice(0, 8)}</DialogTitle>
            <span className={"text-xs px-3 py-1 font-semibold uppercase rounded " + getPaymentStatusColor(order.status)}>
              {order.status}
            </span>
          </div>
          <DialogDescription>Controla el ciclo de vida de la transacción financiera.</DialogDescription>
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
                  <span className="font-medium text-lg text-emerald-600">{order.amount_converted} {order.destination_currency}</span>
                </div>
              )}
            </div>
          </div>

          {(meta?.swift_details || meta?.ach_details || meta?.crypto_destination) && (
            <div className="space-y-3">
              <h4 className="font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1 text-xs">Información de Destino</h4>
              <pre className="p-3 bg-muted/40 rounded-lg overflow-x-auto text-xs font-mono">
                {JSON.stringify(meta.swift_details || meta.ach_details || meta.crypto_destination, null, 2)}
              </pre>
            </div>
          )}

          <div className="space-y-3">
            <h4 className="font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1 text-xs">Evidencias y Respaldos</h4>
            <div className="grid gap-2">
              {order.evidence_url ? (
                <a href={order.evidence_url} target="_blank" rel="noreferrer" className="flex items-center text-blue-600 hover:underline">
                  📄 Ver Comprobante de Depósito (Cliente)
                </a>
              ) : (
                <span className="text-muted-foreground text-xs">Sin comprobante de depósito.</span>
              )}
              {order.support_document_url ? (
                <a href={order.support_document_url} target="_blank" rel="noreferrer" className="flex items-center text-blue-600 hover:underline">
                  📄 Ver Documento de Respaldo
                </a>
              ) : null}
              {order.staff_comprobante_url ? (
                <a href={order.staff_comprobante_url} target="_blank" rel="noreferrer" className="flex items-center text-green-600 hover:underline">
                  ✅ Comprobante Final (Staff)
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

function OrderReasonActionDialog({ actor, action, label, onUpdated, order }: { actor: StaffActor; action: 'deposit_received' | 'failed'; label: string; onUpdated: (order: PaymentOrder) => Promise<void> | void; order: PaymentOrder }) {
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
      <DialogTrigger render={<Button size="sm" variant="outline" />}>{label}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>La accion usa optimistic lock, registra auditoria y notifica al cliente.</DialogDescription>
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

  async function submit(values: StaffOrderProcessingValues) {
    try {
      const updatedOrder = await StaffService.preparePaymentOrderQuote({ actor, order, reason: values.reason, exchangeRateApplied: values.exchange_rate_applied, amountConverted: values.amount_converted, feeTotal: values.fee_total })
      toast.success('Cotizacion final publicada para el cliente.')
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
          <DialogDescription>Define la tasa real, el monto final y la comision. El cliente debera aceptar esta cotizacion para pasar a `processing`.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
            <ProcessingNumberField control={form.control} label="Tipo de cambio" name="exchange_rate_applied" />
            <ProcessingNumberField control={form.control} label="Monto convertido" name="amount_converted" />
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
              <FormLabel>Comprobante final</FormLabel>
              <Input accept={ACCEPTED_UPLOADS} onChange={(event) => setFile(event.target.files?.[0] ?? null)} type="file" />
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

function ProcessingNumberField({ control, label, name }: { control: Control<StaffOrderProcessingValues>; label: string; name: 'exchange_rate_applied' | 'amount_converted' | 'fee_total' }) {
  return (
    <FormField control={control} name={name} render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <FormControl><Input {...field} min={0} step="0.01" type="number" /></FormControl>
        <FormMessage />
      </FormItem>
    )} />
  )
}

function getOrderActions(status: PaymentOrder['status']) {
  switch (status) {
    case 'created':
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
