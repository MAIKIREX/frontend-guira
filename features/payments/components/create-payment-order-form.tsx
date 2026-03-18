'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  useForm,
  useWatch,
  type Control,
  type FieldPath,
  type Resolver,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  CheckCircle2,
  CircleAlert,
  FileCheck2,
  FileText,
  Landmark,
  Network,
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
} from '@/features/payments/lib/deposit-instructions'
import { DepositInstructionCard } from '@/features/payments/components/deposit-instruction-card'
import { CRYPTO_NETWORK_OPTIONS, resolveCryptoNetwork } from '@/features/payments/lib/crypto-networks'
import {
  paymentOrderSchema,
  type PaymentOrderFormValues,
} from '@/features/payments/schemas/payment-order.schema'
import type {
  AppSettingRow,
  CreatePaymentOrderInput,
  FeeConfigRow,
  PaymentOrder,
  PsavConfigRow,
  ReceiveVariant,
  UiMethodGroup,
} from '@/types/payment-order'
import type { Supplier } from '@/types/supplier'
import { ACCEPTED_UPLOADS } from '@/lib/file-validation'

type StepKey = 'route' | 'method' | 'detail' | 'review' | 'finish'

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
  onUploadOrderFile: (orderId: string, field: 'support_document_url' | 'evidence_url', file: File) => Promise<unknown>
  feesConfig: FeeConfigRow[]
  appSettings: AppSettingRow[]
  psavConfigs: PsavConfigRow[]
}

const STEP_ORDER: StepKey[] = ['route', 'method', 'detail', 'review', 'finish']
const DEPOSIT_ROUTES: SupportedPaymentRoute[] = ['us_to_bolivia', 'us_to_wallet']

const ROUTE_STAGE_COPY: Record<SupportedPaymentRoute, {
  detailTitle: string
  detailDescription: string
  finishTitle: string
  finishDescription: string
}> = {
  us_to_bolivia: {
    detailTitle: 'Completa el expediente de deposito',
    detailDescription: 'Primero eliges como recibir. Luego completas solo los datos necesarios para esa variante.',
    finishTitle: 'Adjunta el comprobante del deposito',
    finishDescription: 'La orden ya fue creada. Desde aqui puedes dejar el comprobante ahora o retomarlo despues.',
  },
  us_to_wallet: {
    detailTitle: 'Configura la wallet de recepcion',
    detailDescription: 'Declara el monto y el destino final de tu wallet antes de crear el expediente.',
    finishTitle: 'Adjunta el comprobante del fondeo',
    finishDescription: 'Las instrucciones PSAV quedan visibles y el comprobante puede adjuntarse ahora o despues.',
  },
  bolivia_to_exterior: {
    detailTitle: 'Completa el expediente de envio',
    detailDescription: 'El detalle cambia segun si el destino final sale por banco o por crypto.',
    finishTitle: 'Deposita contra esta orden',
    finishDescription: 'El expediente ya existe. Ahora puedes ver instrucciones y dejar el comprobante final.',
  },
  crypto_to_crypto: {
    detailTitle: 'Completa el destino cripto',
    detailDescription: 'El destino se toma del proveedor y la orden se crea antes de adjuntar el comprobante final.',
    finishTitle: 'Adjunta el comprobante del fondeo',
    finishDescription: 'La orden digital ya fue creada. Puedes adjuntar el comprobante final o continuar despues.',
  },
}

export function CreatePaymentOrderForm({
  userId,
  suppliers,
  defaultRoute,
  allowedRoutes,
  disabled,
  onCreateOrder,
  onUploadOrderFile,
  feesConfig,
  appSettings,
  psavConfigs,
}: CreatePaymentOrderFormProps) {
  const [step, setStep] = useState<StepKey>('route')
  const [supportFile, setSupportFile] = useState<File | null>(null)
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [createdOrder, setCreatedOrder] = useState<PaymentOrder | null>(null)
  const [creatingOrder, setCreatingOrder] = useState(false)
  const [uploadingEvidence, setUploadingEvidence] = useState(false)

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
  const originCurrency = useWatch({ control: form.control, name: 'origin_currency' })
  const destinationCurrency = useWatch({ control: form.control, name: 'destination_currency' })
  const liveValues = useWatch({ control: form.control }) as PaymentOrderFormValues
  const supplierId = useWatch({ control: form.control, name: 'supplier_id' })
  const cryptoAddress = useWatch({ control: form.control, name: 'crypto_address' })
  const achAccountNumber = useWatch({ control: form.control, name: 'ach_account_number' })
  const receiveVariant = useWatch({ control: form.control, name: 'receive_variant' })
  const uiMethodGroup = useWatch({ control: form.control, name: 'ui_method_group' })
  const exchangeRateApplied = useWatch({ control: form.control, name: 'exchange_rate_applied' })

  const currentRoute = useMemo(
    () => routeOptions.find((entry) => entry.key === route) ?? routeOptions[0] ?? supportedPaymentRoutes[0],
    [route, routeOptions]
  )
  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => supplier.id === supplierId || supplier.name === supplierId) ?? null,
    [supplierId, suppliers]
  )
  const supplierMethods = useMemo(
    () => parseSupplierPaymentMethods(selectedSupplier?.payment_method ?? '', selectedSupplier ?? undefined),
    [selectedSupplier]
  )
  const supplierAchDetails = useMemo(() => getSupplierAchDetails(selectedSupplier), [selectedSupplier])
  const supplierSwiftDetails = useMemo(() => getSupplierSwiftDetails(selectedSupplier), [selectedSupplier])
  const supplierHasCrypto = Boolean(selectedSupplier?.crypto_details?.address)
  const isDepositRouteActive = isDepositRoute(currentRoute.key)
  const routeCopy = ROUTE_STAGE_COPY[currentRoute.key]
  const shouldHideSupplier = currentRoute.key === 'us_to_wallet' || currentRoute.key === 'us_to_bolivia'
  const requiresSupplierSelection = currentRoute.key === 'bolivia_to_exterior' || currentRoute.key === 'crypto_to_crypto'
  const hasSupplierSelected = Boolean(selectedSupplier)
  const showSupportUpload = currentRoute.key === 'us_to_bolivia' || !isDepositRouteActive
  const availableTechnicalMethods = useMemo(
    () => getDeliveryMethodsForRoute(currentRoute.key, uiMethodGroup, supplierMethods),
    [currentRoute.key, uiMethodGroup, supplierMethods]
  )

  const summaryStats = useMemo(() => ({
    exchangeRate: formatExchangeRate(
      exchangeRateApplied || 0,
      originCurrency || '',
      destinationCurrency || ''
    ),
    conversion: formatConversionPreview({
      amountOrigin: Number(amountOrigin) || 0,
      exchangeRateApplied: exchangeRateApplied || 0,
      originCurrency: originCurrency || '',
      destinationCurrency: destinationCurrency || '',
    }),
  }), [amountOrigin, exchangeRateApplied, originCurrency, destinationCurrency])

  const supplierValidationMessage = useMemo(
    () => getSupplierValidationMessage({
      route: currentRoute.key,
      selectedSupplier,
      deliveryMethod,
      uiMethodGroup,
      supplierAchDetails,
      supplierSwiftDetails,
      supplierHasCrypto,
    }),
    [currentRoute.key, selectedSupplier, deliveryMethod, uiMethodGroup, supplierAchDetails, supplierSwiftDetails, supplierHasCrypto]
  )
  const hasSupplierObservation = Boolean(supplierValidationMessage && hasSupplierSelected)
  const shouldShowExpandedDetail = (!requiresSupplierSelection || hasSupplierSelected || shouldHideSupplier) && !hasSupplierObservation

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
      values: liveValues,
      enteredAmountOrigin: Number(amountOrigin) || 0,
      routeLabel: currentRoute.label,
      supplierName: selectedSupplier?.name ?? 'Sin proveedor',
      receiveVariant,
      uiMethodGroup,
      supportFileName: supportFile?.name,
      evidenceFileName: evidenceFile?.name,
    }),
    [amountOrigin, currentRoute.key, currentRoute.label, evidenceFile?.name, liveValues, receiveVariant, selectedSupplier?.name, supportFile?.name, uiMethodGroup]
  )

  useEffect(() => {
    form.reset(getDefaultValues(resolvedDefaultRoute))
    setCreatedOrder(null)
    setSupportFile(null)
    setEvidenceFile(null)
    setStep('route')
  }, [form, resolvedDefaultRoute])

  useEffect(() => {
    if (route === 'bolivia_to_exterior') {
      form.setValue('origin_currency', 'Bs')
      form.setValue('destination_currency', 'USD')
      form.setValue('funding_method', 'bs')
      if (!form.getValues('ui_method_group')) form.setValue('ui_method_group', 'bank')
    }

    if (route === 'us_to_bolivia') {
      form.setValue('origin_currency', 'USD')
      form.setValue('destination_currency', 'Bs')
      if (!form.getValues('receive_variant')) form.setValue('receive_variant', 'bank_account')
      form.setValue('delivery_method', 'ach')
      form.setValue('supplier_id', '')
    }

    if (route === 'us_to_wallet') {
      form.setValue('origin_currency', 'USD')
      form.setValue('destination_currency', 'USD')
      form.setValue('delivery_method', 'ach')
      form.setValue('receive_variant', 'wallet')
      form.setValue('stablecoin', 'USDC')
      form.setValue('crypto_network', resolveCryptoNetwork(form.getValues('crypto_network')))
      form.setValue('supplier_id', '')
      form.setValue('ui_method_group', undefined)
    }

    if (route === 'crypto_to_crypto') {
      form.setValue('origin_currency', 'USDC')
      form.setValue('destination_currency', 'USDC')
      form.setValue('delivery_method', 'crypto')
      form.setValue('stablecoin', 'USDC')
      form.setValue('ui_method_group', 'crypto')
    }
  }, [form, route])

  useEffect(() => {
    if (route === 'us_to_bolivia' && receiveVariant === 'bank_qr') {
      form.setValue('supplier_id', '')
      form.setValue('delivery_method', 'ach')
      form.setValue('destination_address', 'QR Bolivia')
      form.setValue('ach_bank_name', '')
      form.setValue('ach_account_number', '')
      form.setValue('ach_routing_number', '')
      form.setValue('crypto_address', '')
      form.setValue('crypto_network', '')
    }

    if (route === 'us_to_bolivia' && receiveVariant === 'bank_account') {
      form.setValue('supplier_id', '')
      form.setValue('delivery_method', 'ach')
      form.setValue('ach_routing_number', '')
      form.setValue('destination_address', achAccountNumber || 'Cuenta Bolivia')
    }

    if (route === 'us_to_wallet') {
      form.setValue('destination_address', cryptoAddress || '')
    }

    if (route === 'bolivia_to_exterior' && uiMethodGroup === 'crypto') {
      form.setValue('delivery_method', 'crypto')
    }
  }, [achAccountNumber, cryptoAddress, form, receiveVariant, route, uiMethodGroup])

  useEffect(() => {
    if (availableTechnicalMethods.length === 0) return

    const currentMethod = String(form.getValues('delivery_method') ?? '')
    if (!(availableTechnicalMethods as string[]).includes(currentMethod)) {
      form.setValue('delivery_method', availableTechnicalMethods[0] as PaymentOrderFormValues['delivery_method'], {
        shouldValidate: true,
      })
    }
  }, [availableTechnicalMethods, form])

  useEffect(() => {
    if (route === 'us_to_bolivia') return
    if (!selectedSupplier) return
    if (route === 'us_to_wallet') return

    let preferredMethod = currentRoute.supportedDeliveryMethods.find((method) =>
      supplierMethods.includes(method as 'crypto' | 'ach' | 'swift')
    )

    if (route === 'bolivia_to_exterior') {
      preferredMethod = uiMethodGroup === 'crypto'
        ? 'crypto'
        : supplierMethods.includes('ach')
          ? 'ach'
          : supplierMethods.includes('swift')
            ? 'swift'
            : preferredMethod
    }

    if (route === 'crypto_to_crypto') {
      preferredMethod = 'crypto'
    }

    if (!preferredMethod) return

    form.setValue('delivery_method', preferredMethod)
  }, [currentRoute.supportedDeliveryMethods, form, receiveVariant, route, selectedSupplier, supplierAchDetails, supplierMethods, supplierSwiftDetails, uiMethodGroup])

  useEffect(() => {
    if (route === 'us_to_bolivia') return
    if (route === 'us_to_wallet') return
    if (!selectedSupplier) return

    if (deliveryMethod === 'swift' && supplierSwiftDetails) {
      form.setValue('destination_address', selectedSupplier.address || supplierSwiftDetails.account_number || '')
      form.setValue('swift_bank_name', supplierSwiftDetails.bank_name || '')
      form.setValue('swift_code', supplierSwiftDetails.swift_code || '')
      form.setValue('swift_country', supplierSwiftDetails.bank_country || selectedSupplier.country || '')
      form.setValue('swift_iban', supplierSwiftDetails.iban || supplierSwiftDetails.account_number || '')
      form.setValue('swift_bank_address', supplierSwiftDetails.bank_address || selectedSupplier.address || '')
      return
    }

    if (deliveryMethod === 'ach' && supplierAchDetails) {
      form.setValue('destination_address', selectedSupplier.address || supplierAchDetails.account_number || '')
      form.setValue('ach_bank_name', supplierAchDetails.bank_name || '')
      form.setValue('ach_routing_number', supplierAchDetails.routing_number || '')
      form.setValue('ach_account_number', supplierAchDetails.account_number || '')
      return
    }

    if (deliveryMethod === 'crypto' && selectedSupplier.crypto_details?.address) {
      form.setValue('destination_address', selectedSupplier.crypto_details.address)
      form.setValue('crypto_address', selectedSupplier.crypto_details.address)
      form.setValue('crypto_network', selectedSupplier.crypto_details.network || 'Polygon')
    }
  }, [deliveryMethod, form, route, selectedSupplier, supplierAchDetails, supplierSwiftDetails])

  useEffect(() => {
    const estimate = estimateRouteValues({
      amountOrigin: Number(amountOrigin) || 0,
      route: currentRoute.key,
      originCurrency: originCurrency || '',
      destinationCurrency: destinationCurrency || '',
      appSettings,
      feesConfig,
    })

    form.setValue('amount_converted', estimate.amountConverted)
    form.setValue('exchange_rate_applied', estimate.exchangeRateApplied)
    form.setValue('fee_total', estimate.feeTotal)
    form.setValue('intended_amount', estimate.amountConverted || 0)
  }, [amountOrigin, appSettings, currentRoute.key, destinationCurrency, feesConfig, form, originCurrency])

  async function handleCreateOrder() {
    try {
      setCreatingOrder(true)
      const order = await onCreateOrder(buildPaymentOrderPayload(form.getValues(), userId), supportFile, null) as PaymentOrder
      setCreatedOrder(order)
      setStep('finish')
      toast.success('Expediente creado. Ahora puedes adjuntar el comprobante final o hacerlo despues.')
    } catch (error) {
      console.error('Failed to create payment order', error)
      toast.error('No se pudo crear el expediente.')
    } finally {
      setCreatingOrder(false)
    }
  }

  async function handleFinishEvidenceUpload() {
    if (!createdOrder) {
      toast.error('Primero debes crear el expediente.')
      return
    }

    if (!evidenceFile) {
      toast.success('El expediente ya fue creado. Puedes subir el comprobante mas tarde desde Seguimiento.')
      resetFlow(form, setStep, setSupportFile, setEvidenceFile, setCreatedOrder)
      return
    }

    try {
      setUploadingEvidence(true)
      await onUploadOrderFile(createdOrder.id, 'evidence_url', evidenceFile)
      toast.success('Comprobante adjuntado. La orden paso a waiting_deposit.')
      resetFlow(form, setStep, setSupportFile, setEvidenceFile, setCreatedOrder)
    } catch (error) {
      console.error('Failed to upload evidence', error)
      toast.error('No se pudo adjuntar el comprobante final.')
    } finally {
      setUploadingEvidence(false)
    }
  }

  async function handleNext() {
    if (step === 'method') {
      const isValidMethod = await form.trigger(getMethodStepFields(route), { shouldFocus: true })
      if (!isValidMethod) return
    }

    if (step === 'detail') {
      if (supplierValidationMessage) {
        toast.error(supplierValidationMessage)
        return
      }

      if (route === 'crypto_to_crypto' && !supportFile) {
        toast.error('Debes adjuntar el documento de respaldo antes de continuar.')
        return
      }

      if (route === 'us_to_bolivia' && receiveVariant === 'bank_qr' && !supportFile) {
        toast.error('Adjunta el QR bancario o respaldo para continuar.')
        return
      }

      const isValidDetail = await form.trigger(getDetailStepFields({
        route,
        deliveryMethod,
        receiveVariant,
        uiMethodGroup,
        hasSupplierSelected,
      }), { shouldFocus: true })

      if (!isValidDetail) return
    }

    if (step === 'review') {
      await handleCreateOrder()
      return
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
    <div className="space-y-6">
      <Card className="border-border/70 bg-muted/10">
        <CardHeader className="border-b border-border/60 bg-background/90">
          <CardTitle>{isDepositRouteActive ? 'Depositar por expediente' : 'Enviar por expediente'}</CardTitle>
          <CardDescription>
            El flujo ahora separa ruta, metodo, detalle, revision y finalizacion para que cada etapa muestre solo lo necesario.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <ProgressRail currentStep={step} />

          <Form {...form}>
            <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
              {step === 'route' ? (
                <section className="space-y-4 rounded-2xl border border-border/70 bg-background/90 p-5">
                  <SectionHeading
                    icon={Landmark}
                    eyebrow="Etapa 1"
                    title="Escoge la ruta del expediente"
                    description="La ruta define el expediente tecnico, las monedas iniciales y el tipo de instrucciones que veras al final."
                  />
                  <FormField
                    control={form.control}
                    name="route"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ruta soportada</FormLabel>
                        <FormControl>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {routeOptions.map((entry) => (
                              <SelectionCard
                                key={entry.key}
                                description={entry.description}
                                disabled={disabled}
                                icon={Landmark}
                                isSelected={field.value === entry.key}
                                onClick={() => {
                                  field.onChange(entry.key)
                                  setCreatedOrder(null)
                                  setSupportFile(null)
                                  setEvidenceFile(null)
                                }}
                                title={entry.label}
                              />
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button disabled={disabled} onClick={handleNext} type="button">
                      Continuar a metodo
                    </Button>
                  </div>
                </section>
              ) : null}

              {step === 'method' ? (
                <section className="space-y-5 rounded-2xl border border-border/70 bg-background/90 p-5">
                  <SectionHeading
                    icon={currentRoute.key === 'crypto_to_crypto' ? Network : Wallet}
                    eyebrow="Etapa 2"
                    title={getMethodTitle(currentRoute.key)}
                    description={getMethodDescription(currentRoute.key)}
                  />
                  {currentRoute.key === 'us_to_bolivia' ? (
                    <FormField
                      control={form.control}
                      name="receive_variant"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Como quieres recibir en Bolivia</FormLabel>
                          <FormControl>
                            <div className="grid gap-3 md:grid-cols-2">
                              <SelectionCard
                                description="Usa un proveedor con cuenta bancaria local y autocompleta la recepcion."
                                disabled={disabled}
                                icon={Landmark}
                                isSelected={field.value === 'bank_account'}
                                onClick={() => field.onChange('bank_account')}
                                title="Recibir en cuenta bancaria"
                              />
                              <SelectionCard
                                description="Adjunta el QR bancario o respaldo y crea el expediente sin proveedor."
                                disabled={disabled}
                                icon={FileText}
                                isSelected={field.value === 'bank_qr'}
                                onClick={() => field.onChange('bank_qr')}
                                title="Recibir por QR"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : null}

                  {currentRoute.key === 'bolivia_to_exterior' ? (
                    <FormField
                      control={form.control}
                      name="ui_method_group"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Grupo de metodo</FormLabel>
                          <FormControl>
                            <div className="grid gap-3 md:grid-cols-2">
                              <SelectionCard
                                description="Entrega bancaria usando ACH o SWIFT segun los datos del proveedor."
                                disabled={disabled}
                                icon={Landmark}
                                isSelected={field.value === 'bank'}
                                onClick={() => field.onChange('bank')}
                                title="ACH o SWIFT"
                              />
                              <SelectionCard
                                description="Entrega a wallet o direccion crypto del proveedor."
                                disabled={disabled}
                                icon={Network}
                                isSelected={field.value === 'crypto'}
                                onClick={() => field.onChange('crypto')}
                                title="Crypto"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : null}

                  {currentRoute.key === 'us_to_wallet' ? (
                    <SelectionCard
                      description="El fondeo tecnico sigue por PSAV y el destino final sera tu wallet."
                      disabled={disabled}
                      icon={Wallet}
                      isSelected
                      onClick={() => form.setValue('receive_variant', 'wallet')}
                      title="Recibir en tu billetera cripto"
                    />
                  ) : null}

                  {currentRoute.key === 'crypto_to_crypto' ? (
                    <SelectionCard
                      description="La salida es digital y el destino final se toma del proveedor cripto."
                      disabled={disabled}
                      icon={Network}
                      isSelected
                      onClick={() => form.setValue('ui_method_group', 'crypto')}
                      title="Enviar a wallet cripto"
                    />
                  ) : null}

                  <div className="flex items-center justify-between">
                    <Button onClick={handleBack} type="button" variant="outline">
                      Volver
                    </Button>
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
                    eyebrow="Etapa 3"
                    title={routeCopy.detailTitle}
                    description={routeCopy.detailDescription}
                  />

                  <div className="grid gap-4">
                    <NumericField control={form.control} disabled={disabled} label={getAmountLabel(currentRoute.key)} name="amount_origin" />
                    <InlineSummaryBar exchangeRate={summaryStats.exchangeRate} conversion={summaryStats.conversion} />

                    {!shouldHideSupplier ? (
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
                              Debes crear un proveedor con los datos correctos antes de usar esta opcion.
                            </p>
                            <div className="flex flex-wrap items-center gap-3">
                              <Link
                                className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
                                href="/proveedores"
                              >
                                Ir a Proveedores
                              </Link>
                              <span className="text-xs text-muted-foreground">Crea o completa el proveedor y vuelve a esta operacion.</span>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : null}

                    {supplierValidationMessage && hasSupplierSelected ? <ValidationNotice message={supplierValidationMessage} /> : null}

                    {currentRoute.key === 'us_to_bolivia' && receiveVariant === 'bank_qr' ? (
                      <DocumentInputCard
                        file={supportFile}
                        label="QR bancario o respaldo"
                        description="Adjunta el QR bancario o respaldo. Se guardara como support_document_url."
                        onFileChange={setSupportFile}
                      />
                    ) : null}

                    {shouldShowExpandedDetail ? (
                      <>
                        <div className={`grid gap-4 ${shouldHideSupplier ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
                          <TextField control={form.control} disabled={disabled} label="Moneda origen" name="origin_currency" />
                          <TextField control={form.control} disabled={disabled} label="Moneda destino" name="destination_currency" />
                          {!shouldHideSupplier ? (
                            <FormField
                              control={form.control}
                              name="delivery_method"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Metodo tecnico final</FormLabel>
                                  <FormControl>
                                    <Select
                                      value={field.value}
                                      onValueChange={field.onChange}
                                      disabled={disabled || route === 'crypto_to_crypto' || (route === 'bolivia_to_exterior' && uiMethodGroup === 'crypto') || availableTechnicalMethods.length <= 1}
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {availableTechnicalMethods.map((method) => (
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
                              <NetworkSelectField
                                control={form.control}
                                disabled={disabled}
                                label="Red de recepcion"
                                name="crypto_network"
                                placeholder="Selecciona la red de recepcion"
                              />
                            </div>
                            <AutoFilledPanel
                              title="Metadata autocompletada"
                              rows={buildMetadataPreview({
                                route,
                                deliveryMethod,
                                receiveVariant,
                                uiMethodGroup,
                                values: form.getValues(),
                              })}
                            />
                          </>
                        ) : null}

                        {currentRoute.key === 'us_to_bolivia' && receiveVariant === 'bank_account' ? (
                          <>
                            <div className="grid gap-4 lg:grid-cols-2">
                              <TextField control={form.control} disabled={disabled} label="Banco" name="ach_bank_name" />
                              <TextField control={form.control} disabled={disabled} label="Cuenta bancaria" name="ach_account_number" />
                            </div>
                            <AutoFilledPanel
                              title="Metadata autocompletada"
                              rows={buildMetadataPreview({
                                route,
                                deliveryMethod,
                                receiveVariant,
                                uiMethodGroup,
                                values: form.getValues(),
                              })}
                            />
                          </>
                        ) : null}

                        {currentRoute.key !== 'us_to_wallet' && currentRoute.key !== 'us_to_bolivia' ? (
                          <>
                            {!isDepositRouteActive ? (
                              <TextField control={form.control} disabled={disabled} label="Motivo del pago" name="payment_reason" />
                            ) : null}

                            <div className={`grid gap-4 ${(route === 'bolivia_to_exterior' && uiMethodGroup !== 'crypto') ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
                              {!(route === 'bolivia_to_exterior' && uiMethodGroup === 'crypto') ? (
                                <TextField control={form.control} disabled={disabled} label={getDestinationLabel(currentRoute.key)} name="destination_address" />
                              ) : null}
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

                            {deliveryMethod === 'swift' && (route === 'bolivia_to_exterior' || route === 'us_to_bolivia') ? (
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

                            <AutoFilledPanel
                              title="Metadata autocompletada"
                              rows={buildMetadataPreview({
                                route,
                                deliveryMethod,
                                receiveVariant,
                                uiMethodGroup,
                                values: form.getValues(),
                              })}
                            />
                          </>
                        ) : null}

                        {showSupportUpload && !(currentRoute.key === 'us_to_bolivia' && receiveVariant === 'bank_qr') ? (
                          <DocumentInputCard
                            file={supportFile}
                            label="Documento de respaldo"
                            description={
                              route === 'bolivia_to_exterior'
                                ? 'Opcional en esta ruta. Si lo adjuntas, se guardara como support_document_url al crear la orden.'
                                : 'Se guardara como support_document_url al crear la orden.'
                            }
                            onFileChange={setSupportFile}
                          />
                        ) : null}
                      </>
                    ) : hasSupplierObservation ? (
                      <div className="rounded-xl border border-dashed border-amber-300/70 bg-amber-50 px-4 py-4 text-sm text-amber-950">
                        Corrige primero la observacion del proveedor para habilitar los campos siguientes.
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-border/70 bg-muted/15 px-4 py-4 text-sm text-muted-foreground">
                        Selecciona primero un proveedor valido para mostrar metodo tecnico, monedas y metadata autocompletada.
                      </div>
                    )}
                  </div>

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
                    eyebrow="Etapa 4"
                    title="Revisa antes de crear el expediente"
                    description="En esta etapa se crea la orden en payment_orders con estado created."
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
                    <Button disabled={disabled || creatingOrder} onClick={handleNext} type="button">
                      {creatingOrder ? 'Creando expediente...' : 'Crear expediente'}
                    </Button>
                  </div>
                </section>
              ) : null}

              {step === 'finish' ? (
                <section className="space-y-5 rounded-2xl border border-border/70 bg-background/90 p-5">
                  <SectionHeading
                    icon={FileCheck2}
                    eyebrow="Etapa 5"
                    title={routeCopy.finishTitle}
                    description={routeCopy.finishDescription}
                  />

                  <div className="grid gap-4 lg:grid-cols-2">
                    {depositInstructions.map((instruction) => (
                      <DepositInstructionCard key={instruction.id} instruction={instruction} />
                    ))}
                  </div>

                  <div className="rounded-2xl border border-emerald-400/35 bg-emerald-400/12 p-4 text-sm text-emerald-100">
                    El expediente ya fue creado con estado `created`. Desde aqui puedes dejar el comprobante final o subirlo despues desde Seguimiento.
                  </div>

                  <DocumentInputCard
                    file={evidenceFile}
                    label="Comprobante final"
                    description="Adjunta aqui el comprobante del deposito o fondeo. Se guardara en evidence_url."
                    onFileChange={setEvidenceFile}
                  />

                  <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                    Cuando el comprobante final quede adjunto y la orden siga en `created`, el sistema la movera a `waiting_deposit`.
                  </div>

                  <div className="flex items-center justify-between">
                    <Button
                      disabled={uploadingEvidence}
                      onClick={() => resetFlow(form, setStep, setSupportFile, setEvidenceFile, setCreatedOrder)}
                      type="button"
                      variant="outline"
                    >
                      Finalizar despues
                    </Button>
                    <Button disabled={disabled || uploadingEvidence || !createdOrder} onClick={handleFinishEvidenceUpload} type="button">
                      {uploadingEvidence ? 'Adjuntando comprobante...' : evidenceFile ? 'Adjuntar comprobante y cerrar' : 'Cerrar sin comprobante'}
                    </Button>
                  </div>
                </section>
              ) : null}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

function resetFlow(
  form: ReturnType<typeof useForm<PaymentOrderFormValues>>,
  setStep: (step: StepKey) => void,
  setSupportFile: (file: File | null) => void,
  setEvidenceFile: (file: File | null) => void,
  setCreatedOrder: (order: PaymentOrder | null) => void
) {
  form.reset(getDefaultValues(form.getValues('route')))
  setSupportFile(null)
  setEvidenceFile(null)
  setCreatedOrder(null)
  setStep('route')
}

function getDefaultValues(route: SupportedPaymentRoute): PaymentOrderFormValues {
  if (route === 'us_to_wallet') {
    return {
      route,
      receive_variant: 'wallet',
      ui_method_group: undefined,
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
      crypto_network: 'Polygon',
    }
  }

  if (route === 'crypto_to_crypto') {
    return {
      route,
      receive_variant: undefined,
      ui_method_group: 'crypto',
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
    receive_variant: route === 'us_to_bolivia' ? 'bank_account' : undefined,
    ui_method_group: route === 'bolivia_to_exterior' ? 'bank' : undefined,
    supplier_id: '',
    amount_origin: 0,
    amount_converted: 0,
    fee_total: 0,
    exchange_rate_applied: 1,
    origin_currency: route === 'bolivia_to_exterior' ? 'Bs' : 'USD',
    destination_currency: route === 'bolivia_to_exterior' ? 'USD' : 'Bs',
    delivery_method: route === 'bolivia_to_exterior' ? 'swift' : 'ach',
    payment_reason: '',
    intended_amount: 0,
    destination_address: '',
    stablecoin: 'USDC',
    funding_method: route === 'bolivia_to_exterior' ? 'bs' : undefined,
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
    <div className="grid gap-3 md:grid-cols-5">
      {STEP_ORDER.map((step, index) => {
        const isCurrent = step === currentStep
        const isReached = STEP_ORDER.indexOf(currentStep) >= index

        return (
          <div
            key={step}
            className={`rounded-2xl border px-4 py-3 text-sm ${isCurrent
              ? 'border-cyan-400/45 bg-cyan-400/12'
              : isReached
                ? 'border-emerald-400/30 bg-emerald-400/10'
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

function InlineSummaryBar({ exchangeRate, conversion }: { exchangeRate: string; conversion: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/15 p-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Tipo de cambio</div>
      <div className="mt-1 text-sm font-medium text-foreground">{exchangeRate}</div>
      <div className="mt-2 text-xs text-muted-foreground">{conversion}</div>
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

function NetworkSelectField({
  control,
  name,
  label,
  placeholder,
  disabled,
}: {
  control: Control<PaymentOrderFormValues>
  name: FieldPath<PaymentOrderFormValues>
  label: string
  placeholder: string
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
            <Select disabled={disabled} onValueChange={field.onChange} value={resolveCryptoNetwork(field.value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                {CRYPTO_NETWORK_OPTIONS.map((network) => (
                  <SelectItem key={network} value={network}>
                    {network}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function SelectionCard({
  title,
  description,
  icon: Icon,
  isSelected,
  onClick,
  disabled,
}: {
  title: string
  description: string
  icon: typeof Landmark
  isSelected: boolean
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      aria-pressed={isSelected}
      className={`rounded-2xl border px-4 py-4 text-left transition-colors ${isSelected
        ? 'border-cyan-400/45 bg-cyan-400/12'
        : 'border-border/70 bg-background hover:border-cyan-400/35 hover:bg-cyan-400/8'
        } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <div className="flex items-start gap-3">
        <div className={`rounded-xl border p-2 ${isSelected ? 'border-cyan-400/35 bg-cyan-400/10 text-cyan-300' : 'border-border/60 bg-muted/20 text-muted-foreground'}`}>
          <Icon className="size-4" />
        </div>
        <div>
          <div className="text-sm font-medium text-foreground">{title}</div>
          <div className="mt-1 text-xs leading-5 text-muted-foreground">{description}</div>
        </div>
      </div>
    </button>
  )
}

function AutoFilledPanel({
  title,
  rows,
}: {
  title: string
  rows: Array<{ label: string; value: string }>
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/15 p-4">
      <div className="font-medium text-foreground">{title}</div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="rounded-xl border border-border/60 bg-background/85 px-3 py-2">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{row.label}</div>
            <div className="mt-1 text-sm font-medium text-foreground">{row.value}</div>
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
    case 'method':
      return 'Metodo'
    case 'detail':
      return 'Detalle'
    case 'review':
      return 'Revision'
    case 'finish':
      return 'Finalizacion'
  }
}

function getMethodTitle(route: SupportedPaymentRoute) {
  switch (route) {
    case 'us_to_bolivia':
      return 'Selecciona como quieres recibir'
    case 'us_to_wallet':
      return 'Selecciona el metodo de recepcion'
    case 'bolivia_to_exterior':
      return 'Selecciona el grupo de metodo'
    case 'crypto_to_crypto':
      return 'Selecciona el metodo digital'
  }
}

function getMethodDescription(route: SupportedPaymentRoute) {
  switch (route) {
    case 'us_to_bolivia':
      return 'Esta eleccion define si el detalle se completa con proveedor bancario o con QR.'
    case 'us_to_wallet':
      return 'La recepcion final siempre ocurre en tu wallet, aunque el rail tecnico de fondeo sea PSAV.'
    case 'bolivia_to_exterior':
      return 'Primero eliges si la salida final va por banco o por crypto. Luego se muestran solo los campos de esa rama.'
    case 'crypto_to_crypto':
      return 'La salida final es digital y el detalle se autocompleta desde el proveedor cripto.'
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
      return 'Cuenta destino en Bolivia'
    case 'us_to_wallet':
      return 'Direccion de la billetera'
    case 'crypto_to_crypto':
      return 'Wallet destino'
  }
}

function isDepositRoute(route: SupportedPaymentRoute) {
  return DEPOSIT_ROUTES.includes(route)
}

function getMethodStepFields(route: SupportedPaymentRoute): FieldPath<PaymentOrderFormValues>[] {
  if (route === 'us_to_bolivia') return ['receive_variant']
  if (route === 'bolivia_to_exterior') return ['ui_method_group']
  return []
}

function getDetailStepFields({
  route,
  deliveryMethod,
  receiveVariant,
  uiMethodGroup,
  hasSupplierSelected,
}: {
  route: SupportedPaymentRoute
  deliveryMethod: PaymentOrderFormValues['delivery_method']
  receiveVariant?: ReceiveVariant
  uiMethodGroup?: UiMethodGroup
  hasSupplierSelected: boolean
}): FieldPath<PaymentOrderFormValues>[] {
  const fields: FieldPath<PaymentOrderFormValues>[] = ['amount_origin']

  if (route === 'us_to_bolivia' && receiveVariant === 'bank_account') {
    return [...fields, 'origin_currency', 'destination_currency', 'ach_bank_name', 'ach_account_number']
  }

  if (route === 'us_to_bolivia' && receiveVariant === 'bank_qr') {
    return fields
  }

  if (route === 'us_to_wallet') {
    return [...fields, 'origin_currency', 'destination_currency', 'crypto_address', 'crypto_network']
  }

  if (route === 'bolivia_to_exterior' || route === 'crypto_to_crypto') {
    fields.push('supplier_id')
  }

  if (!hasSupplierSelected) {
    return fields
  }

  fields.push('origin_currency', 'destination_currency', 'delivery_method')

  if (!isDepositRoute(route)) {
    fields.push('payment_reason', 'stablecoin')
  }

  if (route === 'bolivia_to_exterior') {
    fields.push('funding_method')
  }

  if (!(route === 'bolivia_to_exterior' && uiMethodGroup === 'crypto')) {
    fields.push('destination_address')
  }

  if (deliveryMethod === 'swift' && (route === 'bolivia_to_exterior' || route === 'us_to_bolivia')) {
    fields.push('swift_bank_name', 'swift_code', 'swift_iban', 'swift_bank_address', 'swift_country')
  }

  if (deliveryMethod === 'ach' && (route === 'bolivia_to_exterior' || route === 'us_to_bolivia')) {
    fields.push('ach_routing_number', 'ach_account_number', 'ach_bank_name')
  }

  if (deliveryMethod === 'crypto') {
    fields.push('crypto_address', 'crypto_network')
  }

  return fields
}

function buildReviewItems(args: {
  route: SupportedPaymentRoute
  values: PaymentOrderFormValues
  enteredAmountOrigin: number
  routeLabel: string
  supplierName: string
  receiveVariant?: ReceiveVariant
  uiMethodGroup?: UiMethodGroup
  supportFileName?: string
  evidenceFileName?: string
}) {
  const items: Array<{ label: string; value: string }> = [
    { label: 'Ruta', value: args.routeLabel },
    { label: 'Monto ingresado', value: formatMoney(args.enteredAmountOrigin, args.values.origin_currency) },
    { label: 'Tipo de cambio', value: formatExchangeRate(args.values.exchange_rate_applied, args.values.origin_currency, args.values.destination_currency) },
  ]

  if (args.receiveVariant) {
    items.push({ label: 'Variante', value: args.receiveVariant })
  }

  if (args.uiMethodGroup) {
    items.push({ label: 'Grupo', value: args.uiMethodGroup })
  }

  if (args.route === 'us_to_bolivia') {
    items.push({ label: 'Metodo tecnico', value: 'ach' })

    if (args.receiveVariant === 'bank_account') {
      items.push({ label: 'Banco', value: args.values.ach_bank_name || 'Pendiente' })
      items.push({ label: 'Cuenta bancaria', value: args.values.ach_account_number || 'Pendiente' })
    }

    if (args.receiveVariant === 'bank_qr') {
      items.push({ label: 'Respaldo QR', value: args.supportFileName ?? 'No adjuntado' })
    }
  }

  if (args.route === 'us_to_wallet') {
    items.push({ label: 'Rail tecnico', value: 'PSAV' })
    items.push({ label: 'Wallet destino', value: args.values.crypto_address || 'Pendiente' })
    items.push({ label: 'Red', value: args.values.crypto_network || 'Pendiente' })
  }

  if (args.route === 'bolivia_to_exterior') {
    items.push({ label: 'Proveedor', value: args.supplierName })
    items.push({ label: 'Metodo tecnico', value: args.values.delivery_method || 'Pendiente' })
    items.push({ label: 'Funding method', value: args.values.funding_method || 'Pendiente' })
    items.push({ label: 'Motivo', value: args.values.payment_reason || 'Pendiente' })

    if (args.uiMethodGroup === 'bank') {
      if (args.values.delivery_method === 'ach') {
        items.push({ label: 'Banco ACH', value: args.values.ach_bank_name || 'Pendiente' })
        items.push({ label: 'Cuenta ACH', value: args.values.ach_account_number || 'Pendiente' })
      }

      if (args.values.delivery_method === 'swift') {
        items.push({ label: 'Banco SWIFT', value: args.values.swift_bank_name || 'Pendiente' })
        items.push({ label: 'Codigo SWIFT', value: args.values.swift_code || 'Pendiente' })
      }

      items.push({ label: 'Destino', value: args.values.destination_address || 'Pendiente' })
    }

    if (args.uiMethodGroup === 'crypto') {
      items.push({ label: 'Wallet destino', value: args.values.crypto_address || 'Pendiente' })
      items.push({ label: 'Red', value: args.values.crypto_network || 'Pendiente' })
    }

    items.push({ label: 'Respaldo', value: args.supportFileName ?? 'No adjuntado' })
  }

  if (args.route === 'crypto_to_crypto') {
    items.push({ label: 'Proveedor', value: args.supplierName })
    items.push({ label: 'Metodo tecnico', value: 'crypto' })
    items.push({ label: 'Wallet destino', value: args.values.crypto_address || 'Pendiente' })
    items.push({ label: 'Red', value: args.values.crypto_network || 'Pendiente' })
    items.push({ label: 'Motivo', value: args.values.payment_reason || 'Pendiente' })
    items.push({ label: 'Respaldo', value: args.supportFileName ?? 'No adjuntado' })
  }

  items.push({ label: 'Comprobante final', value: args.evidenceFileName ?? 'Se cargara en la etapa final' })

  return items.filter((item, index, array) => array.findIndex((entry) => entry.label === item.label) === index)
}

function getDeliveryMethodsForRoute(
  route: SupportedPaymentRoute,
  uiMethodGroup: UiMethodGroup | undefined,
  supplierMethods: Array<'crypto' | 'ach' | 'swift'>
) {
  if (route === 'crypto_to_crypto') return ['crypto']
  if (route === 'bolivia_to_exterior' && uiMethodGroup === 'crypto') return ['crypto']
  if (route === 'bolivia_to_exterior' && uiMethodGroup === 'bank') {
    return ['ach', 'swift'].filter((method) => supplierMethods.includes(method as 'ach' | 'swift'))
  }
  if (route === 'us_to_bolivia') {
    return ['ach']
  }
  return ['ach']
}

function ValidationNotice({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <CircleAlert className="mt-0.5 size-4 shrink-0" />
      <p>{message}</p>
    </div>
  )
}

function buildMetadataPreview({
  route,
  deliveryMethod,
  receiveVariant,
  uiMethodGroup,
  values,
}: {
  route: SupportedPaymentRoute
  deliveryMethod: PaymentOrderFormValues['delivery_method']
  receiveVariant?: ReceiveVariant
  uiMethodGroup?: UiMethodGroup
  values: PaymentOrderFormValues
}) {
  const rows: Array<{ label: string; value: string }> = [
    { label: 'route', value: route },
    { label: 'delivery_method', value: deliveryMethod },
  ]

  if (receiveVariant) rows.push({ label: 'receive_variant', value: receiveVariant })
  if (uiMethodGroup) rows.push({ label: 'ui_method_group', value: uiMethodGroup })
  if (values.destination_address) rows.push({ label: 'destination_address', value: values.destination_address })
  if (values.crypto_address) rows.push({ label: 'crypto_address', value: values.crypto_address })
  if (values.crypto_network) rows.push({ label: 'crypto_network', value: values.crypto_network })
  if (values.ach_bank_name) rows.push({ label: 'ach.bank_name', value: values.ach_bank_name })
  if (values.swift_bank_name) rows.push({ label: 'swift.bank_name', value: values.swift_bank_name })

  return rows
}

function getSupplierValidationMessage({
  route,
  selectedSupplier,
  deliveryMethod,
  uiMethodGroup,
  supplierAchDetails,
  supplierSwiftDetails,
  supplierHasCrypto,
}: {
  route: SupportedPaymentRoute
  selectedSupplier: Supplier | null
  deliveryMethod: PaymentOrderFormValues['delivery_method']
  uiMethodGroup?: UiMethodGroup
  supplierAchDetails?: ReturnType<typeof getSupplierAchDetails>
  supplierSwiftDetails?: ReturnType<typeof getSupplierSwiftDetails>
  supplierHasCrypto: boolean
}) {
  if (route === 'us_to_wallet') return null
  if (route === 'us_to_bolivia') return null
  if ((route === 'bolivia_to_exterior' || route === 'crypto_to_crypto') && !selectedSupplier) {
    return null
  }

  if (route === 'bolivia_to_exterior') {
    if (uiMethodGroup === 'crypto') {
      if (!supplierHasCrypto) return 'El proveedor necesita una wallet valida para usar la salida crypto.'
      return null
    }
    if (!supplierAchDetails && !supplierSwiftDetails) {
      return 'El proveedor debe tener datos bancarios ACH o SWIFT para esta ruta.'
    }
    if (deliveryMethod === 'ach' && !supplierAchDetails) return 'El proveedor no tiene datos ACH completos.'
    if (deliveryMethod === 'swift' && !supplierSwiftDetails) return 'El proveedor no tiene datos SWIFT completos.'
  }

  if (route === 'crypto_to_crypto' && !supplierHasCrypto) {
    return 'El proveedor necesita una wallet destino antes de continuar.'
  }

  return null
}

function formatMoney(value: number, currency?: string) {
  const normalized = Number.isFinite(value) ? value : 0
  return `${normalized.toFixed(2)} ${currency ?? ''}`.trim()
}

function formatExchangeRate(value: number, originCurrency?: string, destinationCurrency?: string) {
  const normalized = Number.isFinite(value) ? value : 0
  const origin = originCurrency || 'Origen'
  const destination = destinationCurrency || 'Destino'
  return `1 ${origin} = ${normalized.toFixed(4)} ${destination}`
}

function formatConversionPreview(args: {
  amountOrigin: number
  exchangeRateApplied: number
  originCurrency: string
  destinationCurrency: string
}) {
  const amount = Number.isFinite(args.amountOrigin) ? args.amountOrigin : 0
  const rate = Number.isFinite(args.exchangeRateApplied) ? args.exchangeRateApplied : 0
  const origin = args.originCurrency || 'Origen'
  const destination = args.destinationCurrency || 'Destino'

  let converted = amount

  if (origin.trim().toUpperCase() !== destination.trim().toUpperCase()) {
    converted = amount * rate
  }

  return `${formatMoney(amount, origin)} -> ${formatMoney(converted, destination)}`
}

