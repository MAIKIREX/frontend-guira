import React, { useRef, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EstimationSummary } from '@/components/shared/estimation-summary'
import { cn } from '@/lib/utils'
import { resolveFeeTotal, type ExchangeRateRecord } from '@/features/payments/lib/deposit-instructions'
import type { UseFormReturn } from 'react-hook-form'
import type { PaymentOrderFormValues } from '@/features/payments/schemas/payment-order.schema'
import type { SupportedPaymentRoute } from '@/features/payments/lib/payment-routes'
import { useFeePreview } from '@/features/payments/hooks/use-fee-preview'
import type { WalletBalance } from '@/services/wallet.service'
import type { FeeConfigRow, PsavConfigRow } from '@/types/payment-order'
import { ClientBankAccountsService, type ClientBankAccount } from '@/services/client-bank-accounts.service'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { usePaymentLimits } from '@/features/payments/hooks/use-payment-limits'
import { NETWORK_LABELS, CRYPTO_CURRENCY_LABELS } from '@/lib/guira-crypto-config'
import {
  getOffRampMinAmount,
  OFF_RAMP_SOURCE_CURRENCIES,
  COMING_SOON_OFF_RAMP_SOURCE_CURRENCIES,
  getFiatBoAvailableSourceCurrencies,
  getFiatBoMinAmountForSource,
  getOffRampSameTokenNetworks,
  getOffRampSameTokenDestCurrencies,
} from '@/features/payments/lib/bridge-route-catalog'

const LABEL_CLASS = 'text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground'
const FORM_TEXT_CLASS = 'tracking-[0.01em]'
const FORM_UNDERLINE_INPUT_CLASS = 'h-11 rounded-none border-0 border-b border-input bg-transparent px-0 py-0 shadow-none transition-colors focus-visible:border-primary focus-visible:ring-0 disabled:bg-transparent'
const FORM_UNDERLINE_SELECT_CLASS = 'h-11 w-full rounded-none border-0 border-b border-input bg-transparent px-0 py-0 shadow-none transition-colors focus-visible:border-primary focus-visible:ring-0'

export type WithdrawSubStep = 'wallet' | 'bank' | 'dest_wallet' | 'reason' | 'amount'

interface WalletWithdrawDetailStepProps {
  form: UseFormReturn<PaymentOrderFormValues>
  method?: string
  wallets: WalletBalance[]
  exchangeRates: ExchangeRateRecord[]
  feesConfig: FeeConfigRow[]
  psavConfigs?: PsavConfigRow[]
  disabled?: boolean
  subStep?: WithdrawSubStep
}

export function WalletWithdrawDetailStep({
  form,
  method = 'fiat_bo',
  wallets,
  exchangeRates,
  feesConfig,
  psavConfigs = [],
  disabled,
  subStep,
}: WalletWithdrawDetailStepProps) {
  const prevEstimateRef = useRef<{ feeTotal: number; exchangeRateApplied: number; amountConverted: number } | null>(null)

  const WITHDRAW_FLOW_TYPE_MAP: Record<string, string> = {
    fiat_bo: 'bridge_wallet_to_fiat_bo',
    crypto: 'bridge_wallet_to_crypto',
    fiat_us: 'bridge_wallet_to_fiat_us',
  }
  const withdrawFlowType = WITHDRAW_FLOW_TYPE_MAP[method] ?? null
  const { limits: paymentLimits } = usePaymentLimits(withdrawFlowType)

  // ── Bank account state (for fiat_bo) ──
  const [bankAccount, setBankAccount] = useState<ClientBankAccount | null>(null)
  const [bankLoading, setBankLoading] = useState(method === 'fiat_bo')

  // ── Watched form values ──
  const selectedOriginCurrency = form.watch('origin_currency') ?? ''
  const selectedCryptoNetwork = form.watch('crypto_network') ?? ''
  const selectedDestCurrency = form.watch('destination_currency') ?? ''
  const selectedWalletId = form.watch('wallet_ramp_wallet_id') ?? ''
  const selectedWallet = wallets.find((w) => w.id === selectedWalletId)
  const amount = form.watch('amount_origin')

  // ── Fee preview del servidor (considera overrides por usuario) ──
  const { preview: feePreview } = useFeePreview(withdrawFlowType, Number(amount) || 0)
  const [isOverrideFee, setIsOverrideFee] = useState(false)

  // ── Available source currencies per method ──
  const fiatBoAvailableCurrencies = React.useMemo(() => {
    if (method !== 'fiat_bo') return []
    const routeValid = getFiatBoAvailableSourceCurrencies(psavConfigs)
    let active = routeValid
    if (selectedWallet?.token_balances?.length) {
      active = routeValid.filter((cur) => {
        if ((COMING_SOON_OFF_RAMP_SOURCE_CURRENCIES as readonly string[]).includes(cur)) return false
        const tb = selectedWallet.token_balances.find(
          (t) => t.currency.toLowerCase() === cur.toLowerCase()
        )
        return tb && tb.available_balance > 0
      })
    }
    const comingSoon = [...COMING_SOON_OFF_RAMP_SOURCE_CURRENCIES].filter((c) => !active.includes(c))
    return [...active, ...comingSoon]
  }, [method, psavConfigs, selectedWallet])

  const fiatUsAvailableCurrencies = React.useMemo(() => {
    if (method !== 'fiat_us') return []
    const allTokens = [...OFF_RAMP_SOURCE_CURRENCIES]
    if (!selectedWallet?.token_balances?.length) return allTokens
    const active = allTokens.filter((cur) => {
      if ((COMING_SOON_OFF_RAMP_SOURCE_CURRENCIES as readonly string[]).includes(cur)) return false
      const tb = selectedWallet.token_balances.find(
        (t) => t.currency.toLowerCase() === cur.toLowerCase()
      )
      return tb && tb.available_balance > 0
    })
    const comingSoon = [...COMING_SOON_OFF_RAMP_SOURCE_CURRENCIES].filter((c) => !active.includes(c))
    return [...active, ...comingSoon]
  }, [method, selectedWallet])

  const cryptoAvailableCurrencies = React.useMemo(() => {
    if (method !== 'crypto') return []
    const allTokens = [...OFF_RAMP_SOURCE_CURRENCIES]
    if (!selectedWallet?.token_balances?.length) return allTokens
    const active = allTokens.filter((cur) => {
      if ((COMING_SOON_OFF_RAMP_SOURCE_CURRENCIES as readonly string[]).includes(cur)) return false
      const tb = selectedWallet.token_balances.find(
        (t) => t.currency.toLowerCase() === cur.toLowerCase()
      )
      return tb && tb.available_balance > 0
    })
    const comingSoon = [...COMING_SOON_OFF_RAMP_SOURCE_CURRENCIES].filter((c) => !active.includes(c))
    return [...active, ...comingSoon]
  }, [method, selectedWallet])

  const fiatBoMinAmount = React.useMemo(() => {
    if (method !== 'fiat_bo' || !selectedOriginCurrency) return 0
    return getFiatBoMinAmountForSource(selectedOriginCurrency, psavConfigs)
  }, [method, selectedOriginCurrency, psavConfigs])

  const availableNetworks = React.useMemo(() => {
    if (method !== 'crypto' || !selectedOriginCurrency) return []
    return getOffRampSameTokenNetworks(selectedOriginCurrency)
  }, [method, selectedOriginCurrency])

  const availableDestCurrencies = React.useMemo(() => {
    if (method !== 'crypto' || !selectedOriginCurrency || !selectedCryptoNetwork) return []
    return getOffRampSameTokenDestCurrencies(selectedOriginCurrency, selectedCryptoNetwork)
  }, [method, selectedOriginCurrency, selectedCryptoNetwork])

  const offRampMinAmount = React.useMemo(() => {
    if (method !== 'crypto' || !selectedOriginCurrency || !selectedCryptoNetwork || !selectedDestCurrency) return 0
    return getOffRampMinAmount(selectedOriginCurrency, selectedCryptoNetwork, selectedDestCurrency)
  }, [method, selectedOriginCurrency, selectedCryptoNetwork, selectedDestCurrency])

  // ── Cascada off-ramp: auto-clear invalid selections ──
  const handleSourceTokenChange = useCallback((token: string, fieldOnChange: (v: string) => void) => {
    fieldOnChange(token)
    const newNetworks = getOffRampSameTokenNetworks(token)
    const currentNetwork = form.getValues('crypto_network')
    if (currentNetwork && !newNetworks.includes(currentNetwork)) {
      form.setValue('crypto_network', '', { shouldValidate: false })
      form.setValue('destination_currency', '', { shouldValidate: false })
    } else if (currentNetwork) {
      const newDests = getOffRampSameTokenDestCurrencies(token, currentNetwork)
      const currentDest = form.getValues('destination_currency')
      if (currentDest && !newDests.includes(currentDest.toLowerCase())) {
        form.setValue('destination_currency', '', { shouldValidate: false })
      } else if (newDests.length === 1) {
        form.setValue('destination_currency', newDests[0], { shouldValidate: false })
      }
    }
  }, [form])

  const handleCryptoNetworkChange = useCallback((network: string, fieldOnChange: (v: string) => void) => {
    fieldOnChange(network)
    const srcToken = form.getValues('origin_currency')
    if (srcToken) {
      const dests = getOffRampSameTokenDestCurrencies(srcToken, network)
      if (dests.length === 1) {
        form.setValue('destination_currency', dests[0], { shouldValidate: false })
      } else {
        form.setValue('destination_currency', '', { shouldValidate: false })
      }
    }
  }, [form])

  // ── Dynamic display labels ──
  const displayWithdrawCurrency = method === 'crypto'
    ? (selectedOriginCurrency || 'CRYPTO').toUpperCase()
    : method === 'fiat_bo'
      ? (selectedOriginCurrency || 'TOKEN').toUpperCase()
      : method === 'fiat_us'
        ? (selectedOriginCurrency || 'TOKEN').toUpperCase()
        : 'USD'

  useEffect(() => {
    if (method !== 'fiat_bo') return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBankLoading(true)
    ClientBankAccountsService.getPrimary()
      .then((data) => setBankAccount(data))
      .catch(() => setBankAccount(null))
      .finally(() => setBankLoading(false))
  }, [method])

  useEffect(() => {
    if (method === 'fiat_bo' && bankAccount) {
      form.setValue('withdraw_bank_name', bankAccount.bank_name, { shouldValidate: false, shouldDirty: false, shouldTouch: false })
      form.setValue('withdraw_account_number', bankAccount.account_number, { shouldValidate: false, shouldDirty: false, shouldTouch: false })
      form.setValue('withdraw_account_holder', bankAccount.account_holder, { shouldValidate: false, shouldDirty: false, shouldTouch: false })
    }
  }, [bankAccount, form, method])

  // ── Estimate ──
  const estimate = React.useMemo(() => {
    let feeTotal = 0
    let exchangeRateApplied = 1
    let amountConverted = Number(amount) || 0

    if (method === 'fiat_bo') {
      feeTotal = resolveFeeTotal(feesConfig, Number(amount) || 0, 'bridge_wallet_to_fiat_bo' as SupportedPaymentRoute)
      const rateRecord = exchangeRates.find((r) => r.pair?.toUpperCase() === 'USD_BOB')
      exchangeRateApplied = 6.96
      if (rateRecord) {
        exchangeRateApplied = rateRecord.effective_rate ?? rateRecord.rate
      }
      const netUsdc = Math.max((Number(amount) || 0) - feeTotal, 0)
      amountConverted = netUsdc * exchangeRateApplied
    } else if (method === 'crypto') {
      feeTotal = resolveFeeTotal(feesConfig, Number(amount) || 0, 'bridge_wallet_to_crypto' as SupportedPaymentRoute)
      amountConverted = Math.max((Number(amount) || 0) - feeTotal, 0)
    } else if (method === 'fiat_us') {
      feeTotal = resolveFeeTotal(feesConfig, Number(amount) || 0, 'bridge_wallet_to_fiat_us' as SupportedPaymentRoute)
      amountConverted = Math.max((Number(amount) || 0) - feeTotal, 0)
    }

    return { feeTotal, exchangeRateApplied, amountConverted }
  }, [amount, exchangeRates, feesConfig, method])

  React.useEffect(() => {
    const prev = prevEstimateRef.current
    if (
      prev &&
      prev.feeTotal === estimate.feeTotal &&
      prev.exchangeRateApplied === estimate.exchangeRateApplied &&
      prev.amountConverted === estimate.amountConverted
    ) {
      return
    }
    prevEstimateRef.current = estimate
    form.setValue('fee_total', estimate.feeTotal, { shouldValidate: false, shouldDirty: false, shouldTouch: false })
    form.setValue('exchange_rate_applied', estimate.exchangeRateApplied, { shouldValidate: false, shouldDirty: false, shouldTouch: false })
    form.setValue('amount_converted', estimate.amountConverted, { shouldValidate: false, shouldDirty: false, shouldTouch: false })
  }, [estimate, form])

  // ── Sobreescribir con fee del servidor cuando llega (considera overrides) ──
  React.useEffect(() => {
    if (!feePreview) return
    const originAmount = Number(amount) || 0
    const serverFee = feePreview.fee_amount
    const netAmount = Math.max(originAmount - serverFee, 0)
    const serverAmountConverted = method === 'fiat_bo'
      ? Math.round(netAmount * estimate.exchangeRateApplied * 100) / 100
      : Math.round(netAmount * 100) / 100
    form.setValue('fee_total', serverFee, { shouldValidate: false, shouldDirty: false, shouldTouch: false })
    form.setValue('amount_converted', serverAmountConverted, { shouldValidate: false, shouldDirty: false, shouldTouch: false })
    setIsOverrideFee(feePreview.is_override)
  }, [feePreview, amount, method, estimate.exchangeRateApplied, form])

  // ── Display estimate: prefiere fee del servidor sobre el local ──
  const displayEstimate = React.useMemo(() => {
    if (!feePreview) return estimate
    const originAmount = Number(amount) || 0
    const serverFee = feePreview.fee_amount
    const netAmount = Math.max(originAmount - serverFee, 0)
    const serverAmountConverted = method === 'fiat_bo'
      ? Math.round(netAmount * estimate.exchangeRateApplied * 100) / 100
      : Math.round(netAmount * 100) / 100
    return { feeTotal: serverFee, exchangeRateApplied: estimate.exchangeRateApplied, amountConverted: serverAmountConverted }
  }, [feePreview, estimate, amount, method])

  const isFiatBoBlocked = method === 'fiat_bo' && !bankLoading && !bankAccount

  // ── Shared fields ────────────────────────────────────────────────

  const walletField = (
    <FormField
      control={form.control}
      name="wallet_ramp_wallet_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel className={LABEL_CLASS}>Wallet Bridge (origen)</FormLabel>
          <Select
            value={field.value || null}
            onValueChange={field.onChange}
            disabled={disabled || wallets.length === 0}
          >
            <FormControl>
              <SelectTrigger className={cn(FORM_UNDERLINE_SELECT_CLASS, FORM_TEXT_CLASS)}>
                {selectedWallet ? (
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="font-medium">{selectedWallet.label ?? `${selectedWallet.network?.toUpperCase() ?? 'Wallet'} Wallet`}</span>
                    <span className="text-muted-foreground text-xs">
                      ({selectedWallet.network ?? 'interna'} · {selectedWallet.available_balance.toFixed(2)} disponible)
                    </span>
                  </span>
                ) : (
                  <SelectValue placeholder="Seleccionar wallet" />
                )}
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {wallets.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  <span className="font-medium">{w.label ?? `${w.network?.toUpperCase() ?? 'Wallet'} Wallet`}</span>
                  <span className="ml-1.5 text-muted-foreground text-xs">
                    ({w.network ?? 'interna'} · {w.available_balance.toFixed(2)} disponible)
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  const tokenField = (() => {
    let currencies: string[] = []
    let placeholder = 'Seleccionar token'
    let emptyMsg: string | null = null

    if (method === 'fiat_bo') {
      currencies = fiatBoAvailableCurrencies
      placeholder = currencies.length === 0 ? 'No hay tokens disponibles' : 'Seleccionar token'
      emptyMsg = currencies.length === 0 && !disabled
        ? 'No hay tokens con balance y ruta PSAV disponible para retiro.'
        : null
    } else if (method === 'fiat_us') {
      currencies = fiatUsAvailableCurrencies
      placeholder = currencies.length === 0 ? 'No hay tokens con saldo' : 'Seleccionar token'
      emptyMsg = currencies.length === 0 && !disabled
        ? 'No hay tokens con balance disponible para retiro.'
        : null
    } else if (method === 'crypto') {
      currencies = cryptoAvailableCurrencies
      placeholder = currencies.length === 0 ? 'No hay tokens con saldo' : 'Seleccionar token'
      emptyMsg = currencies.length === 0 && !disabled
        ? 'No hay tokens con balance disponible para retiro.'
        : null
    }

    const onChangeHandler = method === 'crypto'
      ? (v: string, onChange: (v: string) => void) => handleSourceTokenChange(v, onChange)
      : (v: string, onChange: (v: string) => void) => onChange(v)

    return (
      <FormField
        control={form.control}
        name="origin_currency"
        render={({ field }) => (
          <FormItem>
            <FormLabel className={LABEL_CLASS}>Token de origen (de tu wallet)</FormLabel>
            <Select
              value={field.value || null}
              onValueChange={(v) => onChangeHandler(v, field.onChange)}
              disabled={disabled || currencies.length === 0}
            >
              <FormControl>
                <SelectTrigger className={cn(FORM_UNDERLINE_SELECT_CLASS, FORM_TEXT_CLASS)}>
                  <SelectValue placeholder={placeholder} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {currencies.map((cur) => {
                  const isComingSoon = (COMING_SOON_OFF_RAMP_SOURCE_CURRENCIES as readonly string[]).includes(cur)
                  const tokenBalance = selectedWallet?.token_balances?.find(
                    (t) => t.currency.toLowerCase() === cur.toLowerCase()
                  )
                  return (
                    <SelectItem key={cur} value={cur} disabled={isComingSoon}>
                      <span className={isComingSoon ? 'text-muted-foreground' : ''}>
                        {CRYPTO_CURRENCY_LABELS[cur as keyof typeof CRYPTO_CURRENCY_LABELS] ?? cur.toUpperCase()}
                      </span>
                      {isComingSoon ? (
                        <span className="ml-1.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                          Próximamente
                        </span>
                      ) : tokenBalance ? (
                        <span className="ml-1.5 text-muted-foreground text-xs">
                          · {tokenBalance.available_balance.toFixed(2)} disponible
                        </span>
                      ) : null}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            {emptyMsg && (
              <p className="text-[10px] text-amber-500 mt-1">{emptyMsg}</p>
            )}
            {method === 'fiat_bo' && fiatBoMinAmount > 0 && selectedOriginCurrency && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Mínimo: {fiatBoMinAmount} {selectedOriginCurrency.toUpperCase()}
              </p>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    )
  })()

  const amountField = (
    <FormField
      control={form.control}
      name="amount_origin"
      render={({ field }) => (
        <FormItem className="flex flex-col items-center justify-center space-y-2 pb-2 pt-4">
          <FormLabel className={cn(LABEL_CLASS, 'text-center')}>Monto a retirar ({displayWithdrawCurrency})</FormLabel>
          <FormControl>
            <div className="relative flex w-full max-w-[240px] md:max-w-[320px] mx-auto items-center justify-center">
              <Input
                {...field}
                type="number"
                min={0}
                step="any"
                placeholder="0.00"
                disabled={disabled || isFiatBoBlocked}
                className="h-auto w-full p-0 border-none bg-transparent text-center text-5xl font-semibold tracking-[-0.04em] shadow-none focus-visible:ring-0 md:text-6xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="absolute left-full ml-2 md:ml-4 bottom-2 md:bottom-3 text-xl md:text-2xl font-medium text-muted-foreground">
                {displayWithdrawCurrency}
              </span>
            </div>
          </FormControl>
          {/* Opción A: aviso inline cuando el monto está bloqueado por falta de cuenta bancaria */}
          {isFiatBoBlocked && (
            <p className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 mt-1">
              <AlertTriangle className="size-3 shrink-0" />
              Debes registrar tu cuenta bancaria en{' '}
              <Link href="/perfil" className="underline underline-offset-2 font-medium hover:text-amber-500">
                Perfil
              </Link>{' '}
              para habilitar este campo.
            </p>
          )}
          <FormMessage className="text-center" />
          {paymentLimits && (
            <p className="text-[11px] text-muted-foreground text-center">
              Mín: ${paymentLimits.min_usd} USD · Máx: ${paymentLimits.max_usd} USD
            </p>
          )}
        </FormItem>
      )}
    />
  )

  const receiveCurrency = method === 'fiat_bo' ? 'BOB' : method === 'fiat_us' ? 'USD' : displayWithdrawCurrency

  const estimationBlock = (
    <EstimationSummary
      amountOrigin={Number(amount) || 0}
      originCurrency={displayWithdrawCurrency}
      feeTotal={displayEstimate.feeTotal}
      exchangeRate={method === 'fiat_bo' ? displayEstimate.exchangeRateApplied : undefined}
      exchangeRateLabel={method === 'fiat_bo' ? `BOB/${displayWithdrawCurrency}` : undefined}
      exchangeRatePrecision={4}
      receivesApprox={displayEstimate.amountConverted}
      receivesCurrency={receiveCurrency}
      showAmountOrigin
      useCollapsible
      isOverride={isOverrideFee}
      className="mt-3"
    />
  )

  const bankSection = method === 'fiat_bo' ? (
    <>
      {bankLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Cargando cuenta bancaria...</span>
        </div>
      ) : bankAccount ? (
        <div className="rounded-xl border border-border/40 bg-muted/10 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-500" />
            <p className={cn(LABEL_CLASS, 'text-foreground !text-xs')}>
              Tu cuenta bancaria destino
            </p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Los fondos convertidos a bolivianos serán depositados automáticamente en esta cuenta.
            Si necesitas cambiarla, ve a{' '}
            <Link href="/perfil" className="text-primary underline underline-offset-2 hover:text-primary/80">
              Perfil → Cuenta bancaria
            </Link>.
          </p>
          <div className="grid gap-3 sm:grid-cols-3 pt-1">
            <div className="rounded-lg border border-border/50 bg-background/60 p-3">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Banco</span>
              <p className="mt-0.5 text-sm font-medium">{bankAccount.bank_name}</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-background/60 p-3">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Cuenta</span>
              <p className="mt-0.5 text-sm font-medium font-mono tracking-wide">{bankAccount.account_number}</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-background/60 p-3">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Titular</span>
              <p className="mt-0.5 text-sm font-medium">{bankAccount.account_holder}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border-l-4 border-amber-500/60 bg-amber-500/5 p-5 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-600" />
            <p className="font-semibold text-sm text-amber-700 dark:text-amber-400">
              Cuenta bancaria no registrada
            </p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Para retirar fondos a Bolivia, primero debes registrar tu cuenta bancaria personal en tu perfil.
            Esta medida es parte del control de seguridad de la plataforma y asegura que los fondos solo se
            depositen en tu propia cuenta.
          </p>
          <Link
            href="/perfil"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline mt-1"
          >
            Ir a mi Perfil →
          </Link>
        </div>
      )}
    </>
  ) : null

  const cryptoDestSection = method === 'crypto' ? (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="crypto_network"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={LABEL_CLASS}>Red de destino</FormLabel>
              <Select
                value={field.value || null}
                onValueChange={(v) => handleCryptoNetworkChange(v, field.onChange)}
                disabled={disabled || availableNetworks.length === 0}
              >
                <FormControl>
                  <SelectTrigger className={cn(FORM_UNDERLINE_SELECT_CLASS, FORM_TEXT_CLASS)}>
                    <SelectValue placeholder={selectedOriginCurrency ? 'Seleccionar red' : 'Selecciona token primero'} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableNetworks.map((net) => (
                    <SelectItem key={net} value={net}>
                      {NETWORK_LABELS[net as keyof typeof NETWORK_LABELS] ?? net}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="destination_currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={LABEL_CLASS}>Token de destino</FormLabel>
              <Select
                value={field.value || null}
                onValueChange={field.onChange}
                disabled={disabled || availableDestCurrencies.length === 0}
              >
                <FormControl>
                  <SelectTrigger className={cn(FORM_UNDERLINE_SELECT_CLASS, FORM_TEXT_CLASS)}>
                    <SelectValue placeholder={selectedCryptoNetwork ? 'Seleccionar token' : 'Selecciona red primero'} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableDestCurrencies.map((cur) => (
                    <SelectItem key={cur} value={cur}>
                      {CRYPTO_CURRENCY_LABELS[cur as keyof typeof CRYPTO_CURRENCY_LABELS] ?? cur.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCryptoNetwork && availableDestCurrencies.length === 0 && (
                <p className="text-[10px] text-amber-500 mt-1">
                  No hay tokens destino disponibles para esta combinación.
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="crypto_address"
        render={({ field }) => (
          <FormItem>
            <FormLabel className={LABEL_CLASS}>Dirección cripto destino</FormLabel>
            <FormControl>
              <Input
                {...field}
                value={field.value ?? ''}
                placeholder="Ej: 0x... / T... / G..."
                disabled={disabled}
                className={cn(FORM_UNDERLINE_INPUT_CLASS, FORM_TEXT_CLASS, 'font-mono text-xs')}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {offRampMinAmount > 0 && selectedDestCurrency && (
        <p className="text-[10px] text-muted-foreground mt-1">
          Mínimo: {offRampMinAmount} {(selectedOriginCurrency || '').toUpperCase()}
        </p>
      )}
    </div>
  ) : null

  // ── Partial renders for sub-step mode ────────────────────────────────────
  if (subStep === 'wallet') {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
        {walletField}
        {tokenField}
      </div>
    )
  }

  if (subStep === 'bank') {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
        {bankSection}
      </div>
    )
  }

  if (subStep === 'dest_wallet') {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
        {cryptoDestSection}
      </div>
    )
  }

  if (subStep === 'amount') {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div>
          {amountField}
          {estimationBlock}
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">

      {/* 1. Wallet de origen — común a los 3 métodos */}
      {walletField}

      {/* 2. Token de origen — común a los 3 métodos */}
      {tokenField}

      {/* 3. Monto + desglose tipo recibo (se despliega al escribir) */}
      <div>
        {amountField}
        {estimationBlock}
      </div>

      {/* 5. Campos específicos por método */}
      {bankSection}

      {method === 'crypto' && (
        <>
          <div className="space-y-1.5 pt-2">
            <p className={cn(LABEL_CLASS, 'text-foreground')}>Wallet externa destino</p>
            <p className="text-xs text-muted-foreground">
              Selecciona la red y token de destino, luego ingresa la dirección.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="crypto_network"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL_CLASS}>Red de destino</FormLabel>
                  <Select
                    value={field.value || null}
                    onValueChange={(v) => handleCryptoNetworkChange(v, field.onChange)}
                    disabled={disabled || availableNetworks.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger className={cn(FORM_UNDERLINE_SELECT_CLASS, FORM_TEXT_CLASS)}>
                        <SelectValue placeholder={selectedOriginCurrency ? 'Seleccionar red' : 'Selecciona token primero'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableNetworks.map((net) => (
                        <SelectItem key={net} value={net}>
                          {NETWORK_LABELS[net as keyof typeof NETWORK_LABELS] ?? net}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="destination_currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL_CLASS}>Token de destino</FormLabel>
                  <Select
                    value={field.value || null}
                    onValueChange={field.onChange}
                    disabled={disabled || availableDestCurrencies.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger className={cn(FORM_UNDERLINE_SELECT_CLASS, FORM_TEXT_CLASS)}>
                        <SelectValue placeholder={selectedCryptoNetwork ? 'Seleccionar token' : 'Selecciona red primero'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableDestCurrencies.map((cur) => (
                        <SelectItem key={cur} value={cur}>
                          {CRYPTO_CURRENCY_LABELS[cur as keyof typeof CRYPTO_CURRENCY_LABELS] ?? cur.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCryptoNetwork && availableDestCurrencies.length === 0 && (
                    <p className="text-[10px] text-amber-500 mt-1">
                      No hay tokens destino disponibles para esta combinación.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="crypto_address"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={LABEL_CLASS}>Dirección cripto destino</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    placeholder="Ej: 0x... / T... / G..."
                    disabled={disabled}
                    className={cn(FORM_UNDERLINE_INPUT_CLASS, FORM_TEXT_CLASS, 'font-mono text-xs')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {offRampMinAmount > 0 && selectedDestCurrency && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Mínimo: {offRampMinAmount} {(selectedOriginCurrency || '').toUpperCase()}
            </p>
          )}
        </>
      )}

      {method === 'fiat_us' && (
        <div className="space-y-1.5 pt-2">
          <p className={cn(LABEL_CLASS, 'text-foreground')}>Cuenta Bancaria EE. UU.</p>
          <p className="border-l-2 border-border/70 bg-muted/10 px-4 py-4 text-sm text-muted-foreground">
            Selecciona el proveedor con cuenta externa bancaria (ACH/Wire) registrada desde el selector de abajo. Solo se muestran proveedores con cuenta bancaria estadounidense vinculada a Bridge.
          </p>
        </div>
      )}

    </div>
  )
}
