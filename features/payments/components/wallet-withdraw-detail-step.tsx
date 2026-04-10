import React, { useRef } from 'react'
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
import type { FeeConfigRow } from '@/types/payment-order'

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
  disabled?: boolean
}

export function WalletWithdrawDetailStep({
  form,
  method = 'fiat_bo',
  wallets,
  exchangeRates,
  feesConfig,
  disabled,
}: WalletWithdrawDetailStepProps) {
  const prevEstimateRef = useRef<{ feeTotal: number; exchangeRateApplied: number; amountConverted: number } | null>(null)

  const amount = form.watch('amount_origin')

  const estimate = React.useMemo(() => {
    let feeTotal = 0
    let exchangeRateApplied = 1
    let amountConverted = Number(amount) || 0

    if (method === 'fiat_bo') {
      feeTotal = resolveFeeTotal(feesConfig, Number(amount) || 0, 'bridge_wallet_to_fiat_bo' as any)
      const rateRecord =
        exchangeRates.find((r) => r.pair?.toUpperCase() === 'USDC_BOB') ??
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
            <FormLabel className={LABEL_CLASS}>Monto a retirar (USDC)</FormLabel>
            <FormControl>
              <div className="relative">
                <Input
                  {...field}
                  type="number"
                  min={0}
                  step="any"
                  placeholder="0.00"
                  disabled={disabled}
                  className={cn(FORM_UNDERLINE_INPUT_CLASS, 'text-lg font-medium tracking-[-0.02em] pr-16')}
                />
                <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                  USDC
                </span>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {method === 'fiat_bo' ? (
        <>
          <div className="space-y-1.5 pt-2">
            <p className={cn(LABEL_CLASS, 'text-foreground')}>Cuenta bancaria destino (Bolivia)</p>
            <p className="text-xs text-muted-foreground">
              Los fondos convertidos a bolivianos serán depositados en esta cuenta a través de nuestro PSAV.
            </p>
          </div>

          <FormField
            control={form.control}
            name="withdraw_bank_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={LABEL_CLASS}>Banco</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Ej: Banco Mercantil Santa Cruz"
                    disabled={disabled}
                    className={cn(FORM_UNDERLINE_INPUT_CLASS, FORM_TEXT_CLASS)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="withdraw_account_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL_CLASS}>Número de cuenta</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ej: 4010-123456-001"
                      disabled={disabled}
                      className={cn(FORM_UNDERLINE_INPUT_CLASS, FORM_TEXT_CLASS, 'font-mono')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="withdraw_account_holder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL_CLASS}>Titular de la cuenta</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Nombre completo del beneficiario"
                      disabled={disabled}
                      className={cn(FORM_UNDERLINE_INPUT_CLASS, FORM_TEXT_CLASS)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </>
      ) : method === 'crypto' ? (
        <>
          <div className="space-y-1.5 pt-2">
            <p className={cn(LABEL_CLASS, 'text-foreground')}>Wallet externa destino</p>
            <p className="text-xs text-muted-foreground">
              Ingresa la dirección cripto para transferir vía on-chain.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="crypto_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL_CLASS}>Dirección Cripto</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ej: 0x..."
                      disabled={disabled}
                      className={cn(FORM_UNDERLINE_INPUT_CLASS, FORM_TEXT_CLASS, 'font-mono')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="crypto_network"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL_CLASS}>Red</FormLabel>
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
                      <SelectItem value="polygon">Polygon</SelectItem>
                      <SelectItem value="ethereum">Ethereum</SelectItem>
                      <SelectItem value="arbitrum">Arbitrum</SelectItem>
                      <SelectItem value="optimism">Optimism</SelectItem>
                      <SelectItem value="base">Base</SelectItem>
                      <SelectItem value="tron">Tron</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </>
      ) : method === 'fiat_us' ? (
        <div className="space-y-1.5 pt-2">
           <p className={cn(LABEL_CLASS, 'text-foreground')}>Cuenta Bancaria EE. UU.</p>
           <p className="border-l-2 border-border/70 bg-muted/10 px-4 py-4 text-sm text-muted-foreground">
             Selecciona el proveedor con cuenta externa bancaria (ACH/Wire) registrada desde el selector de abajo. Solo se muestran proveedores con cuenta bancaria estadounidense vinculada a Bridge.
           </p>
        </div>
      ) : null}

      {/* Estimación en vivo */}
      {Number(amount) > 0 && (
        <div className="rounded-2xl border border-border/40 bg-muted/20 p-5">
          <p className={cn(LABEL_CLASS, 'mb-4')}>Estimación de retiro</p>
          <div className={cn('grid gap-4 text-center', method === 'fiat_bo' ? 'grid-cols-3' : 'grid-cols-2')}>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Fee estimado</p>
              <p className="mt-1 text-base font-semibold">
                {estimate.feeTotal.toFixed(2)} <span className="text-xs text-muted-foreground">USDC</span>
              </p>
            </div>
            {method === 'fiat_bo' ? (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tipo de cambio</p>
                <p className="mt-1 text-base font-semibold">
                  {estimate.exchangeRateApplied.toFixed(4)} <span className="text-xs text-muted-foreground">BOB/USDC</span>
                </p>
              </div>
            ) : null}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Recibirás aprox.</p>
              <p className="mt-1 text-base font-semibold text-emerald-500">
                {estimate.amountConverted.toFixed(2)} <span className="text-xs">{method === 'fiat_bo' ? 'BOB' : method === 'fiat_us' ? 'USD' : 'USDC'}</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
