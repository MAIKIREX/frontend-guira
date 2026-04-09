'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
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
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { WalletService, type WalletBalance } from '@/services/wallet.service'
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
  type ExchangeRateRecord,
} from '@/features/payments/lib/deposit-instructions'
import { DepositInstructionCard } from '@/features/payments/components/deposit-instruction-card'
import { DocumentUploadCard } from '@/components/shared/document-upload-card'
import { AnimatedNextButton } from '@/components/shared/animated-next-button'
import { AnimatedBackButton } from '@/components/shared/animated-back-button'
import { StepProgressRail } from '@/features/payments/components/step-progress-rail'
import { CRYPTO_NETWORK_OPTIONS, CRYPTO_NETWORK_LABELS, resolveCryptoNetwork } from '@/features/payments/lib/crypto-networks'
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
import { cn, interactiveClickableCardClassName } from '@/lib/utils'

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
  exchangeRates: ExchangeRateRecord[]
}

const STEP_ORDER: StepKey[] = ['route', 'method', 'detail', 'review', 'finish']
const DEPOSIT_ROUTES: SupportedPaymentRoute[] = ['world_to_bolivia', 'us_to_wallet']
const FORM_LABEL_CLASS = 'text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground'
const FORM_TEXT_CLASS = 'tracking-[0.01em]'
const FORM_UNDERLINE_INPUT_CLASS = 'h-11 rounded-none border-0 border-b border-input bg-transparent px-0 py-0 shadow-none transition-colors focus-visible:border-primary focus-visible:ring-0 disabled:bg-transparent'
const FORM_UNDERLINE_SELECT_CLASS = 'h-11 w-full rounded-none border-0 border-b border-input bg-transparent px-0 py-0 shadow-none transition-colors focus-visible:border-primary focus-visible:ring-0'

const ROUTE_STAGE_COPY: Record<SupportedPaymentRoute, {
  detailTitle: string
  detailDescription: string
  finishTitle: string
  finishDescription: string
}> = {
  world_to_bolivia: {
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
  exchangeRates,
}: CreatePaymentOrderFormProps) {
  const [step, setStep] = useState<StepKey>('route')
  const [supportFile, setSupportFile] = useState<File | null>(null)
  const [showSupportFileError, setShowSupportFileError] = useState(false)
  const [qrFile, setQrFile] = useState<File | null>(null)
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [createdOrder, setCreatedOrder] = useState<PaymentOrder | null>(null)
  const [creatingOrder, setCreatingOrder] = useState(false)
  const [uploadingEvidence, setUploadingEvidence] = useState(false)

  const [bridgeWallets, setBridgeWallets] = useState<WalletBalance[]>([])
  const [loadingWallets, setLoadingWallets] = useState(false)
  const [sourceWalletMode, setSourceWalletMode] = useState<'guira' | 'external'>('guira')

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
  
  useEffect(() => {
    if (route === 'crypto_to_crypto') {
      setLoadingWallets(true)
      WalletService.getWallets()
        .then((res) => setBridgeWallets(res.filter((w) => w.address)))
        .catch(console.error)
        .finally(() => setLoadingWallets(false))
    }
  }, [route])
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
  const liveFeeTotal = useWatch({ control: form.control, name: 'fee_total' })
  const liveAmountConverted = useWatch({ control: form.control, name: 'amount_converted' })

  const currentRoute = useMemo(
    () => routeOptions.find((entry) => entry.key === route) ?? routeOptions[0] ?? supportedPaymentRoutes[0],
    [route, routeOptions]
  )
  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => supplier.id === supplierId || supplier.name === supplierId) ?? null,
    [supplierId, suppliers]
  )
  const supplierMethods = useMemo(
    () => parseSupplierPaymentMethods(selectedSupplier?.payment_rail ?? '', selectedSupplier ?? undefined),
    [selectedSupplier]
  )
  const supplierAchDetails = useMemo(() => getSupplierAchDetails(selectedSupplier), [selectedSupplier])
  const supplierSwiftDetails = useMemo(() => getSupplierSwiftDetails(selectedSupplier), [selectedSupplier])
  const supplierHasCrypto = Boolean(selectedSupplier?.bank_details?.wallet_address)
  const isDepositRouteActive = isDepositRoute(currentRoute.key)
  const routeCopy = ROUTE_STAGE_COPY[currentRoute.key]
  const shouldHideSupplier = currentRoute.key === 'us_to_wallet' || currentRoute.key === 'world_to_bolivia' || currentRoute.key === 'crypto_to_crypto'
  const requiresSupplierSelection = currentRoute.key === 'bolivia_to_exterior'
  const hasSupplierSelected = Boolean(selectedSupplier)
  const showSupportUpload = currentRoute.key === 'world_to_bolivia' || !isDepositRouteActive
  const availableTechnicalMethods = useMemo(
    () => getDeliveryMethodsForRoute(currentRoute.key, uiMethodGroup, supplierMethods),
    [currentRoute.key, uiMethodGroup, supplierMethods]
  )

  const summaryStats = useMemo(() => {
    const origin = originCurrency || ''
    const destination = destinationCurrency || ''
    const originAmount = Number(amountOrigin) || 0
    const rate = exchangeRateApplied || 0
    const fee = Number(liveFeeTotal) || 0
    const netAmount = Number(liveAmountConverted) || 0

    return {
      exchangeRate: formatExchangeRate(rate, origin, destination),
      feeTotal: fee,
      netAmountDestination: netAmount,
      originCurrency: origin,
      destinationCurrency: destination,
      amountOrigin: originAmount,
    }
  }, [amountOrigin, exchangeRateApplied, originCurrency, destinationCurrency, liveFeeTotal, liveAmountConverted])

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

  const finalInstructions = useMemo(() => {
    const bridgeDeposit = (createdOrder as any)?.bridge_source_deposit_instructions;
    if (bridgeDeposit && Object.keys(bridgeDeposit).length > 0) {
      return [{
        id: 'bridge-deposit',
        title: 'Instrucciones de Fondeo (Bridge API)',
        kind: 'wallet',
        detail: [bridgeDeposit.payment_rail ?? 'crypto', bridgeDeposit.to_address].filter(Boolean).join(' | '),
        accent: 'sky',
      }] as DepositInstruction[];
    }

    if (createdOrder?.psav_deposit_instructions && Object.keys(createdOrder.psav_deposit_instructions).length > 0) {
      const psav = createdOrder.psav_deposit_instructions as Record<string, string>
      return [{
        id: 'backend-psav',
        title: psav.label || 'Cuenta receptora asignada',
        kind: (psav.type === 'crypto' ? 'wallet' : 'bank') as 'wallet' | 'bank',
        detail: psav.type === 'crypto'
          ? [psav.network, psav.address].filter(Boolean).join(' | ')
          : [psav.bank_name, psav.account_holder, psav.account_number].filter(Boolean).join(' | '),
        qrUrl: psav.qr_url,
        accent: 'sky',
        bankCard: psav.type === 'crypto' ? undefined : {
          bankName: psav.bank_name || 'Banco asignado',
          accountHolder: psav.account_holder || psav.label || 'Guira',
          accountNumber: psav.account_number || '',
          country: psav.currency || 'BO',
        }
      }] as DepositInstruction[]
    }
    return depositInstructions
  }, [createdOrder, depositInstructions])

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
      sourceWalletMode,
    }),
    [amountOrigin, currentRoute.key, currentRoute.label, evidenceFile?.name, liveValues, receiveVariant, selectedSupplier?.name, supportFile?.name, uiMethodGroup, sourceWalletMode]
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

    if (route === 'world_to_bolivia') {
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
    if (route === 'world_to_bolivia' && receiveVariant === 'bank_qr') {
      form.setValue('supplier_id', '')
      form.setValue('delivery_method', 'ach')
      form.setValue('destination_address', 'QR Bolivia')
      form.setValue('ach_bank_name', '')
      form.setValue('ach_account_number', '')
      form.setValue('ach_routing_number', '')
      form.setValue('crypto_address', '')
      form.setValue('crypto_network', '')
    }

    if (route === 'world_to_bolivia' && receiveVariant === 'bank_account') {
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
    if (route === 'world_to_bolivia') return
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
    if (route === 'world_to_bolivia') return
    if (route === 'us_to_wallet') return
    if (!selectedSupplier) return

    if (deliveryMethod === 'swift' && supplierSwiftDetails) {
      form.setValue('destination_address', supplierSwiftDetails.account_number || '')
      form.setValue('swift_bank_name', supplierSwiftDetails.bank_name || '')
      form.setValue('swift_code', supplierSwiftDetails.swift_code || '')
      form.setValue('swift_country', supplierSwiftDetails.bank_country || '')
      form.setValue('swift_iban', supplierSwiftDetails.iban || supplierSwiftDetails.account_number || '')
      form.setValue('swift_bank_address', supplierSwiftDetails.bank_address || '')
      return
    }

    if (deliveryMethod === 'ach' && supplierAchDetails) {
      form.setValue('destination_address', supplierAchDetails.account_number || '')
      form.setValue('ach_bank_name', supplierAchDetails.bank_name || '')
      form.setValue('ach_routing_number', supplierAchDetails.routing_number || '')
      form.setValue('ach_account_number', supplierAchDetails.account_number || '')
      return
    }

    if (deliveryMethod === 'crypto' && selectedSupplier.bank_details?.wallet_address) {
      form.setValue('destination_address', String(selectedSupplier.bank_details.wallet_address))
      form.setValue('crypto_address', String(selectedSupplier.bank_details.wallet_address))
      form.setValue('crypto_network', String(selectedSupplier.bank_details.wallet_network || 'Polygon'))
    }
  }, [deliveryMethod, form, route, selectedSupplier, supplierAchDetails, supplierSwiftDetails])

  useEffect(() => {
    const estimate = estimateRouteValues({
      amountOrigin: Number(amountOrigin) || 0,
      route: currentRoute.key,
      originCurrency: originCurrency || '',
      destinationCurrency: destinationCurrency || '',
      exchangeRates: exchangeRates as ExchangeRateRecord[],
      feesConfig,
    })

    form.setValue('amount_converted', estimate.amountConverted)
    form.setValue('exchange_rate_applied', estimate.exchangeRateApplied)
    form.setValue('fee_total', estimate.feeTotal)
    form.setValue('intended_amount', estimate.amountConverted || 0)
  }, [amountOrigin, exchangeRates, currentRoute.key, destinationCurrency, feesConfig, form, originCurrency])

  async function handleCreateOrder() {
    try {
      setCreatingOrder(true)
      const formValues = form.getValues()
      const selectedSup = suppliers.find(s => s.id === formValues.supplier_id)
      const order = await onCreateOrder(buildPaymentOrderPayload(formValues, userId, selectedSup), qrFile, supportFile) as PaymentOrder
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
      resetFlow(form, setStep, setSupportFile, setQrFile, setEvidenceFile, setCreatedOrder)
      return
    }

    try {
      setUploadingEvidence(true)
      await onUploadOrderFile(createdOrder.id, 'evidence_url', evidenceFile)
      toast.success('Comprobante adjuntado. La orden paso a deposit_received.')
      resetFlow(form, setStep, setSupportFile, setQrFile, setEvidenceFile, setCreatedOrder)
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
        setShowSupportFileError(true)
        toast.error('Debes adjuntar el documento de respaldo antes de continuar.')
        return
      }

      if (route === 'world_to_bolivia' && !supportFile) {
        setShowSupportFileError(true)
        toast.error('Debes adjuntar el documento de respaldo para continuar.')
        return
      }

      if (route === 'bolivia_to_exterior' && !supportFile) {
        setShowSupportFileError(true)
        toast.error('Debes adjuntar el documento de respaldo para continuar.')
        return
      }

      setShowSupportFileError(false)

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
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Card className="ring-0 shadow-none bg-background">
        <CardHeader className="border-b border-border/60 bg-transparent px-4 py-5 sm:px-6">
          <CardTitle className="text-xl sm:text-2xl font-semibold tracking-[-0.03em]">
            {isDepositRouteActive ? 'Depositar por expediente' : 'Enviar por expediente'}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm leading-relaxed sm:leading-6 tracking-[0.01em]">
            El flujo separa ruta, metodo, detalle, revision y finalizacion para una mejor experiencia.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 sm:space-y-8 px-4 py-6 sm:px-6 lg:px-8">
          <StepProgressRail currentStep={step} getStepLabel={getStepLabel} steps={STEP_ORDER} />

          <Form {...form}>
            <form className="mx-auto w-full max-w-4xl space-y-8" onSubmit={(event) => event.preventDefault()}>
              <AnimatePresence mode="wait">
                {step === 'route' ? (
                  <AnimatedStepPanel key="route">
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
                          <FormLabel className={FORM_LABEL_CLASS}>Ruta soportada</FormLabel>
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

                    <div className="flex justify-end mt-8">
                      <AnimatedNextButton disabled={disabled} onClick={handleNext}>
                        Continuar a metodo
                      </AnimatedNextButton>
                    </div>
                  </AnimatedStepPanel>
                ) : null}

                {step === 'method' ? (
                  <AnimatedStepPanel key="method">
                    <SectionHeading
                      icon={currentRoute.key === 'crypto_to_crypto' ? Network : Wallet}
                      eyebrow="Etapa 2"
                      title={getMethodTitle(currentRoute.key)}
                      description={getMethodDescription(currentRoute.key)}
                    />
                    {currentRoute.key === 'world_to_bolivia' ? (
                      <FormField
                        control={form.control}
                        name="receive_variant"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={FORM_LABEL_CLASS}>Como quieres recibir en Bolivia</FormLabel>
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
                                  description="Adjunta el QR bancario o respaldo y crea el expediente sin proveedor. (Próximamente)"
                                  disabled={true} // Inhabilitado temporalmente a petición
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
                            <FormLabel className={FORM_LABEL_CLASS}>Grupo de metodo</FormLabel>
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

                    <div className="flex items-center justify-between mt-8">
                      <AnimatedBackButton onClick={handleBack}>
                        Volver
                      </AnimatedBackButton>
                      <AnimatedNextButton disabled={disabled} onClick={handleNext}>
                        Continuar a detalle
                      </AnimatedNextButton>
                    </div>
                  </AnimatedStepPanel>
                ) : null}

                {step === 'detail' ? (
                  <AnimatedStepPanel key="detail">
                    <SectionHeading
                      icon={currentRoute.key === 'crypto_to_crypto' ? Network : Wallet}
                      eyebrow="Etapa 3"
                      title={routeCopy.detailTitle}
                      description={routeCopy.detailDescription}
                    />

                    <div className="grid gap-4">
                      <NumericField control={form.control} disabled={disabled} label={getAmountLabel(currentRoute.key)} name="amount_origin" />
                      <InlineSummaryBar
                        exchangeRate={summaryStats.exchangeRate}
                        feeTotal={summaryStats.feeTotal}
                        netAmountDestination={summaryStats.netAmountDestination}
                        originCurrency={summaryStats.originCurrency}
                        destinationCurrency={summaryStats.destinationCurrency}
                        amountOrigin={summaryStats.amountOrigin}
                      />

                      {!shouldHideSupplier ? (
                        <FormField
                          control={form.control}
                          name="supplier_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={FORM_LABEL_CLASS}>Proveedor o beneficiario</FormLabel>
                              <FormControl>
                                <Select
                                  value={field.value || 'none'}
                                  onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                                  disabled={disabled}
                                >
                                  <SelectTrigger className={cn(FORM_UNDERLINE_SELECT_CLASS, FORM_TEXT_CLASS)}>
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

                      {/* El campo QR bancario (Opcional) fue removido de aquí para trasladarlo al método 'bank_qr' posteriormente */}


                      {shouldShowExpandedDetail ? (
                        <>
                          {!shouldHideSupplier ? (
                            <FormField
                              control={form.control}
                              name="delivery_method"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className={FORM_LABEL_CLASS}>Metodo tecnico final</FormLabel>
                                  <FormControl>
                                    <Select
                                      value={field.value}
                                      onValueChange={field.onChange}
                                      disabled={disabled || route === 'crypto_to_crypto' || (route === 'bolivia_to_exterior' && uiMethodGroup === 'crypto') || availableTechnicalMethods.length <= 1}
                                    >
                                      <SelectTrigger className={cn(FORM_UNDERLINE_SELECT_CLASS, FORM_TEXT_CLASS)}>
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
                              {/*
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
                            */}
                            </>
                          ) : null}

                          {currentRoute.key === 'world_to_bolivia' ? (
                            <>
                              <div className="grid gap-4 lg:grid-cols-2">
                                <TextField control={form.control} disabled={disabled} label="Banco" name="ach_bank_name" />
                                <TextField control={form.control} disabled={disabled} label="Cuenta bancaria" name="ach_account_number" />
                              </div>
                              <TextField control={form.control} disabled={disabled} label="Nombre del titular de la cuenta" name="destination_account_holder" />
                              <TextField control={form.control} disabled={disabled} label="Motivo del pago" name="payment_reason" />
                            </>
                          ) : null}

                          {currentRoute.key !== 'us_to_wallet' && currentRoute.key !== 'world_to_bolivia' ? (
                            <>
                              <div className={`grid gap-4 ${(route === 'bolivia_to_exterior' && uiMethodGroup !== 'crypto') ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
                                {!(route === 'bolivia_to_exterior' && uiMethodGroup === 'crypto') && route !== 'crypto_to_crypto' ? (
                                  <TextField control={form.control} disabled={disabled} label={getDestinationLabel(currentRoute.key)} name="destination_address" />
                                ) : null}
                                {route === 'bolivia_to_exterior' ? (
                                  <FormField
                                    control={form.control}
                                    name="funding_method"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className={FORM_LABEL_CLASS}>Funding method</FormLabel>
                                        <FormControl>
                                          <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                                            <SelectTrigger className={cn(FORM_UNDERLINE_SELECT_CLASS, FORM_TEXT_CLASS)}>
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
                                <>
                                  {route === 'crypto_to_crypto' ? (
                                    <div className="grid gap-4 mt-4 px-4 py-4 border rounded-md bg-muted/20">
                                      <div className="col-span-full mb-2">
                                        <h4 className="text-sm font-semibold">Datos de Fondeo (Desde dónde envías)</h4>
                                        <div className="flex gap-2 mt-3 mb-4">
                                          <Button type="button" variant={sourceWalletMode === 'guira' ? 'default' : 'outline'} size="sm" onClick={() => setSourceWalletMode('guira')}>Mis Wallets Guira</Button>
                                          <Button type="button" variant={sourceWalletMode === 'external' ? 'default' : 'outline'} size="sm" onClick={() => { setSourceWalletMode('external'); form.setValue('source_crypto_address', ''); form.setValue('source_crypto_network', ''); }}>Wallet Externa</Button>
                                        </div>
                                      </div>
                                      
                                      {sourceWalletMode === 'guira' ? (
                                        <>
                                          <FormField
                                            control={form.control}
                                            name="source_crypto_address"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel className={FORM_LABEL_CLASS}>Wallet de Origen</FormLabel>
                                                <FormControl>
                                                  <Select
                                                    disabled={disabled || loadingWallets}
                                                    value={field.value ?? ''}
                                                    onValueChange={(val) => {
                                                      field.onChange(val)
                                                      // Auto-set the network based on the selected wallet
                                                      const selectedWallet = bridgeWallets.find((w) => w.address === val)
                                                      if (selectedWallet?.network) {
                                                        form.setValue('source_crypto_network', selectedWallet.network, { shouldValidate: true })
                                                      }
                                                    }}
                                                  >
                                                    <SelectTrigger className={cn(FORM_UNDERLINE_SELECT_CLASS, FORM_TEXT_CLASS)}>
                                                      <SelectValue placeholder={loadingWallets ? "Cargando wallets..." : "Selecciona tu wallet"} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      {bridgeWallets.map((wallet) => (
                                                        <SelectItem key={wallet.id} value={wallet.address ?? ''}>
                                                          {wallet.currency.toUpperCase()} - {wallet.network ? `${wallet.network.charAt(0).toUpperCase()}${wallet.network.slice(1)}` : 'Interna'} ({wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)})
                                                        </SelectItem>
                                                      ))}
                                                    </SelectContent>
                                                  </Select>
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                          
                                          <NetworkSelectField control={form.control} disabled={true} label="Red de Origen (Autocompletada)" name="source_crypto_network" placeholder="Autocompletado" />
                                        </>
                                      ) : (
                                        <>
                                          <TextField control={form.control} disabled={disabled} label="Wallet de Origen (Externa)" name="source_crypto_address" />
                                          <NetworkSelectField control={form.control} disabled={disabled} label="Red de Origen" name="source_crypto_network" placeholder="Selecciona la red" />
                                        </>
                                      )}
                                    </div>
                                  ) : null}
                                  <div className="grid gap-4 lg:grid-cols-2 mt-4">
                                    <TextField control={form.control} disabled={disabled} label="Wallet destino" name="crypto_address" />
                                    <NetworkSelectField control={form.control} disabled={disabled} label="Red destino" name="crypto_network" placeholder="Selecciona la red" />
                                  </div>
                                </>
                              ) : null}

                              {/*
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
                            */}
                            </>
                          ) : null}

                          {currentRoute.key !== 'us_to_wallet' && !isDepositRouteActive ? (
                            <TextField control={form.control} disabled={disabled} label="Motivo del pago" name="payment_reason" />
                          ) : null}


                          {showSupportUpload && !(currentRoute.key === 'world_to_bolivia' && receiveVariant === 'bank_qr') ? (
                            <DocumentInputCard
                              className={showSupportFileError && !supportFile ? 'border-destructive/80 bg-destructive/5 ring-1 ring-destructive' : ''}
                              file={supportFile}
                              label="Documento de respaldo"
                              description={
                                route === 'bolivia_to_exterior' || route === 'crypto_to_crypto' || route === 'world_to_bolivia'
                                  ? 'Obligatorio en esta ruta. Se guardara como support_document_url al crear la orden.'
                                  : 'Documento Opcional.'
                              }
                              onFileChange={(f) => {
                                setSupportFile(f)
                                if (f) setShowSupportFileError(false)
                              }}
                            />
                          ) : null}
                        </>
                      ) : hasSupplierObservation ? (
                        <div className="border-l-2 border-amber-500/70 bg-amber-50/70 px-4 py-4 text-sm text-amber-950">
                          Corrige primero la observacion del proveedor para habilitar los campos siguientes.
                        </div>
                      ) : (
                        <div className="border-l-2 border-border/70 bg-muted/10 px-4 py-4 text-sm text-muted-foreground">
                          Selecciona primero un proveedor valido para mostrar metodo tecnico, monedas y metadata autocompletada.
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-8">
                      <AnimatedBackButton onClick={handleBack}>
                        Volver
                      </AnimatedBackButton>
                      <AnimatedNextButton disabled={disabled} onClick={handleNext}>
                        Revisar expediente
                      </AnimatedNextButton>
                    </div>
                  </AnimatedStepPanel>
                ) : null}

                {step === 'review' ? (
                  <AnimatedStepPanel key="review">
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

                    <div className="flex items-center justify-between mt-8">
                      <AnimatedBackButton onClick={handleBack}>
                        Editar detalle
                      </AnimatedBackButton>
                      <AnimatedNextButton disabled={disabled || creatingOrder} onClick={handleNext}>
                        {creatingOrder ? 'Creando expediente...' : 'Crear expediente'}
                      </AnimatedNextButton>
                    </div>
                  </AnimatedStepPanel>
                ) : null}

                {step === 'finish' ? (
                  <AnimatedStepPanel key="finish">
                    <SectionHeading
                      icon={FileCheck2}
                      eyebrow="Etapa 5"
                      title={routeCopy.finishTitle}
                      description={routeCopy.finishDescription}
                    />

                    <div className="grid gap-4 lg:grid-cols-2">
                      {finalInstructions.map((instruction) => (
                        <DepositInstructionCard key={instruction.id} instruction={instruction} />
                      ))}
                    </div>

                    <div className="border-l-2 border-emerald-400/45 bg-emerald-400/10 px-4 py-4 text-sm text-emerald-100">
                      El expediente ya fue creado con estado `waiting_deposit`. Desde aqui puedes dejar el comprobante final o subirlo despues desde Seguimiento.
                    </div>

                    <DocumentInputCard
                      file={evidenceFile}
                      label="Comprobante final"
                      description="Adjunta aqui el comprobante del deposito o fondeo. Se guardara en evidence_url."
                      onFileChange={setEvidenceFile}
                    />

                    <div className="border-l-2 border-border/70 bg-muted/10 px-4 py-4 text-sm text-muted-foreground">
                      Cuando el comprobante final quede adjunto y la orden siga en `waiting_deposit`, el sistema la movera a `deposit_received`.
                    </div>

                    <div className="flex items-center justify-between mt-8">
                      <AnimatedBackButton
                        disabled={uploadingEvidence}
                        onClick={() => resetFlow(form, setStep, setSupportFile, setQrFile, setEvidenceFile, setCreatedOrder)}
                      >
                        Finalizar despues
                      </AnimatedBackButton>
                      <AnimatedNextButton disabled={disabled || uploadingEvidence || !createdOrder} onClick={handleFinishEvidenceUpload}>
                        {uploadingEvidence ? 'Adjuntando...' : evidenceFile ? 'Adjuntar y cerrar' : 'Cerrar sin comprobante'}
                      </AnimatedNextButton>
                    </div>
                  </AnimatedStepPanel>
                ) : null}
              </AnimatePresence>
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
  setQrFile: (file: File | null) => void,
  setEvidenceFile: (file: File | null) => void,
  setCreatedOrder: (order: PaymentOrder | null) => void
) {
  form.reset(getDefaultValues(form.getValues('route')))
  setSupportFile(null)
  setQrFile(null)
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
    receive_variant: route === 'world_to_bolivia' ? 'bank_account' : undefined,
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
    destination_account_holder: '',
  }
}

function AnimatedStepPanel({ children }: { children: React.ReactNode }) {
  return (
    <motion.section
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      className="space-y-6 border-0 bg-transparent p-0 shadow-none"
      exit={{ opacity: 0, y: -14, filter: 'blur(4px)' }}
      initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
      transition={{ duration: 0.26, ease: 'easeOut' }}
    >
      {children}
    </motion.section>
  )
}

function DocumentInputCard({
  label,
  description,
  file,
  onFileChange,
  className,
}: {
  label: string
  description: string
  file: File | null
  onFileChange: (file: File | null) => void
  className?: string
}) {
  return (
    <DocumentUploadCard
      className={className}
      label={label}
      description={description}
      file={file}
      onFileChange={onFileChange}
    />
  )
}

function SectionHeading({ icon: Icon, eyebrow, title, description }: { icon: typeof Landmark; eyebrow: string; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-border/60 pb-4 sm:pb-5">
      <div className="shrink-0 rounded-xl border border-border/60 bg-muted/20 p-2 text-muted-foreground">
        <Icon className="size-3.5 sm:size-4" />
      </div>
      <div className="min-w-0">
        <div className={cn(FORM_LABEL_CLASS, 'text-[10px] sm:text-[11px]')}>{eyebrow}</div>
        <div className="mt-0.5 sm:mt-1 text-lg sm:text-xl font-semibold tracking-[-0.03em] text-foreground leading-tight sm:leading-normal">{title}</div>
        <div className="mt-1 text-xs sm:text-sm leading-relaxed sm:leading-6 tracking-[0.01em] text-muted-foreground line-clamp-2 sm:line-clamp-none">{description}</div>
      </div>
    </div>
  )
}

function InlineSummaryBar({
  exchangeRate,
  feeTotal,
  netAmountDestination,
  originCurrency,
  destinationCurrency,
  amountOrigin,
}: {
  exchangeRate: string
  feeTotal: number
  netAmountDestination: number
  originCurrency: string
  destinationCurrency: string
  amountOrigin: number
}) {
  const hasAmount = amountOrigin > 0
  const hasCurrencyChange = originCurrency.trim().toUpperCase() !== destinationCurrency.trim().toUpperCase()

  return (
    <div className="rounded-xl border border-border/60 bg-muted/10 divide-y divide-border/40 overflow-hidden">
      {/* Tipo de cambio */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className={FORM_LABEL_CLASS}>Tipo de cambio</span>
        <span className="text-sm font-semibold tracking-[0.01em] text-foreground">{exchangeRate}</span>
      </div>

      {/* Conversión bruta (solo si hay monto ingresado) */}
      {hasAmount ? (
        <>
          <div className="flex items-center justify-between px-4 py-3">
            <span className={FORM_LABEL_CLASS}>Monto ingresado</span>
            <span className="text-sm font-medium text-foreground">
              {amountOrigin.toFixed(2)} {originCurrency}
            </span>
          </div>

          {/* Comisión */}
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <span className={FORM_LABEL_CLASS}>Comisión estimada</span>
              <p className="mt-0.5 text-[10px] text-muted-foreground/70 tracking-wider">
                Calculada según tarifa de la ruta
              </p>
            </div>
            <span className="text-sm font-medium text-destructive/80">
              − {feeTotal.toFixed(2)} {originCurrency}
            </span>
          </div>

          {/* Monto neto al destino — el dato clave de transparencia */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-primary/5">
            <div>
              <span className={cn(FORM_LABEL_CLASS, 'text-primary/80')}>Monto que llegará al destino</span>
              <p className="mt-0.5 text-[10px] text-muted-foreground/70 tracking-wider">
                {hasCurrencyChange
                  ? `Después de comisión y conversión a ${destinationCurrency}`
                  : 'Después de descontar la comisión'}
              </p>
            </div>
            <span className="text-base font-bold tracking-[-0.02em] text-primary">
              {netAmountDestination.toFixed(2)} {destinationCurrency}
            </span>
          </div>
        </>
      ) : (
        <div className="px-4 py-3">
          <span className="text-xs text-muted-foreground/70 tracking-wider">
            Ingresa el monto para ver el estimado de comisión y lo que llegará al destino.
          </span>
        </div>
      )}
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
          <FormLabel className={FORM_LABEL_CLASS}>{label}</FormLabel>
          <FormControl>
            <Input
              {...field}
              className={cn(FORM_UNDERLINE_INPUT_CLASS, 'text-lg font-medium tracking-[-0.02em]')}
              disabled={disabled}
              min={0.01}
              step="0.01"
              type="number"
            />
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
          <FormLabel className={FORM_LABEL_CLASS}>{label}</FormLabel>
          <FormControl>
            <Input {...field} className={cn(FORM_UNDERLINE_INPUT_CLASS, FORM_TEXT_CLASS)} disabled={disabled} />
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
          <FormLabel className={FORM_LABEL_CLASS}>{label}</FormLabel>
          <FormControl>
            <Select
              disabled={disabled}
              onValueChange={field.onChange}
              value={field.value ? resolveCryptoNetwork(field.value as string) : undefined}
            >
              <SelectTrigger className={cn(FORM_UNDERLINE_SELECT_CLASS, FORM_TEXT_CLASS)}>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                {CRYPTO_NETWORK_OPTIONS.map((network) => (
                  <SelectItem key={network} value={network}>
                    {CRYPTO_NETWORK_LABELS[network]}
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
      className={cn(
        'group rounded-xl border px-4 py-4 text-left transition-all duration-300',
        isSelected
          ? 'border-primary/40 bg-primary/8 shadow-[0_0_12px_rgba(var(--primary-rgb),0.06)]'
          : 'border-border/50 bg-transparent hover:border-border/80 hover:bg-muted/5',
        !disabled && interactiveClickableCardClassName,
        disabled && 'cursor-not-allowed opacity-60'
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300',
          isSelected 
            ? 'bg-primary/15 text-primary scale-110' 
            : 'bg-muted/20 text-muted-foreground group-hover:bg-muted/30 group-hover:text-foreground'
        )}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className={cn(
            "text-sm font-semibold tracking-tight transition-colors",
            isSelected ? "text-foreground" : "text-foreground/90"
          )}>
            {title}
          </div>
          <div className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {description}
          </div>
        </div>
      </div>
    </button>
  )
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border/50 px-1 py-3">
      <div className={FORM_LABEL_CLASS}>{label}</div>
      <div className="mt-1 text-sm font-medium tracking-[0.01em] text-foreground">{value}</div>
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
    case 'world_to_bolivia':
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
    case 'world_to_bolivia':
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
    case 'world_to_bolivia':
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
    case 'world_to_bolivia':
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
  if (route === 'world_to_bolivia') return ['receive_variant']
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

  if (route === 'world_to_bolivia') {
    return [...fields, 'origin_currency', 'destination_currency', 'ach_bank_name', 'ach_account_number', 'destination_account_holder', 'payment_reason']
  }

  if (route === 'us_to_wallet') {
    return [...fields, 'origin_currency', 'destination_currency', 'crypto_address', 'crypto_network']
  }

  if (route === 'bolivia_to_exterior') {
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

  if (!(route === 'bolivia_to_exterior' && uiMethodGroup === 'crypto') && route !== 'crypto_to_crypto') {
    fields.push('destination_address')
  }

  if (deliveryMethod === 'swift' && route === 'bolivia_to_exterior') {
    fields.push('swift_bank_name', 'swift_code', 'swift_iban', 'swift_bank_address', 'swift_country')
  }

  if (deliveryMethod === 'ach' && route === 'bolivia_to_exterior') {
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
  sourceWalletMode?: 'guira' | 'external'
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

  if (args.route === 'world_to_bolivia') {
    items.push({ label: 'Metodo tecnico', value: 'ach' })
    items.push({ label: 'Banco', value: args.values.ach_bank_name || 'Pendiente' })
    items.push({ label: 'Cuenta bancaria', value: args.values.ach_account_number || 'Pendiente' })
    items.push({ label: 'Titular', value: args.values.destination_account_holder || 'Pendiente' })
    items.push({ label: 'Motivo', value: args.values.payment_reason || 'Pendiente' })

    if (args.supportFileName) {
      items.push({ label: 'Respaldo', value: args.supportFileName })
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
    items.push({ label: 'Origen (Fondeo)', value: args.sourceWalletMode === 'guira' ? 'Mis Wallets Guira' : 'Wallet Externa' })
    items.push({ label: 'Wallet origen', value: args.values.source_crypto_address || 'Pendiente' })
    items.push({ label: 'Red origen', value: args.values.source_crypto_network || 'Pendiente' })
    items.push({ label: 'Metodo tecnico', value: 'crypto' })
    items.push({ label: 'Wallet destino', value: args.values.crypto_address || 'Pendiente' })
    items.push({ label: 'Red destino', value: args.values.crypto_network || 'Pendiente' })
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
  if (route === 'world_to_bolivia') {
    return ['ach']
  }
  return ['ach']
}

function ValidationNotice({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 border-l-2 border-amber-500/70 bg-amber-50/70 px-4 py-3 text-sm text-amber-950">
      <CircleAlert className="mt-0.5 size-4 shrink-0" />
      <p>{message}</p>
    </div>
  )
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
  if (route === 'world_to_bolivia') return null
  if (route === 'bolivia_to_exterior' && !selectedSupplier) {
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

  if (route === 'crypto_to_crypto' && selectedSupplier && !supplierHasCrypto) {
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

