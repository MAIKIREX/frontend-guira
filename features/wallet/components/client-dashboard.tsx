'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowDownUp,
  TrendingDown,
  TrendingUp,
  Activity,
  Clock,
} from 'lucide-react'
import { GuiraLoadingInline } from '@/components/shared/guira-loading'
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
import { BalanceLineChart } from './balance-line-chart'
import { RecentActivityCard } from './recent-activity-card'
import { MonthlyFlowsCard } from './monthly-flows-card'
import { GlobalPaymentFlowCard } from './global-payment-flow-card'

/* ── Framer Motion orchestration ── */
const SPRING = { type: 'spring' as const, stiffness: 100, damping: 20 }

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}

const fadeSlideUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: SPRING },
}

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

export function ClientDashboard({ children }: { children?: React.ReactNode }) {
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
        <GuiraLoadingInline />
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

  const config = ACTION_CONFIG[action]
  const amountOrigin = parseAmount(amountInput)
  const buyRate = rates.buyRate
  const sellRate = rates.sellRate
  const estimate = {
    amountConverted: action === 'depositar'
      ? amountOrigin * (sellRate ?? 0)
      : (buyRate ? amountOrigin / buyRate : 0),
  }

  // Format integer and decimal parts of balance for styling
  const balanceInt = Math.floor(balanceUSD).toLocaleString('en-US')
  const balanceDec = (balanceUSD % 1).toFixed(2).substring(1) // gets ".00"

  return (
    <motion.div
      className="mx-auto w-full max-w-screen-xl pb-12"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >

      {/* ══════════════════════════════════════════════
          ROW 1: Panorama de cuentas + Posición neta
         ══════════════════════════════════════════════ */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3 mb-3"
        variants={fadeSlideUp}
      >
        {/* Card 1: Balance Operativo Total */}
        <div className="bg-card border border-border rounded-2xl shadow-[0_8px_24px_rgba(15,23,42,0.04)] p-6 pb-5">
          {/* Header: blue dot + title */}
          <div className="flex items-center gap-2 mb-5">
            <span className="inline-block size-2 rounded-full bg-primary" />
            <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/80">
              Balance Operativo Total
            </h3>
          </div>

          {/* Amount: large split typography */}
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-[2.75rem] leading-none font-extrabold tracking-tighter text-foreground tabular-nums">
              ${balanceInt}
            </span>
            <span className="text-lg font-semibold text-muted-foreground/40 tabular-nums leading-none">
              {balanceDec}
            </span>
            <span className="text-sm font-semibold text-muted-foreground/50 ml-1 self-start mt-1.5">
              USD
            </span>
          </div>

          {/* Chart: full width below amount */}
          <div className="mt-4 -mx-2">
            <BalanceLineChart currentBalance={balanceUSD} />
          </div>

          {/* Stat pills */}
          <div className="flex flex-wrap items-center gap-2.5 mt-4 pt-4 border-t border-border/40">
            <div className="flex items-center gap-2 rounded-full border border-border/50 bg-muted/15 px-4 py-2">
              <TrendingUp className="size-3.5 text-[#16C784]" />
              <span className="text-[12px] font-bold tabular-nums text-foreground">{ordersThisMonth}</span>
              <span className="text-[11px] text-muted-foreground font-medium">operaciones este mes</span>
            </div>
            {pendingOrders > 0 && (
              <div className="flex items-center gap-2 rounded-full border border-destructive/15 bg-destructive/5 px-4 py-2">
                <Clock className="size-3.5 text-destructive" />
                <span className="text-[12px] font-bold tabular-nums text-destructive">{pendingOrders}</span>
                <span className="text-[11px] text-destructive/70 font-medium">pendientes</span>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Posición neta */}
        <div className="bg-card border border-border rounded-2xl shadow-[0_8px_24px_rgba(15,23,42,0.04)] p-6">
          <h3 className="text-sm font-bold text-foreground mb-0.5">Posición neta (USD)</h3>
          <p className="text-xs text-muted-foreground mb-4">Este mes</p>

          <div className="flex items-baseline gap-1.5 mb-3">
            <span className={cn(
              "text-3xl font-bold tracking-tight tabular-nums",
              balanceUSD >= 0 ? "text-[#16C784]" : "text-destructive"
            )}>
              {balanceUSD >= 0 ? '+' : ''}${balanceInt}
            </span>
            <span className="text-lg font-medium text-muted-foreground/50 tabular-nums">
              {balanceDec}
            </span>
          </div>

          {/* Rate cards inline */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="flex size-5 items-center justify-center rounded-md bg-[var(--green-100)] text-[#16C784]">
                  <TrendingUp className="size-2.5" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Compra</span>
              </div>
              <p className="text-base font-bold tracking-tight text-foreground tabular-nums">
                {buyRate ? formatNumber(buyRate) : '—'}
                <span className="text-[10px] font-medium text-muted-foreground/50 ml-1">Bs</span>
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="flex size-5 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <TrendingDown className="size-2.5" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Venta</span>
              </div>
              <p className="text-base font-bold tracking-tight text-foreground tabular-nums">
                {sellRate ? formatNumber(sellRate) : '—'}
                <span className="text-[10px] font-medium text-muted-foreground/50 ml-1">Bs</span>
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════
          ROW 2: Actividad Reciente + Cotizador
         ══════════════════════════════════════════════ */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-[2fr_1.15fr] gap-3 mb-3"
        variants={fadeSlideUp}
      >
        {/* Actividad Reciente */}
        <div className="bg-card border border-border rounded-2xl shadow-[0_8px_24px_rgba(15,23,42,0.04)] p-6">
          <RecentActivityCard />
        </div>

        {/* Cotizador */}
        <div className="bg-card border border-border rounded-2xl shadow-[0_8px_24px_rgba(15,23,42,0.04)] overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-0.5">
                  En tiempo real
                </p>
                <h3 className="text-lg font-bold tracking-tight text-foreground">Cotizador</h3>
              </div>
              <motion.div
                className="flex items-center gap-1.5 rounded-full bg-[var(--green-100)] px-2.5 py-1 text-[#16C784]"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#16C784] opacity-75" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-[#16C784]" />
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider">Live</span>
              </motion.div>
            </div>
          </div>

          {/* Toggle Tabs */}
          <div className="px-6 mb-4 flex gap-6 border-b border-border/30">
            {(['depositar', 'enviar'] as const).map((item) => (
              <button
                key={item}
                onClick={() => setAction(item)}
                className={cn(
                  "text-[13px] font-semibold transition-all duration-300 pb-3 border-b-2 relative -mb-[1px] cursor-pointer",
                  action === item
                    ? "text-foreground border-primary"
                    : "text-muted-foreground/60 border-transparent hover:text-foreground"
                )}
              >
                {item === 'depositar' ? 'Depositar' : 'Retirar'}
              </button>
            ))}
          </div>

          {/* Form Fields */}
          <div className="px-6 pb-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={action}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ type: 'spring', stiffness: 200, damping: 24 }}
              >
                {/* Origin */}
                <div className="rounded-xl border border-border/40 bg-muted/20 p-4 transition-all duration-300 focus-within:bg-muted/40 focus-within:border-border/60 focus-within:shadow-sm">
                  <MoneyField
                    currency={config.originCurrency}
                    label={config.originLabel}
                    onChange={setAmountInput}
                    value={amountInput}
                  />
                </div>

                {/* Swap Arrow */}
                <div className="flex items-center justify-center -my-4 relative z-10">
                  <motion.div
                    className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg border-[3px] border-card cursor-pointer"
                    whileHover={{ scale: 1.15, rotate: 180 }}
                    whileTap={{ scale: 0.92 }}
                    transition={SPRING}
                  >
                    <ArrowDownUp className="size-[16px]" />
                  </motion.div>
                </div>

                {/* Destination */}
                <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
                  <ReadOnlyField
                    currency={config.destinationCurrency}
                    label={config.destinationLabel}
                    value={estimate.amountConverted}
                  />
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Active Rate */}
            <div className="pt-4 flex items-center justify-between text-sm text-muted-foreground font-medium">
              <span className="text-xs">
                1 USD = {action === 'depositar' ? formatNumber(sellRate) : (buyRate ? formatNumber(buyRate) : 0)} Bs
              </span>
              <div className="flex items-center gap-1.5">
                <Activity className="size-3 text-[#16C784]" />
                <span className="text-[10px] font-semibold text-[#16C784]">En vivo</span>
              </div>
            </div>

            {/* CTA */}
            <div className="pt-4">
              <GuiraButton
                onClick={() => router.push(action === 'depositar' ? '/depositar' : '/enviar')}
                className="w-full justify-center h-12 rounded-xl text-sm"
              >
                Continuar
              </GuiraButton>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════
          ROW 3: Flujo del mes (Analytics)
         ══════════════════════════════════════════════ */}
      <motion.div
        className="bg-card border border-border rounded-2xl shadow-[0_8px_24px_rgba(15,23,42,0.04)] p-6 mb-3"
        variants={fadeSlideUp}
      >
        <MonthlyFlowsCard />
      </motion.div>

      {/* ══════════════════════════════════════════════
          ROW 4: Flujo de pagos globales (Mapa)
         ══════════════════════════════════════════════ */}
      <motion.div
        className="bg-card border border-border rounded-2xl shadow-[0_8px_24px_rgba(15,23,42,0.04)] p-6 mb-3"
        variants={fadeSlideUp}
      >
        <GlobalPaymentFlowCard />
      </motion.div>

      {/* ══════════════════════════════════════════════
          ROW 5: Wallets + Virtual Accounts (children)
         ══════════════════════════════════════════════ */}
      {children && (
        <motion.section className="mt-3" variants={fadeSlideUp}>
          {children}
        </motion.section>
      )}
    </motion.div>
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
    <div className="space-y-1">
      <label className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">{label}</label>
      <div className="flex items-center justify-between gap-3">
        <Input
          className="h-auto w-full border-0 bg-transparent p-0 text-2xl font-bold tracking-tight text-foreground shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/25"
          inputMode="decimal"
          onChange={(event) => onChange(event.target.value)}
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
    <div className="space-y-1">
      <label className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">{label}</label>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 truncate text-2xl font-bold tracking-tight text-primary">
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
    <div className="flex shrink-0 items-center gap-2 rounded-full bg-muted/40 px-3 py-1.5 border border-border/40">
      <div className="flex size-5 items-center justify-center overflow-hidden rounded-full bg-muted shadow-sm">
        <Flag code={flagCode} className="h-full w-full object-cover" />
      </div>
      <span className="text-sm font-bold text-foreground tracking-tight">{currency}</span>
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
