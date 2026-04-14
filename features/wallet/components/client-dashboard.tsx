'use client'

import { useState } from 'react'
import { ArrowLeftRight, BadgeDollarSign, Loader2, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useProfileStore } from '@/stores/profile-store'
import { useExchangeRates } from '@/features/payments/hooks/use-exchange-rates'

const FORM_LABEL_CLASS = 'text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground'
const FORM_UNDERLINE_INPUT_CLASS = 'h-11 rounded-none border-0 border-b border-input bg-transparent px-0 py-0 shadow-none transition-colors focus-within:border-primary focus-visible:ring-0 disabled:bg-transparent'

type QuoteAction = 'depositar' | 'enviar'

const ACTION_CONFIG: Record<
  QuoteAction,
  {
    label: string
    route: 'us_to_bolivia' | 'bolivia_to_exterior'
    originCurrency: 'USD' | 'Bs'
    destinationCurrency: 'Bs' | 'USD'
    originLabel: string
    destinationLabel: string
    helperText: string
    rateLabel: string
  }
> = {
  depositar: {
    label: 'Depositar',
    route: 'us_to_bolivia',
    originCurrency: 'USD',
    destinationCurrency: 'Bs',
    originLabel: 'Depositas',
    destinationLabel: 'Recibes',
    helperText: 'Cotiza depositos desde USD hacia bolivianos usando la tasa de venta.',
    rateLabel: 'Tasa de venta',
  },
  enviar: {
    label: 'Enviar',
    route: 'bolivia_to_exterior',
    originCurrency: 'Bs',
    destinationCurrency: 'USD',
    originLabel: 'Envias',
    destinationLabel: 'Recibe destino',
    helperText: 'Cotiza salidas desde bolivianos hacia dolares usando la tasa de compra.',
    rateLabel: 'Tasa de compra',
  },
}

export function ClientDashboard() {
  const { profile } = useProfileStore()
  const { rates, loading, error, reload } = useExchangeRates()
  const [action, setAction] = useState<QuoteAction>('depositar')
  const [amountInput, setAmountInput] = useState('0')

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="rounded-md border-destructive/30 shadow-none">
        <CardHeader>
          <CardTitle>No se pudo cargar el panel</CardTitle>
          <CardDescription>
            Verifica tu conexión con el backend. Las tasas de cambio no están disponibles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={reload} type="button">
            Reintentar
          </Button>
        </CardContent>
      </Card>
    )
  }

  const userFirstName = profile?.full_name?.split(' ')[0] ?? 'Usuario'
  const config = ACTION_CONFIG[action]
  const amountOrigin = parseAmount(amountInput)
  const buyRate = rates.buyRate
  const sellRate = rates.sellRate
  const visibleBaseRate = action === 'depositar' ? (sellRate ?? 0) : (buyRate ?? 0)
  // Estimación local simple: sin fees del backend por ahora
  const amountToConvert = amountOrigin
  const estimate = {
    feeTotal: 0,
    amountConverted: action === 'depositar'
      ? amountOrigin * (sellRate ?? 0)
      : (buyRate ? amountOrigin / buyRate : 0),
    exchangeRateApplied: action === 'depositar' ? (sellRate ?? 0) : (buyRate ?? 0),
  }

  return (
    <div className="space-y-6 md:space-y-10 lg:px-12 xl:px-32">
      <section className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80 md:text-xs">
          Panel
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
          ¡Hola, {userFirstName}!
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
          Bienvenido de nuevo a tu panel de Guira. Cotiza tus operaciones con las tasas actualizadas.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <Card className="rounded-xl border-border/70 shadow-none">
          <CardHeader className="space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-xl md:text-2xl">Calculadora de cotizacion</CardTitle>
                <CardDescription className="mt-1">{config.helperText}</CardDescription>
              </div>
              <Button onClick={reload} type="button" variant="outline" className="h-9 rounded-md px-3 text-xs md:h-10 md:px-4 md:text-sm">
                <RefreshCw className="mr-2 size-3.5" />
                Actualizar
              </Button>
            </div>

            <div className="inline-flex w-full rounded-lg bg-muted p-1 sm:w-fit">
              {(['depositar', 'enviar'] as const).map((item) => (
                <button
                  key={item}
                  className={cn(
                    'flex-1 rounded-md px-4 py-2 text-xs font-semibold transition-all sm:flex-none sm:px-8 sm:text-sm',
                    action === item
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => { setAction(item) }}
                  type="button"
                >
                  {ACTION_CONFIG[item].label}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="space-y-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-end">
              <MoneyField
                currency={config.originCurrency}
                label={config.originLabel}
                onChange={setAmountInput}
                value={amountInput}
              />

              <div className="flex justify-center lg:pb-3">
                <div className="rounded-full border border-border/70 bg-background p-2.5 text-muted-foreground shadow-sm">
                  <ArrowLeftRight className="size-4 lg:size-5" />
                </div>
              </div>

              <ReadOnlyField
                currency={config.destinationCurrency}
                label={config.destinationLabel}
                value={estimate.amountConverted}
              />
            </div>

            <div className="rounded-md border border-primary/15 bg-primary/5 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-medium text-foreground">{config.rateLabel}</span>
                <span className="font-semibold text-primary">
                  1 USD = {formatNumber(visibleBaseRate)} Bs
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/70 shadow-none">
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl">Resumen de la transaccion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <SummaryRow
                label={config.originLabel}
                value={formatMoney(amountOrigin, config.originCurrency)}
              />
              <SummaryRow
                label="Comisiones"
                value={formatMoney(estimate.feeTotal, config.originCurrency)}
              />
              <SummaryRow
                description="Monto neto despues del fee antes de aplicar el cambio."
                label="Cantidad a convertir"
                value={formatMoney(amountToConvert, config.originCurrency)}
              />
              <SummaryRow
                label="Tipo de cambio base (Mercado)"
                value={formatExchangeRate(
                  action === 'depositar' ? (rates.sellBaseRate ?? 0) : (rates.buyBaseRate ?? 0),
                  config.originCurrency,
                  config.destinationCurrency
                )}
              />
              <SummaryRow
                label="Spread aplicado"
                value={`${formatNumber(action === 'depositar' ? rates.sellSpread : rates.buySpread)} %`}
              />
              <SummaryRow
                label="Tipo de cambio final"
                value={formatExchangeRate(
                  estimate.exchangeRateApplied,
                  config.originCurrency,
                  config.destinationCurrency
                )}
              />
            </div>

            <Separator className="bg-border/50" />

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Total estimado a recibir</p>
              <p className="text-3xl font-bold tracking-tight text-primary md:text-4xl">
                {formatMoney(estimate.amountConverted, config.destinationCurrency)}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-xl border-border/70 shadow-none">
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl md:text-2xl">Valor actual del dolar</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Tasas de referencia para operaciones en tiempo real.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700 w-fit">
            <div className="size-1.5 animate-pulse rounded-full bg-emerald-500"></div>
            En vivo
          </div>
        </CardHeader>

        <CardContent className="grid gap-6 sm:grid-cols-2">
          <RateCard
            accent="buy"
            description="Tasa aplicada al enviar desde BOB."
            icon={TrendingUp}
            label="Compra de USD"
            value={buyRate}
          />
          <RateCard
            accent="sell"
            description="Tasa aplicada al depositar USD."
            icon={TrendingDown}
            label="Venta de USD"
            value={sellRate}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function MoneyField({
  label,
  value,
  currency,
  onChange,
}: {
  label: string
  value: string
  currency: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <label className={cn(FORM_LABEL_CLASS)}>{label}</label>
      <div className="flex items-center gap-3 border-b border-input py-2 transition-all focus-within:border-primary">
        <Input
          className="h-9 border-0 bg-transparent p-0 text-2xl font-bold shadow-none focus-visible:ring-0 md:h-12 md:text-3xl"
          inputMode="decimal"
          onChange={(event) => {
            onChange(event.target.value)
          }}
          placeholder="0.00"
          value={value}
        />
        <CurrencyPill currency={currency} />
      </div>
    </div>
  )
}

function ReadOnlyField({
  label,
  value,
  currency,
}: {
  label: string
  value: number
  currency: string
}) {
  return (
    <div className="space-y-2">
      <label className={cn(FORM_LABEL_CLASS)}>{label}</label>
      <div className="flex items-center gap-3 border-b border-input py-2 transition-all focus-within:border-primary">
        <div className="min-w-0 flex-1 py-1 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {formatNumber(value)}
        </div>
        <CurrencyPill currency={currency} />
      </div>
    </div>
  )
}

function CurrencyPill({ currency }: { currency: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-xs font-bold text-muted-foreground">
      <BadgeDollarSign className="size-3.5" />
      <span>{currency}</span>
    </div>
  )
}

function SummaryRow({
  label,
  value,
  description,
}: {
  label: string
  value: string
  description?: string
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description ? (
          <p className="text-xs leading-5 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <p className="text-right text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}

function RateCard({
  label,
  description,
  value,
  icon: Icon,
  accent,
}: {
  label: string
  description: string
  value: number | null
  icon: typeof TrendingUp
  accent: 'buy' | 'sell'
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border p-6 transition-all duration-300',
        accent === 'buy'
          ? 'border-sky-200/60 bg-gradient-to-br from-sky-50/80 to-background dark:border-sky-500/20 dark:from-sky-500/10 dark:to-background'
          : 'border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 to-background dark:border-emerald-500/20 dark:from-emerald-500/10 dark:to-background'
      )}
    >
      <div className="mb-5 flex items-center gap-4">
        <div
          className={cn(
            'flex size-10 items-center justify-center rounded-md',
            accent === 'buy' && 'bg-sky-100/80 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400',
            accent === 'sell' && 'bg-emerald-100/80 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
          )}
        >
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-foreground/80">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="space-y-1">
        <p
          className={cn(
            'text-4xl font-bold tracking-tight',
            accent === 'buy' && 'text-sky-700 dark:text-sky-400',
            accent === 'sell' && 'text-emerald-700 dark:text-emerald-400'
          )}
        >
          {formatNumber(value)}
        </p>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          BOB por 1 USD
        </p>
      </div>

      <div
        className={cn(
          'absolute -right-4 -top-4 size-24 transform rounded-full opacity-[0.03] transition-transform group-hover:scale-110',
          accent === 'buy' ? 'bg-sky-500' : 'bg-emerald-500'
        )}
      />
    </div>
  )
}

// getNumericSetting eliminado — las tasas ahora vienen de useExchangeRates

function parseAmount(value: string) {
  if (!value.trim()) return 0
  const normalized = Number(value.replace(',', '.'))
  return Number.isFinite(normalized) ? normalized : 0
}



function formatNumber(value: number | null) {
  const normalized = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return normalized.toFixed(2)
}

function formatMoney(value: number, currency: string) {
  return `${formatNumber(value)} ${currency}`
}

function formatExchangeRate(value: number, originCurrency: string, destinationCurrency: string) {
  return `1 USD = ${formatNumber(value)} Bs`
}
