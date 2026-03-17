'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import {
  useForm,
  useWatch,
  type Control,
  type FieldPath,
  type Resolver,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  FileCheck2,
  FileText,
  Landmark,
  Network,
  ShieldCheck,
  Upload,
  Wallet,
} from 'lucide-react'
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
  getSupplierAchDetails,
  getSupplierSwiftDetails,
  parseSupplierPaymentMethods,
} from '@/features/payments/lib/supplier-methods'
import {
  buildDepositInstructions,
  estimateRouteValues,
  type DepositInstruction,
} from '@/features/payments/lib/deposit-instructions'
import {
  paymentOrderSchema,
  type PaymentOrderFormValues,
} from '@/features/payments/schemas/payment-order.schema'
import type {
  AppSettingRow,
  CreatePaymentOrderInput,
  FeeConfigRow,
  PsavConfigRow,
} from '@/types/payment-order'
import type { Supplier } from '@/types/supplier'
import { ACCEPTED_UPLOADS } from '@/lib/file-validation'

type StepKey = 'route' | 'detail' | 'review' | 'finish'

interface CreatePaymentOrderFormProps {
  userId: string
  suppliers: Supplier[]
  defaultRoute: SupportedPaymentRoute
  allowedRoutes?: SupportedPaymentRoute[]
  disabled?: boolean
  onCreateOrder: (
    input: CreatePaymentOrderInput,
    supportFile?: File | null,
    evidenceFile?: File | null
  ) => Promise<unknown>
  feesConfig: FeeConfigRow[]
  appSettings: AppSettingRow[]
  psavConfigs: PsavConfigRow[]
}

const STEP_ORDER: StepKey[] = ['route', 'detail', 'review', 'finish']
const DEPOSIT_ROUTES: SupportedPaymentRoute[] = ['us_to_bolivia', 'us_to_wallet']

const ROUTE_STAGE_COPY: Record<SupportedPaymentRoute, {
  routeTitle: string
  detailTitle: string
  detailDescription: string
  finishTitle: string
  finishDescription: string
}> = {
  us_to_bolivia: {
    routeTitle: 'Exterior a Bolivia',
    detailTitle: 'Declara el deposito a recibir',
    detailDescription: 'Registra monto, cuenta o medio de recepcion y deja un respaldo opcional antes de crear el expediente.',
    finishTitle: 'Adjunta el comprobante del deposito',
    finishDescription: 'Puedes subirlo ahora o retomarlo despues desde Transacciones.',
  },
  us_to_wallet: {
    routeTitle: 'USA a Wallet',
    detailTitle: 'Configura la wallet de recepcion',
    detailDescription: 'Indica monto, billetera y red de recepcion para crear el expediente antes de fondear.',
    finishTitle: 'Adjunta el comprobante del fondeo',
    finishDescription: 'Veras los datos PSAV disponibles y podras subir el comprobante ahora o mas tarde.',
  },
  bolivia_to_exterior: {
    routeTitle: 'Bolivia a Exterior',
    detailTitle: 'Crea el expediente de pago',
    detailDescription: 'Selecciona proveedor, declara el motivo y deja el respaldo documental desde el inicio.',
    finishTitle: 'Deposita contra esta orden',
    finishDescription: 'La orden queda lista con instrucciones de cuenta o QR de Guira para que subas el comprobante despues.',
  },
  crypto_to_crypto: {
    routeTitle: 'Cripto a Cripto',
    detailTitle: 'Registra el destino de la red',
    detailDescription: 'La orden se crea primero y luego se muestran las wallets de Guira para fondearla.',
    finishTitle: 'Deposita a la wallet de Guira',
    finishDescription: 'Puedes ver las direcciones activas y dejar el hash o captura cuando tengas el comprobante.',
  },
}

export function CreatePaymentOrderForm({
  userId,
  suppliers,
  defaultRoute,
  allowedRoutes,
  disabled,
  onCreateOrder,
  feesConfig,
  appSettings,
  psavConfigs,
}: CreatePaymentOrderFormProps) {
  const [step, setStep] = useState<StepKey>('route')
  const [supportFile, setSupportFile] = useState<File | null>(null)
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const routeOptions = useMemo(
    () => supportedPaymentRoutes.filter((entry) => !allowedRoutes || allowedRoutes.includes(entry.key)),
    [allowedRoutes]
  )
  const resolvedDefaultRoute = routeOptions.some((entry) => entry.key === defaultRoute)
    ? defaultRoute
    : routeOptions[0]?.key ?? supportedPaymentRoutes[0].key

  const form = useForm<PaymentOrderFormValues>({
    resolver: zodResolver(paymentOrderSchema) as Resolver<PaymentOrderFormValues>,
    defaultValues: getDefaultValues(resolvedDefaultRoute),
  })

  const route = useWatch({ control: form.control, name: 'route' })
  const deliveryMethod = useWatch({ control: form.control, name: 'delivery_method' })
  const amountOrigin = useWatch({ control: form.control, name: 'amount_origin' })
  const supplierId = useWatch({ control: form.control, name: 'supplier_id' })
  const cryptoAddress = useWatch({ control: form.control, name: 'crypto_address' })

  const currentRoute = useMemo(
    () => routeOptions.find((entry) => entry.key === route) ?? routeOptions[0] ?? supportedPaymentRoutes[0],
    [route, routeOptions]
  )
  const supportedDeliveryMethods = currentRoute.supportedDeliveryMethods
  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => supplier.id === supplierId || supplier.name === supplierId) ?? null,
    [supplierId, suppliers]
  )
  const routeCopy = ROUTE_STAGE_COPY[currentRoute.key]
  const isDepositRouteActive = isDepositRoute(currentRoute.key)
  const showSupportUpload = currentRoute.key === 'us_to_bolivia' || !isDepositRouteActive
  const depositInstructions = useMemo(
    () => buildDepositInstructions({
      route: currentRoute.key,
      psavConfigs,
      selectedSupplier,
    }) as DepositInstruction[],
    [currentRoute.key, psavConfigs, selectedSupplier]
  )
  const reviewItems = useMemo(
    () => buildReviewItems({
      route: currentRoute.key,
      values: form.getValues() as PaymentOrderFormValues,
      routeLabel: currentRoute.label,
      supplierName: selectedSupplier?.name ?? 'Sin proveedor',
      supportFileName: supportFile?.name,
      evidenceFileName: evidenceFile?.name,
    }),
    [currentRoute.key, currentRoute.label, evidenceFile?.name, form, selectedSupplier?.name, supportFile?.name]
  )

  useEffect(() => {
    form.reset(getDefaultValues(resolvedDefaultRoute))
  }, [form, resolvedDefaultRoute])

  useEffect(() => {
    if (!supportedDeliveryMethods.includes(form.getValues('delivery_method'))) {
      form.setValue('delivery_method', supportedDeliveryMethods[0], {
        shouldValidate: true,
      })
    }

    if (route === 'bolivia_to_exterior') {
      form.setValue('origin_currency', 'Bs')
      form.setValue('destination_currency', 'USD')
      if (!form.getValues('funding_method')) form.setValue('funding_method', 'bs')
    }
    if (route === 'us_to_bolivia') {
      form.setValue('origin_currency', 'USD')
      form.setValue('destination_currency', 'Bs')
      if (!form.getValues('funding_method')) form.setValue('funding_method', 'ach')
    }
    if (route === 'us_to_wallet') {
      form.setValue('origin_currency', 'USD')
      form.setValue('destination_currency', 'USD')
      form.setValue('delivery_method', 'ach')
      form.setValue('funding_method', undefined)
      form.setValue('stablecoin', 'USDC')
    }
    if (route === 'crypto_to_crypto') {
      form.setValue('origin_currency', 'USDC')
      form.setValue('destination_currency', 'USDC')
      form.setValue('delivery_method', 'crypto')
      form.setValue('funding_method', undefined)
      form.setValue('stablecoin', 'USDC')
    }
  }, [form, route, supportedDeliveryMethods])

  useEffect(() => {
    if (route === 'us_to_wallet') {
      form.setValue('destination_address', cryptoAddress || '')
    }
  }, [cryptoAddress, form, route])

  useEffect(() => {
    if (!selectedSupplier) return

    if (currentRoute.key === 'us_to_wallet') {
      if (selectedSupplier.crypto_details?.address) {
        form.setValue('destination_address', selectedSupplier.crypto_details.address)
        form.setValue('crypto_address', selectedSupplier.crypto_details.address)
        form.setValue('crypto_network', selectedSupplier.crypto_details.network || 'Polygon')
      }
      return
    }

    const supplierMethods = parseSupplierPaymentMethods(
      selectedSupplier.payment_method,
      selectedSupplier
    )
    const preferredMethod = supportedDeliveryMethods.find((method) =>
      supplierMethods.includes(method as 'crypto' | 'ach' | 'swift')
    )

    if (!preferredMethod) return

    form.setValue('delivery_method', preferredMethod)

    if (preferredMethod === 'swift') {
      const swiftDetails = getSupplierSwiftDetails(selectedSupplier)
      if (!swiftDetails) return

      form.setValue(
        'destination_address',
        selectedSupplier.address || swiftDetails.account_number || ''
      )
      form.setValue('swift_bank_name', swiftDetails.bank_name || '')
      form.setValue('swift_code', swiftDetails.swift_code || '')
      form.setValue('swift_country', swiftDetails.bank_country || selectedSupplier.country || '')
      form.setValue('swift_iban', swiftDetails.iban || swiftDetails.account_number || '')
      form.setValue(
        'swift_bank_address',
        swiftDetails.bank_address || selectedSupplier.address || ''
      )
    }

    if (preferredMethod === 'ach') {
      const achDetails = getSupplierAchDetails(selectedSupplier)
      if (!achDetails) return

      form.setValue('destination_address', selectedSupplier.address || achDetails.account_number || '')
      form.setValue('ach_bank_name', achDetails.bank_name || '')
      form.setValue('ach_routing_number', achDetails.routing_number || '')
      form.setValue('ach_account_number', achDetails.account_number || '')
    }

    if (preferredMethod === 'crypto' && selectedSupplier.crypto_details?.address) {
      form.setValue('destination_address', selectedSupplier.crypto_details.address)
      form.setValue('crypto_address', selectedSupplier.crypto_details.address)
      form.setValue('crypto_network', selectedSupplier.crypto_details.network || 'Polygon')
    }
  }, [currentRoute.key, form, selectedSupplier, supportedDeliveryMethods])

  useEffect(() => {
    const estimate = estimateRouteValues({
      amountOrigin: Number(amountOrigin) || 0,
      route: currentRoute.key,
      appSettings,
      feesConfig,
    })

    form.setValue('amount_converted', estimate.amountConverted)
    form.setValue('exchange_rate_applied', estimate.exchangeRateApplied)
    form.setValue('fee_total', estimate.feeTotal)
    form.setValue('intended_amount', estimate.amountConverted || 0)
  }, [amountOrigin, appSettings, currentRoute.key, feesConfig, form])

  async function submit(values: PaymentOrderFormValues) {
    try {
      await onCreateOrder(buildPaymentOrderPayload(values, userId), supportFile, evidenceFile)
      toast.success(
        evidenceFile
          ? 'Expediente creado y comprobante adjuntado. La orden ya puede pasar a revision de staff.'
          : 'Expediente creado. Puedes completar el comprobante desde Transacciones.'
      )
      form.reset(getDefaultValues(values.route))
      setSupportFile(null)
      setEvidenceFile(null)
      setStep('route')
    } catch (error) {
      console.error('Failed to create payment order', error)
      toast.error('No se pudo crear el expediente.')
    }
  }

  async function handleNext() {
    if (step === 'detail') {
      const isValid = await form.trigger(getStepFields({
        deliveryMethod,
        route,
      }), { shouldFocus: true })

      if (!isValid) return
    }

    const currentIndex = STEP_ORDER.indexOf(step)
    const nextStep = STEP_ORDER[currentIndex + 1]
    if (!nextStep) return
    setStep(nextStep)
  }

  function handleBack() {
    const currentIndex = STEP_ORDER.indexOf(step)
    const previousStep = STEP_ORDER[currentIndex - 1]
    if (!previousStep) return
    setStep(previousStep)
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
      <Card className="border-border/70 bg-muted/10">
        <CardHeader className="border-b border-border/60 bg-background/90">
          <CardTitle>{isDepositRouteActive ? 'Depositar por expediente' : 'Enviar por expediente'}</CardTitle>
          <CardDescription>
            {isDepositRouteActive
              ? 'Primero creas el expediente, luego ves las instrucciones de fondeo y finalmente adjuntas el comprobante ahora o despues.'
              : 'El cliente ve una ruta guiada: primero se crea la orden, luego se muestran instrucciones, y por ultimo se cargan respaldos o comprobantes.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <ProgressRail currentStep={step} />

          <Form {...form}>
            <form className="space-y-6" onSubmit={form.handleSubmit(submit)}>
              {step === 'route' ? (
                <section className="space-y-4 rounded-2xl border border-border/70 bg-background/90 p-5">
                  <SectionHeading
                    icon={Landmark}
                    eyebrow="Etapa 1"
                    title="Escoge la ruta del expediente"
                    description={isDepositRouteActive
                      ? 'La ruta define como se crea el expediente de deposito y que instrucciones de fondeo se mostraran al final.'
                      : 'La ruta define el tipo de orden, el rail y las instrucciones que se mostraran al final.'}
                  />
                  <div className="grid gap-4">
                    <FormField
                      control={form.control}
                      name="route"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ruta soportada</FormLabel>
                          <FormControl>
                            <div className="grid gap-3 sm:grid-cols-2">
                              {routeOptions.map((entry) => {
                                const isSelected = field.value === entry.key

                                return (
                                  <button
                                    key={entry.key}
                                    aria-pressed={isSelected}
                                    className={`rounded-2xl border px-4 py-4 text-left transition-colors ${isSelected
                                      ? 'border-sky-400/70 bg-sky-50'
                                      : 'border-border/70 bg-background hover:border-sky-300/60 hover:bg-sky-50/40'
                                      } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                                    disabled={disabled}
                                    onClick={() => {
                                      field.onChange(entry.key)
                                      setStep('route')
                                    }}
                                    type="button"
                                  >
                                    <div className="text-sm font-medium text-foreground">{entry.label}</div>
                                    <div className="mt-1 text-xs text-muted-foreground">{entry.description}</div>
                                  </button>
                                )
                              })}
                            </div>
                          </FormControl>
                          <p className="text-xs text-muted-foreground">{currentRoute.description}</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />


                  </div>

                  <div className="flex justify-end">
                    <Button disabled={disabled} onClick={handleNext} type="button">
                      Continuar a detalle
                    </Button>
                  </div>
                </section>
              ) : null}

              {step === 'detail' ? (
                <section className="space-y-5 rounded-2xl border border-border/70 bg-background/90 p-5">
                  <SectionHeading
                    icon={currentRoute.key === 'crypto_to_crypto' ? Network : Wallet}
                    eyebrow="Etapa 2"
                    title={routeCopy.detailTitle}
                    description={routeCopy.detailDescription}
                  />

                  <div className="grid gap-4">
                    <NumericField control={form.control} disabled={disabled} label={getAmountLabel(currentRoute.key)} name="amount_origin" />

                    {currentRoute.key !== 'us_to_wallet' ? (
                      <FormField
                        control={form.control}
                        name="supplier_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Proveedor o beneficiario</FormLabel>
                            <FormControl>
                              <Select
                                value={field.value || 'none'}
                                onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                                disabled={disabled}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Selecciona uno guardado o crea uno nuevo en Proveedores">
                                    {selectedSupplier?.name ?? (field.value ? field.value : undefined)}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Sin proveedor cargado</SelectItem>
                                  {suppliers.map((supplier) => (
                                    <SelectItem key={supplier.id} value={supplier.id ?? supplier.name}>
                                      {supplier.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                              Si no existe todavia, puedes crearlo desde la pestaña Proveedores y luego volver aqui.
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : null}
                  </div>

                  <div className={`grid gap-4 ${currentRoute.key === 'us_to_wallet' ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
                    <TextField control={form.control} disabled={disabled} label="Moneda origen" name="origin_currency" />
                    <TextField control={form.control} disabled={disabled} label="Moneda destino" name="destination_currency" />
                    {currentRoute.key !== 'us_to_wallet' ? (
                      <FormField
                        control={form.control}
                        name="delivery_method"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{isDepositRouteActive ? 'Medio de recepcion' : 'Metodo de entrega'}</FormLabel>
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
                    ) : null}
                  </div>

                  {currentRoute.key === 'us_to_wallet' ? (
                    <>
                      <div className="grid gap-4 lg:grid-cols-2">
                        <TextField control={form.control} disabled={disabled} label="Direccion de la billetera" name="crypto_address" />
                        <TextField control={form.control} disabled={disabled} label="Red de recepcion" name="crypto_network" />
                      </div>
                      <div className="rounded-xl border border-dashed border-border/70 bg-muted/15 px-3 py-3 text-sm text-muted-foreground">
                        El fondeo se ejecuta sobre PSAV y el destino final de la orden se guardara con la wallet y la red que declares aqui.
                      </div>
                    </>
                  ) : (
                    <>
                      {!isDepositRouteActive ? (
                        <div className="grid gap-4">
                          <TextField control={form.control} disabled={disabled} label="Motivo del pago" name="payment_reason" />
                        </div>
                      ) : null}

                      <div className={`grid gap-4 ${route === 'bolivia_to_exterior' ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
                        <TextField control={form.control} disabled={disabled} label={getDestinationLabel(currentRoute.key)} name="destination_address" />
                        {!isDepositRouteActive ? (
                          <TextField control={form.control} disabled={disabled} label="Stablecoin" name="stablecoin" />
                        ) : null}
                        {route === 'bolivia_to_exterior' ? (
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

                      {deliveryMethod === 'swift' && route === 'bolivia_to_exterior' ? (
                        <div className="grid gap-4 lg:grid-cols-2">
                          <TextField control={form.control} disabled={disabled} label="Banco" name="swift_bank_name" />
                          <TextField control={form.control} disabled={disabled} label="Codigo SWIFT" name="swift_code" />
                          <TextField control={form.control} disabled={disabled} label="IBAN o cuenta" name="swift_iban" />
                          <TextField control={form.control} disabled={disabled} label="Direccion del banco" name="swift_bank_address" />
                          <TextField control={form.control} disabled={disabled} label="Pais del banco" name="swift_country" />
                        </div>
                      ) : null}

                      {deliveryMethod === 'ach' && route === 'bolivia_to_exterior' ? (
                        <div className="grid gap-4 lg:grid-cols-3">
                          <TextField control={form.control} disabled={disabled} label="Routing number" name="ach_routing_number" />
                          <TextField control={form.control} disabled={disabled} label="Account number" name="ach_account_number" />
                          <TextField control={form.control} disabled={disabled} label="Bank name" name="ach_bank_name" />
                        </div>
                      ) : null}

                      {deliveryMethod === 'crypto' ? (
                        <div className="grid gap-4 lg:grid-cols-2">
                          <TextField control={form.control} disabled={disabled} label="Wallet destino" name="crypto_address" />
                          <TextField control={form.control} disabled={disabled} label="Red" name="crypto_network" />
                        </div>
                      ) : null}
                    </>
                  )}

                  {showSupportUpload ? (
                    <DocumentInputCard
                      file={supportFile}
                      label="Documento de respaldo"
                      description={currentRoute.key === 'us_to_bolivia'
                        ? 'Puedes adjuntar el QR bancario o un documento de respaldo. Se guardara como support_document_url.'
                        : 'Se guardara como support_document_url al crear la orden.'}
                      onFileChange={setSupportFile}
                    />
                  ) : null}

                  <div className="flex items-center justify-between">
                    <Button onClick={handleBack} type="button" variant="outline">
                      Volver
                    </Button>
                    <Button disabled={disabled} onClick={handleNext} type="button">
                      Revisar expediente
                    </Button>
                  </div>
                </section>
              ) : null}
              {step === 'review' ? (
                <section className="space-y-5 rounded-2xl border border-border/70 bg-background/90 p-5">
                  <SectionHeading
                    icon={CheckCircle2}
                    eyebrow="Etapa 3"
                    title="Revisa antes de crear el expediente"
                    description={isDepositRouteActive
                      ? 'Confirma el monto, el destino y el respaldo opcional antes de crear el expediente.'
                      : 'Aqui se resume la logica de la orden y el destino antes de pasar a la finalizacion.'}
                  />

                  <div className="grid gap-3 md:grid-cols-2">
                    {reviewItems.map((item) => (
                      <InfoBlock key={item.label} label={item.label} value={item.value} />
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <Button onClick={handleBack} type="button" variant="outline">
                      Editar detalle
                    </Button>
                    <Button disabled={disabled} onClick={handleNext} type="button">
                      Ver finalizacion
                    </Button>
                  </div>
                </section>
              ) : null}

              {step === 'finish' ? (
                <section className="space-y-5 rounded-2xl border border-border/70 bg-background/90 p-5">
                  <SectionHeading
                    icon={FileCheck2}
                    eyebrow="Etapa 4"
                    title={routeCopy.finishTitle}
                    description={routeCopy.finishDescription}
                  />

                  <div className="grid gap-4 lg:grid-cols-2">
                    {depositInstructions.map((instruction) => (
                      <InstructionCard key={instruction.id} instruction={instruction} />
                    ))}
                  </div>

                  <DocumentInputCard
                    file={evidenceFile}
                    label="Comprobante de deposito"
                    description="Adjunta aqui el comprobante final del deposito para cerrar esta etapa."
                    onFileChange={setEvidenceFile}
                  />

                  <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                    El expediente se creara con estado `created`. Cuando el comprobante del deposito quede adjunto, la orden pasara a `waiting_deposit`.
                  </div>

                  <div className="flex items-center justify-between">
                    <Button onClick={handleBack} type="button" variant="outline">
                      Volver a revision
                    </Button>
                    <Button disabled={disabled || form.formState.isSubmitting} type="submit">
                      {form.formState.isSubmitting ? 'Creando expediente...' : 'Crear expediente'}
                    </Button>
                  </div>
                </section>
              ) : null}
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="border-border/70 bg-sky-50/60">
          <CardHeader>
            <CardTitle>Lectura del expediente</CardTitle>
            <CardDescription>
              La persona siempre sabe en que etapa esta y que datos quedaran visibles para staff.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <PreviewRow icon={Banknote} label="Monto origen" value={String(amountOrigin || 0)} />
            <PreviewRow icon={ArrowRight} label="Monto destino" value={String(form.getValues('amount_converted') || 0)} />
            <PreviewRow icon={ShieldCheck} label="Fee total" value={String(form.getValues('fee_total') || 0)} />
            <PreviewRow icon={Landmark} label="Tipo de cambio" value={String(form.getValues('exchange_rate_applied') || 0)} />
          </CardContent>
        </Card>
        <InfoPanel
          title={routeCopy.routeTitle}
          description={isDepositRouteActive
            ? 'La interfaz muestra solo los datos que el expediente de deposito necesita para cliente y staff.'
            : 'El formulario solo mostrara los campos necesarios para esta operacion.'}
          rows={[
            { label: 'Rail principal', value: getRouteRail(currentRoute.key) },
            { label: 'Moneda origen', value: form.getValues('origin_currency') || 'Pendiente' },
            { label: 'Moneda destino', value: form.getValues('destination_currency') || 'Pendiente' },
          ]}
        />
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Documentos visibles</CardTitle>
            <CardDescription>
              {isDepositRouteActive
                ? 'Puedes verificar que respaldo y comprobante no se confundan antes de crear el expediente.'
                : 'El usuario puede confirmar visualmente lo que ya esta preparando antes de crear el expediente.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {showSupportUpload ? <DocumentSummaryRow label="Respaldo" file={supportFile} /> : null}
            <DocumentSummaryRow label="Comprobante" file={evidenceFile} />
            <div className="rounded-xl border border-dashed border-border/70 p-3 text-xs text-muted-foreground">
              Despues de crear la orden, los archivos entregados quedaran visibles tambien desde Transacciones.
            </div>
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
      origin_currency: 'USDC',
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
    funding_method: route === 'bolivia_to_exterior' ? 'bs' : 'ach',
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

function ProgressRail({ currentStep }: { currentStep: StepKey }) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {STEP_ORDER.map((step, index) => {
        const isCurrent = step === currentStep
        const isReached = STEP_ORDER.indexOf(currentStep) >= index

        return (
          <div
            key={step}
            className={`rounded-2xl border px-4 py-3 text-sm ${isCurrent
              ? 'border-sky-400/70 bg-sky-50'
              : isReached
                ? 'border-emerald-400/40 bg-emerald-50'
                : 'border-border/60 bg-muted/20'
              }`}
          >
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {String(index + 1).padStart(2, '0')}
            </div>
            <div className="mt-1 font-medium text-foreground">{getStepLabel(step)}</div>
          </div>
        )
      })}
    </div>
  )
}

function DocumentInputCard({
  label,
  description,
  file,
  onFileChange,
}: {
  label: string
  description: string
  file: File | null
  onFileChange: (file: File | null) => void
}) {
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const isImage = Boolean(file && file.type.startsWith('image/'))

  return (
    <div className="rounded-2xl border border-border/70 bg-background/85 p-4">
      <div className="mb-3 flex items-start gap-3">
        <div className="rounded-xl border border-border/60 bg-muted/20 p-2 text-muted-foreground">
          <Upload className="size-4" />
        </div>
        <div>
          <div className="font-medium text-foreground">{label}</div>
          <div className="text-sm text-muted-foreground">{description}</div>
        </div>
      </div>
      <Input
        accept={ACCEPTED_UPLOADS}
        onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        type="file"
      />
      <div className="mt-3 rounded-xl border border-dashed border-border/70 bg-muted/15 p-3">
        {file ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-foreground">{file.name}</div>
                <div className="text-xs text-muted-foreground">{Math.round(file.size / 1024)} KB</div>
              </div>
              {previewUrl ? (
                <a className="text-sm font-medium text-primary underline-offset-4 hover:underline" href={previewUrl} rel="noreferrer" target="_blank">
                  Abrir
                </a>
              ) : null}
            </div>
            {isImage && previewUrl ? (
              <Image
                alt={file.name}
                className="h-40 w-full rounded-xl border border-border/60 object-cover"
                height={160}
                src={previewUrl}
                unoptimized
                width={640}
              />
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/80 px-3 py-2 text-sm text-muted-foreground">
                <FileText className="size-4" />
                Vista previa disponible en una pestaña nueva.
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Aun no seleccionaste un archivo.</div>
        )}
      </div>
    </div>
  )
}

function InstructionCard({ instruction }: { instruction: DepositInstruction }) {
  const accentClass =
    instruction.accent === 'emerald'
      ? 'border-emerald-300/60 bg-emerald-50'
      : instruction.accent === 'amber'
        ? 'border-amber-300/60 bg-amber-50'
        : 'border-sky-300/60 bg-sky-50'

  return (
    <div className={`rounded-2xl border p-4 ${accentClass}`}>
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
        {instruction.kind === 'wallet' ? <Wallet className="size-4" /> : <Landmark className="size-4" />}
        {instruction.title}
      </div>
      <div className="text-sm text-muted-foreground">{instruction.detail}</div>
    </div>
  )
}

function DocumentSummaryRow({ label, file }: { label: string; file: File | null }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{file?.name ?? 'Pendiente'}</span>
    </div>
  )
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
    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/80 px-3 py-2">
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
            <Input {...field} disabled={disabled} min={0.01} step="0.01" type="number" />
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

function InfoPanel({
  title,
  description,
  rows,
}: {
  title: string
  description: string
  rows: Array<{ label: string; value: string }>
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/15 p-4">
      <div className="font-medium text-foreground">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{description}</div>
      <div className="mt-4 space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between rounded-xl border border-border/60 bg-background/85 px-3 py-2 text-sm">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-medium text-foreground">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
    </div>
  )
}

function getStepLabel(step: StepKey) {
  switch (step) {
    case 'route':
      return 'Ruta'
    case 'detail':
      return 'Detalle'
    case 'review':
      return 'Revision'
    case 'finish':
      return 'Finalizacion'
  }
}

function getRouteRail(route: SupportedPaymentRoute) {
  switch (route) {
    case 'bolivia_to_exterior':
      return 'SWIFT / ACH / DIGITAL_NETWORK'
    case 'us_to_bolivia':
      return 'SWIFT / ACH / DIGITAL_NETWORK'
    case 'us_to_wallet':
      return 'PSAV'
    case 'crypto_to_crypto':
      return 'DIGITAL_NETWORK'
  }
}

function getAmountLabel(route: SupportedPaymentRoute) {
  switch (route) {
    case 'bolivia_to_exterior':
      return 'Monto en bolivianos'
    case 'us_to_bolivia':
      return 'Monto a depositar'
    case 'us_to_wallet':
      return 'Monto en USD a fondear'
    case 'crypto_to_crypto':
      return 'Monto en USDC'
  }
}

function getDestinationLabel(route: SupportedPaymentRoute) {
  switch (route) {
    case 'bolivia_to_exterior':
      return 'Cuenta o destino del beneficiario'
    case 'us_to_bolivia':
      return 'Cuenta destino o medio de recepcion'
    case 'us_to_wallet':
      return 'Direccion de la billetera'
    case 'crypto_to_crypto':
      return 'Direccion del beneficiario'
  }
}

function isDepositRoute(route: SupportedPaymentRoute) {
  return DEPOSIT_ROUTES.includes(route)
}

function buildReviewItems(args: {
  route: SupportedPaymentRoute
  values: PaymentOrderFormValues
  routeLabel: string
  supplierName: string
  supportFileName?: string
  evidenceFileName?: string
}) {
  const items = [
    { label: 'Ruta', value: args.routeLabel },
    { label: 'Monto origen', value: `${args.values.amount_origin} ${args.values.origin_currency}` },
    { label: 'Monto destino', value: `${args.values.amount_converted} ${args.values.destination_currency}` },
    { label: 'Destino', value: args.values.destination_address || 'Pendiente' },
  ]

  if (args.route !== 'us_to_wallet') {
    items.splice(1, 0, { label: 'Proveedor', value: args.supplierName })
  }

  if (!isDepositRoute(args.route)) {
    items.push({ label: 'Motivo', value: args.values.payment_reason || 'Pendiente' })
  }

  if (args.route === 'us_to_bolivia' || !isDepositRoute(args.route)) {
    items.push({ label: 'Respaldo', value: args.supportFileName ?? 'No adjuntado' })
  }

  if (!isDepositRoute(args.route)) {
    items.push({ label: 'Comprobante', value: args.evidenceFileName ?? 'Se cargara despues' })
  }

  return items
}

function getStepFields({
  route,
  deliveryMethod,
}: {
  route: SupportedPaymentRoute
  deliveryMethod: PaymentOrderFormValues['delivery_method']
}): FieldPath<PaymentOrderFormValues>[] {
  const fields: FieldPath<PaymentOrderFormValues>[] = [
    'amount_origin',
    'origin_currency',
    'destination_currency',
    'destination_address',
  ]

  if (route !== 'us_to_wallet') {
    fields.push('supplier_id', 'delivery_method')
  }

  if (!isDepositRoute(route)) {
    fields.push('payment_reason', 'stablecoin')
  }

  if (route === 'bolivia_to_exterior') {
    fields.push('funding_method')
  }

  if (deliveryMethod === 'swift' && route === 'bolivia_to_exterior') {
    fields.push('swift_bank_name', 'swift_code', 'swift_iban', 'swift_bank_address', 'swift_country')
  }

  if (deliveryMethod === 'ach' && route === 'bolivia_to_exterior') {
    fields.push('ach_routing_number', 'ach_account_number', 'ach_bank_name')
  }

  if (deliveryMethod === 'crypto' || route === 'us_to_wallet') {
    fields.push('crypto_address', 'crypto_network')
  }

  return fields
}
