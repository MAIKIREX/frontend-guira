'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftRight, Loader2, RefreshCw } from 'lucide-react'
import Flag from 'react-world-flags'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useProfileStore } from '@/stores/profile-store'
import { useExchangeRates } from '@/features/payments/hooks/use-exchange-rates'
import { WalletService } from '@/services/wallet.service'
import { PaymentsService } from '@/services/payments.service'
import { GuiraButton } from '@/components/shared/guira-button'

const FORM_LABEL_CLASS = 'text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-muted-foreground'

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
    helperText: 'Cotiza depósitos desde USD hacia bolivianos usando la tasa de venta.',
    rateLabel: 'Tasa de venta',
  },
  enviar: {
    label: 'Retirar Fondos',
    route: 'bolivia_to_exterior',
    originCurrency: 'Bs',
    destinationCurrency: 'USD',
    originLabel: 'TÚ ENVÍAS',
    destinationLabel: 'RECIBES',
    helperText: 'Cotiza salidas desde bolivianos hacia dólares usando la tasa de compra.',
    rateLabel: 'Tasa de compra',
  },
}

export function ClientDashboard() {
  const router = useRouter()
  const { profile } = useProfileStore()
  const { rates, loading, error, reload } = useExchangeRates()
  const [action, setAction] = useState<QuoteAction>('depositar')
  const [amountInput, setAmountInput] = useState('1000')

  const [balanceUSD, setBalanceUSD] = useState(0)
  const [ordersThisMonth, setOrdersThisMonth] = useState(0)
  const [pendingOrders, setPendingOrders] = useState(0)

  useEffect(() => {
    WalletService.getWallets().then(wallets => {
      const list = Array.isArray(wallets) ? wallets : []
      const totalUSD = list.reduce((acc, w) => acc + (w.available_balance || 0), 0)
      setBalanceUSD(totalUSD)
    }).catch(err => {
      console.error('[Dashboard] Error cargando wallets:', err)
    })

    PaymentsService.getOrders({ limit: 50 } as any).then((rawResponse: any) => {
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
      <Card className="mx-auto mt-8 max-w-xl rounded-2xl border-destructive/30 shadow-none">
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
  const estimate = {
    amountConverted: action === 'depositar'
      ? amountOrigin * (sellRate ?? 0)
      : (buyRate ? amountOrigin / buyRate : 0),
  }

  return (
    <div className="mx-auto w-full max-w-screen-lg pb-12 pt-6">

      {/* ── Header ── */}
      <section className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
            Panel de control
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tighter text-foreground leading-none">
            ¡Hola, {userFirstName}!
          </h1>
        </div>

        {/* Compact Rate Ticker */}
        <div className="flex items-center gap-3 self-start rounded-2xl border border-border/60 bg-card px-5 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            <span className="text-[0.65rem] font-extrabold uppercase tracking-[0.14em] text-success">En vivo</span>
          </div>
          <div className="h-3.5 w-px bg-border" />
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              Compra: <span className="font-bold text-foreground">{formatNumber(buyRate)} Bs</span>
            </span>
            <span className="text-muted-foreground">
              Venta: <span className="font-bold text-accent">{formatNumber(sellRate)} Bs</span>
            </span>
          </div>
          <button
            onClick={reload}
            type="button"
            className="ml-1 text-muted-foreground/50 hover:text-foreground transition-colors"
            aria-label="Actualizar tasas"
          >
            <RefreshCw className="size-3.5" />
          </button>
        </div>
      </section>

      {/* ── Bento Grid: 1fr 2fr ── */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-5">

        {/* ── Left: Stats Panel ── */}
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <div className="px-7 pt-7 pb-6 border-b border-border/50">
            <p className={cn(FORM_LABEL_CLASS, 'mb-2.5')}>Balance Total</p>
            <p className="text-[2.2rem] font-extrabold tracking-tighter text-foreground leading-none">
              ${balanceUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-2">USD disponible en tu cuenta</p>
          </div>

          <div className="px-7 py-6 border-b border-border/50">
            <p className={cn(FORM_LABEL_CLASS, 'mb-2.5')}>Operaciones este mes</p>
            <p className="text-[2.2rem] font-extrabold tracking-tighter text-foreground leading-none">
              {ordersThisMonth}
            </p>
            {pendingOrders > 0 ? (
              <p className="text-xs text-warning font-medium mt-2">
                {pendingOrders} pendiente{pendingOrders !== 1 ? 's' : ''} de confirmación
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-2">Sin operaciones pendientes</p>
            )}
          </div>

          <div className="px-7 py-6">
            <p className={cn(FORM_LABEL_CLASS, 'mb-2.5')}>
              Tasa {action === 'depositar' ? 'de venta' : 'de compra'}
            </p>
            <p className="text-[2.2rem] font-extrabold tracking-tighter text-foreground leading-none">
              {formatNumber(visibleBaseRate)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">Bolivianos por dólar</p>
          </div>
        </div>

        {/* ── Right: Quote Calculator ── */}
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          {/* Tabs Header */}
          <div className="border-b border-border/50 px-7 pt-7">
            <h2 className="text-base font-bold text-foreground mb-4">Cotización rápida</h2>
            <div className="flex">
              {(['depositar', 'enviar'] as const).map((item) => (
                <GuiraButton
                  key={item}
                  variant="tab"
                  active={action === item}
                  className="mr-6 pb-3"
                  onClick={() => { setAction(item) }}
                >
                  {ACTION_CONFIG[item].label}
                </GuiraButton>
              ))}
            </div>
          </div>

          <div className="p-7 space-y-3">
            {/* Origin input */}
            <div className="rounded-xl bg-muted/50 px-6 py-5 transition-colors focus-within:bg-muted/80">
              <MoneyField
                currency={config.originCurrency}
                label={config.originLabel}
                onChange={setAmountInput}
                value={amountInput}
              />
            </div>

            {/* Swap arrow */}
            <div className="flex justify-center py-0.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground hover:scale-105 transition-transform cursor-default shadow-sm">
                <ArrowLeftRight className="size-4" />
              </div>
            </div>

            {/* Destination read-only */}
            <div className="rounded-xl border border-border/40 bg-muted/20 px-6 py-5">
              <ReadOnlyField
                currency={config.destinationCurrency}
                label={config.destinationLabel}
                value={estimate.amountConverted}
              />
            </div>

            {/* Helper + CTA */}
            <div className="pt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground leading-relaxed max-w-[44ch]">
                {config.helperText}
              </p>
              <GuiraButton
                arrowNext
                onClick={() => router.push(action === 'depositar' ? '/depositar' : '/enviar')}
                className="self-start sm:self-auto shrink-0"
              >
                Continuar
              </GuiraButton>
            </div>
          </div>
        </div>
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
    <div className="space-y-3">
      <label className={FORM_LABEL_CLASS}>{label}</label>
      <div className="flex items-center justify-between gap-3">
        <Input
          className="h-auto w-full border-0 bg-transparent p-0 text-[2.8rem] md:text-[3.5rem] font-extrabold tracking-tight text-foreground shadow-none focus-visible:ring-0 placeholder:text-muted-foreground"
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
    <div className="space-y-3">
      <label className={FORM_LABEL_CLASS}>{label}</label>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 truncate text-[2.8rem] md:text-[3.5rem] font-extrabold tracking-tight text-foreground">
          {formatNumber(value)}
        </div>
        <CurrencyPill currency={currency} />
      </div>
    </div>
  )
}

function CurrencyPill({ currency }: { currency: string }) {
  const flagCode = currency === 'USD' ? 'US' : 'BO'

  return (
    <div className="flex shrink-0 items-center gap-2 rounded-full bg-background/90 px-3 py-1.5 shadow-sm border border-border/40">
      <div className="flex size-5 items-center justify-center overflow-hidden rounded-full bg-muted">
        <Flag code={flagCode} className="h-full w-full object-cover" />
      </div>
      <span className="text-sm font-bold text-foreground pr-1">{currency}</span>
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
