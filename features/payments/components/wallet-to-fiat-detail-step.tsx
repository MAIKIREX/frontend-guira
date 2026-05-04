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
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { resolveFeeTotal, type ExchangeRateRecord } from '@/features/payments/lib/deposit-instructions'
import type { FeeConfigRow } from '@/types/payment-order'
import { CRYPTO_CURRENCY_LABELS } from '@/lib/guira-crypto-config'
import { EstimationSummary } from '@/components/shared/estimation-summary'

// ── constantes visuales idénticas a WalletWithdrawDetailStep ──
const LABEL_CLASS = 'text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground'
const FORM_TEXT_CLASS = 'tracking-[0.01em]'
const FORM_UNDERLINE_INPUT_CLASS =
  'h-11 rounded-none border-0 border-b border-input bg-transparent px-0 py-0 shadow-none transition-colors focus-visible:border-primary focus-visible:ring-0 disabled:bg-transparent'
const FORM_UNDERLINE_SELECT_CLASS =
  'h-11 w-full rounded-none border-0 border-b border-input bg-transparent px-0 py-0 shadow-none transition-colors focus-visible:border-primary focus-visible:ring-0'

// Redes on-chain válidas (deben coincidir con WALLET_TO_FIAT_ALLOWED_NETWORKS en el backend)
const WALLET_TO_FIAT_NETWORKS = [
  { value: 'ethereum', label: 'Ethereum (ETH)' },
  { value: 'solana',   label: 'Solana (SOL)' },
  { value: 'tron',     label: 'Tron (TRX)' },
  { value: 'polygon',  label: 'Polygon (MATIC)' },
  { value: 'stellar',  label: 'Stellar (XLM)' },
] as const

// Tokens disponibles para enviar on-chain vía Bridge
const SOURCE_CURRENCIES = ['usdc', 'usdt'] as const

interface WalletToFiatDetailStepProps {
  form: any
  feesConfig: FeeConfigRow[]
  exchangeRates?: ExchangeRateRecord[]
  disabled?: boolean
}

export function WalletToFiatDetailStep({
  form,
  feesConfig,
  disabled,
}: WalletToFiatDetailStepProps) {
  const prevEstimateRef = useRef<{ feeTotal: number; amountConverted: number } | null>(null)

  const amount = form.watch('amount_origin')
  const sourceNetwork: string = form.watch('wallet_to_fiat_source_network') ?? ''
  const sourceCurrency: string = form.watch('wallet_to_fiat_source_currency') ?? ''
  const displayCurrency = sourceCurrency ? sourceCurrency.toUpperCase() : 'CRYPTO'

  // ── Estimación en vivo ──
  const estimate = React.useMemo(() => {
    const feeTotal = resolveFeeTotal(feesConfig, Number(amount) || 0, 'wallet_to_fiat' as any)
    const amountConverted = Math.max((Number(amount) || 0) - feeTotal, 0)
    return { feeTotal, amountConverted }
  }, [amount, feesConfig])

  React.useEffect(() => {
    const prev = prevEstimateRef.current
    if (
      prev &&
      prev.feeTotal === estimate.feeTotal &&
      prev.amountConverted === estimate.amountConverted
    ) return
    prevEstimateRef.current = estimate
    form.setValue('fee_total', estimate.feeTotal, { shouldValidate: false, shouldDirty: false, shouldTouch: false })
    form.setValue('amount_converted', estimate.amountConverted, { shouldValidate: false, shouldDirty: false, shouldTouch: false })
  }, [estimate, form])

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">

      {/* ─────────────────────────────────────────────
          SECCIÓN 1: Origen on-chain
      ───────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <p className={cn(LABEL_CLASS, 'text-foreground')}>Wallet on-chain origen</p>
        <p className="border-l-2 border-border/70 bg-muted/10 px-4 py-4 text-sm text-muted-foreground">
          Indica la red, el token y la dirección desde la cual enviarás los fondos.
          Bridge la usará también como dirección de retorno en caso de error.
        </p>
      </div>

      {/* Red de origen */}
      <FormField
        control={form.control}
        name="wallet_to_fiat_source_network"
        render={({ field }) => (
          <FormItem>
            <FormLabel className={LABEL_CLASS}>Red de origen</FormLabel>
            <Select
              value={field.value || null}
              onValueChange={field.onChange}
              disabled={disabled}
            >
              <FormControl>
                <SelectTrigger className={cn(FORM_UNDERLINE_SELECT_CLASS, FORM_TEXT_CLASS)}>
                  <SelectValue placeholder="Seleccionar red" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {WALLET_TO_FIAT_NETWORKS.map((net) => (
                  <SelectItem key={net.value} value={net.value}>
                    {net.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Token de origen */}
      <FormField
        control={form.control}
        name="wallet_to_fiat_source_currency"
        render={({ field }) => (
          <FormItem>
            <FormLabel className={LABEL_CLASS}>Token a enviar</FormLabel>
            <Select
              value={field.value || null}
              onValueChange={field.onChange}
              disabled={disabled || !sourceNetwork}
            >
              <FormControl>
                <SelectTrigger className={cn(FORM_UNDERLINE_SELECT_CLASS, FORM_TEXT_CLASS)}>
                  <SelectValue placeholder={!sourceNetwork ? 'Selecciona red primero' : 'Seleccionar token'} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {SOURCE_CURRENCIES.map((cur) => (
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

      {/* Monto a enviar */}
      <FormField
        control={form.control}
        name="amount_origin"
        render={({ field }) => (
          <FormItem className="flex flex-col items-center justify-center space-y-2 pb-2 pt-4">
            <FormLabel className={cn(LABEL_CLASS, 'text-center')}>Monto a enviar ({displayCurrency})</FormLabel>
            <FormControl>
              <div className="relative flex w-full max-w-[240px] md:max-w-[320px] mx-auto items-center justify-center">
                <Input
                  {...field}
                  type="number"
                  min={0}
                  step="any"
                  placeholder="0.00"
                  disabled={disabled}
                  className="h-auto w-full p-0 border-none bg-transparent text-center text-5xl font-semibold tracking-[-0.04em] shadow-none focus-visible:ring-0 md:text-6xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="absolute left-full ml-2 md:ml-4 bottom-2 md:bottom-3 text-xl md:text-2xl font-medium text-muted-foreground">
                  {displayCurrency}
                </span>
              </div>
            </FormControl>
            <FormMessage className="text-center" />
          </FormItem>
        )}
      />

      {/* Dirección on-chain de origen */}
      <FormField
        control={form.control}
        name="wallet_to_fiat_source_address"
        render={({ field }) => (
          <FormItem>
            <FormLabel className={LABEL_CLASS}>Dirección on-chain de origen</FormLabel>
            <FormControl>
              <Input
                {...field}
                value={field.value ?? ''}
                placeholder="Ej. D9TSXfYjkJver3TCqHgcVnFKcB4rP99RFRvqvNtauhkT"
                disabled={disabled}
                className={cn(FORM_UNDERLINE_INPUT_CLASS, FORM_TEXT_CLASS, 'font-mono text-xs')}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* ─────────────────────────────────────────────
          SECCIÓN 2: Cuenta Bancaria destino — descripción informativa
          (el selector de proveedor lo maneja el form principal)
      ───────────────────────────────────────────── */}
      <div className="space-y-1.5 pt-2">
        <p className={cn(LABEL_CLASS, 'text-foreground')}>Cuenta Bancaria EE. UU.</p>
        <p className="border-l-2 border-border/70 bg-muted/10 px-4 py-4 text-sm text-muted-foreground">
          Selecciona el proveedor con cuenta externa bancaria (ACH/Wire) registrada desde el selector
          de abajo. Solo se muestran proveedores con cuenta bancaria estadounidense vinculada a Bridge.
        </p>
      </div>

      {/* ─────────────────────────────────────────────
          Estimación en vivo
      ───────────────────────────────────────────── */}
      <EstimationSummary
        amountOrigin={Number(amount) || 0}
        originCurrency={displayCurrency}
        feeTotal={estimate.feeTotal}
        receivesApprox={estimate.amountConverted}
        receivesCurrency="USD"
      />
    </div>
  )
}
