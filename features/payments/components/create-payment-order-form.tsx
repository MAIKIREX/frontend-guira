'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  useForm,
  useWatch,
  type Control,
  type FieldPath,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Banknote, FileCheck2, Landmark, ShieldCheck, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  buildPaymentOrderPayload,
  supportedPaymentRoutes,
  type SupportedPaymentRoute,
} from '@/features/payments/lib/payment-routes'
import {
  paymentOrderSchema,
  type PaymentOrderFormValues,
} from '@/features/payments/schemas/payment-order.schema'
import type { CreatePaymentOrderInput } from '@/types/payment-order'
import type { Supplier } from '@/types/supplier'

import { ACCEPTED_UPLOADS } from '@/lib/file-validation'

interface CreatePaymentOrderFormProps {
  userId: string
  suppliers: Supplier[]
  defaultRoute: SupportedPaymentRoute
  disabled?: boolean
  onCreateOrder: (input: CreatePaymentOrderInput, supportFile?: File | null) => Promise<void>
}

const ROUTE_PLAYBOOK: Record<SupportedPaymentRoute, Array<{ title: string; body: string }>> = {
  bolivia_to_exterior: [
    { title: '1. Orden primero', body: 'Registras beneficiario, monto y motivo antes de mover fondos.' },
    { title: '2. Fondeo local', body: 'Guira te mostrara el riel local y luego subiras tu comprobante.' },
    { title: '3. Validacion de staff', body: 'Staff confirma el deposito y prepara la cotizacion final.' },
    { title: '4. Aceptacion del cliente', body: 'Veras fee y tipo de cambio final antes de autorizar la ejecucion.' },
    { title: '5. Cierre documentado', body: 'Cuando el envio se complete recibiras evidencia y PDF.' },
  ],
  us_to_bolivia: [
    { title: '1. Declaracion de retorno', body: 'Creas el expediente con monto y destino boliviano.' },
    { title: '2. Fondeo externo', body: 'Envias el dinero al riel internacional y subes respaldo.' },
    { title: '3. Validacion de origen', body: 'Staff verifica llegada de fondos y prepara cotizacion final.' },
    { title: '4. Aceptacion', body: 'Apruebas la cotizacion antes del desembolso local.' },
    { title: '5. Desembolso y PDF', body: 'Guira deposita en Bolivia y deja comprobante final.' },
  ],
  us_to_wallet: [
    { title: '1. Configuracion ACH', body: 'Defines monto, wallet y red de destino.' },
    { title: '2. Instrucciones PSAV', body: 'La operacion queda registrada antes de cualquier deposito.' },
    { title: '3. Fondeo y validacion', body: 'Subes evidencia y staff confirma recepcion en EE.UU.' },
    { title: '4. Aceptacion', body: 'Autorizas la cotizacion final antes de liberar la ejecucion.' },
    { title: '5. Hash y cierre', body: 'El envio queda documentado con hash o referencia y PDF.' },
  ],
  crypto_to_crypto: [
    { title: '1. Seleccion de redes', body: 'Creas el expediente con wallet y red de destino.' },
    { title: '2. Deposito supervisado', body: 'Envias a la direccion indicada y subes hash o captura.' },
    { title: '3. Verificacion', body: 'Staff revisa el origen y prepara condiciones finales.' },
    { title: '4. Aceptacion', body: 'Confirmas la cotizacion final antes del puente.' },
    { title: '5. Evidencia de salida', body: 'Recibes hash/comprobante final y PDF de respaldo.' },
  ],
}

export function CreatePaymentOrderForm({
  userId,
  suppliers,
  defaultRoute,
  disabled,
  onCreateOrder,
}: CreatePaymentOrderFormProps) {
  const [supportFile, setSupportFile] = useState<File | null>(null)
  const form = useForm<PaymentOrderFormValues>({
    resolver: zodResolver(paymentOrderSchema),
    defaultValues: getDefaultValues(defaultRoute),
  })

  const route = useWatch({ control: form.control, name: 'route' })
  const deliveryMethod = useWatch({ control: form.control, name: 'delivery_method' })
  const amountOrigin = useWatch({ control: form.control, name: 'amount_origin' })
  const amountConverted = useWatch({ control: form.control, name: 'amount_converted' })
  const feeTotal = useWatch({ control: form.control, name: 'fee_total' })
  const exchangeRateApplied = useWatch({ control: form.control, name: 'exchange_rate_applied' })

  const currentRoute = useMemo(
    () => supportedPaymentRoutes.find((entry) => entry.key === route) ?? supportedPaymentRoutes[0],
    [route]
  )

  useEffect(() => {
    form.reset(getDefaultValues(defaultRoute))
  }, [defaultRoute, form])

  useEffect(() => {
    if (!currentRoute.supportedDeliveryMethods.includes(form.getValues('delivery_method'))) {
      form.setValue('delivery_method', currentRoute.supportedDeliveryMethods[0], {
        shouldValidate: true,
      })
    }

    if (route === 'bolivia_to_exterior') {
      form.setValue('origin_currency', 'Bs')
      form.setValue('destination_currency', 'USD')
    }
    if (route === 'us_to_bolivia') {
      form.setValue('origin_currency', 'USD')
      form.setValue('destination_currency', 'Bs')
    }
    if (route === 'us_to_wallet') {
      form.setValue('origin_currency', 'USD')
      form.setValue('destination_currency', 'USD')
    }
    if (route === 'crypto_to_crypto') {
      form.setValue('origin_currency', 'USDT')
      form.setValue('destination_currency', 'USDC')
    }
  }, [currentRoute, form, route])

  async function submit(values: PaymentOrderFormValues) {
    try {
      await onCreateOrder(buildPaymentOrderPayload(values, userId), supportFile)
      toast.success('Expediente creado.')
      form.reset(getDefaultValues(values.route))
      setSupportFile(null)
    } catch (error) {
      console.error('Failed to create payment order', error)
      toast.error('No se pudo crear el expediente.')
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
      <Card className="border-border/70 bg-muted/10">
        <CardHeader>
          <CardTitle>Orden primero, dinero despues</CardTitle>
          <CardDescription>
            Cada expediente nace con ruta, destino y documentacion antes de mover fondos reales.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-6" onSubmit={form.handleSubmit(submit)}>
              <section className="space-y-4 rounded-2xl border border-border/70 bg-background/90 p-4">
                <SectionHeading
                  icon={Landmark}
                  eyebrow="Paso 1"
                  title="Define la ruta y el expediente"
                  description="Esta decision fija el rail, las monedas y la documentacion que seguira la orden."
                />
                <div className="grid gap-4 lg:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="route"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ruta soportada</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {supportedPaymentRoutes.map((entry) => (
                                <SelectItem key={entry.key} value={entry.key}>
                                  {entry.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <p className="text-xs text-muted-foreground">{currentRoute.description}</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="supplier_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Proveedor</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value || 'none'}
                            onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                            disabled={disabled}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Sin proveedor" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sin proveedor</SelectItem>
                              {suppliers.map((supplier) => (
                                <SelectItem key={supplier.id} value={supplier.id ?? supplier.name}>
                                  {supplier.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-4">
                  <NumericField control={form.control} disabled={disabled} label="Monto origen" name="amount_origin" />
                  <NumericField control={form.control} disabled={disabled} label="Monto destino" name="amount_converted" />
                  <NumericField control={form.control} disabled={disabled} label="Tipo de cambio" name="exchange_rate_applied" />
                  <NumericField control={form.control} disabled={disabled} label="Fee total" name="fee_total" />
                </div>
              </section>

              <section className="space-y-4 rounded-2xl border border-border/70 bg-background/90 p-4">
                <SectionHeading
                  icon={Wallet}
                  eyebrow="Paso 2"
                  title="Configura el destino"
                  description="El sistema valida los campos segun el rail de entrega para evitar destinos incompletos."
                />
                <div className="grid gap-4 lg:grid-cols-3">
                  <TextField control={form.control} disabled={disabled} label="Moneda origen" name="origin_currency" />
                  <TextField control={form.control} disabled={disabled} label="Moneda destino" name="destination_currency" />
                  <FormField
                    control={form.control}
                    name="delivery_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery method</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {currentRoute.supportedDeliveryMethods.map((method) => (
                                <SelectItem key={method} value={method}>
                                  {method}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <TextField control={form.control} disabled={disabled} label="Motivo" name="payment_reason" />
                  <NumericField control={form.control} disabled={disabled} label="Intended amount" name="intended_amount" />
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <TextField control={form.control} disabled={disabled} label="Destination address" name="destination_address" />
                  <TextField control={form.control} disabled={disabled} label="Stablecoin" name="stablecoin" />
                  {(route === 'bolivia_to_exterior' || route === 'us_to_bolivia') ? (
                    <FormField
                      control={form.control}
                      name="funding_method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Funding method</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecciona" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="bs">bs</SelectItem>
                                <SelectItem value="crypto">crypto</SelectItem>
                                <SelectItem value="ach">ach</SelectItem>
                                <SelectItem value="wallet">wallet</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : null}
                </div>

                {deliveryMethod === 'swift' ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <TextField control={form.control} disabled={disabled} label="Swift bank name" name="swift_bank_name" />
                    <TextField control={form.control} disabled={disabled} label="Swift code" name="swift_code" />
                    <TextField control={form.control} disabled={disabled} label="IBAN" name="swift_iban" />
                    <TextField control={form.control} disabled={disabled} label="Bank address" name="swift_bank_address" />
                    <TextField control={form.control} disabled={disabled} label="Country" name="swift_country" />
                  </div>
                ) : null}

                {deliveryMethod === 'ach' ? (
                  <div className="grid gap-4 lg:grid-cols-3">
                    <TextField control={form.control} disabled={disabled} label="Routing number" name="ach_routing_number" />
                    <TextField control={form.control} disabled={disabled} label="Account number" name="ach_account_number" />
                    <TextField control={form.control} disabled={disabled} label="Bank name" name="ach_bank_name" />
                  </div>
                ) : null}

                {deliveryMethod === 'crypto' ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <TextField control={form.control} disabled={disabled} label="Crypto address" name="crypto_address" />
                    <TextField control={form.control} disabled={disabled} label="Network" name="crypto_network" />
                  </div>
                ) : null}
              </section>

              <section className="space-y-4 rounded-2xl border border-dashed border-border/70 bg-background/90 p-4">
                <SectionHeading
                  icon={FileCheck2}
                  eyebrow="Paso 3"
                  title="Sube respaldo inicial"
                  description="Puedes dejar el soporte desde el inicio para acelerar la revision del equipo."
                />
                <Input
                  accept={ACCEPTED_UPLOADS}
                  disabled={disabled}
                  onChange={(event) => setSupportFile(event.target.files?.[0] ?? null)}
                  type="file"
                />
                <p className="text-xs text-muted-foreground">
                  Tipos permitidos: JPEG, PNG, WEBP y PDF.
                </p>
              </section>

              <Button disabled={disabled || form.formState.isSubmitting} type="submit">
                {form.formState.isSubmitting ? 'Creando expediente...' : 'Crear expediente'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="border-border/70 bg-sky-50/60 dark:bg-sky-950/20">
          <CardHeader>
            <CardTitle>Lectura operativa de esta ruta</CardTitle>
            <CardDescription>
              La interfaz ya te muestra el mismo mapa que seguira staff despues de tu deposito.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ROUTE_PLAYBOOK[currentRoute.key].map((step) => (
              <div key={step.title} className="rounded-xl border border-sky-200/70 bg-background/80 p-3 dark:border-sky-900/70">
                <div className="font-medium text-foreground">{step.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{step.body}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Resumen economico visible</CardTitle>
            <CardDescription>
              Cuando staff confirme fondos, estos valores se volveran la base de la cotizacion final que deberas aceptar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <PreviewRow icon={Banknote} label="Monto origen" value={String(amountOrigin || 0)} />
            <PreviewRow icon={ArrowRight} label="Monto destino" value={String(amountConverted || 0)} />
            <PreviewRow icon={ShieldCheck} label="Fee total" value={String(feeTotal || 0)} />
            <PreviewRow icon={Landmark} label="Tipo de cambio" value={String(exchangeRateApplied || 0)} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function getDefaultValues(route: SupportedPaymentRoute): PaymentOrderFormValues {
  if (route === 'us_to_wallet') {
    return {
      route,
      supplier_id: '',
      amount_origin: 0,
      amount_converted: 0,
      fee_total: 0,
      exchange_rate_applied: 1,
      origin_currency: 'USD',
      destination_currency: 'USD',
      delivery_method: 'ach',
      payment_reason: '',
      intended_amount: 0,
      destination_address: '',
      stablecoin: 'USDC',
      funding_method: undefined,
      swift_bank_name: '',
      swift_code: '',
      swift_iban: '',
      swift_bank_address: '',
      swift_country: '',
      ach_routing_number: '',
      ach_account_number: '',
      ach_bank_name: '',
      crypto_address: '',
      crypto_network: '',
    }
  }

  if (route === 'crypto_to_crypto') {
    return {
      route,
      supplier_id: '',
      amount_origin: 0,
      amount_converted: 0,
      fee_total: 0,
      exchange_rate_applied: 1,
      origin_currency: 'USDT',
      destination_currency: 'USDC',
      delivery_method: 'crypto',
      payment_reason: '',
      intended_amount: 0,
      destination_address: '',
      stablecoin: 'USDC',
      funding_method: undefined,
      swift_bank_name: '',
      swift_code: '',
      swift_iban: '',
      swift_bank_address: '',
      swift_country: '',
      ach_routing_number: '',
      ach_account_number: '',
      ach_bank_name: '',
      crypto_address: '',
      crypto_network: '',
    }
  }

  return {
    route,
    supplier_id: '',
    amount_origin: 0,
    amount_converted: 0,
    fee_total: 0,
    exchange_rate_applied: 1,
    origin_currency: route === 'bolivia_to_exterior' ? 'Bs' : 'USD',
    destination_currency: route === 'bolivia_to_exterior' ? 'USD' : 'Bs',
    delivery_method: 'swift',
    payment_reason: '',
    intended_amount: 0,
    destination_address: '',
    stablecoin: 'USDC',
    funding_method: 'bs',
    swift_bank_name: '',
    swift_code: '',
    swift_iban: '',
    swift_bank_address: '',
    swift_country: '',
    ach_routing_number: '',
    ach_account_number: '',
    ach_bank_name: '',
    crypto_address: '',
    crypto_network: '',
  }
}

function SectionHeading({ icon: Icon, eyebrow, title, description }: { icon: typeof Landmark; eyebrow: string; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-xl border border-border/70 bg-muted/30 p-2 text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{eyebrow}</div>
        <div className="mt-1 font-medium text-foreground">{title}</div>
        <div className="mt-1 text-sm text-muted-foreground">{description}</div>
      </div>
    </div>
  )
}

function PreviewRow({ icon: Icon, label, value }: { icon: typeof Landmark; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span>{label}</span>
      </div>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}

function NumericField({
  control,
  name,
  label,
  disabled,
}: {
  control: Control<PaymentOrderFormValues>
  name: FieldPath<PaymentOrderFormValues>
  label: string
  disabled?: boolean
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input {...field} disabled={disabled} step="0.01" type="number" />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function TextField({
  control,
  name,
  label,
  disabled,
}: {
  control: Control<PaymentOrderFormValues>
  name: FieldPath<PaymentOrderFormValues>
  label: string
  disabled?: boolean
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input {...field} disabled={disabled} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
