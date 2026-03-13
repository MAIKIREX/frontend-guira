'use client'

import { useMemo, useState } from 'react'
import { useForm, type Control } from 'react-hook-form'
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

export function OnboardingActions({ actor, record, onUpdated }: { actor: StaffActor; record: StaffOnboardingRecord; onUpdated: () => Promise<void> | void }) {
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

function OnboardingActionDialog({ actor, defaultStatus, onUpdated, record }: { actor: StaffActor; defaultStatus: StaffOnboardingActionValues['status']; onUpdated: () => Promise<void> | void; record: StaffOnboardingRecord }) {
  const [open, setOpen] = useState(false)
  const form = useForm<StaffOnboardingActionValues>({
    resolver: zodResolver(staffOnboardingActionSchema),
    defaultValues: { status: defaultStatus, reason: '' },
  })

  async function submit(values: StaffOnboardingActionValues) {
    try {
      await StaffService.updateOnboardingStatus({ actor, record, status: values.status, reason: values.reason })
      toast.success('Onboarding actualizado.')
      setOpen(false)
      form.reset({ status: defaultStatus, reason: '' })
      await onUpdated()
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

export function SupportTicketActions({ actor, onUpdated, ticket }: { actor: StaffActor; onUpdated: () => Promise<void> | void; ticket: StaffSupportTicket }) {
  const [open, setOpen] = useState(false)
  const form = useForm<StaffSupportActionValues>({
    resolver: zodResolver(staffSupportActionSchema),
    defaultValues: { status: ticket.status ?? 'open', reason: '' },
  })

  async function submit(values: StaffSupportActionValues) {
    try {
      await StaffService.updateSupportTicketStatus({ actor, ticket, status: values.status, reason: values.reason })
      toast.success('Ticket actualizado.')
      setOpen(false)
      form.reset({ status: values.status, reason: '' })
      await onUpdated()
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

export function OrderActions({ actor, onUpdated, order }: { actor: StaffActor; onUpdated: () => Promise<void> | void; order: PaymentOrder }) {
  const actions = getOrderActions(order.status)
  if (actions.length === 0) return null

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {actions.includes('deposit_received') ? <OrderReasonActionDialog actor={actor} action="deposit_received" label="Validar deposito" onUpdated={onUpdated} order={order} /> : null}
      {actions.includes('quote') ? <OrderQuoteDialog actor={actor} onUpdated={onUpdated} order={order} /> : null}
      {actions.includes('sent') ? <OrderSentDialog actor={actor} onUpdated={onUpdated} order={order} /> : null}
      {actions.includes('completed') ? <OrderCompletionDialog actor={actor} onUpdated={onUpdated} order={order} /> : null}
      {actions.includes('failed') ? <OrderReasonActionDialog actor={actor} action="failed" label="Marcar failed" onUpdated={onUpdated} order={order} /> : null}
    </div>
  )
}

function OrderReasonActionDialog({ actor, action, label, onUpdated, order }: { actor: StaffActor; action: 'deposit_received' | 'failed'; label: string; onUpdated: () => Promise<void> | void; order: PaymentOrder }) {
  const [open, setOpen] = useState(false)
  const form = useForm<{ reason: string }>({ resolver: zodResolver(staffReasonSchema), defaultValues: { reason: '' } })

  async function submit(values: { reason: string }) {
    try {
      if (action === 'deposit_received') {
        await StaffService.advancePaymentOrderToDepositReceived({ actor, order, reason: values.reason })
      } else {
        await StaffService.failPaymentOrder({ actor, order, reason: values.reason })
      }
      toast.success('Orden actualizada.')
      setOpen(false)
      form.reset({ reason: '' })
      await onUpdated()
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

function OrderQuoteDialog({ actor, onUpdated, order }: { actor: StaffActor; onUpdated: () => Promise<void> | void; order: PaymentOrder }) {
  const [open, setOpen] = useState(false)
  const form = useForm<StaffOrderProcessingValues>({
    resolver: zodResolver(staffOrderProcessingSchema),
    defaultValues: { exchange_rate_applied: order.exchange_rate_applied, amount_converted: order.amount_converted, fee_total: order.fee_total, reason: '' },
  })

  async function submit(values: StaffOrderProcessingValues) {
    try {
      await StaffService.preparePaymentOrderQuote({ actor, order, reason: values.reason, exchangeRateApplied: values.exchange_rate_applied, amountConverted: values.amount_converted, feeTotal: values.fee_total })
      toast.success('Cotizacion final publicada para el cliente.')
      setOpen(false)
      await onUpdated()
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

function OrderSentDialog({ actor, onUpdated, order }: { actor: StaffActor; onUpdated: () => Promise<void> | void; order: PaymentOrder }) {
  const [open, setOpen] = useState(false)
  const currentReference = typeof order.metadata === 'object' && order.metadata && 'reference' in order.metadata ? String(order.metadata.reference ?? '') : ''
  const form = useForm<StaffOrderSentValues>({ resolver: zodResolver(staffOrderSentSchema), defaultValues: { reference: currentReference, reason: '' } })

  async function submit(values: StaffOrderSentValues) {
    try {
      await StaffService.advancePaymentOrderToSent({ actor, order, reason: values.reason, reference: values.reference })
      toast.success('Orden movida a sent.')
      setOpen(false)
      await onUpdated()
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

function OrderCompletionDialog({ actor, onUpdated, order }: { actor: StaffActor; onUpdated: () => Promise<void> | void; order: PaymentOrder }) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const form = useForm<StaffOrderCompletionValues>({ resolver: zodResolver(staffOrderCompletionSchema), defaultValues: { reason: '' } })

  async function submit(values: StaffOrderCompletionValues) {
    if (!file) {
      toast.error('Adjunta el comprobante final antes de completar la orden.')
      return
    }

    try {
      await StaffService.advancePaymentOrderToCompleted({ actor, order, reason: values.reason, comprobanteFile: file })
      toast.success('Orden completada.')
      setOpen(false)
      setFile(null)
      await onUpdated()
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
        <FormControl><Input {...field} step="0.01" type="number" /></FormControl>
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
