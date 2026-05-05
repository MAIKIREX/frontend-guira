import React, { useState, useRef, useCallback } from 'react'
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
import { Button } from '@/components/ui/button'
import { Plus, CircleAlert, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CRYPTO_NETWORK_LABELS } from '@/features/payments/lib/crypto-networks'
import { CRYPTO_CURRENCY_LABELS } from '@/lib/guira-crypto-config'
import {
  getAllCryptoDestCurrencies,
  FIAT_BO_ALLOWED_DESTINATION_CURRENCIES,
  getSourceNetworksForDest,
  getSourceCurrenciesForDestAndNetwork,
  getMinAmountByDest,
} from '@/features/payments/lib/bridge-route-catalog'
import { CreateVirtualAccountDialog } from '@/features/client/components/create-virtual-account-dialog'
import { resolveFeeTotal, type ExchangeRateRecord } from '@/features/payments/lib/deposit-instructions'
import type { WalletBalance } from '@/services/wallet.service'
import type { VirtualAccount } from '@/services/bridge.service'
import type { FeeConfigRow } from '@/types/payment-order'
import { EstimationSummary } from '@/components/shared/estimation-summary'

const LABEL_CLASS = 'text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground'
const FORM_TEXT_CLASS = 'tracking-[0.01em]'
const FORM_UNDERLINE_INPUT_CLASS = 'h-11 rounded-none border-0 border-b border-input bg-transparent px-0 py-0 shadow-none transition-colors focus-visible:border-primary focus-visible:ring-0 disabled:bg-transparent'
const FORM_UNDERLINE_SELECT_CLASS = 'h-11 w-full rounded-none border-0 border-b border-input bg-transparent px-0 py-0 shadow-none transition-colors focus-visible:border-primary focus-visible:ring-0'

const METHOD_META: Record<string, { originCurrency: string }> = {
  fiat_bo: { originCurrency: 'BOB' },
  crypto: { originCurrency: '' }, // dinámico según selector
  fiat_us: { originCurrency: 'USD' },
}

// Hoisted outside the component so the reference is stable across renders
const FLOW_TYPE_MAP: Record<string, string> = {
  fiat_bo: 'fiat_bo_to_bridge_wallet',
  crypto: 'crypto_to_bridge_wallet',
  fiat_us: 'fiat_us_to_bridge_wallet',
}

export type RampDepositSubStep = 'wallet' | 'network' | 'amount'

interface WalletRampDetailStepProps {
  form: any
  method: 'fiat_bo' | 'crypto' | 'fiat_us'
  wallets: WalletBalance[]
  virtualAccounts: VirtualAccount[]
  loadingVirtualAccounts: boolean
  onVaCreated: (va: VirtualAccount) => void
  exchangeRates: ExchangeRateRecord[]
  feesConfig: FeeConfigRow[]
  disabled?: boolean
  subStep?: RampDepositSubStep
}

export function WalletRampDetailStep({
  form,
  method,
  wallets,
  virtualAccounts,
  loadingVirtualAccounts,
  onVaCreated,
  exchangeRates,
  feesConfig,
  disabled,
  subStep,
}: WalletRampDetailStepProps) {
  const [vaDialogOpen, setVaDialogOpen] = useState(false)
  const meta = METHOD_META[method]

  // Ref to track previous estimate values and skip redundant setValue calls
  const prevEstimateRef = useRef<{ feeTotal: number; exchangeRateApplied: number; amountConverted: number } | null>(null)

  const amount = form.watch('amount_origin')
  const selectedSourceNetwork = form.watch('wallet_ramp_source_network') ?? ''
  const selectedOriginCurrency = form.watch('origin_currency') ?? ''
  const selectedDestCurrency = form.watch('wallet_ramp_destination_currency') ?? ''

  // ── Listas dinámicas filtradas por documento lista_permitida_moneda_origen_destino ──
  // La moneda destino (elegida en el paso anterior) determina las redes y monedas de origen válidas.

  const availableSourceNetworks = React.useMemo(() => {
    if (method !== 'crypto') return []
    return getSourceNetworksForDest(selectedDestCurrency)
  }, [method, selectedDestCurrency])

  const availableSourceCurrencies = React.useMemo(() => {
    if (method !== 'crypto' || !selectedSourceNetwork) return []
    return getSourceCurrenciesForDestAndNetwork(selectedDestCurrency, selectedSourceNetwork)
  }, [method, selectedDestCurrency, selectedSourceNetwork])

  const availableDestCurrencies = React.useMemo(() => {
    if (method === 'fiat_bo') {
      return [...FIAT_BO_ALLOWED_DESTINATION_CURRENCIES]
    }
    if (method === 'crypto') {
      return getAllCryptoDestCurrencies()
    }
    return []
  }, [method])

  const minAmount = React.useMemo(() => {
    if (method === 'crypto' && selectedDestCurrency && selectedSourceNetwork && selectedOriginCurrency) {
      return getMinAmountByDest(selectedDestCurrency, selectedSourceNetwork, selectedOriginCurrency)
    }
    return 0
  }, [method, selectedDestCurrency, selectedSourceNetwork, selectedOriginCurrency])

  // ── Cascada: auto-clear cuando la selección queda inválida ──
  // IMPORTANT: Base UI Select treats '' as a valid value that doesn't match
  // any item, causing the component to freeze. Use undefined to clear.
  const handleNetworkChange = useCallback((network: string, fieldOnChange: (v: string) => void) => {
    fieldOnChange(network)
    // Limpiar moneda origen si ya no es válida para la nueva red + destino seleccionado
    const destCurrency = form.getValues('wallet_ramp_destination_currency')
    const newSourceCurrencies = getSourceCurrenciesForDestAndNetwork(destCurrency, network)
    const currentOrigin = form.getValues('origin_currency')
    if (currentOrigin && !newSourceCurrencies.includes(currentOrigin.toLowerCase())) {
      if (newSourceCurrencies.length === 1) {
        form.setValue('origin_currency', newSourceCurrencies[0], { shouldValidate: false })
      } else {
        form.setValue('origin_currency', undefined as any, { shouldValidate: false })
      }
    }
  }, [form])

  const handleSourceCurrencyChange = useCallback((currency: string, fieldOnChange: (v: string) => void) => {
    fieldOnChange(currency)
  }, [])

  // ── Resolución de moneda para labels ──
  const displayOriginCurrency = method === 'fiat_bo' ? 'BOB' : (selectedOriginCurrency || 'CRYPTO').toUpperCase()
  const displayDestCurrency = (selectedDestCurrency || 'USDC').toUpperCase()

  const estimate = React.useMemo(() => {
    const feeTotal = resolveFeeTotal(feesConfig, Number(amount) || 0, FLOW_TYPE_MAP[method] as any)
    let exchangeRateApplied = 1

    if (method === 'fiat_bo') {
      const rateRecord = exchangeRates.find((r) => r.pair?.toUpperCase() === 'BOB_USD')
      if (rateRecord) {
        exchangeRateApplied = rateRecord.effective_rate ?? rateRecord.rate
      } else {
        exchangeRateApplied = 6.96
      }
    }

    // Fiat BO → token: dividir por tasa (BOB/USD)
    const netAmt = Math.max((Number(amount) || 0) - feeTotal, 0)
    const amountConverted = method === 'fiat_bo'
      ? netAmt / exchangeRateApplied
      : netAmt * exchangeRateApplied

    return {
      feeTotal,
      exchangeRateApplied,
      amountConverted
    }
  }, [method, amount, exchangeRates, feesConfig])

  React.useEffect(() => {
    const prev = prevEstimateRef.current
    // Only call setValue when the computed values have actually changed
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

  // ── Partial renders for sub-step mode (fiat_bo_to_bridge_wallet) ────────────
  if (subStep === 'wallet') {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <FormField
          control={form.control}
          name="wallet_ramp_wallet_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={LABEL_CLASS}>Wallet Bridge destino</FormLabel>
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
                        ({w.currency.toUpperCase()} · {w.network ?? 'interna'} · {w.available_balance.toFixed(2)} disponible)
                      </span>
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
          name="wallet_ramp_destination_currency"
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
                    <SelectValue placeholder="Seleccionar token destino" />
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
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    )
  }

  if (subStep === 'network') {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
        {method === 'crypto' && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Red de origen — filtrada por token destino elegido en paso 1 */}
              <FormField
                control={form.control}
                name="wallet_ramp_source_network"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_CLASS}>Red de origen</FormLabel>
                    <Select
                      value={field.value || null}
                      onValueChange={(v) => handleNetworkChange(v, field.onChange)}
                      disabled={disabled || availableSourceNetworks.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger className={cn(FORM_UNDERLINE_SELECT_CLASS, FORM_TEXT_CLASS)}>
                          <SelectValue placeholder={selectedDestCurrency ? 'Seleccionar red' : 'Selecciona un token destino primero'} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableSourceNetworks.map((net) => (
                          <SelectItem key={net} value={net}>
                            {CRYPTO_NETWORK_LABELS[net as keyof typeof CRYPTO_NETWORK_LABELS] ?? net}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Moneda de origen — filtrada por token destino + red de origen */}
              <FormField
                control={form.control}
                name="origin_currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_CLASS}>Moneda de origen</FormLabel>
                    <Select
                      value={field.value || null}
                      onValueChange={(v) => handleSourceCurrencyChange(v, field.onChange)}
                      disabled={disabled || availableSourceCurrencies.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger className={cn(FORM_UNDERLINE_SELECT_CLASS, FORM_TEXT_CLASS)}>
                          <SelectValue placeholder={selectedSourceNetwork ? 'Seleccionar moneda' : 'Selecciona una red primero'} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableSourceCurrencies.map((cur) => (
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
            </div>
          </div>
        )}
      </div>
    )
  }

  if (subStep === 'amount') {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <FormField
          control={form.control}
          name="amount_origin"
          render={({ field }) => (
            <FormItem className="flex flex-col items-center justify-center space-y-2 pb-2 pt-4">
              <FormLabel className={cn(LABEL_CLASS, 'text-center')}>Monto inicial en {displayOriginCurrency}</FormLabel>
              <FormControl>
                <div className="relative flex w-full max-w-[240px] md:max-w-[320px] mx-auto items-center justify-center">
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    type="number"
                    min={0}
                    step="any"
                    placeholder="0.00"
                    disabled={disabled}
                    className="h-auto w-full p-0 border-none bg-transparent text-center text-5xl font-semibold tracking-[-0.04em] shadow-none focus-visible:ring-0 md:text-6xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="absolute left-full ml-2 md:ml-4 bottom-2 md:bottom-3 text-xl md:text-2xl font-medium text-muted-foreground">
                    {displayOriginCurrency}
                  </span>
                </div>
              </FormControl>
              <FormMessage className="text-center" />
            </FormItem>
          )}
        />
        {Number(amount) > 0 && (
          <EstimationSummary
            amountOrigin={Number(amount) || 0}
            originCurrency={displayOriginCurrency}
            feeTotal={estimate.feeTotal}
            exchangeRate={method === 'fiat_bo' ? estimate.exchangeRateApplied : undefined}
            exchangeRateLabel={method === 'fiat_bo' ? `BOB/${displayDestCurrency}` : undefined}
            exchangeRatePrecision={4}
            receivesApprox={estimate.amountConverted}
            receivesCurrency={displayDestCurrency}
            showAmountOrigin
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Oculto para crypto_to_bridge_wallet: flexible_amount permite cualquier monto */}
      <div className={method === 'crypto' ? 'hidden' : ''}>
        <FormField
          control={form.control}
          name="amount_origin"
          render={({ field }) => (
            <FormItem className="flex flex-col items-center justify-center space-y-2 pb-2 pt-4">
              <FormLabel className={cn(LABEL_CLASS, 'text-center')}>
                Monto inicial en {displayOriginCurrency}
              </FormLabel>
              <FormControl>
                <div className="relative flex w-full max-w-[240px] md:max-w-[320px] mx-auto items-center justify-center">
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    type="number"
                    min={0}
                    step="any"
                    placeholder={`0.00`}
                    disabled={disabled}
                    className="h-auto w-full p-0 border-none bg-transparent text-center text-5xl font-semibold tracking-[-0.04em] shadow-none focus-visible:ring-0 md:text-6xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="absolute left-full ml-2 md:ml-4 bottom-2 md:bottom-3 text-xl md:text-2xl font-medium text-muted-foreground">
                    {displayOriginCurrency}
                  </span>
                </div>
              </FormControl>
              <FormMessage className="text-center" />
            </FormItem>
          )}
        />
      </div>

      {method === 'crypto' && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Red de origen — filtrada por token destino */}
            <FormField
              control={form.control}
              name="wallet_ramp_source_network"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL_CLASS}>Red de origen</FormLabel>
                  <Select
                    value={field.value || null}
                    onValueChange={(v) => handleNetworkChange(v, field.onChange)}
                    disabled={disabled || availableSourceNetworks.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger className={cn(FORM_UNDERLINE_SELECT_CLASS, FORM_TEXT_CLASS)}>
                        <SelectValue placeholder={selectedDestCurrency ? 'Seleccionar red' : 'Selecciona un token destino primero'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableSourceNetworks.map((net) => (
                        <SelectItem key={net} value={net}>
                          {CRYPTO_NETWORK_LABELS[net as keyof typeof CRYPTO_NETWORK_LABELS] ?? net}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Moneda de origen (filtrada por red) */}
            <FormField
              control={form.control}
              name="origin_currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL_CLASS}>Moneda de origen</FormLabel>
                  <Select
                    value={field.value || null}
                    onValueChange={(v) => handleSourceCurrencyChange(v, field.onChange)}
                    disabled={disabled || availableSourceCurrencies.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger className={cn(FORM_UNDERLINE_SELECT_CLASS, FORM_TEXT_CLASS)}>
                        <SelectValue placeholder={selectedSourceNetwork ? 'Seleccionar moneda' : 'Selecciona una red primero'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableSourceCurrencies.map((cur) => (
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
          </div>
        </div>
      )}

      {(method === 'fiat_bo' || method === 'crypto') && (
        <FormField
          control={form.control}
          name="wallet_ramp_wallet_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={LABEL_CLASS}>Wallet Bridge destino</FormLabel>
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
                        ({w.currency.toUpperCase()} · {w.network ?? 'interna'} · {w.available_balance.toFixed(2)} disponible)
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* ── Token de destino: fiat_bo y crypto ── */}
      {(method === 'fiat_bo' || method === 'crypto') && (
        <FormField
          control={form.control}
          name="wallet_ramp_destination_currency"
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
                    <SelectValue placeholder="Seleccionar token destino" />
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
              {method === 'crypto' && availableDestCurrencies.length === 0 && selectedSourceNetwork && (
                <p className="text-[10px] text-amber-500 mt-1">
                  Selecciona red y moneda de origen para ver los tokens destino disponibles.
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {method === 'fiat_us' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className={LABEL_CLASS}>Virtual Account (USD)</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setVaDialogOpen(true)}
              disabled={disabled}
            >
              <Plus className="size-3" />
              Nueva VA
            </Button>
          </div>

          {loadingVirtualAccounts ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Cargando cuentas virtuales…
            </div>
          ) : virtualAccounts.length === 0 ? (
            <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-border/60 bg-muted/20 p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CircleAlert className="size-4" />
                <span>No tienes ninguna Virtual Account activa.</span>
              </div>
              <p className="text-xs text-muted-foreground/80">
                Las Virtual Accounts son cuentas bancarias en USD vinculadas a tu wallet Bridge.
                Crea una para recibir depósitos ACH/Wire desde EE.UU.
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => setVaDialogOpen(true)}
                disabled={disabled}
                className="gap-1.5"
              >
                <Plus className="size-3.5" />
                Crear Virtual Account
              </Button>
            </div>
          ) : (
            <FormField
              control={form.control}
              name="wallet_ramp_va_id"
              render={({ field }) => (
                <FormItem>
                  <Select
                    value={field.value ?? ''}
                    onValueChange={field.onChange}
                    disabled={disabled}
                  >
                    <FormControl>
                      <SelectTrigger className={cn(FORM_UNDERLINE_SELECT_CLASS, FORM_TEXT_CLASS)}>
                        <SelectValue placeholder="Seleccionar cuenta virtual" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {virtualAccounts.map((va) => (
                        <SelectItem key={va.id} value={va.id}>
                          <span className="font-medium">
                            {va.bank_name ?? 'Banco VA'} — {va.account_number ?? va.id.slice(0, 8)}
                          </span>
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            ({va.source_currency.toUpperCase()} → {va.destination_currency.toUpperCase()})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <CreateVirtualAccountDialog
            open={vaDialogOpen}
            onOpenChange={setVaDialogOpen}
            internalCurrencies={virtualAccounts.filter((va) => !va.is_external_sweep).map((va) => va.source_currency)}
            externalCountBySource={virtualAccounts.filter((va) => va.is_external_sweep).reduce<Record<string, number>>((acc, va) => { acc[va.source_currency] = (acc[va.source_currency] ?? 0) + 1; return acc }, {})}
            onCreated={onVaCreated}
          />
        </div>
      )}

      {Number(amount) > 0 && (
        <EstimationSummary
          amountOrigin={Number(amount) || 0}
          originCurrency={displayOriginCurrency}
          feeTotal={estimate.feeTotal}
          exchangeRate={method === 'fiat_bo' ? estimate.exchangeRateApplied : undefined}
          exchangeRateLabel={method === 'fiat_bo' ? `BOB/${displayDestCurrency}` : undefined}
          exchangeRatePrecision={4}
          receivesApprox={estimate.amountConverted}
          receivesCurrency={displayDestCurrency}
          showAmountOrigin
        />
      )}
    </div>
  )
}
