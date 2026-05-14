'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
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
  Upload,
  Wallet,
  Loader2,
  Earth,
  Send,
  ArrowRightLeft,
  WalletMinimal,
  ArrowUpRight,
  Bitcoin,
  CircleDollarSign,
  BadgeDollarSign,
  Building2,
} from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/utils'
import { WalletService, type WalletBalance } from '@/services/wallet.service'
import { BridgeService, type VirtualAccount } from '@/services/bridge.service'
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
  resolveFlowType,
  supportedPaymentRoutes,
  type SupportedPaymentRoute,
} from '@/features/payments/lib/payment-routes'
import { usePaymentLimits } from '@/features/payments/hooks/use-payment-limits'
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
import { GuiraButton } from '@/components/shared/guira-button'
import { StepProgressRail } from '@/features/payments/components/step-progress-rail'
import { WalletRampDetailStep } from '@/features/payments/components/wallet-ramp-detail-step'
import { WalletWithdrawDetailStep } from '@/features/payments/components/wallet-withdraw-detail-step'
import { WalletToFiatDetailStep } from '@/features/payments/components/wallet-to-fiat-detail-step'
import { EstimationSummary } from '@/components/shared/estimation-summary'
import { useFeePreview } from '@/features/payments/hooks/use-fee-preview'
import { ACTIVE_CRYPTO_NETWORKS, CRYPTO_NETWORK_LABELS, resolveCryptoNetwork } from '@/features/payments/lib/crypto-networks'
import { getSupportedSourceCrypto } from '@/features/payments/lib/supported-crypto-rails'
import {
  paymentOrderSchema,
  type PaymentOrderFormValues,
} from '@/features/payments/schemas/payment-order.schema'
import type {
  AppSettingRow,
  BridgeDepositInstructionsPayload,
  CreatePaymentOrderInput,
  FeeConfigRow,
  PaymentOrder,
  PsavConfigRow,
  ReceiveVariant,
  UiMethodGroup,
  OrderReviewRequest,
} from '@/types/payment-order'
import type { Supplier } from '@/types/supplier'
import { ACCEPTED_UPLOADS } from '@/lib/file-validation'
import { cn, interactiveClickableCardClassName } from '@/lib/utils'

type StepKey = 'route' | 'method' | 'detail' | 'review' | 'finish' | 'review_requested'

interface CreatePaymentOrderFormProps {
  userId: string
  suppliers: Supplier[]
  defaultRoute: SupportedPaymentRoute
  allowedRoutes?: SupportedPaymentRoute[]
  disabled?: boolean
  mode?: 'depositar' | 'enviar'
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
const DEPOSIT_ROUTES: SupportedPaymentRoute[] = ['world_to_bolivia', 'us_to_wallet', 'wallet_ramp_deposit', 'wallet_ramp_withdraw']
const FORM_LABEL_CLASS = 'text-[13px] font-semibold uppercase tracking-[0.18em] text-muted-foreground'
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
    detailDescription: 'El destino se toma del proveedor y la orden se crea antes de iniciar la transferencia.',
    finishTitle: 'Deposita en la dirección Bridge',
    finishDescription: 'La orden fue creada exitosamente. Deposita los fondos en la dirección indicada — Bridge los detectará automáticamente.',
  },
  wallet_ramp_deposit: {
    detailTitle: 'Detalle de la recarga a tu wallet',
    detailDescription: 'Completa los montos y datos necesarios para generar las instrucciones.',
    finishTitle: 'Guía de Depósito',
    finishDescription: 'El expediente fue creado. Sigue las instrucciones de fondeo y haz el depósito cuando estés listo. Opcionalmente sube tu comprobante de una vez.',
  },
  wallet_ramp_withdraw: {
    detailTitle: 'Detalle del retiro',
    detailDescription: 'Selecciona tu wallet Bridge, completa los datos de destino y el monto a retirar.',
    finishTitle: 'Retiro en proceso',
    finishDescription: 'Tu orden fue creada y la transferencia de fondos está en camino.',
  },
  wallet_to_fiat: {
    detailTitle: 'Envío desde wallet on-chain',
    detailDescription: 'Selecciona la red, el token y la dirección origen. Bridge realizará la conversión y acreditará al proveedor seleccionado.',
    finishTitle: 'Transferencia on-chain iniciada',
    finishDescription: 'Tu solicitud fue enviada a Bridge. Los fondos serán enviados desde tu dirección on-chain al proveedor fiat una vez que Bridge los detecte.',
  },
}

export function CreatePaymentOrderForm({
  userId,
  suppliers,
  defaultRoute,
  allowedRoutes,
  disabled,
  mode,
  onCreateOrder,
  onUploadOrderFile,
  feesConfig,
  appSettings,
  psavConfigs,
  exchangeRates,
}: CreatePaymentOrderFormProps) {
  const router = useRouter()
  const [step, setStep] = useState<StepKey>('route')
  const [supportFile, setSupportFile] = useState<File | null>(null)
  const [showSupportFileError, setShowSupportFileError] = useState(false)
  const [qrFile, setQrFile] = useState<File | null>(null)
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [createdOrder, setCreatedOrder] = useState<PaymentOrder | null>(null)
  const [reviewRequest, setReviewRequest] = useState<OrderReviewRequest | null>(null)
  const [showReviewReasonModal, setShowReviewReasonModal] = useState(false)
  const [reviewReason, setReviewReason] = useState('')
  const [creatingOrder, setCreatingOrder] = useState(false)
  const [uploadingEvidence, setUploadingEvidence] = useState(false)
  const [isOverrideFee, setIsOverrideFee] = useState(false)

  // Sub-pasos del detalle para rutas con flujo guiado
  type DetailSubStep = 'supplier' | 'funding' | 'reason' | 'amount'
  const [detailSubStep, setDetailSubStep] = useState<DetailSubStep>('supplier')

  // Sub-pasos para bridge_wallet_to_fiat_bo
  type FiatBoSubStep = 'wallet' | 'bank' | 'reason' | 'amount'
  const FIAT_BO_SUB_ORDER: FiatBoSubStep[] = ['wallet', 'bank', 'reason', 'amount']
  const [fiatBoSubStep, setFiatBoSubStep] = useState<FiatBoSubStep>('wallet')

  // Sub-pasos para bridge_wallet_to_crypto
  type CryptoWithdrawSubStep = 'wallet' | 'dest_wallet' | 'reason' | 'amount'
  const CRYPTO_WITHDRAW_SUB_ORDER: CryptoWithdrawSubStep[] = ['wallet', 'dest_wallet', 'reason', 'amount']
  const [cryptoWithdrawSubStep, setCryptoWithdrawSubStep] = useState<CryptoWithdrawSubStep>('wallet')

  // Sub-pasos para bridge_wallet_to_fiat_us
  type FiatUsSubStep = 'wallet' | 'supplier' | 'reason' | 'amount'
  const FIAT_US_SUB_ORDER: FiatUsSubStep[] = ['wallet', 'supplier', 'reason', 'amount']
  const [fiatUsSubStep, setFiatUsSubStep] = useState<FiatUsSubStep>('wallet')

  // Sub-pasos para fiat_bo_to_bridge_wallet (wallet_ramp_deposit + fiat_bo)
  type FiatBoDepositSubStep = 'wallet' | 'reason' | 'amount'
  const FIAT_BO_DEPOSIT_SUB_ORDER: FiatBoDepositSubStep[] = ['wallet', 'reason', 'amount']
  const [fiatBoDepositSubStep, setFiatBoDepositSubStep] = useState<FiatBoDepositSubStep>('wallet')

  // Sub-pasos para wallet_ramp_deposit (crypto)
  type RampDepositSubStep = 'wallet' | 'network' | 'reason'
  const RAMP_DEPOSIT_SUB_ORDER: RampDepositSubStep[] = ['wallet', 'network', 'reason']
  const [rampDepositSubStep, setRampDepositSubStep] = useState<RampDepositSubStep>('wallet')

  // Sub-pasos para world_to_bolivia (3 pasos guiados)
  type WorldBoliviaSubStep = 'bank' | 'reason' | 'amount'
  const WORLD_BOLIVIA_SUB_ORDER: WorldBoliviaSubStep[] = ['bank', 'reason', 'amount']
  const [worldBoliviaSubStep, setWorldBoliviaSubStep] = useState<WorldBoliviaSubStep>('bank')

  const [bridgeWallets, setBridgeWallets] = useState<WalletBalance[]>([])
  const [loadingWallets, setLoadingWallets] = useState(false)
  const [virtualAccounts, setVirtualAccounts] = useState<VirtualAccount[]>([])
  const [loadingVirtualAccounts, setLoadingVirtualAccounts] = useState(false)

  const routeOptions = useMemo(
    () => supportedPaymentRoutes.filter((entry) => (!allowedRoutes || allowedRoutes.includes(entry.key)) && !entry.hidden),
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
    if (route === 'crypto_to_crypto' || route === 'wallet_ramp_deposit' || route === 'wallet_ramp_withdraw') {
      setLoadingWallets(true)
      WalletService.getWallets()
        .then((res) => setBridgeWallets(res.filter((w) => w.network)))
        .catch(console.error)
        .finally(() => setLoadingWallets(false))
    }

    if (route === 'wallet_ramp_deposit') {
      setLoadingVirtualAccounts(true)
      BridgeService.listVirtualAccounts()
        .then(setVirtualAccounts)
        .catch(console.error)
        .finally(() => setLoadingVirtualAccounts(false))
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
  const walletRampWithdrawMethod = useWatch({ control: form.control, name: 'wallet_ramp_withdraw_method' })
  const walletRampDestCurrency = useWatch({ control: form.control, name: 'wallet_ramp_destination_currency' })

  // Sync wallet_ramp_destination_currency → destination_currency for wallet_ramp_deposit
  useEffect(() => {
    if (route !== 'wallet_ramp_deposit') return
    if (walletRampDestCurrency && typeof walletRampDestCurrency === 'string') {
      const normalized = walletRampDestCurrency.toUpperCase()
      if (normalized !== destinationCurrency) {
        form.setValue('destination_currency', normalized, { shouldValidate: false, shouldDirty: false })
      }
    }
  }, [route, walletRampDestCurrency, destinationCurrency, form])

  const interbankFlowType = useMemo(() => {
    if (['wallet_ramp_deposit', 'wallet_ramp_withdraw'].includes(route)) return null
    return resolveFlowType(route as SupportedPaymentRoute, deliveryMethod, undefined, walletRampWithdrawMethod)
  }, [route, deliveryMethod, walletRampWithdrawMethod])
  const { limits: interbankLimits } = usePaymentLimits(interbankFlowType)

  // Fee preview desde el servidor — incluye overrides personales del cliente
  const isWalletRampRoute = route === 'wallet_ramp_deposit' || route === 'wallet_ramp_withdraw'
  const { preview: feePreview } = useFeePreview(
    isWalletRampRoute ? null : route,
    Number(amountOrigin) || 0,
  )

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

  const supportedSourceRails = useMemo(() => {
    if (route !== 'crypto_to_crypto' || !selectedSupplier?.bank_details) return []
    const destNet = String(selectedSupplier.bank_details.wallet_network || '')
    const destCur = String(selectedSupplier.bank_details.wallet_currency || '')
    if (!destNet || !destCur) return []
    return getSupportedSourceCrypto(destNet, destCur)
  }, [route, selectedSupplier])

  const supportedSourceNetworks = useMemo(() => {
    return Array.from(new Set(supportedSourceRails.map((r) => r.network)))
  }, [supportedSourceRails])

  const supportedSourceCurrencies = useMemo(() => {
    return Array.from(new Set(supportedSourceRails.map((r) => r.currency))).map(c => ({
      value: c,
      label: c
    }))
  }, [supportedSourceRails])

  const isDepositRouteActive = isDepositRoute(currentRoute.key)
  const routeCopy = ROUTE_STAGE_COPY[currentRoute.key]
  const shouldHideSupplier = currentRoute.key === 'us_to_wallet' || currentRoute.key === 'world_to_bolivia' || (currentRoute.key === 'wallet_ramp_withdraw' && walletRampWithdrawMethod !== 'fiat_us')
  const requiresSupplierSelection = currentRoute.key === 'bolivia_to_exterior' || currentRoute.key === 'crypto_to_crypto'
  const hasSupplierSelected = Boolean(selectedSupplier)
  const showSupportUpload = (currentRoute.key === 'world_to_bolivia' || currentRoute.key === 'wallet_ramp_withdraw' || !isDepositRouteActive) && currentRoute.key !== 'wallet_to_fiat'
  const isBoliviaToExterior = route === 'bolivia_to_exterior'
  const isCryptoToCrypto = route === 'crypto_to_crypto'
  const hasSubStepFlow = isBoliviaToExterior || isCryptoToCrypto

  // ── Helper: validación de límites interbank (reutilizable en todos los flujos) ──
  const isInterbankRoute = currentRoute.category === 'interbank'
  function validateInterbankLimits(): string | null {
    if (!isInterbankRoute) return null
    const minUsd = interbankLimits?.min_usd ?? 0
    const maxUsd = interbankLimits?.max_usd ?? 999999

    // Determinar la moneda de entrada y convertir a USD
    let amountInUsd = Number(amountOrigin) || 0
    const inputCurrency = (originCurrency || 'USD').toUpperCase()
    if (inputCurrency === 'BOB' || isBoliviaToExterior) {
      const rateData = exchangeRates.find((r) => r.pair === 'BOB_USD')
      const rate = rateData?.effective_rate ?? rateData?.rate ?? 1
      amountInUsd = Number(amountOrigin) / rate
    }
    // Stablecoins (USDC, USDT, USDB, PYUSD, EURC) → 1:1 USD

    if (amountInUsd > 0 && amountInUsd < minUsd) {
      return `El monto mínimo es $${minUsd} USD (tu monto equivale a ~$${amountInUsd.toFixed(2)} USD).`
    }
    if (amountInUsd > 0 && amountInUsd > maxUsd) {
      return `El monto máximo es $${maxUsd.toLocaleString()} USD (tu monto equivale a ~$${amountInUsd.toFixed(2)} USD).`
    }
    return null
  }
  const isFiatBoWithdraw = route === 'wallet_ramp_withdraw' && walletRampWithdrawMethod === 'fiat_bo'
  const isCryptoWithdraw = route === 'wallet_ramp_withdraw' && walletRampWithdrawMethod === 'crypto'
  const isFiatUsWithdraw = route === 'wallet_ramp_withdraw' && walletRampWithdrawMethod === 'fiat_us'
  const walletRampMethod = form.watch('wallet_ramp_method')
  const isFiatBoDeposit = route === 'wallet_ramp_deposit' && walletRampMethod === 'fiat_bo'
  const isRampDepositWithSubSteps = route === 'wallet_ramp_deposit' && walletRampMethod === 'crypto'
  const isWorldToBolivia = route === 'world_to_bolivia'
  const DETAIL_SUB_ORDER: DetailSubStep[] = isCryptoToCrypto
    ? ['supplier', 'funding', 'reason', 'amount']
    : ['supplier', 'reason', 'amount']

  // Para retiros a cuenta bancaria US y wallet_to_fiat, solo mostrar proveedores con external account registrada en Bridge
  const filteredSuppliers = useMemo(() => {
    if (
      (currentRoute.key === 'wallet_ramp_withdraw' && walletRampWithdrawMethod === 'fiat_us') ||
      currentRoute.key === 'wallet_to_fiat'
    ) {
      return suppliers.filter((s) => s.bridge_external_account_id)
    }
    if (currentRoute.key === 'crypto_to_crypto' || (currentRoute.key === 'bolivia_to_exterior' && uiMethodGroup === 'crypto')) {
      return suppliers.filter((s) => s.bank_details?.wallet_address && s.bank_details?.wallet_network && s.bank_details?.wallet_currency)
    }
    if (currentRoute.key === 'bolivia_to_exterior' && uiMethodGroup === 'bank') {
      return suppliers.filter((s) => s.payment_rail !== 'crypto' && !s.bank_details?.wallet_address)
    }
    return suppliers
  }, [suppliers, currentRoute.key, walletRampWithdrawMethod, uiMethodGroup])
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
  }, [amountOrigin, exchangeRateApplied, originCurrency, destinationCurrency, liveFeeTotal, liveAmountConverted, currentRoute.key])

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
    // fiat_bo: bridge_source_deposit_instructions es la dirección de liquidación Solana
    // que usa el PSAV internamente — no la mostramos al cliente.
    // El cliente debe ver psav_deposit_instructions (cuenta bancaria boliviana donde depositar BOB).
    const isFiatBo = createdOrder?.flow_type === 'fiat_bo_to_bridge_wallet'

    const bridgeDeposit = createdOrder?.bridge_source_deposit_instructions as BridgeDepositInstructionsPayload | undefined;
    if (!isFiatBo && bridgeDeposit && Object.keys(bridgeDeposit).length > 0) {
      if (bridgeDeposit.type === 'virtual_account') {
        return [{
          id: 'va-bank-deposit',
          title: bridgeDeposit.label || `Depósito bancario VA (${bridgeDeposit.source_currency?.toUpperCase() ?? 'USD'})`,
          kind: 'bank',
          detail: [bridgeDeposit.bank_name, bridgeDeposit.account_number].filter(Boolean).join(' | '),
          accent: 'sky',
          bankCard: {
            bankName: bridgeDeposit.bank_name || 'Banco VA',
            accountHolder: bridgeDeposit.account_name || bridgeDeposit.beneficiary_name || 'Virtual Account',
            accountNumber: bridgeDeposit.account_number || '',
            routingNumber: bridgeDeposit.routing_number || '',
            country: 'US',
          }
        }] as DepositInstruction[];
      }

      const depositAddress = bridgeDeposit.to_address ?? bridgeDeposit.address ?? ''
      return [{
        id: 'bridge-deposit',
        title: bridgeDeposit.label || 'Instrucciones de Fondeo (Bridge API)',
        kind: 'wallet',
        detail: depositAddress || [bridgeDeposit.payment_rail ?? bridgeDeposit.chain ?? 'crypto'].filter(Boolean).join(' | '),
        accent: 'emerald',
        qrValue: depositAddress || undefined,
        network: bridgeDeposit.chain || bridgeDeposit.payment_rail || undefined,
        currency: bridgeDeposit.currency || bridgeDeposit.source_currency || createdOrder?.source_currency || createdOrder?.currency || undefined,
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
      supplierName: selectedSupplier?.name || 'Pendiente',
      receiveVariant,
      uiMethodGroup,
      supportFileName: supportFile?.name ?? evidenceFile?.name ?? undefined,
      evidenceFileName: evidenceFile?.name ?? undefined,
      bridgeWallets,
      virtualAccounts,
    }),
    [amountOrigin, bridgeWallets, virtualAccounts, currentRoute.key, currentRoute.label, evidenceFile?.name, liveValues, receiveVariant, selectedSupplier?.name, supportFile?.name, uiMethodGroup]
  )

  useEffect(() => {
    form.reset(getDefaultValues(resolvedDefaultRoute))
    setCreatedOrder(null)
    setSupportFile(null)
    setEvidenceFile(null)
    setStep('route')
    setDetailSubStep('supplier')
    setFiatBoSubStep('wallet')
    setCryptoWithdrawSubStep('wallet')
    setFiatUsSubStep('wallet')
    setFiatBoDepositSubStep('wallet')
    setRampDepositSubStep('wallet')
    setWorldBoliviaSubStep('bank')
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
      if (!form.getValues('origin_currency')) form.setValue('origin_currency', 'USDC')
      if (!form.getValues('destination_currency')) form.setValue('destination_currency', 'USDC')
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
      if (route === 'crypto_to_crypto' && selectedSupplier.bank_details.wallet_currency) {
        form.setValue('destination_currency', String(selectedSupplier.bank_details.wallet_currency).toUpperCase() as PaymentOrderFormValues['destination_currency'])
        // Resetear selecciones de origen al cambiar proveedor
        form.setValue('source_crypto_network', '')
        form.setValue('origin_currency', '')
      }
    }
  }, [deliveryMethod, form, route, selectedSupplier, supplierAchDetails, supplierSwiftDetails])

  useEffect(() => {
    // Las rutas wallet ramp calculan y sincronizan sus propios estimados desde
    // sus componentes de detalle (wallet-ramp-detail-step, wallet-withdraw-detail-step).
    // Si el padre sobreescribe aquí, pisa los valores correctos del hijo.
    if (currentRoute.key === 'wallet_ramp_deposit' || currentRoute.key === 'wallet_ramp_withdraw') return

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

  // Cuando el servidor confirma el fee real (con overrides), sobreescribimos el estimado local.
  useEffect(() => {
    if (!feePreview || isWalletRampRoute) return

    const originAmount = Number(amountOrigin) || 0
    const serverFee = feePreview.fee_amount
    const currentRate = form.getValues('exchange_rate_applied') || 1

    const netAmount = originAmount - serverFee
    let converted = netAmount
    if (currentRate !== 1) {
      // BOB→USD: dividir. USD→BOB: multiplicar. Misma lógica que estimateRouteValues.
      const isBobToUsd = currentRoute.key === 'bolivia_to_exterior'
      converted = isBobToUsd ? netAmount / currentRate : netAmount * currentRate
    }
    converted = Math.max(Math.round(converted * 100) / 100, 0)

    form.setValue('fee_total', serverFee)
    form.setValue('amount_converted', converted)
    form.setValue('intended_amount', converted)
    setIsOverrideFee(feePreview.is_override)
  }, [feePreview, amountOrigin, currentRoute.key, isWalletRampRoute, form])

  async function handleCreateOrder(clientReason?: string) {
    try {
      setCreatingOrder(true)
      const formValues = form.getValues()
      const selectedSup = suppliers.find(s => s.id === formValues.supplier_id)
      const payload = buildPaymentOrderPayload(formValues, userId, selectedSup as Record<string, unknown> | undefined)
      if (clientReason) {
        payload.client_reason = clientReason
      }
      if (payload.flow_type === 'bridge_wallet_to_crypto') {
        console.log('[DEBUG bridge_wallet_to_crypto] Payload construido en form:', JSON.stringify(payload, null, 2))
      }
      const result = await onCreateOrder(payload, qrFile, supportFile) as PaymentOrder & { _type?: string; review?: unknown }

      // El backend retorna { _type: 'review_request', review } cuando el monto supera el límite
      if (result?._type === 'review_request') {
        setReviewRequest(result.review)
        setShowReviewReasonModal(false)
        setReviewReason('')
        setStep('review_requested')
        toast.info('Tu solicitud fue enviada a revisión. El equipo de Guira la atenderá en breve.')
        return
      }

      setCreatedOrder(result as PaymentOrder)
      setStep('finish')
      toast.success('Expediente creado. Ahora puedes adjuntar el comprobante final o hacerlo despues.')
    } catch (error: unknown) {
      // El backend puede retornar 409 si ya hay una review pendiente para este servicio
      const axiosErr = error as { response?: { status?: number; data?: { message?: string } } }
      if (axiosErr?.response?.status === 409) {
        const data = axiosErr?.response?.data
        toast.warning(data?.message ?? 'Ya tienes una solicitud de revisión pendiente para este servicio.')
        return
      }
      // El backend retorna 400 cuando excede el límite y no envió client_reason → mostrar modal
      const msg = getErrorMessage(error)
      if (msg.includes('límite máximo') || msg.includes('solicitud de revisión')) {
        setShowReviewReasonModal(true)
        return
      }
      console.error('Failed to create payment order', error)
      toast.error(`No se pudo crear el expediente: ${msg}`)
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
      toast.error(`No se pudo adjuntar el comprobante final: ${getErrorMessage(error)}`)
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
      if (route === 'wallet_ramp_withdraw') {
        if (isFiatBoWithdraw) {
          if (fiatBoSubStep === 'wallet') {
            const isValid = await form.trigger(['wallet_ramp_wallet_id', 'origin_currency'], { shouldFocus: true })
            if (!isValid) return
            setFiatBoSubStep('bank')
            return
          }
          if (fiatBoSubStep === 'bank') {
            setFiatBoSubStep('reason')
            return
          }
          if (fiatBoSubStep === 'reason') {
            const isValid = await form.trigger(['payment_reason'], { shouldFocus: true })
            if (!isValid) return
            if (!supportFile) {
              setShowSupportFileError(true)
              toast.error('Debes adjuntar el documento de respaldo para continuar.')
              return
            }
            setShowSupportFileError(false)
            setFiatBoSubStep('amount')
            return
          }
          if (fiatBoSubStep === 'amount') {
            const isValid = await form.trigger(['amount_origin'], { shouldFocus: true })
            if (!isValid) return
          }
        } else if (isCryptoWithdraw) {
          if (cryptoWithdrawSubStep === 'wallet') {
            const isValid = await form.trigger(['wallet_ramp_wallet_id', 'origin_currency'], { shouldFocus: true })
            if (!isValid) return
            setCryptoWithdrawSubStep('dest_wallet')
            return
          }
          if (cryptoWithdrawSubStep === 'dest_wallet') {
            const isValid = await form.trigger(['crypto_network', 'destination_currency', 'crypto_address'], { shouldFocus: true })
            if (!isValid) return
            setCryptoWithdrawSubStep('reason')
            return
          }
          if (cryptoWithdrawSubStep === 'reason') {
            const isValid = await form.trigger(['payment_reason'], { shouldFocus: true })
            if (!isValid) return
            if (!supportFile) {
              setShowSupportFileError(true)
              toast.error('Debes adjuntar el documento de respaldo para continuar.')
              return
            }
            setShowSupportFileError(false)
            setCryptoWithdrawSubStep('amount')
            return
          }
          if (cryptoWithdrawSubStep === 'amount') {
            const isValid = await form.trigger(['amount_origin'], { shouldFocus: true })
            if (!isValid) return
          }
        } else if (isFiatUsWithdraw) {
          if (fiatUsSubStep === 'wallet') {
            const isValid = await form.trigger(['wallet_ramp_wallet_id', 'origin_currency'], { shouldFocus: true })
            if (!isValid) return
            setFiatUsSubStep('supplier')
            return
          }
          if (fiatUsSubStep === 'supplier') {
            if (supplierValidationMessage) {
              toast.error(supplierValidationMessage)
              return
            }
            const isValid = await form.trigger(['supplier_id'], { shouldFocus: true })
            if (!isValid) return
            setFiatUsSubStep('reason')
            return
          }
          if (fiatUsSubStep === 'reason') {
            const isValid = await form.trigger(['payment_reason'], { shouldFocus: true })
            if (!isValid) return
            if (!supportFile) {
              setShowSupportFileError(true)
              toast.error('Debes adjuntar el documento de respaldo para continuar.')
              return
            }
            setShowSupportFileError(false)
            setFiatUsSubStep('amount')
            return
          }
          if (fiatUsSubStep === 'amount') {
            const isValid = await form.trigger(['amount_origin'], { shouldFocus: true })
            if (!isValid) return
          }
        }
      } else if (route === 'wallet_ramp_deposit') {
        if (isFiatBoDeposit) {
          // ── Sub-pasos para fiat_bo_to_bridge_wallet (3 pasos) ──
          if (fiatBoDepositSubStep === 'wallet') {
            const isValid = await form.trigger(['wallet_ramp_wallet_id', 'wallet_ramp_destination_currency'], { shouldFocus: true })
            if (!isValid) return
            setFiatBoDepositSubStep('reason')
            return
          }
          if (fiatBoDepositSubStep === 'reason') {
            const isValid = await form.trigger(['payment_reason'], { shouldFocus: true })
            if (!isValid) return
            if (!supportFile) {
              setShowSupportFileError(true)
              toast.error('Debes adjuntar el documento de respaldo para continuar.')
              return
            }
            setShowSupportFileError(false)
            setFiatBoDepositSubStep('amount')
            return
          }
          if (fiatBoDepositSubStep === 'amount') {
            const isValid = await form.trigger(['amount_origin'], { shouldFocus: true })
            if (!isValid) return
          }
        } else if (isRampDepositWithSubSteps) {
          // ── Sub-pasos para crypto deposit (3 pasos) ──
          if (rampDepositSubStep === 'wallet') {
            const isValid = await form.trigger(['wallet_ramp_wallet_id', 'wallet_ramp_destination_currency'], { shouldFocus: true })
            if (!isValid) return
            setRampDepositSubStep('network')
            return
          }
          if (rampDepositSubStep === 'network') {
            const fieldsToValidate: FieldPath<PaymentOrderFormValues>[] = [
              'wallet_ramp_source_network',
              'origin_currency',
            ]
            const isValid = await form.trigger(fieldsToValidate, { shouldFocus: true })
            if (!isValid) return
            setRampDepositSubStep('reason')
            return
          }
          if (rampDepositSubStep === 'reason') {
            const isValid = await form.trigger(['payment_reason'], { shouldFocus: true })
            if (!isValid) return
            if (!supportFile) {
              setShowSupportFileError(true)
              toast.error('Debes adjuntar el documento de respaldo para continuar.')
              return
            }
            setShowSupportFileError(false)
          }
        } else {
          // fiat_us: flujo monolítico original
          const isValidWalletRamp = await form.trigger([
            'amount_origin',
            'wallet_ramp_method',
            'wallet_ramp_va_id',
          ], { shouldFocus: true })
          if (!isValidWalletRamp) return
        }
      } else if (hasSubStepFlow) {
        // ── Sub-pasos para bolivia_to_exterior y crypto_to_crypto ──
        if (detailSubStep === 'supplier') {
          if (supplierValidationMessage) {
            toast.error(supplierValidationMessage)
            return
          }
          const supplierFields: FieldPath<PaymentOrderFormValues>[] = ['supplier_id', 'delivery_method']
          if (isBoliviaToExterior) supplierFields.push('funding_method')
          if (isBoliviaToExterior && uiMethodGroup !== 'crypto') supplierFields.push('destination_address')
          if (deliveryMethod === 'ach') supplierFields.push('ach_routing_number', 'ach_account_number', 'ach_bank_name')
          if (deliveryMethod === 'swift') supplierFields.push('swift_bank_name', 'swift_code', 'swift_iban', 'swift_bank_address', 'swift_country')
          if (deliveryMethod === 'crypto') supplierFields.push('crypto_address', 'crypto_network')
          if (isCryptoToCrypto) supplierFields.push('destination_currency')

          const isValid = await form.trigger(supplierFields, { shouldFocus: true })
          if (!isValid) return
          // crypto_to_crypto va a 'funding', bolivia_to_exterior salta a 'reason'
          setDetailSubStep(isCryptoToCrypto ? 'funding' : 'reason')
          return
        }
        if (detailSubStep === 'funding') {
          // Solo aplica a crypto_to_crypto
          const fundingFields: FieldPath<PaymentOrderFormValues>[] = ['source_crypto_network', 'origin_currency', 'source_crypto_address']
          const isValid = await form.trigger(fundingFields, { shouldFocus: true })
          if (!isValid) return
          setDetailSubStep('reason')
          return
        }
        if (detailSubStep === 'reason') {
          const isValid = await form.trigger(['payment_reason'], { shouldFocus: true })
          if (!isValid) return
          if (!supportFile) {
            setShowSupportFileError(true)
            toast.error('Debes adjuntar el documento de respaldo para continuar.')
            return
          }
          setShowSupportFileError(false)
          setDetailSubStep('amount')
          return
        }
        if (detailSubStep === 'amount') {
          const isValid = await form.trigger(['amount_origin'], { shouldFocus: true })
          if (!isValid) return
          const limitError = validateInterbankLimits()
          if (limitError) {
            toast.error(limitError)
            return
          }
          setStep('review')
          return
        }
      } else if (isWorldToBolivia) {
        // ── Sub-pasos para world_to_bolivia (3 pasos) ──
        if (worldBoliviaSubStep === 'bank') {
          const isValid = await form.trigger(['ach_bank_name', 'ach_account_number', 'destination_account_holder'], { shouldFocus: true })
          if (!isValid) return
          setWorldBoliviaSubStep('reason')
          return
        }
        if (worldBoliviaSubStep === 'reason') {
          const isValid = await form.trigger(['payment_reason'], { shouldFocus: true })
          if (!isValid) return
          if (!supportFile) {
            setShowSupportFileError(true)
            toast.error('Debes adjuntar el documento de respaldo para continuar.')
            return
          }
          setShowSupportFileError(false)
          setWorldBoliviaSubStep('amount')
          return
        }
        if (worldBoliviaSubStep === 'amount') {
          const isValid = await form.trigger(['amount_origin'], { shouldFocus: true })
          if (!isValid) return
          const limitError = validateInterbankLimits()
          if (limitError) {
            toast.error(limitError)
            return
          }
        }
      } else {
        if (supplierValidationMessage) {
          toast.error(supplierValidationMessage)
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

        // Validar límites interbank para flujos genéricos (wallet_to_fiat, etc.)
        const limitError = validateInterbankLimits()
        if (limitError) {
          toast.error(limitError)
          return
        }
      }
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
    // Sub-paso navigation para rutas con sub-pasos
    if (step === 'detail' && hasSubStepFlow && detailSubStep !== 'supplier') {
      const idx = DETAIL_SUB_ORDER.indexOf(detailSubStep)
      if (idx > 0) { setDetailSubStep(DETAIL_SUB_ORDER[idx - 1]); return }
    }
    // Al volver de review a detail en ruta con sub-pasos, caer en el último sub-paso
    if (step === 'review' && hasSubStepFlow) {
      setDetailSubStep('amount')
    }
    // Sub-paso navigation para fiat_bo
    if (step === 'detail' && isFiatBoWithdraw && fiatBoSubStep !== 'wallet') {
      const idx = FIAT_BO_SUB_ORDER.indexOf(fiatBoSubStep)
      if (idx > 0) { setFiatBoSubStep(FIAT_BO_SUB_ORDER[idx - 1]); return }
    }
    if (step === 'review' && isFiatBoWithdraw) {
      setFiatBoSubStep('amount')
    }
    // Sub-paso navigation para crypto withdraw
    if (step === 'detail' && isCryptoWithdraw && cryptoWithdrawSubStep !== 'wallet') {
      const idx = CRYPTO_WITHDRAW_SUB_ORDER.indexOf(cryptoWithdrawSubStep)
      if (idx > 0) { setCryptoWithdrawSubStep(CRYPTO_WITHDRAW_SUB_ORDER[idx - 1]); return }
    }
    if (step === 'review' && isCryptoWithdraw) {
      setCryptoWithdrawSubStep('amount')
    }
    // Sub-paso navigation para fiat_us withdraw
    if (step === 'detail' && isFiatUsWithdraw && fiatUsSubStep !== 'wallet') {
      const idx = FIAT_US_SUB_ORDER.indexOf(fiatUsSubStep)
      if (idx > 0) { setFiatUsSubStep(FIAT_US_SUB_ORDER[idx - 1]); return }
    }
    if (step === 'review' && isFiatUsWithdraw) {
      setFiatUsSubStep('amount')
    }
    // Sub-paso navigation para fiat_bo_to_bridge_wallet deposit
    if (step === 'detail' && isFiatBoDeposit && fiatBoDepositSubStep !== 'wallet') {
      const idx = FIAT_BO_DEPOSIT_SUB_ORDER.indexOf(fiatBoDepositSubStep)
      if (idx > 0) { setFiatBoDepositSubStep(FIAT_BO_DEPOSIT_SUB_ORDER[idx - 1]); return }
    }
    if (step === 'review' && isFiatBoDeposit) {
      setFiatBoDepositSubStep('amount')
    }
    // Sub-paso navigation para wallet_ramp_deposit (crypto)
    if (step === 'detail' && isRampDepositWithSubSteps && rampDepositSubStep !== 'wallet') {
      const idx = RAMP_DEPOSIT_SUB_ORDER.indexOf(rampDepositSubStep)
      if (idx > 0) { setRampDepositSubStep(RAMP_DEPOSIT_SUB_ORDER[idx - 1]); return }
    }
    if (step === 'review' && isRampDepositWithSubSteps) {
      setRampDepositSubStep('reason')
    }
    // Sub-paso navigation para world_to_bolivia
    if (step === 'detail' && isWorldToBolivia && worldBoliviaSubStep !== 'bank') {
      const idx = WORLD_BOLIVIA_SUB_ORDER.indexOf(worldBoliviaSubStep)
      if (idx > 0) { setWorldBoliviaSubStep(WORLD_BOLIVIA_SUB_ORDER[idx - 1]); return }
    }
    if (step === 'review' && isWorldToBolivia) {
      setWorldBoliviaSubStep('amount')
    }
    const currentIndex = STEP_ORDER.indexOf(step)
    const previousStep = STEP_ORDER[currentIndex - 1]
    if (!previousStep) return
    setStep(previousStep)
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Card className="ring-0 shadow-none bg-background overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-transparent px-4 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
              {isDepositRouteActive ? 'Fondeo de expediente' : 'Transferencia de expediente'}
            </span>
            <CardTitle className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
              {mode === 'depositar' ? 'Depositar' : (isDepositRouteActive ? 'Retirar fondos' : 'Enviar fondos')}
            </CardTitle>
            <CardDescription className="mt-1 text-sm text-muted-foreground leading-relaxed max-w-[65ch]">
              Selecciona ruta, metodo y detalle. La orden se crea antes de cualquier instruccion de pago.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 sm:space-y-8 px-4 py-6 sm:px-8 lg:px-10">
          <StepProgressRail currentStep={step} getStepLabel={getStepLabel} steps={STEP_ORDER} />

          <Form {...form}>
            <form className="mx-auto w-full max-w-4xl space-y-8" onSubmit={(event) => event.preventDefault()}>
              <AnimatePresence mode="wait">
                {step === 'route' ? (
                  <AnimatedStepPanel key="route">

                    <FormField
                      control={form.control}
                      name="route"
                      render={({ field }) => {
                        const interbankRoutes = routeOptions.filter(r => r.category === 'interbank' || !r.category)
                        const rampRoutes = routeOptions.filter(r => r.category === 'ramp')
                        return (
                          <FormItem>
                            <FormLabel className={FORM_LABEL_CLASS}>Ruta soportada</FormLabel>
                            <FormControl>
                              <div className="space-y-6">
                                {interbankRoutes.length > 0 && (
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                      <div className="h-px flex-1 bg-border/40" />
                                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                                        {mode === 'depositar' ? 'Recepción Interbancaria' : 'Envíos Interbancarios'}
                                      </span>
                                      <div className="h-px flex-1 bg-border/40" />
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                      {interbankRoutes.map((entry) => (
                                          <SelectionCard
                                            key={entry.key}
                                            description={entry.description}
                                            disabled={disabled || entry.disabled}
                                            icon={
                                              entry.key === 'bolivia_to_exterior' ? Send :
                                                entry.key === 'world_to_bolivia' ? Earth :
                                                  entry.key === 'crypto_to_crypto' ? ArrowRightLeft :
                                                    Landmark
                                            }
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
                                  </div>
                                )}
                                {rampRoutes.length > 0 && (
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                      <div className="h-px flex-1 bg-border/40" />
                                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                                        {mode === 'depositar' ? 'Fondeo de Billetera' : 'Retiros de Billetera'}
                                      </span>
                                      <div className="h-px flex-1 bg-border/40" />
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                      {rampRoutes.map((entry) => (
                                          <SelectionCard
                                            key={entry.key}
                                            description={entry.description}
                                            disabled={disabled || entry.disabled}
                                            icon={
                                              entry.key === 'wallet_ramp_deposit' ? WalletMinimal :
                                                entry.key === 'wallet_ramp_withdraw' ? ArrowUpRight :
                                                  Wallet
                                            }
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
                                  </div>
                                )}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )
                      }}
                    />

                    <div className="flex justify-end mt-8">
                      <GuiraButton disabled={disabled} onClick={handleNext} arrowNext>
                        Continuar a metodo
                      </GuiraButton>
                    </div>
                  </AnimatedStepPanel>
                ) : null}

                {step === 'method' ? (
                  <AnimatedStepPanel key="method">

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
                                  description="Recibe los fondos directamente en tu cuenta de banco local."
                                  disabled={disabled}
                                  icon={Building2}
                                  isSelected={field.value === 'bank_account'}
                                  onClick={() => field.onChange('bank_account')}
                                  title="Cuenta Bancaria"
                                />
                                {/* Hidden from UI — set to true to re-enable */}
                                {false && (
                                  <SelectionCard
                                    description="Próximamente: escanea y paga directamente usando un QR bancario."
                                    disabled={true} // Inhabilitado temporalmente a petición
                                    icon={FileText}
                                    isSelected={field.value === 'bank_qr'}
                                    onClick={() => field.onChange('bank_qr')}
                                    title="Pago con QR"
                                  />
                                )}
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
                                  description="Transfiere a cuentas bancarias internacionales vía ACH o SWIFT."
                                  disabled={disabled}
                                  icon={Landmark}
                                  isSelected={field.value === 'bank'}
                                  onClick={() => field.onChange('bank')}
                                  title="Transferencia Bancaria"
                                />
                                <SelectionCard
                                  description="Envía los fondos directamente a una billetera digital."
                                  disabled={disabled}
                                  icon={Bitcoin}
                                  isSelected={field.value === 'crypto'}
                                  onClick={() => field.onChange('crypto')}
                                  title="Billetera Crypto"
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
                        description="Recibe directamente en tu billetera digital asegurando rapidez."
                        disabled={disabled}
                        icon={Wallet}
                        isSelected
                        onClick={() => form.setValue('receive_variant', 'wallet')}
                        title="Directo a tu Billetera"
                      />
                    ) : null}

                    {currentRoute.key === 'crypto_to_crypto' ? (
                      <SelectionCard
                        description="Transfiere activos entre billeteras de manera inmediata."
                        disabled={disabled}
                        icon={Bitcoin}
                        isSelected
                        onClick={() => form.setValue('ui_method_group', 'crypto')}
                        title="A Billetera Digital"
                      />
                    ) : null}

                    {currentRoute.key === 'wallet_ramp_deposit' ? (
                      <FormField
                        control={form.control}
                        name="wallet_ramp_method"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={FORM_LABEL_CLASS}>¿Desde dónde depositas?</FormLabel>
                            <FormControl>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <SelectionCard
                                  description="Convierte tus Bolivianos a dólares digitales."
                                  disabled={disabled}
                                  icon={CircleDollarSign}
                                  isSelected={field.value === 'fiat_bo'}
                                  onClick={() => {
                                    field.onChange('fiat_bo')
                                    form.setValue('origin_currency', 'BOB')
                                    form.setValue('destination_currency', 'USDC')
                                  }}
                                  title="Con Bolivianos"
                                />
                                <SelectionCard
                                  description="Fondea usando tus activos digitales de otras billeteras."
                                  disabled={disabled}
                                  icon={Bitcoin}
                                  isSelected={field.value === 'crypto'}
                                  onClick={() => {
                                    field.onChange('crypto')
                                    form.setValue('origin_currency', 'USDT')
                                    form.setValue('destination_currency', 'USDC')
                                  }}
                                  title="Con Crypto"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : null}

                    {currentRoute.key === 'wallet_ramp_withdraw' ? (
                      <FormField
                        control={form.control}
                        name="wallet_ramp_withdraw_method"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={FORM_LABEL_CLASS}>¿Hacia dónde retiras?</FormLabel>
                            <FormControl>
                              <div className="grid gap-3 md:grid-cols-2">
                                <SelectionCard
                                  description="Recibe tu dinero directamente en tu cuenta local en Bolivianos."
                                  disabled={disabled}
                                  icon={Building2}
                                  isSelected={field.value === 'fiat_bo'}
                                  onClick={() => {
                                    field.onChange('fiat_bo')
                                    form.setValue('origin_currency', '')
                                    form.setValue('destination_currency', 'BOB')
                                  }}
                                  title="A Banco en Bolivia"
                                />
                                <SelectionCard
                                  description="Transfiere el saldo a otra billetera digital de forma directa."
                                  disabled={disabled}
                                  icon={Bitcoin}
                                  isSelected={field.value === 'crypto'}
                                  onClick={() => {
                                    field.onChange('crypto')
                                    form.setValue('origin_currency', '')
                                    form.setValue('destination_currency', '')
                                    form.setValue('crypto_network', '')
                                    form.setValue('crypto_address', '')
                                  }}
                                  title="A Billetera Crypto"
                                />
                                <SelectionCard
                                  description="Envía los fondos a una cuenta bancaria en Estados Unidos."
                                  disabled={disabled}
                                  icon={BadgeDollarSign}
                                  isSelected={field.value === 'fiat_us'}
                                  onClick={() => {
                                    field.onChange('fiat_us')
                                    form.setValue('origin_currency', '')
                                    form.setValue('destination_currency', 'USD')
                                  }}
                                  title="A Banco en EE.UU."
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : null}

                    <div className="flex items-center justify-between mt-8">
                      <GuiraButton variant="secondary" onClick={handleBack} arrowBack>
                        Volver
                      </GuiraButton>
                      <GuiraButton disabled={disabled} onClick={handleNext} arrowNext>
                        Continuar a detalle
                      </GuiraButton>
                    </div>
                  </AnimatedStepPanel>
                ) : null}

                {step === 'detail' ? (
                  <>
                    {!hasSubStepFlow && !isFiatBoWithdraw && !isCryptoWithdraw && !isFiatUsWithdraw && !isFiatBoDeposit && !isRampDepositWithSubSteps && !isWorldToBolivia && (
                      <AnimatedStepPanel key="detail">


                        <div className="grid gap-4">
                          {route === 'wallet_ramp_withdraw' ? (
                            <WalletWithdrawDetailStep
                              form={form}
                              method={walletRampWithdrawMethod || 'fiat_bo'}
                              wallets={bridgeWallets}
                              exchangeRates={exchangeRates}
                              feesConfig={feesConfig}
                              psavConfigs={psavConfigs}
                              disabled={disabled}
                            />
                          ) : route === 'wallet_ramp_deposit' ? (
                            <WalletRampDetailStep
                              form={form}
                              method={form.watch('wallet_ramp_method') || 'fiat_bo'}
                              wallets={bridgeWallets}
                              virtualAccounts={virtualAccounts}
                              loadingVirtualAccounts={loadingVirtualAccounts}
                              onVaCreated={(va) => setVirtualAccounts(prev => [...prev, va])}
                              exchangeRates={exchangeRates}
                              feesConfig={feesConfig}
                              disabled={disabled}
                            />
                          ) : route === 'wallet_to_fiat' ? (
                            <WalletToFiatDetailStep
                              form={form}
                              feesConfig={feesConfig}
                              exchangeRates={exchangeRates}
                              disabled={disabled}
                            />
                          ) : (
                            <>
                              <NumericField control={form.control} disabled={disabled} label={getAmountLabel(currentRoute.key)} name="amount_origin" />
                              {interbankLimits && (
                                <p className="text-[11px] text-muted-foreground text-center mt-1">
                                  Mín: ${interbankLimits.min_usd} USD · Máx: ${interbankLimits.max_usd} USD
                                </p>
                              )}
                              <EstimationSummary
                                amountOrigin={summaryStats.amountOrigin}
                                originCurrency={summaryStats.originCurrency}
                                feeTotal={summaryStats.feeTotal}
                                exchangeRate={exchangeRateApplied}
                                exchangeRateLabel={`${summaryStats.destinationCurrency}/${summaryStats.originCurrency}`}
                                exchangeRatePrecision={2}
                                receivesApprox={summaryStats.netAmountDestination}
                                receivesCurrency={summaryStats.destinationCurrency}
                                showAmountOrigin
                                isOverride={isOverrideFee}
                                receivesSubtext={
                                  summaryStats.originCurrency.trim().toUpperCase() !== summaryStats.destinationCurrency.trim().toUpperCase()
                                    ? `Después de comisión y conversión a ${summaryStats.destinationCurrency}`
                                    : 'Después de descontar la comisión'
                                }
                              />
                            </>
                          )}

                          {!shouldHideSupplier && route !== 'wallet_ramp_deposit' ? (
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
                                        {filteredSuppliers.map((supplier) => (
                                          <SelectItem key={supplier.id} value={supplier.id ?? supplier.name}>
                                            <span>{supplier.name}</span>
                                            {supplier.bridge_external_account_id ? (
                                              <span className="ml-1.5 text-sm text-muted-foreground">
                                                ({supplier.payment_rail?.toUpperCase() ?? 'BANK'} · External Account)
                                              </span>
                                            ) : null}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                  {currentRoute.key === 'wallet_ramp_withdraw' && walletRampWithdrawMethod === 'fiat_us' && filteredSuppliers.length === 0 ? (
                                    <p className="text-sm text-amber-500">
                                      No tienes proveedores con cuenta externa bancaria (ACH/Wire) registrada. Crea uno en la sección Proveedores para continuar.
                                    </p>
                                  ) : currentRoute.key === 'wallet_to_fiat' && filteredSuppliers.length === 0 ? (
                                    <p className="text-sm text-amber-500">
                                      No tienes proveedores con cuenta bancaria externa registrada en Bridge. Crea uno en la sección Proveedores.
                                    </p>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">
                                      {currentRoute.key === 'wallet_ramp_withdraw' && walletRampWithdrawMethod === 'fiat_us'
                                        ? 'Solo se muestran proveedores con cuenta bancaria externa registrada en Bridge (ACH/Wire).'
                                        : currentRoute.key === 'wallet_to_fiat'
                                          ? 'Solo se muestran proveedores con cuenta bancaria externa registrada en Bridge (ACH/Wire).'
                                          : currentRoute.key === 'crypto_to_crypto' || (currentRoute.key === 'bolivia_to_exterior' && uiMethodGroup === 'crypto')
                                            ? 'Solo se muestran proveedores con wallet crypto configurada.'
                                            : currentRoute.key === 'bolivia_to_exterior' && uiMethodGroup === 'bank'
                                              ? 'Solo se muestran proveedores con cuenta bancaria fiat.'
                                              : 'Debes crear un proveedor con los datos correctos antes de usar esta opcion.'}
                                    </p>
                                  )}
                                  <div className="flex flex-wrap items-center gap-3">
                                    <Link
                                      className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
                                      href="/proveedores"
                                    >
                                      Ir a Proveedores
                                    </Link>
                                    <span className="text-sm text-muted-foreground">Crea o completa el proveedor y vuelve a esta operacion.</span>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ) : null}

                          {supplierValidationMessage && hasSupplierSelected ? <ValidationNotice message={supplierValidationMessage} /> : null}

                          {/* Motivo obligatorio para retiro fiat US */}
                          {currentRoute.key === 'wallet_ramp_withdraw' ? (
                            <TextField control={form.control} disabled={disabled} label="Motivo del retiro" name="payment_reason" />
                          ) : null}

                          {/* El campo QR bancario (Opcional) fue removido de aquí para trasladarlo al método 'bank_qr' posteriormente */}

                          {shouldShowExpandedDetail && route !== 'wallet_ramp_deposit' ? (
                            <>
                              {!shouldHideSupplier && route !== 'wallet_to_fiat' ? (
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
                                          disabled={disabled || availableTechnicalMethods.length <= 1}
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

                              {/* Legacy detail block — these routes now go through hasSubStepFlow; kept for safety */}
                              {(() => {
                                const r = route as string; return currentRoute.key !== 'us_to_wallet' && currentRoute.key !== 'world_to_bolivia' && currentRoute.key !== 'wallet_ramp_withdraw' && currentRoute.key !== 'wallet_to_fiat' ? (
                                  <>
                                    <div className={`grid gap-4 ${(r === 'bolivia_to_exterior' && uiMethodGroup !== 'crypto') ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
                                      {!(r === 'bolivia_to_exterior' && uiMethodGroup === 'crypto') && r !== 'crypto_to_crypto' ? (
                                        <TextField control={form.control} disabled={disabled} label={getDestinationLabel(currentRoute.key)} name="destination_address" />
                                      ) : null}
                                      {r === 'bolivia_to_exterior' ? (
                                        <FormField
                                          control={form.control}
                                          name="funding_method"
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel className={FORM_LABEL_CLASS}>Funding method</FormLabel>
                                              <FormControl>
                                                <Select value={field.value} onValueChange={field.onChange} disabled={true}>
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

                                    {deliveryMethod === 'swift' && r === 'bolivia_to_exterior' ? (
                                      <div className="grid gap-4 lg:grid-cols-2">
                                        <TextField control={form.control} disabled={disabled} label="Banco" name="swift_bank_name" />
                                        <TextField control={form.control} disabled={disabled} label="Codigo SWIFT" name="swift_code" />
                                        <TextField control={form.control} disabled={disabled} label="IBAN o cuenta" name="swift_iban" />
                                        <TextField control={form.control} disabled={disabled} label="Direccion del banco" name="swift_bank_address" />
                                        <TextField control={form.control} disabled={disabled} label="Pais del banco" name="swift_country" />
                                      </div>
                                    ) : null}

                                    {deliveryMethod === 'ach' && r === 'bolivia_to_exterior' ? (
                                      <div className="grid gap-4 lg:grid-cols-3">
                                        <TextField control={form.control} disabled={disabled} label="Routing number" name="ach_routing_number" />
                                        <TextField control={form.control} disabled={disabled} label="Account number" name="ach_account_number" />
                                        <TextField control={form.control} disabled={disabled} label="Bank name" name="ach_bank_name" />
                                      </div>
                                    ) : null}

                                    {deliveryMethod === 'crypto' ? (
                                      <>
                                        {r === 'crypto_to_crypto' ? (
                                          <>
                                            <div className="grid gap-4 mt-4 px-4 py-4 border rounded-md bg-muted/20">
                                              <div className="col-span-full mb-2">
                                                <h4 className="text-base font-semibold">Datos de Fondeo (Desde dónde envías)</h4>
                                              </div>
                                              <div className="grid gap-4 lg:grid-cols-2">
                                                <NetworkSelectField
                                                  control={form.control}
                                                  disabled={disabled || !hasSupplierSelected || supportedSourceNetworks.length === 0}
                                                  label="Red de Origen"
                                                  name="source_crypto_network"
                                                  placeholder="Selecciona la red"
                                                  options={supportedSourceNetworks}
                                                />
                                                <CurrencySelectField
                                                  control={form.control}
                                                  disabled={disabled || !hasSupplierSelected || supportedSourceCurrencies.length === 0}
                                                  label="Moneda de origen"
                                                  name="origin_currency"
                                                  placeholder="Selecciona moneda"
                                                  options={supportedSourceCurrencies}
                                                />
                                              </div>
                                              <TextField control={form.control} disabled={disabled} label="Wallet de Origen (Externa)" name="source_crypto_address" />
                                            </div>
                                          </>
                                        ) : null}
                                        <div className="grid gap-4 lg:grid-cols-3 mt-4">
                                          <TextField control={form.control} disabled={true} label="Wallet destino" name="crypto_address" />
                                          <NetworkSelectField control={form.control} disabled={true} label="Red destino" name="crypto_network" placeholder="Selecciona la red" />
                                          {r === 'crypto_to_crypto' ? (
                                            <CurrencySelectField control={form.control} disabled={true} label="Moneda destino" name="destination_currency" placeholder="Selecciona moneda" />
                                          ) : null}
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
                                ) : null;
                              })()}

                              {currentRoute.key !== 'us_to_wallet' && !isDepositRouteActive ? (
                                <TextField control={form.control} disabled={disabled} label="Motivo del pago" name="payment_reason" />
                              ) : null}


                              {showSupportUpload && !(currentRoute.key === 'world_to_bolivia' && receiveVariant === 'bank_qr') ? (
                                <DocumentInputCard
                                  className={showSupportFileError && !supportFile ? 'border-destructive/80 bg-destructive/5 ring-1 ring-destructive' : ''}
                                  file={supportFile}
                                  label="Documento de respaldo"
                                  description={
                                    currentRoute.key === 'bolivia_to_exterior' || currentRoute.key === 'crypto_to_crypto' || currentRoute.key === 'world_to_bolivia' || currentRoute.key === 'wallet_ramp_withdraw'
                                      ? 'Obligatorio en esta ruta. Se guardará como support_document_url al crear la orden.'
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
                            <div className="border-l-2 border-amber-500/70 bg-amber-50/70 px-4 py-4 text-base text-amber-950">
                              Corrige primero la observacion del proveedor para habilitar los campos siguientes.
                            </div>
                          ) : (
                            <div className="border-l-2 border-border/70 bg-muted/10 px-4 py-4 text-base text-muted-foreground">
                              Selecciona primero un proveedor valido para mostrar metodo tecnico, monedas y metadata autocompletada.
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-8">
                          <GuiraButton variant="secondary" onClick={handleBack} arrowBack>
                            Volver
                          </GuiraButton>
                          <GuiraButton disabled={disabled} onClick={handleNext} arrowNext>
                            Revisar expediente
                          </GuiraButton>
                        </div>
                      </AnimatedStepPanel>
                    )}

                    {hasSubStepFlow && (
                      <AnimatedStepPanel key={`detail-${detailSubStep}`}>
                        <SubStepRail steps={DETAIL_SUB_ORDER} current={detailSubStep} />

                        <div className="grid gap-4">
                          {detailSubStep === 'supplier' && (
                            <>


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
                                          <SelectValue placeholder="Selecciona uno guardado o crea uno nuevo">
                                            {selectedSupplier?.name ?? (field.value ? field.value : undefined)}
                                          </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">Sin proveedor cargado</SelectItem>
                                          {filteredSuppliers.map((supplier) => (
                                            <SelectItem key={supplier.id} value={supplier.id ?? supplier.name}>
                                              <span>{supplier.name}</span>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </FormControl>
                                    <p className="text-sm text-muted-foreground">
                                      {isCryptoToCrypto
                                        ? 'Solo se muestran proveedores con wallet crypto configurada.'
                                        : 'Debes crear un proveedor con los datos correctos antes de usar esta opcion.'}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-3">
                                      <Link className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted" href="/proveedores">Ir a Proveedores</Link>
                                      <span className="text-sm text-muted-foreground">Crea o completa el proveedor y vuelve a esta operacion.</span>
                                    </div>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              {supplierValidationMessage && hasSupplierSelected ? <ValidationNotice message={supplierValidationMessage} /> : null}

                              {shouldShowExpandedDetail && (
                                <>
                                  <FormField
                                    control={form.control}
                                    name="delivery_method"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className={FORM_LABEL_CLASS}>Metodo tecnico final</FormLabel>
                                        <FormControl>
                                          <Select value={field.value} onValueChange={field.onChange} disabled={disabled || isCryptoToCrypto || uiMethodGroup === 'crypto' || availableTechnicalMethods.length <= 1}>
                                            <SelectTrigger className={cn(FORM_UNDERLINE_SELECT_CLASS, FORM_TEXT_CLASS)}>
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {availableTechnicalMethods.map((method) => (
                                                <SelectItem key={method} value={method}>{method}</SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  {isBoliviaToExterior && (
                                    <div className={`grid gap-4 ${uiMethodGroup !== 'crypto' ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
                                      {uiMethodGroup !== 'crypto' && (
                                        <TextField control={form.control} disabled={disabled} label="Cuenta o destino" name="destination_address" />
                                      )}
                                      <FormField control={form.control} name="funding_method" render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className={FORM_LABEL_CLASS}>Funding method</FormLabel>
                                          <FormControl>
                                            <Select value={field.value} onValueChange={field.onChange} disabled={true}>
                                              <SelectTrigger className={cn(FORM_UNDERLINE_SELECT_CLASS, FORM_TEXT_CLASS)}><SelectValue /></SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="bs">bs</SelectItem>
                                                <SelectItem value="crypto">crypto</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </FormControl>
                                        </FormItem>
                                      )} />
                                    </div>
                                  )}

                                  {deliveryMethod === 'swift' && isBoliviaToExterior && (
                                    <div className="grid gap-4 lg:grid-cols-2">
                                      <TextField control={form.control} disabled={disabled} label="Banco" name="swift_bank_name" />
                                      <TextField control={form.control} disabled={disabled} label="Codigo SWIFT" name="swift_code" />
                                      <TextField control={form.control} disabled={disabled} label="IBAN o cuenta" name="swift_iban" />
                                      <TextField control={form.control} disabled={disabled} label="Direccion del banco" name="swift_bank_address" />
                                      <TextField control={form.control} disabled={disabled} label="Pais del banco" name="swift_country" />
                                    </div>
                                  )}

                                  {deliveryMethod === 'ach' && isBoliviaToExterior && (
                                    <div className="grid gap-4 lg:grid-cols-3">
                                      <TextField control={form.control} disabled={disabled} label="Routing number" name="ach_routing_number" />
                                      <TextField control={form.control} disabled={disabled} label="Account number" name="ach_account_number" />
                                      <TextField control={form.control} disabled={disabled} label="Bank name" name="ach_bank_name" />
                                    </div>
                                  )}

                                  {deliveryMethod === 'crypto' && (
                                    <div className="grid gap-4 lg:grid-cols-2 mt-4">
                                      <TextField control={form.control} disabled={true} label="Wallet destino" name="crypto_address" />
                                      <NetworkSelectField control={form.control} disabled={true} label="Red destino" name="crypto_network" placeholder="Selecciona la red" />
                                      {isCryptoToCrypto && (
                                        <CurrencySelectField control={form.control} disabled={true} label="Moneda destino" name="destination_currency" placeholder="Selecciona moneda" />
                                      )}
                                    </div>
                                  )}
                                </>
                              )}
                            </>
                          )}

                          {detailSubStep === 'funding' && isCryptoToCrypto && (
                            <>

                              <div className="grid gap-4 lg:grid-cols-2">
                                <NetworkSelectField
                                  control={form.control}
                                  disabled={disabled || !hasSupplierSelected || supportedSourceNetworks.length === 0}
                                  label="Red de Origen"
                                  name="source_crypto_network"
                                  placeholder="Selecciona la red"
                                  options={supportedSourceNetworks}
                                />
                                <CurrencySelectField
                                  control={form.control}
                                  disabled={disabled || !hasSupplierSelected || supportedSourceCurrencies.length === 0}
                                  label="Moneda de origen"
                                  name="origin_currency"
                                  placeholder="Selecciona moneda"
                                  options={supportedSourceCurrencies}
                                />
                              </div>
                              <TextField control={form.control} disabled={disabled} label="Wallet de Origen (Externa)" name="source_crypto_address" />
                            </>
                          )}

                          {detailSubStep === 'reason' && (
                            <>

                              <TextField control={form.control} disabled={disabled} label="Motivo del pago" name="payment_reason" />
                              <DocumentInputCard
                                className={showSupportFileError && !supportFile ? 'border-destructive/80 bg-destructive/5 ring-1 ring-destructive' : ''}
                                file={supportFile}
                                label="Documento de respaldo"
                                description="Obligatorio en esta ruta. Se guardara como support_document_url al crear la orden."
                                onFileChange={(f) => {
                                  setSupportFile(f)
                                  if (f) setShowSupportFileError(false)
                                }}
                              />
                            </>
                          )}

                          {detailSubStep === 'amount' && (
                            <>

                              <NumericField control={form.control} disabled={disabled} label={getAmountLabel(currentRoute.key)} name="amount_origin" />
                              {interbankLimits && (
                                <p className="text-[11px] text-muted-foreground text-center mt-1">
                                  Mín: ${interbankLimits.min_usd} USD · Máx: ${interbankLimits.max_usd} USD
                                </p>
                              )}
                              <EstimationSummary
                                amountOrigin={summaryStats.amountOrigin}
                                originCurrency={summaryStats.originCurrency}
                                feeTotal={summaryStats.feeTotal}
                                exchangeRate={exchangeRateApplied}
                                exchangeRateLabel={`${summaryStats.destinationCurrency}/${summaryStats.originCurrency}`}
                                exchangeRatePrecision={2}
                                receivesApprox={summaryStats.netAmountDestination}
                                receivesCurrency={summaryStats.destinationCurrency}
                                showAmountOrigin
                                isOverride={isOverrideFee}
                                receivesSubtext={
                                  summaryStats.originCurrency.trim().toUpperCase() !== summaryStats.destinationCurrency.trim().toUpperCase()
                                    ? `Después de comisión y conversión a ${summaryStats.destinationCurrency}`
                                    : 'Después de descontar la comisión'
                                }
                                validationError={
                                  isInterbankRoute && summaryStats.amountOrigin > 0
                                    ? validateInterbankLimits() ?? undefined
                                    : undefined
                                }
                              />
                            </>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-8">
                          <GuiraButton variant="secondary" onClick={handleBack} arrowBack>
                            {detailSubStep === 'supplier' ? 'Volver' : 'Anterior'}
                          </GuiraButton>
                          <GuiraButton disabled={disabled} onClick={handleNext} arrowNext>
                            {detailSubStep === 'amount' ? 'Revisar expediente' : 'Siguiente'}
                          </GuiraButton>
                        </div>
                      </AnimatedStepPanel>
                    )}

                    {isFiatBoWithdraw && (
                      <AnimatedStepPanel key={`detail-fiatbo-${fiatBoSubStep}`}>
                        <SubStepRail steps={FIAT_BO_SUB_ORDER} current={fiatBoSubStep} />

                        <div className="grid gap-4">
                          {fiatBoSubStep === 'wallet' && (
                            <>

                              <WalletWithdrawDetailStep
                                form={form}
                                method="fiat_bo"
                                wallets={bridgeWallets}
                                exchangeRates={exchangeRates}
                                feesConfig={feesConfig}
                                psavConfigs={psavConfigs}
                                disabled={disabled}
                                subStep="wallet"
                              />
                            </>
                          )}

                          {fiatBoSubStep === 'bank' && (
                            <>

                              <WalletWithdrawDetailStep
                                form={form}
                                method="fiat_bo"
                                wallets={bridgeWallets}
                                exchangeRates={exchangeRates}
                                feesConfig={feesConfig}
                                psavConfigs={psavConfigs}
                                disabled={disabled}
                                subStep="bank"
                              />
                            </>
                          )}

                          {fiatBoSubStep === 'reason' && (
                            <>

                              <TextField control={form.control} disabled={disabled} label="Motivo del retiro" name="payment_reason" />
                              <DocumentInputCard
                                className={showSupportFileError && !supportFile ? 'border-destructive/80 bg-destructive/5 ring-1 ring-destructive' : ''}
                                file={supportFile}
                                label="Documento de respaldo"
                                description="Obligatorio en esta ruta. Se guardará como support_document_url al crear la orden."
                                onFileChange={(f) => {
                                  setSupportFile(f)
                                  if (f) setShowSupportFileError(false)
                                }}
                              />
                            </>
                          )}

                          {fiatBoSubStep === 'amount' && (
                            <>

                              <WalletWithdrawDetailStep
                                form={form}
                                method="fiat_bo"
                                wallets={bridgeWallets}
                                exchangeRates={exchangeRates}
                                feesConfig={feesConfig}
                                psavConfigs={psavConfigs}
                                disabled={disabled}
                                subStep="amount"
                              />
                            </>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-8">
                          <GuiraButton variant="secondary" onClick={handleBack} arrowBack>
                            {fiatBoSubStep === 'wallet' ? 'Volver' : 'Anterior'}
                          </GuiraButton>
                          <GuiraButton disabled={disabled} onClick={handleNext} arrowNext>
                            {fiatBoSubStep === 'amount' ? 'Revisar expediente' : 'Siguiente'}
                          </GuiraButton>
                        </div>
                      </AnimatedStepPanel>
                    )}

                    {isCryptoWithdraw && (
                      <AnimatedStepPanel key={`detail-crypto-${cryptoWithdrawSubStep}`}>
                        <SubStepRail steps={CRYPTO_WITHDRAW_SUB_ORDER} current={cryptoWithdrawSubStep} />

                        <div className="grid gap-4">
                          {cryptoWithdrawSubStep === 'wallet' && (
                            <>

                              <WalletWithdrawDetailStep
                                form={form}
                                method="crypto"
                                wallets={bridgeWallets}
                                exchangeRates={exchangeRates}
                                feesConfig={feesConfig}
                                psavConfigs={psavConfigs}
                                disabled={disabled}
                                subStep="wallet"
                              />
                            </>
                          )}

                          {cryptoWithdrawSubStep === 'dest_wallet' && (
                            <>

                              <WalletWithdrawDetailStep
                                form={form}
                                method="crypto"
                                wallets={bridgeWallets}
                                exchangeRates={exchangeRates}
                                feesConfig={feesConfig}
                                psavConfigs={psavConfigs}
                                disabled={disabled}
                                subStep="dest_wallet"
                              />
                            </>
                          )}

                          {cryptoWithdrawSubStep === 'reason' && (
                            <>

                              <TextField control={form.control} disabled={disabled} label="Motivo del retiro" name="payment_reason" />
                              <DocumentInputCard
                                className={showSupportFileError && !supportFile ? 'border-destructive/80 bg-destructive/5 ring-1 ring-destructive' : ''}
                                file={supportFile}
                                label="Documento de respaldo"
                                description="Obligatorio en esta ruta. Se guardará como support_document_url al crear la orden."
                                onFileChange={(f) => { setSupportFile(f); if (f) setShowSupportFileError(false) }}
                              />
                            </>
                          )}

                          {cryptoWithdrawSubStep === 'amount' && (
                            <>

                              <WalletWithdrawDetailStep
                                form={form}
                                method="crypto"
                                wallets={bridgeWallets}
                                exchangeRates={exchangeRates}
                                feesConfig={feesConfig}
                                psavConfigs={psavConfigs}
                                disabled={disabled}
                                subStep="amount"
                              />
                            </>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-8">
                          <GuiraButton variant="secondary" onClick={handleBack} arrowBack>
                            {cryptoWithdrawSubStep === 'wallet' ? 'Volver' : 'Anterior'}
                          </GuiraButton>
                          <GuiraButton disabled={disabled} onClick={handleNext} arrowNext>
                            {cryptoWithdrawSubStep === 'amount' ? 'Revisar expediente' : 'Siguiente'}
                          </GuiraButton>
                        </div>
                      </AnimatedStepPanel>
                    )}

                    {isFiatUsWithdraw && (
                      <AnimatedStepPanel key={`detail-fiatus-${fiatUsSubStep}`}>
                        <SubStepRail steps={FIAT_US_SUB_ORDER} current={fiatUsSubStep} />

                        <div className="grid gap-4">
                          {fiatUsSubStep === 'wallet' && (
                            <>

                              <WalletWithdrawDetailStep
                                form={form}
                                method="fiat_us"
                                wallets={bridgeWallets}
                                exchangeRates={exchangeRates}
                                feesConfig={feesConfig}
                                psavConfigs={psavConfigs}
                                disabled={disabled}
                                subStep="wallet"
                              />
                            </>
                          )}

                          {fiatUsSubStep === 'supplier' && (
                            <>

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
                                          <SelectValue placeholder="Selecciona uno guardado">
                                            {selectedSupplier?.name ?? (field.value ? field.value : undefined)}
                                          </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">Sin proveedor cargado</SelectItem>
                                          {filteredSuppliers.map((supplier) => (
                                            <SelectItem key={supplier.id} value={supplier.id ?? supplier.name}>
                                              <span>{supplier.name}</span>
                                              {supplier.bridge_external_account_id ? (
                                                <span className="ml-1.5 text-sm text-muted-foreground">
                                                  ({supplier.payment_rail?.toUpperCase() ?? 'BANK'} · External Account)
                                                </span>
                                              ) : null}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </FormControl>
                                    {filteredSuppliers.length === 0 ? (
                                      <p className="text-sm text-amber-500">
                                        No tienes proveedores con cuenta bancaria externa (ACH/Wire) registrada en Bridge. Crea uno en la sección Proveedores.
                                      </p>
                                    ) : (
                                      <p className="text-sm text-muted-foreground">
                                        Solo se muestran proveedores con cuenta bancaria externa registrada en Bridge (ACH/Wire).
                                      </p>
                                    )}
                                    <div className="flex flex-wrap items-center gap-3">
                                      <Link
                                        className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
                                        href="/proveedores"
                                      >
                                        Ir a Proveedores
                                      </Link>
                                      <span className="text-sm text-muted-foreground">Crea o completa el proveedor y vuelve a esta operacion.</span>
                                    </div>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              {supplierValidationMessage && hasSupplierSelected ? <ValidationNotice message={supplierValidationMessage} /> : null}
                            </>
                          )}

                          {fiatUsSubStep === 'reason' && (
                            <>

                              <TextField control={form.control} disabled={disabled} label="Motivo del retiro" name="payment_reason" />
                              <DocumentInputCard
                                className={showSupportFileError && !supportFile ? 'border-destructive/80 bg-destructive/5 ring-1 ring-destructive' : ''}
                                file={supportFile}
                                label="Documento de respaldo"
                                description="Obligatorio en esta ruta. Se guardará como support_document_url al crear la orden."
                                onFileChange={(f) => { setSupportFile(f); if (f) setShowSupportFileError(false) }}
                              />
                            </>
                          )}

                          {fiatUsSubStep === 'amount' && (
                            <>

                              <WalletWithdrawDetailStep
                                form={form}
                                method="fiat_us"
                                wallets={bridgeWallets}
                                exchangeRates={exchangeRates}
                                feesConfig={feesConfig}
                                psavConfigs={psavConfigs}
                                disabled={disabled}
                                subStep="amount"
                              />
                            </>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-8">
                          <GuiraButton variant="secondary" onClick={handleBack} arrowBack>
                            {fiatUsSubStep === 'wallet' ? 'Volver' : 'Anterior'}
                          </GuiraButton>
                          <GuiraButton disabled={disabled} onClick={handleNext} arrowNext>
                            {fiatUsSubStep === 'amount' ? 'Revisar expediente' : 'Siguiente'}
                          </GuiraButton>
                        </div>
                      </AnimatedStepPanel>
                    )}

                    {isFiatBoDeposit && (
                      <AnimatedStepPanel key={`detail-fiat-bo-deposit-${fiatBoDepositSubStep}`}>
                        <SubStepRail steps={FIAT_BO_DEPOSIT_SUB_ORDER} current={fiatBoDepositSubStep} />

                        <div className="grid gap-4">
                          {fiatBoDepositSubStep === 'wallet' && (
                            <>

                              <WalletRampDetailStep
                                form={form}
                                method="fiat_bo"
                                wallets={bridgeWallets}
                                virtualAccounts={virtualAccounts}
                                loadingVirtualAccounts={loadingVirtualAccounts}
                                onVaCreated={(va) => setVirtualAccounts(prev => [...prev, va])}
                                exchangeRates={exchangeRates}
                                feesConfig={feesConfig}
                                disabled={disabled}
                                subStep="wallet"
                              />
                            </>
                          )}

                          {fiatBoDepositSubStep === 'reason' && (
                            <>

                              <TextField control={form.control} disabled={disabled} label="Motivo del depósito" name="payment_reason" />
                              <DocumentInputCard
                                className={showSupportFileError && !supportFile ? 'border-destructive/80 bg-destructive/5 ring-1 ring-destructive' : ''}
                                file={supportFile}
                                label="Documento de respaldo"
                                description="Obligatorio. Se guardará como support_document_url al crear la orden."
                                onFileChange={(f) => {
                                  setSupportFile(f)
                                  if (f) setShowSupportFileError(false)
                                }}
                              />
                            </>
                          )}

                          {fiatBoDepositSubStep === 'amount' && (
                            <>

                              <WalletRampDetailStep
                                form={form}
                                method="fiat_bo"
                                wallets={bridgeWallets}
                                virtualAccounts={virtualAccounts}
                                loadingVirtualAccounts={loadingVirtualAccounts}
                                onVaCreated={(va) => setVirtualAccounts(prev => [...prev, va])}
                                exchangeRates={exchangeRates}
                                feesConfig={feesConfig}
                                disabled={disabled}
                                subStep="amount"
                              />
                            </>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-8">
                          <GuiraButton variant="secondary" onClick={handleBack} arrowBack>
                            {fiatBoDepositSubStep === 'wallet' ? 'Volver' : 'Anterior'}
                          </GuiraButton>
                          <GuiraButton disabled={disabled} onClick={handleNext} arrowNext>
                            {fiatBoDepositSubStep === 'amount' ? 'Revisar expediente' : 'Siguiente'}
                          </GuiraButton>
                        </div>
                      </AnimatedStepPanel>
                    )}

                    {isRampDepositWithSubSteps && (
                      <AnimatedStepPanel key={`detail-ramp-deposit-${rampDepositSubStep}`}>
                        <SubStepRail steps={RAMP_DEPOSIT_SUB_ORDER} current={rampDepositSubStep} />

                        <div className="grid gap-4">
                          {rampDepositSubStep === 'wallet' && (
                            <>

                              <WalletRampDetailStep
                                form={form}
                                method={walletRampMethod || 'fiat_bo'}
                                wallets={bridgeWallets}
                                virtualAccounts={virtualAccounts}
                                loadingVirtualAccounts={loadingVirtualAccounts}
                                onVaCreated={(va) => setVirtualAccounts(prev => [...prev, va])}
                                exchangeRates={exchangeRates}
                                feesConfig={feesConfig}
                                disabled={disabled}
                                subStep="wallet"
                              />
                            </>
                          )}

                          {rampDepositSubStep === 'network' && (
                            <>

                              <WalletRampDetailStep
                                form={form}
                                method={walletRampMethod || 'fiat_bo'}
                                wallets={bridgeWallets}
                                virtualAccounts={virtualAccounts}
                                loadingVirtualAccounts={loadingVirtualAccounts}
                                onVaCreated={(va) => setVirtualAccounts(prev => [...prev, va])}
                                exchangeRates={exchangeRates}
                                feesConfig={feesConfig}
                                disabled={disabled}
                                subStep="network"
                              />
                            </>
                          )}

                          {rampDepositSubStep === 'reason' && (
                            <>

                              <TextField control={form.control} disabled={disabled} label="Motivo del depósito" name="payment_reason" />
                              <DocumentInputCard
                                className={showSupportFileError && !supportFile ? 'border-destructive/80 bg-destructive/5 ring-1 ring-destructive' : ''}
                                file={supportFile}
                                label="Documento de respaldo"
                                description="Obligatorio. Se guardará como support_document_url al crear la orden."
                                onFileChange={(f) => {
                                  setSupportFile(f)
                                  if (f) setShowSupportFileError(false)
                                }}
                              />
                            </>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-8">
                          <GuiraButton variant="secondary" onClick={handleBack} arrowBack>
                            {rampDepositSubStep === 'wallet' ? 'Volver' : 'Anterior'}
                          </GuiraButton>
                          <GuiraButton disabled={disabled} onClick={handleNext} arrowNext>
                            {rampDepositSubStep === 'reason' ? 'Revisar expediente' : 'Siguiente'}
                          </GuiraButton>
                        </div>
                      </AnimatedStepPanel>
                    )}

                    {isWorldToBolivia && (
                      <AnimatedStepPanel key={`detail-world-bolivia-${worldBoliviaSubStep}`}>
                        <SubStepRail steps={WORLD_BOLIVIA_SUB_ORDER} current={worldBoliviaSubStep} />

                        <div className="grid gap-4">
                          {worldBoliviaSubStep === 'bank' && (
                            <>

                              <div className="grid gap-4 lg:grid-cols-2">
                                <TextField control={form.control} disabled={disabled} label="Banco" name="ach_bank_name" />
                                <TextField control={form.control} disabled={disabled} label="Cuenta bancaria" name="ach_account_number" />
                              </div>
                              <TextField control={form.control} disabled={disabled} label="Nombre del titular de la cuenta" name="destination_account_holder" />
                            </>
                          )}

                          {worldBoliviaSubStep === 'reason' && (
                            <>

                              <TextField control={form.control} disabled={disabled} label="Motivo del pago" name="payment_reason" />
                              <DocumentInputCard
                                className={showSupportFileError && !supportFile ? 'border-destructive/80 bg-destructive/5 ring-1 ring-destructive' : ''}
                                file={supportFile}
                                label="Documento de respaldo"
                                description="Obligatorio en esta ruta. Se guardará como support_document_url al crear la orden."
                                onFileChange={(f) => {
                                  setSupportFile(f)
                                  if (f) setShowSupportFileError(false)
                                }}
                              />
                            </>
                          )}

                          {worldBoliviaSubStep === 'amount' && (
                            <>

                              <NumericField control={form.control} disabled={disabled} label={getAmountLabel(currentRoute.key)} name="amount_origin" />
                              {interbankLimits && (
                                <p className="text-[11px] text-muted-foreground text-center mt-1">
                                  Mín: ${interbankLimits.min_usd} USD · Máx: ${interbankLimits.max_usd} USD
                                </p>
                              )}
                              <EstimationSummary
                                amountOrigin={summaryStats.amountOrigin}
                                originCurrency={summaryStats.originCurrency}
                                feeTotal={summaryStats.feeTotal}
                                exchangeRate={exchangeRateApplied}
                                exchangeRateLabel={`${summaryStats.destinationCurrency}/${summaryStats.originCurrency}`}
                                exchangeRatePrecision={2}
                                receivesApprox={summaryStats.netAmountDestination}
                                receivesCurrency={summaryStats.destinationCurrency}
                                showAmountOrigin
                                isOverride={isOverrideFee}
                                receivesSubtext={
                                  summaryStats.originCurrency.trim().toUpperCase() !== summaryStats.destinationCurrency.trim().toUpperCase()
                                    ? `Después de comisión y conversión a ${summaryStats.destinationCurrency}`
                                    : 'Después de descontar la comisión'
                                }
                              />
                            </>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-8">
                          <GuiraButton variant="secondary" onClick={handleBack} arrowBack>
                            {worldBoliviaSubStep === 'bank' ? 'Volver' : 'Anterior'}
                          </GuiraButton>
                          <GuiraButton disabled={disabled} onClick={handleNext} arrowNext>
                            {worldBoliviaSubStep === 'amount' ? 'Revisar expediente' : 'Siguiente'}
                          </GuiraButton>
                        </div>
                      </AnimatedStepPanel>
                    )}
                  </>
                ) : null}

                {step === 'review' ? (
                  <AnimatedStepPanel key="review">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-px flex-1 bg-border/40" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Resumen del expediente</span>
                      <div className="h-px flex-1 bg-border/40" />
                    </div>
                    <div className="rounded-xl border border-border/60 overflow-hidden divide-y divide-border/40">
                      {reviewItems.map((item) => (
                        <InfoBlock key={item.label} label={item.label} value={item.value} />
                      ))}
                    </div>
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                      Revisa todos los datos antes de crear. Una vez creado el expediente no se puede modificar.
                    </div>
                    <div className="flex items-center justify-between mt-6">
                      <GuiraButton variant="secondary" onClick={handleBack} arrowBack>
                        Editar detalle
                      </GuiraButton>
                      <GuiraButton disabled={disabled || creatingOrder} onClick={handleNext} arrowNext>
                        {creatingOrder ? 'Creando expediente...' : 'Crear expediente'}
                      </GuiraButton>
                    </div>
                  </AnimatedStepPanel>
                ) : null}

                {step === 'finish' ? (
                  <AnimatedStepPanel key="finish">
                    <div className="flex flex-col items-center justify-center space-y-6 py-8 text-center">
                      <div className="relative flex size-24 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
                        <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-xl" />
                        <CheckCircle2 className="relative size-12 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
                      </div>
                      <div className="space-y-2 max-w-lg mx-auto">
                        <h3 className="text-2xl font-semibold tracking-tight text-foreground">
                          Expediente Creado Exitosamente
                        </h3>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {route === 'wallet_ramp_withdraw'
                            ? 'Tu solicitud de retiro ha sido recibida y está siendo procesada de forma automática.'
                            : route === 'crypto_to_crypto'
                            ? 'La orden está lista. Esperando el depósito on-chain para completar la transferencia.'
                            : isRampDepositWithSubSteps
                            ? 'La orden está lista. Envía el cripto a la dirección indicada — Bridge detectará el depósito on-chain y cerrará el expediente automáticamente.'
                            : 'La orden está registrada. Puedes adjuntar tu comprobante ahora o más adelante.'}
                        </p>
                      </div>
                    </div>

                    {route === 'wallet_ramp_withdraw' ? (
                      <div className="space-y-6">
                        <div className="overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/5 to-transparent">
                          <div className="p-6">
                            <div className="flex items-center gap-3 font-medium text-emerald-700 dark:text-emerald-400 mb-4">
                              <Loader2 className="size-5 animate-spin" />
                              <span>Tu retiro está siendo procesado…</span>
                            </div>
                            <p className="text-sm leading-relaxed text-muted-foreground mb-6">
                              {walletRampWithdrawMethod === 'crypto'
                                ? 'Tu transferencia on-chain fue iniciada desde tu wallet Bridge hacia la dirección destino. Bridge procesará el envío automáticamente y el estado se actualizará cuando se complete.'
                                : walletRampWithdrawMethod === 'fiat_us'
                                  ? 'Tu retiro fue iniciado desde tu wallet Bridge hacia tu cuenta bancaria estadounidense. Bridge procesará la transferencia vía ACH/Wire automáticamente.'
                                  : 'La transferencia cripto ya fue iniciada desde tu wallet Bridge hacia el PSAV. Una vez que el PSAV reciba los fondos, los convertirá a bolivianos y los depositará en tu cuenta bancaria. El staff confirmará cada etapa.'}
                            </p>
                            <div className="grid gap-2 text-sm">
                              <div className="flex items-center justify-between rounded-xl bg-background/50 p-3 ring-1 ring-border/50">
                                <span className="text-muted-foreground">Estado actual</span>
                                <span className="font-semibold text-amber-600 dark:text-amber-400">En proceso</span>
                              </div>
                              {walletRampWithdrawMethod === 'crypto' ? (
                                <>
                                  <div className="flex items-center justify-between rounded-xl bg-background/50 p-3 ring-1 ring-border/50">
                                    <span className="text-muted-foreground">Dirección destino</span>
                                    <span className="font-mono text-xs font-medium text-foreground">{form.getValues('crypto_address')?.slice(0, 10)}…{form.getValues('crypto_address')?.slice(-6)}</span>
                                  </div>
                                  <div className="flex items-center justify-between rounded-xl bg-background/50 p-3 ring-1 ring-border/50">
                                    <span className="text-muted-foreground">Red</span>
                                    <span className="font-medium text-foreground capitalize">{form.getValues('crypto_network')}</span>
                                  </div>
                                </>
                              ) : walletRampWithdrawMethod === 'fiat_us' ? (
                                <div className="flex items-center justify-between rounded-xl bg-background/50 p-3 ring-1 ring-border/50">
                                  <span className="text-muted-foreground">Método</span>
                                  <span className="font-medium text-foreground">Cuenta bancaria (USD) vía ACH/Wire</span>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center justify-between rounded-xl bg-background/50 p-3 ring-1 ring-border/50">
                                    <span className="text-muted-foreground">Destino</span>
                                    <span className="font-medium text-foreground">{form.getValues('withdraw_bank_name')} — ****{form.getValues('withdraw_account_number')?.slice(-4)}</span>
                                  </div>
                                  <div className="flex items-center justify-between rounded-xl bg-background/50 p-3 ring-1 ring-border/50">
                                    <span className="text-muted-foreground">Titular</span>
                                    <span className="font-medium text-foreground">{form.getValues('withdraw_account_holder')}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/20 p-4 text-sm text-muted-foreground">
                          <CircleAlert className="size-5 shrink-0 text-muted-foreground/70" />
                          <p>
                            {walletRampWithdrawMethod === 'fiat_bo'
                              ? 'Puedes dar seguimiento a esta orden desde el tab "Seguimiento". No es necesario subir comprobante; el proceso es automático en la primera etapa.'
                              : 'Tu retiro es procesado automáticamente por Bridge. El estado se actualizará cuando se complete. Puedes dar seguimiento desde el tab "Seguimiento".'}
                          </p>
                        </div>

                        <div className="flex items-center justify-end mt-8">
                          <GuiraButton
                            disabled={disabled}
                            onClick={() => { resetFlow(form, setStep, setSupportFile, setQrFile, setEvidenceFile, setCreatedOrder); router.push('/transacciones') }}
                          >
                            Ir al Seguimiento
                          </GuiraButton>
                        </div>
                      </div>
                    ) : route === 'crypto_to_crypto' ? (
                      <div className="space-y-6">
                        <div className="grid gap-4 lg:grid-cols-2">
                          {finalInstructions.map((instruction) => (
                            <DepositInstructionCard key={instruction.id} instruction={instruction} />
                          ))}
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-500/5 to-transparent">
                          <div className="p-6">
                            <div className="flex items-center gap-3 font-medium text-amber-700 dark:text-amber-400 mb-4">
                              <Loader2 className="size-5 animate-spin" />
                              <span>Esperando depósito…</span>
                            </div>
                            <p className="text-sm leading-relaxed text-muted-foreground mb-6">
                              Deposita los fondos en la dirección indicada arriba. Bridge detectará
                              la transacción on-chain automáticamente y la orden se completará
                              sin necesidad de subir comprobante.
                            </p>
                            <div className="grid gap-2 text-sm">
                              <div className="flex items-center justify-between rounded-xl bg-background/50 p-3 ring-1 ring-border/50">
                                <span className="text-muted-foreground">Estado actual</span>
                                <span className="font-semibold text-amber-600 dark:text-amber-400">Esperando depósito</span>
                              </div>
                              <div className="flex items-center justify-between rounded-xl bg-background/50 p-3 ring-1 ring-border/50">
                                <span className="text-muted-foreground">Proveedor destino</span>
                                <span className="font-medium text-foreground">{suppliers.find(s => s.id === form.getValues('supplier_id'))?.name ?? 'Sin proveedor'}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/20 p-4 text-sm text-muted-foreground">
                          <CircleAlert className="size-5 shrink-0 text-muted-foreground/70" />
                          <p>
                            Puedes dar seguimiento a esta orden desde el tab &quot;Seguimiento&quot;. El proceso es completamente automático — Bridge verificará el depósito on-chain y enviará los fondos al destino.
                          </p>
                        </div>

                        <div className="flex items-center justify-end mt-8">
                          <GuiraButton
                            disabled={disabled}
                            onClick={() => { resetFlow(form, setStep, setSupportFile, setQrFile, setEvidenceFile, setCreatedOrder); router.push('/transacciones') }}
                          >
                            Ir al Seguimiento
                          </GuiraButton>
                        </div>
                      </div>
                    ) : isRampDepositWithSubSteps ? (
                      <div className="space-y-6">
                        <div className="grid gap-4 lg:grid-cols-2">
                          {finalInstructions.map((instruction) => (
                            <DepositInstructionCard key={instruction.id} instruction={instruction} />
                          ))}
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-500/5 to-transparent">
                          <div className="p-6">
                            <div className="flex items-center gap-3 font-medium text-amber-700 dark:text-amber-400 mb-4">
                              <Loader2 className="size-5 animate-spin" />
                              <span>Esperando depósito on-chain…</span>
                            </div>
                            <p className="text-sm leading-relaxed text-muted-foreground mb-6">
                              Envía el cripto a la dirección de liquidación indicada arriba. Bridge
                              detectará la transacción on-chain automáticamente y cerrará el
                              expediente sin necesidad de subir comprobante.
                            </p>
                            <div className="grid gap-2 text-sm">
                              <div className="flex items-center justify-between rounded-xl bg-background/50 p-3 ring-1 ring-border/50">
                                <span className="text-muted-foreground">Estado actual</span>
                                <span className="font-semibold text-amber-600 dark:text-amber-400">Esperando depósito</span>
                              </div>
                              <div className="flex items-center justify-between rounded-xl bg-background/50 p-3 ring-1 ring-border/50">
                                <span className="text-muted-foreground">Red origen</span>
                                <span className="font-medium text-foreground capitalize">{form.getValues('wallet_ramp_source_network') ?? '—'}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/20 p-4 text-sm text-muted-foreground">
                          <CircleAlert className="size-5 shrink-0 text-muted-foreground/70" />
                          <p>
                            Puedes dar seguimiento a esta orden desde el tab &quot;Seguimiento&quot;. El proceso es completamente automático — Bridge verificará el depósito on-chain y actualizará el saldo de tu wallet.
                          </p>
                        </div>

                        <div className="flex items-center justify-end mt-8">
                          <GuiraButton
                            disabled={disabled}
                            onClick={() => { resetFlow(form, setStep, setSupportFile, setQrFile, setEvidenceFile, setCreatedOrder); router.push('/transacciones') }}
                          >
                            Ir al Seguimiento
                          </GuiraButton>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="grid gap-4 lg:grid-cols-2">
                          {finalInstructions.map((instruction) => (
                            <DepositInstructionCard key={instruction.id} instruction={instruction} />
                          ))}
                        </div>

                        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-800 dark:text-emerald-300">
                          <FileCheck2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          <p>
                            El expediente ya fue creado con estado <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">waiting_deposit</span>. 
                            Desde aquí puedes adjuntar el comprobante final o hacerlo después desde Seguimiento.
                          </p>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                          <div className="border-b border-border/50 bg-muted/20 px-5 py-4">
                            <h4 className="font-semibold text-foreground">Comprobante Final</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">Adjunta el comprobante del depósito o fondeo para avanzar la orden.</p>
                          </div>
                          <div className="p-6">
                            <DocumentInputCard
                              file={evidenceFile}
                              label="Subir comprobante"
                              description="Formatos soportados: PDF, JPG, PNG"
                              onFileChange={setEvidenceFile}
                            />
                          </div>
                        </div>

                        <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/20 p-4 text-sm text-muted-foreground">
                          <CircleAlert className="size-5 shrink-0 text-muted-foreground/70" />
                          <p>
                            Cuando el comprobante final quede adjunto, el sistema revisará el depósito y la orden avanzará a <span className="font-mono text-xs font-semibold">deposit_received</span>.
                          </p>
                        </div>

                        <div className="flex items-center justify-between mt-8">
                          <GuiraButton 
                            variant="secondary"
                            disabled={uploadingEvidence}
                            onClick={() => resetFlow(form, setStep, setSupportFile, setQrFile, setEvidenceFile, setCreatedOrder)}
                          >
                            Finalizar después
                          </GuiraButton>
                          <GuiraButton 
                            disabled={disabled || uploadingEvidence || !createdOrder} 
                            onClick={handleFinishEvidenceUpload} 
                            arrowNext
                          >
                            {uploadingEvidence ? 'Adjuntando...' : evidenceFile ? 'Adjuntar y cerrar' : 'Cerrar sin comprobante'}
                          </GuiraButton>
                        </div>
                      </div>
                    )}
                  </AnimatedStepPanel>
                ) : null}

                {step === 'review_requested' ? (
                  <AnimatedStepPanel key="review_requested">
                    <div className="flex flex-col items-center justify-center space-y-6 py-8 text-center">
                      <div className="relative flex size-24 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-500/20">
                        <div className="absolute inset-0 rounded-full bg-amber-500/10 blur-xl" />
                        <CircleAlert className="relative size-12 text-amber-600 dark:text-amber-400" strokeWidth={1.5} />
                      </div>
                      <div className="space-y-2 max-w-lg mx-auto">
                        <h3 className="text-2xl font-semibold tracking-tight text-foreground">
                          Solicitud en Revisión
                        </h3>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          Tu monto supera el límite configurado para este servicio. El equipo de Guira revisará tu solicitud y te notificará en menos de 48 horas.
                        </p>
                      </div>
                    </div>
                    {reviewRequest && (
                      <div className="space-y-3">
                        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Monto solicitado</span>
                            <span className="font-semibold">{reviewRequest.amount.toLocaleString()} {reviewRequest.currency}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Equivalente USD</span>
                            <span className="font-semibold">${reviewRequest.amount_usd_equiv.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Límite del servicio</span>
                            <span className="font-semibold text-amber-600">${reviewRequest.limit_usd.toLocaleString()} USD</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Excede en</span>
                            <span className="font-semibold text-destructive">${reviewRequest.excess_usd.toLocaleString()} USD</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Expira</span>
                            <span className="font-semibold">{new Date(reviewRequest.expires_at).toLocaleDateString('es-BO', { dateStyle: 'medium' })}</span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                          Puedes ver el estado de esta solicitud en el historial de expedientes.
                        </p>
                      </div>
                    )}
                  </AnimatedStepPanel>
                ) : null}
              </AnimatePresence>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Modal de motivo cuando el monto supera el límite */}
      {showReviewReasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-background border border-border shadow-2xl p-6 space-y-5">
            <div className="flex items-start gap-3">
              <CircleAlert className="size-6 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold">Monto supera el límite</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Tu monto excede el límite máximo configurado para este servicio. Para continuar, necesitas enviar una solicitud de revisión al staff con el motivo de la operación.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo de la operación <span className="text-destructive">*</span></label>
              <textarea
                className="w-full rounded-xl border border-input bg-muted/30 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[100px]"
                placeholder="Explica brevemente por qué necesitas operar con este monto (mínimo 10 caracteres)…"
                value={reviewReason}
                onChange={e => setReviewReason(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{reviewReason.length} / mínimo 10 caracteres</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setShowReviewReasonModal(false); setReviewReason('') }}>
                Cancelar
              </Button>
              <Button
                className="flex-1"
                disabled={reviewReason.trim().length < 10 || creatingOrder}
                onClick={() => handleCreateOrder(reviewReason.trim())}
              >
                {creatingOrder ? <><Loader2 className="size-4 animate-spin mr-2" />Enviando…</> : 'Enviar solicitud'}
              </Button>
            </div>
          </div>
        </div>
      )}
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

  if (route === 'wallet_ramp_deposit') {
    return {
      route,
      wallet_ramp_method: 'fiat_bo',
      amount_origin: 0,
      amount_converted: 0,
      fee_total: 0,
      exchange_rate_applied: 1,
      origin_currency: 'BOB',
      destination_currency: 'USDC',
      delivery_method: 'ach', // Not really used but required by schema
      payment_reason: '',
      intended_amount: 0,
      destination_address: '',
      stablecoin: 'USDC',
    } as PaymentOrderFormValues
  }

  if (route === 'wallet_ramp_withdraw') {
    return {
      route,
      amount_origin: 0,
      amount_converted: 0,
      fee_total: 0,
      exchange_rate_applied: 1,
      origin_currency: 'USDC',
      destination_currency: 'BOB',
      delivery_method: 'ach',
      payment_reason: 'Retiro de fondos wallet a Bolivia',
      intended_amount: 0,
      destination_address: '',
      stablecoin: 'USDC',
      withdraw_bank_name: '',
      withdraw_account_number: '',
      withdraw_account_holder: '',
    } as PaymentOrderFormValues
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
      exit={{ opacity: 0, y: -10, filter: 'blur(3px)' }}
      initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] as const }}
    >
      {children}
    </motion.section>
  )
}

const SUBSTEP_LABELS: Record<string, string> = {
  wallet: 'Billetera',
  bank: 'Banco',
  reason: 'Motivo',
  amount: 'Monto',
  supplier: 'Proveedor',
  funding: 'Fondeo',
  dest_wallet: 'Destino',
  network: 'Red',
}

function SubStepRail({
  steps,
  current,
}: {
  steps: readonly string[]
  current: string
}) {
  const currentIdx = steps.indexOf(current)
  return (
    <div className="flex items-center mb-8 gap-0">
      {steps.map((step, i) => {
        const isCompleted = currentIdx > i
        const isCurrent = current === step
        return (
          <div key={step} className="flex items-center flex-1 min-w-0">
            <div className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide transition-all duration-300 whitespace-nowrap',
              isCurrent
                ? 'bg-primary/10 text-primary border border-primary/25'
                : isCompleted
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-muted-foreground/40'
            )}>
              <div className={cn(
                'size-4 rounded-full flex items-center justify-center shrink-0',
                isCurrent
                  ? 'bg-primary text-primary-foreground'
                  : isCompleted
                    ? 'bg-emerald-500 text-white'
                    : 'bg-muted/60 text-muted-foreground'
              )}>
                {isCompleted ? (
                  <svg viewBox="0 0 12 12" fill="none" className="size-2.5">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span className="text-[9px] font-bold">{i + 1}</span>
                )}
              </div>
              <span className={cn('hidden sm:inline', !isCurrent && !isCompleted && 'opacity-0 sm:opacity-100')}>
                {SUBSTEP_LABELS[step] ?? step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn(
                'h-px flex-1 mx-1 transition-colors duration-500 min-w-[8px]',
                isCompleted ? 'bg-emerald-400/50' : 'bg-border/30'
              )} />
            )}
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
    <div className="flex items-start gap-3.5 border-b border-border/50 pb-5">
      <div className="shrink-0 flex size-9 items-center justify-center rounded-lg border border-border/50 bg-muted/30 text-muted-foreground mt-0.5">
        <Icon className="size-4" strokeWidth={1.5} />
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">{eyebrow}</span>
        <div className="mt-0.5 text-xl font-semibold tracking-tight text-foreground leading-tight">{title}</div>
        <div className="mt-1 text-sm leading-relaxed text-muted-foreground max-w-[65ch]">{description}</div>
      </div>
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
  // Extract currency symbol/name from the label if it's in parentheses, e.g., "(USD)"
  const currencyMatch = label.match(/\((.*?)\)/);
  const currency = currencyMatch ? currencyMatch[1] : '';
  const displayLabel = label.replace(/\s*\((.*?)\)/, '').trim();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col items-center justify-center space-y-2 pb-2 pt-4">
          <FormLabel className={cn(FORM_LABEL_CLASS, "text-center")}>{displayLabel}</FormLabel>
          <FormControl>
            <div className="relative flex w-full max-w-[240px] md:max-w-[320px] mx-auto items-center justify-center">
              <Input
                {...field}
                value={field.value ?? ""}
                className="h-auto w-full p-0 border-none bg-transparent text-center text-5xl font-semibold tracking-[-0.04em] shadow-none focus-visible:ring-0 md:text-6xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                disabled={disabled}
                min={0.01}
                step="0.01"
                type="number"
                placeholder="0.00"
              />
              {currency && (
                <span className="absolute left-full ml-2 md:ml-4 bottom-2 md:bottom-3 text-xl md:text-2xl font-medium text-muted-foreground">
                  {currency}
                </span>
              )}
            </div>
          </FormControl>
          <FormMessage className="text-center" />
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
            <Input {...field} value={field.value ?? ""} className={cn(FORM_UNDERLINE_INPUT_CLASS, FORM_TEXT_CLASS)} disabled={disabled} />
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
  options,
}: {
  control: Control<PaymentOrderFormValues>
  name: FieldPath<PaymentOrderFormValues>
  label: string
  placeholder: string
  disabled?: boolean
  options?: string[]
}) {
  const renderedOptions = options ?? ACTIVE_CRYPTO_NETWORKS
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
              value={field.value ? resolveCryptoNetwork(field.value as string) : ""}
            >
              <SelectTrigger className={cn(FORM_UNDERLINE_SELECT_CLASS, FORM_TEXT_CLASS)}>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                {renderedOptions.map((network) => (
                  <SelectItem key={network} value={network}>
                    {(CRYPTO_NETWORK_LABELS as Record<string, string>)[network] ?? network}
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

const CRYPTO_CURRENCY_OPTIONS = [
  { value: 'USDC', label: 'USDC' },
  { value: 'USDT', label: 'USDT (Tether)' },
  { value: 'ETH', label: 'ETH (Ethereum)' },
  { value: 'EURC', label: 'EURC' },
  { value: 'PYUSD', label: 'PYUSD' },
  { value: 'USDB', label: 'USDB' },
] as const

function CurrencySelectField({
  control,
  name,
  label,
  placeholder,
  disabled,
  options,
}: {
  control: Control<PaymentOrderFormValues>
  name: FieldPath<PaymentOrderFormValues>
  label: string
  placeholder: string
  disabled?: boolean
  options?: { value: string, label: string }[]
}) {
  const renderedOptions = options ?? CRYPTO_CURRENCY_OPTIONS
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
              value={(field.value as string) || ""}
            >
              <SelectTrigger className={cn(FORM_UNDERLINE_SELECT_CLASS, FORM_TEXT_CLASS)}>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                {renderedOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
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
  icon: React.ElementType
  isSelected: boolean
  onClick: () => void
  disabled?: boolean
}) {
  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    e.currentTarget.style.setProperty('--spot-x', `${x}px`)
    e.currentTarget.style.setProperty('--spot-y', `${y}px`)
  }

  return (
    <motion.button
      aria-pressed={isSelected}
      className={cn(
        'group relative w-full rounded-2xl border text-left overflow-hidden',
        'active:scale-[0.98]',
        isSelected
          ? 'border-primary bg-background shadow-[0_8px_30px_rgb(0,0,0,0.06)] ring-1 ring-primary'
          : 'border-border/50 bg-background',
        disabled ? 'cursor-not-allowed opacity-50' : '',
        !disabled ? 'cursor-pointer' : ''
      )}
      disabled={disabled}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      type="button"
      whileHover={disabled ? {} : { y: -4, scale: 1.015, transition: { type: 'spring', stiffness: 260, damping: 20 } }}
      whileTap={disabled ? {} : { scale: 0.975 }}
      style={{
        // CSS custom properties for the spotlight — updated via onMouseMove
        '--spot-x': '50%',
        '--spot-y': '50%',
      } as React.CSSProperties}
    >
      {/* Spotlight glow overlay — follows cursor position */}
      {!isSelected && !disabled && (
        <div
          className="pointer-events-none absolute inset-0 z-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: 'radial-gradient(320px circle at var(--spot-x) var(--spot-y), hsl(var(--primary) / 0.08), transparent 60%)',
          }}
        />
      )}

      {/* Directional shine sweep on hover */}
      {!disabled && (
        <div className="pointer-events-none absolute inset-0 z-0 -translate-x-full skew-x-[-18deg] bg-gradient-to-r from-transparent via-foreground/[0.06] to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
      )}

      <div className="relative z-10 flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-start justify-between">
          <motion.div
            className={cn(
              'flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-300',
              isSelected
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
            )}
            whileHover={{ rotate: [0, -8, 8, -4, 0], transition: { duration: 0.5, ease: 'easeInOut' } }}
          >
            <Icon className="size-[22px]" strokeWidth={1.5} />
          </motion.div>
          <div className={cn(
            'mt-1 flex size-5 items-center justify-center rounded-full border transition-all duration-300',
            isSelected
              ? 'border-primary bg-primary'
              : 'border-border/60 bg-transparent group-hover:border-primary/40'
          )}>
            {isSelected && (
              <motion.div
                className="size-2 rounded-full bg-background"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 15 }}
              />
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <div className={cn(
            'text-base font-semibold tracking-tight transition-colors duration-300',
            isSelected ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
          )}>
            {title}
          </div>
          <div className="text-[13.5px] leading-relaxed text-muted-foreground line-clamp-2">
            {description}
          </div>
        </div>
      </div>
    </motion.button>
  )
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between px-4 py-3.5 gap-6">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-sm font-medium text-foreground text-right break-all max-w-[60%]">
        {value}
      </span>
    </div>
  )
}

function getStepLabel(step: StepKey): string {
  switch (step) {
    case 'route':            return 'Ruta'
    case 'method':           return 'Metodo'
    case 'detail':           return 'Detalle'
    case 'review':           return 'Revision'
    case 'finish':           return 'Finalizacion'
    case 'review_requested': return 'En Revision'
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
    case 'wallet_ramp_deposit':
      return 'Elige tu cuenta de origen'
    case 'wallet_ramp_withdraw':
      return 'Retiro de fondos'
    case 'wallet_to_fiat':
      return 'Envío desde wallet on-chain'
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
    case 'wallet_ramp_deposit':
      return 'Tus opciones para depositar a tu saldo en base a tu procedencia.'
    case 'wallet_ramp_withdraw':
      return 'Los fondos USDC se enviarán al PSAV. El PSAV los convertirá y depositará BOB en tu cuenta bancaria.'
    case 'wallet_to_fiat':
      return 'Selecciona la red, token y dirección de origen. Bridge realizará la conversión y acreditará al proveedor.'
  }
}

function getAmountLabel(route: SupportedPaymentRoute) {
  switch (route) {
    case 'bolivia_to_exterior':
      return 'Monto en bolivianos (BOB)'
    case 'world_to_bolivia':
      return 'Monto a depositar'
    case 'us_to_wallet':
      return 'Monto en USD a fondear'
    case 'crypto_to_crypto':
      return 'Monto en USDC'
    case 'wallet_ramp_deposit':
      return 'Monto'
    case 'wallet_ramp_withdraw':
      return 'Monto a retirar (USDC)'
    case 'wallet_to_fiat':
      return 'Monto a enviar'
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
    case 'wallet_ramp_deposit':
      return 'Direccion'
    case 'wallet_ramp_withdraw':
      return 'Cuenta bancaria destino'
    case 'wallet_to_fiat':
      return 'Proveedor fiat destino'
  }
}

function isDepositRoute(route: SupportedPaymentRoute) {
  return DEPOSIT_ROUTES.includes(route)
}

function getMethodStepFields(route: SupportedPaymentRoute): FieldPath<PaymentOrderFormValues>[] {
  if (route === 'world_to_bolivia') return ['receive_variant']
  if (route === 'bolivia_to_exterior') return ['ui_method_group']
  if (route === 'wallet_ramp_deposit') return ['wallet_ramp_method']
  if (route === 'wallet_ramp_withdraw') return ['wallet_ramp_withdraw_method']
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

  if (route === 'wallet_ramp_withdraw') {
    return ['amount_origin', 'wallet_ramp_wallet_id', 'withdraw_bank_name', 'withdraw_account_number', 'withdraw_account_holder', 'crypto_address', 'crypto_network', 'supplier_id']
  }

  if (route === 'wallet_to_fiat') {
    return [
      'amount_origin',
      'wallet_to_fiat_source_network',
      'wallet_to_fiat_source_currency',
      'wallet_to_fiat_source_address',
      'supplier_id',
      'payment_reason',
    ]
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

  // Para crypto_to_crypto los datos de ORIGEN son obligatorios
  if (route === 'crypto_to_crypto') {
    fields.push('source_crypto_network', 'source_crypto_address')
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
  bridgeWallets?: WalletBalance[]
  virtualAccounts?: VirtualAccount[]
}) {
  const items: Array<{ label: string; value: string }> = [
    { label: 'Ruta', value: args.routeLabel },
    { label: 'Monto ingresado', value: formatMoney(args.enteredAmountOrigin, args.values.origin_currency) },
  ]

  // Only show exchange rate here if not a wallet ramp (ramp handles its own form syncing differently, or we can use the default if synced)
  if (args.route !== 'wallet_ramp_deposit') {
    items.push({ label: 'Tipo de cambio', value: formatExchangeRate(args.values.exchange_rate_applied, args.values.origin_currency, args.values.destination_currency) })
  }

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
    items.push({ label: 'Origen (Fondeo)', value: 'Wallet Externa' })
    items.push({ label: 'Wallet origen', value: args.values.source_crypto_address || 'Pendiente' })
    items.push({ label: 'Red origen', value: args.values.source_crypto_network || 'Pendiente' })
    items.push({ label: 'Metodo tecnico', value: 'crypto' })
    items.push({ label: 'Wallet destino', value: args.values.crypto_address || 'Pendiente' })
    items.push({ label: 'Red destino', value: args.values.crypto_network || 'Pendiente' })
    items.push({ label: 'Motivo', value: args.values.payment_reason || 'Pendiente' })
    items.push({ label: 'Respaldo', value: args.supportFileName ?? 'No adjuntado' })
  }

  if (args.route === 'wallet_ramp_deposit') {
    items.push({ label: 'Método de Fondeo', value: args.values.wallet_ramp_method === 'fiat_bo' ? 'Fiat BO' : 'Crypto' })

    if (args.values.fee_total !== undefined) {
      items.push({ label: 'Comisión', value: formatMoney(args.values.fee_total, args.values.origin_currency) })
    }

    if (args.values.exchange_rate_applied !== undefined && args.values.exchange_rate_applied !== 0 && args.values.wallet_ramp_method === 'fiat_bo') {
      items.push({ label: 'Tipo de cambio', value: formatExchangeRate(args.values.exchange_rate_applied, args.values.origin_currency, args.values.destination_currency) })
    }

    if (args.values.amount_converted !== undefined) {
      const rampDestCurrency = args.values.wallet_ramp_destination_currency
        ? args.values.wallet_ramp_destination_currency.toUpperCase()
        : args.values.destination_currency
      items.push({ label: 'Recibirás', value: formatMoney(args.values.amount_converted, rampDestCurrency) })
    }

    if (args.values.wallet_ramp_method === 'fiat_bo' || args.values.wallet_ramp_method === 'crypto') {
      const wallet = args.bridgeWallets?.find(w => w.id === args.values.wallet_ramp_wallet_id)
      const readableWallet = wallet ? `Wallet ${wallet.network}` : (args.values.wallet_ramp_wallet_id || 'Pendiente')
      items.push({ label: 'Tu Billetera Digital Destino', value: readableWallet })
    }
    if (args.values.wallet_ramp_method === 'crypto') {
      items.push({ label: 'Red Cripto Origen', value: args.values.wallet_ramp_source_network || 'Pendiente' })
    }

    // Motivo y documento de respaldo para fiat_bo y crypto
    if (args.values.wallet_ramp_method === 'fiat_bo' || args.values.wallet_ramp_method === 'crypto') {
      items.push({ label: 'Motivo', value: args.values.payment_reason || 'Pendiente' })
      items.push({ label: 'Respaldo', value: args.supportFileName ?? 'No adjuntado' })
    }
  }

  if (args.route === 'wallet_ramp_withdraw') {
    const method = args.values.wallet_ramp_withdraw_method || 'fiat_bo'
    const originCurrency = (args.values.origin_currency || '').toLowerCase()
    const wallet = args.bridgeWallets?.find(w => w.id === args.values.wallet_ramp_wallet_id)
    const tokenBalance = originCurrency && wallet?.token_balances
      ? wallet.token_balances.find(t => t.currency.toLowerCase() === originCurrency)
      : null
    const displayBalance = tokenBalance
      ? tokenBalance.available_balance.toFixed(2)
      : wallet?.available_balance.toFixed(2) ?? '0.00'
    const displayCurrency = originCurrency ? originCurrency.toUpperCase() : ''
    const readableWallet = wallet ? `${displayCurrency} Wallet (${displayBalance} disponible)` : 'Pendiente'
    items.push({ label: 'Wallet Bridge Origen', value: readableWallet })
    items.push({ label: 'Método Destino', value: method === 'fiat_bo' ? 'Cuenta bancaria (BOB)' : method === 'crypto' ? 'Wallet cripto externa' : 'Cuenta bancaria (USD)' })

    if (args.values.fee_total !== undefined && args.values.fee_total > 0) {
      items.push({ label: 'Comisión', value: formatMoney(args.values.fee_total, displayCurrency) })
    }

    if (method === 'fiat_bo') {
      items.push({ label: 'Tipo de cambio', value: formatExchangeRate(args.values.exchange_rate_applied, displayCurrency, 'BOB') })
      if (args.values.amount_converted !== undefined) {
        items.push({ label: 'Recibirás', value: formatMoney(args.values.amount_converted, 'BOB') })
      }
      items.push({ label: 'Banco destino', value: args.values.withdraw_bank_name || 'Pendiente' })
      items.push({ label: 'Cuenta destino', value: args.values.withdraw_account_number || 'Pendiente' })
      items.push({ label: 'Titular', value: args.values.withdraw_account_holder || 'Pendiente' })
    } else if (method === 'crypto') {
      if (args.values.amount_converted !== undefined) {
        items.push({ label: 'Recibirás', value: formatMoney(args.values.amount_converted, displayCurrency) })
      }
      items.push({ label: 'Cripto destino', value: args.values.crypto_address || 'Pendiente' })
      items.push({ label: 'Red destino', value: args.values.crypto_network || 'Pendiente' })
    } else if (method === 'fiat_us') {
      items.push({ label: 'Token de origen', value: displayCurrency || 'Pendiente' })
      if (args.values.amount_converted !== undefined) {
        items.push({ label: 'Recibirás', value: formatMoney(args.values.amount_converted, 'USD') })
      }
      items.push({ label: 'Proveedor', value: args.supplierName || 'Pendiente' })
    }
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
    <div className="flex items-start gap-3 border-l-2 border-amber-500/70 bg-amber-50/70 px-4 py-3 text-base text-amber-950">
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
  // Todas las tasas están en BOB por USD ahora
  // Para rutas BOB→USD, invertir la presentación
  if (origin === 'Bs' && (destination === 'USD' || destination === 'USDC')) {
    return `1 USD = ${normalized.toFixed(2)} Bs`
  }
  return `1 ${origin} = ${normalized.toFixed(2)} ${destination}`
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
    // Para Bs→USD/USDC: dividir (la tasa es BOB por 1 USD)
    const isBobToUsd = origin === 'Bs' && (destination === 'USD' || destination === 'USDC')
    converted = isBobToUsd ? (rate > 0 ? amount / rate : 0) : amount * rate
  }

  return `${formatMoney(amount, origin)} -> ${formatMoney(converted, destination)}`
}
