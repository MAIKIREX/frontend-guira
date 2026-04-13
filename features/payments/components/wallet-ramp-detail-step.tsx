import React, { useState, useRef } from 'react'
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
import { CRYPTO_NETWORK_OPTIONS, CRYPTO_NETWORK_LABELS } from '@/features/payments/lib/crypto-networks'
import { CreateVirtualAccountDialog } from '@/features/client/components/create-virtual-account-dialog'
import { resolveFeeTotal, type ExchangeRateRecord } from '@/features/payments/lib/deposit-instructions'
import type { WalletBalance } from '@/services/wallet.service'
import type { VirtualAccount } from '@/services/bridge.service'
import type { FeeConfigRow } from '@/types/payment-order'

const LABEL_CLASS = 'text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground'
const FORM_TEXT_CLASS = 'tracking-[0.01em]'
const FORM_UNDERLINE_INPUT_CLASS = 'h-11 rounded-none border-0 border-b border-input bg-transparent px-0 py-0 shadow-none transition-colors focus-visible:border-primary focus-visible:ring-0 disabled:bg-transparent'
const FORM_UNDERLINE_SELECT_CLASS = 'h-11 w-full rounded-none border-0 border-b border-input bg-transparent px-0 py-0 shadow-none transition-colors focus-visible:border-primary focus-visible:ring-0'

const METHOD_META = {
  fiat_bo: { originCurrency: 'BOB', destCurrency: 'USDC' },
  crypto: { originCurrency: 'USDT', destCurrency: 'USDC' },
  fiat_us: { originCurrency: 'USD', destCurrency: 'USDC' }
}

// Hoisted outside the component so the reference is stable across renders
const FLOW_TYPE_MAP: Record<string, string> = {
  fiat_bo: 'fiat_bo_to_bridge_wallet',
  crypto: 'crypto_to_bridge_wallet',
  fiat_us: 'fiat_us_to_bridge_wallet',
}

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
  disabled
}: WalletRampDetailStepProps) {
  const [vaDialogOpen, setVaDialogOpen] = useState(false)
  const meta = METHOD_META[method]

  // Ref to track previous estimate values and skip redundant setValue calls
  const prevEstimateRef = useRef<{ feeTotal: number; exchangeRateApplied: number; amountConverted: number } | null>(null)

  const amount = form.watch('amount_origin')
  const estimate = React.useMemo(() => {
    const feeTotal = resolveFeeTotal(feesConfig, Number(amount) || 0, FLOW_TYPE_MAP[method] as any)
    let exchangeRateApplied = 1

    if (method === 'fiat_bo') {
      const rateRecord = exchangeRates.find((r) => r.pair?.toUpperCase() === 'BOB_USDC') ?? exchangeRates.find((r) => r.pair?.toUpperCase() === 'BOB_USD')
      if (rateRecord) {
        const spread = rateRecord.spread_percent ?? 0
        // BOB_USDC: dividimos → spread SUBE la tasa para penalizar al usuario
        exchangeRateApplied = rateRecord.rate * (1 + spread / 100)
      } else {
        exchangeRateApplied = 6.96
      }
    }

    // Fiat BO → USDC: dividir por tasa (BOB/USD)
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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <FormField
        control={form.control}
        name="amount_origin"
        render={({ field }) => (
          <FormItem>
            <FormLabel className={LABEL_CLASS}>
              Monto inicial en {meta.originCurrency}
            </FormLabel>
            <FormControl>
              <div className="relative">
                <Input
                  {...field}
                  type="number"
                  min={0}
                  step="any"
                  placeholder={`0.00`}
                  disabled={disabled}
                  className={cn(FORM_UNDERLINE_INPUT_CLASS, 'text-lg font-medium tracking-[-0.02em] pr-16')}
                />
                <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                  {meta.originCurrency}
                </span>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {(method === 'fiat_bo' || method === 'crypto') && (
        <FormField
          control={form.control}
          name="wallet_ramp_wallet_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={LABEL_CLASS}>Wallet Bridge destino</FormLabel>
              <Select
                value={field.value ?? ''}
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

      {method === 'crypto' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="wallet_ramp_source_network"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={LABEL_CLASS}>Red de origen</FormLabel>
                <Select
                  value={field.value ?? ''}
                  onValueChange={field.onChange}
                  disabled={disabled}
                >
                  <FormControl>
                    <SelectTrigger className={cn(FORM_UNDERLINE_SELECT_CLASS, FORM_TEXT_CLASS)}>
                      <SelectValue placeholder="Seleccionar red" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CRYPTO_NETWORK_OPTIONS.map((net) => (
                      <SelectItem key={net} value={net}>
                        {CRYPTO_NETWORK_LABELS[net] ?? net}
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
            name="wallet_ramp_source_address"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={LABEL_CLASS}>Dirección de origen</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="0x... / T... / sol..."
                    className={cn(FORM_UNDERLINE_INPUT_CLASS, FORM_TEXT_CLASS, 'font-mono text-xs')}
                    disabled={disabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
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
            existingCurrencies={virtualAccounts.map((va) => va.source_currency)}
            onCreated={onVaCreated}
          />
        </div>
      )}

      {Number(amount) > 0 && (
        <div className="rounded-2xl border border-border/40 bg-muted/20 p-5">
          <p className={cn(LABEL_CLASS, 'mb-4')}>Estimación</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Fee estimado</p>
              <p className="mt-1 text-base font-semibold">
                {estimate.feeTotal.toFixed(2)} <span className="text-xs text-muted-foreground">{meta.originCurrency}</span>
              </p>
            </div>
            {method === 'fiat_bo' && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tipo de cambio</p>
                <p className="mt-1 text-base font-semibold">
                  {estimate.exchangeRateApplied.toFixed(4)} <span className="text-xs text-muted-foreground">BOB/USDC</span>
                </p>
              </div>
            )}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Recibirás aprox.</p>
              <p className="mt-1 text-base font-semibold text-emerald-500">
                {estimate.amountConverted.toFixed(2)} <span className="text-xs">USDC</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
