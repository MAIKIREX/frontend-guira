'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, ArrowLeftRight, Loader2, RefreshCw } from 'lucide-react'
import Flag from 'react-world-flags'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useProfileStore } from '@/stores/profile-store'
import { useExchangeRates } from '@/features/payments/hooks/use-exchange-rates'
import { WalletService } from '@/services/wallet.service'
import { PaymentsService } from '@/services/payments.service'

const FORM_LABEL_CLASS = 'text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground'

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
    label: 'Depositar / Enviar',
    route: 'us_to_bolivia',
    originCurrency: 'USD',
    destinationCurrency: 'Bs',
    originLabel: 'TÚ ENVÍAS',
    destinationLabel: 'RECIBES',
    helperText: 'Cotiza depositos desde USD hacia bolivianos usando la tasa de venta.',
    rateLabel: 'Tasa de venta',
  },
  enviar: {
    label: 'Retirar Fondos',
    route: 'bolivia_to_exterior',
    originCurrency: 'Bs',
    destinationCurrency: 'USD',
    originLabel: 'TÚ ENVÍAS',
    destinationLabel: 'RECIBES',
    helperText: 'Cotiza salidas desde bolivianos hacia dolares usando la tasa de compra.',
    rateLabel: 'Tasa de compra',
  },
}

export function ClientDashboard() {
  const { profile } = useProfileStore()
  const { rates, loading, error, reload } = useExchangeRates()
  const [action, setAction] = useState<QuoteAction>('depositar')
  const [amountInput, setAmountInput] = useState('1000')
  
  // Dynamic stats
  const [balanceUSD, setBalanceUSD] = useState(0)
  const [ordersThisMonth, setOrdersThisMonth] = useState(0)
  const [pendingOrders, setPendingOrders] = useState(0)

  useEffect(() => {
    // Balance: usar getWallets() que es el endpoint probado (/wallets)
    // getBalances() (/wallets/balances) puede no estar implementado o retornar vacío
    WalletService.getWallets().then(wallets => {
       const list = Array.isArray(wallets) ? wallets : []
       const totalUSD = list.reduce((acc, w) => acc + (w.available_balance || 0), 0)
       setBalanceUSD(totalUSD)
    }).catch(err => {
       console.error('[Dashboard] Error cargando wallets:', err)
    })

    // Órdenes: el backend retorna { data: [...], total, page, limit }
    // Pedir limit=50 para capturar más órdenes del mes actual
    PaymentsService.getOrders({ limit: 50 } as any).then((rawResponse: any) => {
       // Normalizar: puede ser array plano o wrapper paginado
       let orders: any[] = []
       let totalFromBackend = 0

       if (Array.isArray(rawResponse)) {
         orders = rawResponse
         totalFromBackend = rawResponse.length
       } else if (rawResponse && typeof rawResponse === 'object') {
         orders = Array.isArray(rawResponse.data) ? rawResponse.data
                : Array.isArray(rawResponse.items) ? rawResponse.items
                : []
         totalFromBackend = rawResponse.total ?? orders.length
       }

       // Filtrar por mes actual
       const now = new Date()
       const thisMonth = orders.filter((o: any) => {
          if (!o.created_at) return false
          const d = new Date(o.created_at)
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
       })
       setOrdersThisMonth(thisMonth.length > 0 ? thisMonth.length : totalFromBackend)
       const pendingStatuses = ['pending', 'created', 'processing', 'waiting_deposit', 'deposit_received']
       setPendingOrders(orders.filter((o: any) => pendingStatuses.includes(o.status)).length)
    }).catch(err => {
       console.error('[Dashboard] Error cargando órdenes:', err)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="mx-auto mt-8 max-w-xl rounded-md border-destructive/30 shadow-none">
        <CardContent className="space-y-4 pt-6 text-center">
          <p className="text-lg font-semibold">No se pudo cargar el panel</p>
          <p className="text-sm text-muted-foreground">
            Verifica tu conexión con el backend. Las tasas de cambio no están disponibles.
          </p>
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
  const amountToConvert = amountOrigin
  const estimate = {
    feeTotal: 0,
    amountConverted: action === 'depositar'
      ? amountOrigin * (sellRate ?? 0)
      : (buyRate ? amountOrigin / buyRate : 0),
    exchangeRateApplied: action === 'depositar' ? (sellRate ?? 0) : (buyRate ?? 0),
  }
  const feePercent = 0.5

  return (
    <div className="mx-auto w-full max-w-screen-lg space-y-10 px-4 pb-12 pt-6">
      {/* ── Header ──────────────────────────────────── */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            PANEL
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-[2.5rem]">
            ¡Hola, {userFirstName}!
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[11px] italic text-muted-foreground">Actualizado hace 2 min</span>
          <Button
            onClick={reload}
            type="button"
            variant="outline"
            className="h-9 rounded-md border-accent/30 px-4 text-xs font-semibold text-accent hover:bg-accent/5"
          >
            <RefreshCw className="mr-2 size-3.5" />
            Actualizar
          </Button>
        </div>
      </section>

      {/* ── Live Rate Ticker Bar ───────────────────── */}
      <section className="flex flex-wrap items-center justify-between rounded-sm bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-4">
          <span className="text-xs font-medium text-muted-foreground">
            Tipo de cambio en vivo
          </span>
          <div className="h-4 w-px bg-border/80" />
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <span>
              Buy: 1 USD = <span className="font-bold text-primary">{formatNumber(buyRate)} Bs</span>
            </span>
            <span>
              Sell: 1 USD = <span className="font-bold text-success">{formatNumber(sellRate)} Bs</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-success">
          <div className="size-1.5 animate-pulse rounded-full bg-success" />
          EN VIVO
        </div>
      </section>

      {/* ── Cotización Rápida ──────────────────────── */}
      <section className="space-y-6">
        <h2 className="text-lg font-medium text-foreground md:text-xl">Cotización rápida</h2>

        {/* Tabs */}
        <div className="flex border-b border-border/50">
          {(['depositar', 'enviar'] as const).map((item) => (
            <button
              key={item}
              className={cn(
                'relative pb-3 text-sm transition-colors px-1',
                item === 'depositar' ? 'mr-6' : '',
                action === item
                  ? 'text-accent font-medium after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-accent'
                  : 'text-muted-foreground hover:text-foreground font-normal'
              )}
              onClick={() => { setAction(item) }}
              type="button"
            >
              {ACTION_CONFIG[item].label}
            </button>
          ))}
        </div>

        {/* Inputs (No Cards) */}
        <div className="relative flex flex-col items-center gap-4 md:flex-row md:items-stretch py-2">
          {/* Origin */}
          <div className="flex-1 rounded-lg bg-muted/60 p-6 md:p-8 w-full transition-all focus-within:bg-muted">
            <MoneyField
              currency={config.originCurrency}
              label={config.originLabel}
              onChange={setAmountInput}
              value={amountInput}
            />
          </div>

          {/* Center Arrow */}
          <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md z-10 hidden md:flex hover:scale-105 transition-transform cursor-pointer">
            <ArrowLeftRight className="size-5" />
          </div>

          {/* Mobile Arrow */}
          <div className="md:hidden flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md -my-7 z-10 hover:scale-105 transition-transform cursor-pointer">
            <ArrowLeftRight className="size-4 rotate-90" />
          </div>

          {/* Destination */}
          <div className="flex-1 rounded-lg bg-muted/60 p-6 md:p-8 w-full transition-all">
            <ReadOnlyField
              currency={config.destinationCurrency}
              label={config.destinationLabel}
              value={estimate.amountConverted}
            />
          </div>
        </div>

        {/* Summary Details Row */}
        <div className="flex flex-wrap items-center justify-between gap-y-4 py-2 border-b border-border/50 pb-6">
          <div className="flex flex-wrap items-center gap-6 md:gap-10">
            <DetailItem label="Comisión:" value={`${feePercent}%`} />
            <div className="h-8 w-px bg-border/80 hidden sm:block" />
            <DetailItem label="Tasa final:" value={`${formatNumber(visibleBaseRate)} Bs`} bold />
            <div className="h-8 w-px bg-border/80 hidden sm:block" />
            <DetailItem
              label="Recibes:"
              value={`${formatNumber(estimate.amountConverted)} Bs`}
              bold
              accent
            />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            COTIZACIÓN GARANTIZADA POR 5:00 MIN
          </span>
        </div>

        {/* CTA */}
        <div className="pt-2">
          <Button
            type="button"
            className="h-[52px] rounded-md bg-primary px-8 text-[15px] font-normal text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Iniciar operación
            <ArrowRight className="ml-2.5 size-4 opacity-80" />
          </Button>
        </div>
      </section>

      {/* ── Bottom Stats Row ───────────────────────────── */}
      <div className="pt-12">
        <section className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-12">
          <StatItem
            label="BALANCE TOTAL USD"
            value={`$${balanceUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            sub="+2.4% vs mes anterior"
            subColor="text-success"
          />
          <div className="hidden sm:block w-px self-stretch bg-border/60" />
          <StatItem
            label="OPERACIONES ESTE MES"
            value={ordersThisMonth.toString()}
            sub={`${pendingOrders} pendientes de confirmación`}
          />
          <div className="hidden sm:block w-px self-stretch bg-border/60" />
          <StatItem
            label="TASA PROMEDIO"
            value={`${formatNumber(visibleBaseRate)} Bs`}
            sub="Eficiencia del 98.2%"
            subColor="text-primary"
          />
        </section>
      </div>
    </div>
  )
}

/* ───────────────────────────────────────────────
   Sub-components
   ─────────────────────────────────────────────── */

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
    <div className="space-y-4">
      <label className={cn(FORM_LABEL_CLASS)}>{label}</label>
      <div className="flex items-center justify-between gap-3">
        <Input
          className="h-auto w-full border-0 bg-transparent p-0 text-[2.5rem] md:text-[3rem] font-bold tracking-tight text-foreground shadow-none focus-visible:ring-0 placeholder:text-muted-foreground"
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
    <div className="space-y-4">
      <label className={cn(FORM_LABEL_CLASS)}>{label}</label>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 truncate text-[2.5rem] md:text-[3rem] font-bold tracking-tight text-foreground">
          {formatNumber(value)}
        </div>
        <CurrencyPill currency={currency} />
      </div>
    </div>
  )
}

function CurrencyPill({ currency }: { currency: string }) {
  // Determine flag code based on currency
  const flagCode = currency === 'USD' ? 'US' : 'BO' // Using BO (Bolivia) for Bs
  
  return (
    <div className="flex shrink-0 items-center gap-2 rounded-full bg-background/90 px-3 py-1.5 shadow-sm border border-border/40">
      <div className="flex size-5 items-center justify-center overflow-hidden rounded-full bg-muted">
        <Flag code={flagCode} className="h-full w-full object-cover" />
      </div>
      <span className="text-[13px] font-semibold text-foreground pr-1">{currency}</span>
    </div>
  )
}

function DetailItem({
  label,
  value,
  bold,
  accent,
}: {
  label: string
  value: string
  bold?: boolean
  accent?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span
        className={cn(
          'text-sm',
          bold ? 'font-bold' : 'font-semibold',
          accent ? 'text-success' : 'text-foreground'
        )}
      >
        {value}
      </span>
    </div>
  )
}

function StatItem({
  label,
  value,
  sub,
  subColor,
}: {
  label: string
  value: string
  sub: string
  subColor?: string
}) {
  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <p className="text-[1.75rem] md:text-[2rem] font-medium tracking-tight text-foreground">{value}</p>
      <p className={cn('text-[11px] font-medium', subColor ?? 'text-muted-foreground')}>{sub}</p>
    </div>
  )
}

function parseAmount(value: string) {
  if (!value.trim()) return 0
  const normalized = Number(value.replace(',', '.'))
  return Number.isFinite(normalized) ? normalized : 0
}

function formatNumber(value: number | null) {
  const normalized = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return normalized.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
