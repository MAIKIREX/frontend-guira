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
import { cn } from '@/lib/utils'
import { resolveFeeTotal, type ExchangeRateRecord } from '@/features/payments/lib/deposit-instructions'
import type { WalletBalance } from '@/services/wallet.service'
import type { FeeConfigRow, PsavConfigRow } from '@/types/payment-order'
import { ClientBankAccountsService, type ClientBankAccount } from '@/services/client-bank-accounts.service'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { ALLOWED_NETWORKS, NETWORK_LABELS, CRYPTO_CURRENCY_LABELS } from '@/lib/guira-crypto-config'
import {
  getOffRampDestNetworks,
  getOffRampDestCurrencies,
  getOffRampMinAmount,
  OFF_RAMP_SOURCE_CURRENCIES,
  getFiatBoAvailableSourceCurrencies,
  getFiatBoMinAmountForSource,
} from '@/features/payments/lib/bridge-route-catalog'

const LABEL_CLASS = 'text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground'
const FORM_TEXT_CLASS = 'tracking-[0.01em]'
const FORM_UNDERLINE_INPUT_CLASS = 'h-11 rounded-none border-0 border-b border-input bg-transparent px-0 py-0 shadow-none transition-colors focus-visible:border-primary focus-visible:ring-0 disabled:bg-transparent'
const FORM_UNDERLINE_SELECT_CLASS = 'h-11 w-full rounded-none border-0 border-b border-input bg-transparent px-0 py-0 shadow-none transition-colors focus-visible:border-primary focus-visible:ring-0'

interface WalletWithdrawDetailStepProps {
  form: any
  method?: string
  wallets: WalletBalance[]
  exchangeRates: ExchangeRateRecord[]
  feesConfig: FeeConfigRow[]
  psavConfigs?: PsavConfigRow[]
  disabled?: boolean
}

export function WalletWithdrawDetailStep({
  form,
  method = 'fiat_bo',
  wallets,
  exchangeRates,
  feesConfig,
  psavConfigs = [],
  disabled,
}: WalletWithdrawDetailStepProps) {
  const prevEstimateRef = useRef<{ feeTotal: number; exchangeRateApplied: number; amountConverted: number } | null>(null)

  // ── Bank account state (for fiat_bo) ──
  const [bankAccount, setBankAccount] = useState<ClientBankAccount | null>(null)
  const [bankLoading, setBankLoading] = useState(method === 'fiat_bo')

  // ── Crypto off-ramp dynamic state ──
  const selectedOriginCurrency = form.watch('origin_currency') ?? ''
  const selectedCryptoNetwork = form.watch('crypto_network') ?? ''
  const selectedDestCurrency = form.watch('destination_currency') ?? ''

  // ── Fiat BO dynamic source currencies ──
  const selectedWalletId = form.watch('wallet_ramp_wallet_id') ?? ''
  const selectedWallet = wallets.find((w) => w.id === selectedWalletId)

  const fiatBoAvailableCurrencies = React.useMemo(() => {
    if (method !== 'fiat_bo') return []
    // Get tokens valid for Bridge + PSAV
    const routeValid = getFiatBoAvailableSourceCurrencies(psavConfigs as any[])
    if (!selectedWallet?.token_balances?.length) return routeValid
    // Further filter by tokens user actually has balance in
    return routeValid.filter((cur) => {
      const tb = selectedWallet.token_balances.find(
        (t) => t.currency.toLowerCase() === cur.toLowerCase()
      )
      return tb && tb.available_balance > 0
    })
  }, [method, psavConfigs, selectedWallet])

  // ── Fiat US dynamic source currencies ──
  const fiatUsAvailableCurrencies = React.useMemo(() => {
    if (method !== 'fiat_us') return []
    // All 5 tokens are valid for fiat_us off-ramp via Bridge (no PSAV dependency)
    const allTokens = [...OFF_RAMP_SOURCE_CURRENCIES]
    if (!selectedWallet?.token_balances?.length) return allTokens
    // Filter to tokens user actually has balance in
    return allTokens.filter((cur) => {
      const tb = selectedWallet.token_balances.find(
        (t) => t.currency.toLowerCase() === cur.toLowerCase()
      )
      return tb && tb.available_balance > 0
    })
  }, [method, selectedWallet])

  const fiatBoMinAmount = React.useMemo(() => {
    if (method !== 'fiat_bo' || !selectedOriginCurrency) return 0
    return getFiatBoMinAmountForSource(selectedOriginCurrency, psavConfigs as any[])
  }, [method, selectedOriginCurrency, psavConfigs])

  const availableNetworks = React.useMemo(() => {
    if (method !== 'crypto' || !selectedOriginCurrency) return []
    return getOffRampDestNetworks(selectedOriginCurrency)
  }, [method, selectedOriginCurrency])

  const availableDestCurrencies = React.useMemo(() => {
    if (method !== 'crypto' || !selectedOriginCurrency || !selectedCryptoNetwork) return []
    return getOffRampDestCurrencies(selectedOriginCurrency, selectedCryptoNetwork)
  }, [method, selectedOriginCurrency, selectedCryptoNetwork])

  const offRampMinAmount = React.useMemo(() => {
    if (method !== 'crypto' || !selectedOriginCurrency || !selectedCryptoNetwork || !selectedDestCurrency) return 0
    return getOffRampMinAmount(selectedOriginCurrency, selectedCryptoNetwork, selectedDestCurrency)
  }, [method, selectedOriginCurrency, selectedCryptoNetwork, selectedDestCurrency])

  // ── Cascada off-ramp: auto-clear invalid selections ──
  // IMPORTANT: Base UI Select treats '' as a valid value. Use undefined to clear.
  const handleSourceTokenChange = useCallback((token: string, fieldOnChange: (v: string) => void) => {
    fieldOnChange(token)
    const newNetworks = getOffRampDestNetworks(token)
    const currentNetwork = form.getValues('crypto_network')
    if (currentNetwork && !newNetworks.includes(currentNetwork)) {
      form.setValue('crypto_network', undefined as any, { shouldValidate: false })
      form.setValue('destination_currency', undefined as any, { shouldValidate: false })
    } else if (currentNetwork) {
      const newDests = getOffRampDestCurrencies(token, currentNetwork)
      const currentDest = form.getValues('destination_currency')
      if (currentDest && !newDests.includes(currentDest.toLowerCase())) {
        form.setValue('destination_currency', undefined as any, { shouldValidate: false })
      }
    }
  }, [form])

  const handleCryptoNetworkChange = useCallback((network: string, fieldOnChange: (v: string) => void) => {
    fieldOnChange(network)
    const srcToken = form.getValues('origin_currency')
    if (srcToken) {
      const newDests = getOffRampDestCurrencies(srcToken, network)
      const currentDest = form.getValues('destination_currency')
      if (currentDest && !newDests.includes(currentDest.toLowerCase())) {
        form.setValue('destination_currency', undefined as any, { shouldValidate: false })
      }
      // Auto-select if only one dest currency
      if (newDests.length === 1) {
        form.setValue('destination_currency', newDests[0], { shouldValidate: false })
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

  const amount = form.watch('amount_origin')

  const estimate = React.useMemo(() => {
    let feeTotal = 0
    let exchangeRateApplied = 1
    let amountConverted = Number(amount) || 0

    if (method === 'fiat_bo') {
      feeTotal = resolveFeeTotal(feesConfig, Number(amount) || 0, 'bridge_wallet_to_fiat_bo' as any)
      const rateRecord =
        exchangeRates.find((r) => r.pair?.toUpperCase() === 'USD_BOB')
      exchangeRateApplied = 6.96 // fallback
      if (rateRecord) {
        const spread = rateRecord.spread_percent ?? 0
        exchangeRateApplied = rateRecord.rate * (1 - spread / 100)
      }
      const netUsdc = Math.max((Number(amount) || 0) - feeTotal, 0)
      amountConverted = netUsdc * exchangeRateApplied
    } else if (method === 'crypto') {
      feeTotal = resolveFeeTotal(feesConfig, Number(amount) || 0, 'bridge_wallet_to_crypto' as any)
      amountConverted = Math.max((Number(amount) || 0) - feeTotal, 0)
    } else if (method === 'fiat_us') {
      feeTotal = resolveFeeTotal(feesConfig, Number(amount) || 0, 'bridge_wallet_to_fiat_us' as any)
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

  // Determine if the submit should be blocked for fiat_bo without bank account
  const isFiatBoBlocked = method === 'fiat_bo' && !bankLoading && !bankAccount

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Wallet origen */}
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
                  <SelectValue placeholder="Seleccionar wallet" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {wallets.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    <span className="font-medium">{w.label ?? `${w.currency.toUpperCase()} Wallet`}</span>
                    <span className="ml-1.5 text-muted-foreground text-xs">
                      ({w.currency.toUpperCase()} · {w.available_balance.toFixed(2)} disponible)
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Monto */}
      <FormField
        control={form.control}
        name="amount_origin"
        render={({ field }) => (
          <FormItem>
            <FormLabel className={LABEL_CLASS}>Monto a retirar ({displayWithdrawCurrency})</FormLabel>
            <FormControl>
              <div className="relative">
                <Input
                  {...field}
                  type="number"
                  min={0}
                  step="any"
                  placeholder="0.00"
                  disabled={disabled || isFiatBoBlocked}
                  className={cn(FORM_UNDERLINE_INPUT_CLASS, 'text-lg font-medium tracking-[-0.02em] pr-16')}
                />
                <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                  {displayWithdrawCurrency}
                </span>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {method === 'fiat_bo' ? (
        <>
          {/* Token de origen (dinámico) */}
          <FormField
            control={form.control}
            name="origin_currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={LABEL_CLASS}>Token de origen (de tu wallet)</FormLabel>
                <Select
                  value={field.value || null}
                  onValueChange={field.onChange}
                  disabled={disabled || fiatBoAvailableCurrencies.length === 0}
                >
                  <FormControl>
                    <SelectTrigger className={cn(FORM_UNDERLINE_SELECT_CLASS, FORM_TEXT_CLASS)}>
                      <SelectValue placeholder={fiatBoAvailableCurrencies.length === 0 ? 'No hay tokens disponibles' : 'Seleccionar token'} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {fiatBoAvailableCurrencies.map((cur) => {
                      const tokenBalance = selectedWallet?.token_balances?.find(
                        (t) => t.currency.toLowerCase() === cur.toLowerCase()
                      )
                      return (
                        <SelectItem key={cur} value={cur}>
                          {CRYPTO_CURRENCY_LABELS[cur as keyof typeof CRYPTO_CURRENCY_LABELS] ?? cur.toUpperCase()}
                          {tokenBalance ? (
                            <span className="ml-1.5 text-muted-foreground text-xs">
                              · {tokenBalance.available_balance.toFixed(2)} disponible
                            </span>
                          ) : null}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                {fiatBoAvailableCurrencies.length === 0 && !disabled && (
                  <p className="text-[10px] text-amber-500 mt-1">
                    No hay tokens con balance y ruta PSAV disponible para retiro.
                  </p>
                )}
                {fiatBoMinAmount > 0 && selectedOriginCurrency && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Mínimo: {fiatBoMinAmount} {selectedOriginCurrency.toUpperCase()}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {bankLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Cargando cuenta bancaria...</span>
            </div>
          ) : bankAccount ? (
            /* ── Datos bancarios del perfil (solo lectura) ── */
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
            /* ── CTA: Cuenta bancaria no registrada ── */
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
      ) : method === 'crypto' ? (
        <>
          {/* Token de origen */}
          <FormField
            control={form.control}
            name="origin_currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={LABEL_CLASS}>Token de origen (de tu wallet)</FormLabel>
                <Select
                  value={field.value || null}
                  onValueChange={(v) => handleSourceTokenChange(v, field.onChange)}
                  disabled={disabled}
                >
                  <FormControl>
                    <SelectTrigger className={cn(FORM_UNDERLINE_SELECT_CLASS, FORM_TEXT_CLASS)}>
                      <SelectValue placeholder="Seleccionar token" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {OFF_RAMP_SOURCE_CURRENCIES.map((cur) => (
                      <SelectItem key={cur} value={cur}>
                        {CRYPTO_CURRENCY_LABELS[cur as keyof typeof CRYPTO_CURRENCY_LABELS] ?? cur.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Header wallet destino */}
          <div className="space-y-1.5 pt-2">
            <p className={cn(LABEL_CLASS, 'text-foreground')}>Wallet externa destino</p>
            <p className="text-xs text-muted-foreground">
              Selecciona la red y token de destino, luego ingresa la dirección.
            </p>
          </div>

          {/* Red de destino + Token de destino */}
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

          {/* Dirección cripto destino */}
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

          {/* Monto mínimo indicator */}
          {offRampMinAmount > 0 && selectedDestCurrency && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Mínimo: {offRampMinAmount} {(selectedOriginCurrency || '').toUpperCase()}
            </p>
          )}
        </>
      ) : method === 'fiat_us' ? (
        <>
          {/* Token de origen (dinámico) */}
          <FormField
            control={form.control}
            name="origin_currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={LABEL_CLASS}>Token de origen (de tu wallet)</FormLabel>
                <Select
                  value={field.value || null}
                  onValueChange={field.onChange}
                  disabled={disabled || fiatUsAvailableCurrencies.length === 0}
                >
                  <FormControl>
                    <SelectTrigger className={cn(FORM_UNDERLINE_SELECT_CLASS, FORM_TEXT_CLASS)}>
                      <SelectValue placeholder={fiatUsAvailableCurrencies.length === 0 ? 'No hay tokens con saldo' : 'Seleccionar token'} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {fiatUsAvailableCurrencies.map((cur) => {
                      const tokenBalance = selectedWallet?.token_balances?.find(
                        (t) => t.currency.toLowerCase() === cur.toLowerCase()
                      )
                      return (
                        <SelectItem key={cur} value={cur}>
                          {CRYPTO_CURRENCY_LABELS[cur as keyof typeof CRYPTO_CURRENCY_LABELS] ?? cur.toUpperCase()}
                          {tokenBalance ? (
                            <span className="ml-1.5 text-muted-foreground text-xs">
                              · {tokenBalance.available_balance.toFixed(2)} disponible
                            </span>
                          ) : null}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                {fiatUsAvailableCurrencies.length === 0 && !disabled && (
                  <p className="text-[10px] text-amber-500 mt-1">
                    No hay tokens con balance disponible para retiro.
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-1.5 pt-2">
             <p className={cn(LABEL_CLASS, 'text-foreground')}>Cuenta Bancaria EE. UU.</p>
             <p className="border-l-2 border-border/70 bg-muted/10 px-4 py-4 text-sm text-muted-foreground">
               Selecciona el proveedor con cuenta externa bancaria (ACH/Wire) registrada desde el selector de abajo. Solo se muestran proveedores con cuenta bancaria estadounidense vinculada a Bridge.
             </p>
          </div>
        </>
      ) : null}

      {/* Estimación en vivo */}
      {Number(amount) > 0 && (
        <div className="rounded-2xl border border-border/40 bg-muted/20 p-5">
          <p className={cn(LABEL_CLASS, 'mb-4')}>Estimación de retiro</p>
          <div className={cn('grid gap-4 text-center', method === 'fiat_bo' ? 'grid-cols-3' : 'grid-cols-2')}>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Fee estimado</p>
              <p className="mt-1 text-base font-semibold">
                {estimate.feeTotal.toFixed(2)} <span className="text-xs text-muted-foreground">{displayWithdrawCurrency}</span>
              </p>
            </div>
            {method === 'fiat_bo' ? (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tipo de cambio</p>
                <p className="mt-1 text-base font-semibold">
                  {estimate.exchangeRateApplied.toFixed(4)} <span className="text-xs text-muted-foreground">BOB/{displayWithdrawCurrency}</span>
                </p>
              </div>
            ) : null}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Recibirás aprox.</p>
              <p className="mt-1 text-base font-semibold text-emerald-500">
                {estimate.amountConverted.toFixed(2)} <span className="text-xs">{method === 'fiat_bo' ? 'BOB' : method === 'fiat_us' ? 'USD' : displayWithdrawCurrency}</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

