'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowDownUp,
  DollarSign,
  Loader2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Waypoints,
  Activity,
  Clock,
} from 'lucide-react'
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

/* ── Framer Motion orchestration ── */
const SPRING = { type: 'spring' as const, stiffness: 100, damping: 20 }

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
}

const fadeSlideUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: SPRING },
}

const fadeSlideRight = {
  hidden: { opacity: 0, x: 32 },
  visible: { opacity: 1, x: 0, transition: { ...SPRING, delay: 0.2 } },
}

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

  // Format integer and decimal parts of balance for styling
  const balanceInt = Math.floor(balanceUSD).toLocaleString('en-US')
  const balanceDec = (balanceUSD % 1).toFixed(2).substring(1) // gets ".00"

  // Extract first name correctly from full_name if available
  const userFirstName = profile?.full_name?.split(' ')[0] || 'Usuario'

  return (
    <motion.div
      className="mx-auto w-full max-w-screen-xl pb-12 pt-8"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] gap-10 xl:gap-16 items-start">

        {/* ── LEFT COLUMN: Balances & Activity ── */}
        <motion.div className="space-y-12" variants={staggerContainer}>

          {/* ── Hero Greeting ── */}
          <motion.div className="space-y-2" variants={fadeSlideUp}>
            <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tighter text-foreground leading-[0.95]">
              Bienvenido a Guira
            </h1>
            <p className="text-4xl sm:text-5xl font-bold tracking-tight text-primary/80 leading-[1]">
              {userFirstName}
            </p>
            <p className="text-sm font-medium text-muted-foreground/60 max-w-md pt-2">
              Resumen de tu actividad financiera y cuentas operativas
            </p>
          </motion.div>

          {/* ── Balance Hero ── */}
          <motion.section
            className="relative overflow-hidden rounded-[2rem] border border-border/40 bg-card/60 p-8 sm:p-10 shadow-[0_8px_40px_-16px_rgba(0,0,0,0.06)]"
            variants={fadeSlideUp}
          >
            {/* Ambient gradient orb — decorative background */}
            <div className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-primary/[0.06] blur-[100px]" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 size-60 rounded-full bg-accent/[0.04] blur-[80px]" />

            <div className="relative z-10">
              {/* Label with live indicator */}
              <div className="flex items-center gap-2.5 mb-5">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
                  Balance Operativo Total
                </p>
              </div>

              {/* Hero balance number */}
              <div className="flex items-baseline gap-2">
                <motion.span
                  className="text-7xl sm:text-[6.5rem] font-extrabold tracking-tighter text-foreground leading-none"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING, delay: 0.15 }}
                >
                  ${balanceInt}
                </motion.span>
                <span className="text-3xl sm:text-4xl font-medium text-muted-foreground/50 tracking-tight">
                  {balanceDec}
                </span>
                <span className="text-lg font-semibold text-muted-foreground/40 ml-1 self-center">
                  USD
                </span>
              </div>

              {/* Inline stat pills */}
              <div className="flex flex-wrap items-center gap-3 mt-8">
                <motion.div
                  className="flex items-center gap-2 rounded-full border border-border/50 bg-card/80 px-4 py-2 shadow-sm"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ ...SPRING, delay: 0.3 }}
                >
                  <Activity className="size-3.5 text-success" />
                  <span className="text-xs font-semibold text-foreground tabular-nums">{ordersThisMonth}</span>
                  <span className="text-[10px] text-muted-foreground font-medium">operaciones este mes</span>
                </motion.div>

                {pendingOrders > 0 && (
                  <motion.div
                    className="flex items-center gap-2 rounded-full border border-destructive/20 bg-destructive/5 px-4 py-2"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ ...SPRING, delay: 0.4 }}
                  >
                    <Clock className="size-3.5 text-destructive" />
                    <span className="text-xs font-semibold text-destructive tabular-nums">{pendingOrders}</span>
                    <span className="text-[10px] text-destructive/70 font-medium">pendientes</span>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.section>

          {/* Children slot (Wallets + Virtual Accounts) */}
          {children && (
            <motion.section className="pt-2" variants={fadeSlideUp}>
              {children}
            </motion.section>
          )}
        </motion.div>

        {/* ── RIGHT COLUMN: Cotizador Card ── */}
        <motion.div variants={fadeSlideRight} className="sticky top-8">
          <div className="relative overflow-hidden rounded-[2rem] border border-border/50 bg-card text-foreground shadow-[0_8px_40px_-12px_rgba(0,0,0,0.10)] dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.30)]">

            {/* Ambient gradient orbs — visible in light + dark */}
            <div className="pointer-events-none absolute -top-20 -right-20 size-64 rounded-full bg-primary/[0.07] dark:bg-primary/[0.12] blur-[80px]" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 size-64 rounded-full bg-accent/[0.06] dark:bg-accent/[0.10] blur-[80px]" />

            {/* Header */}
            <div className="relative z-10 px-8 sm:px-10 pt-8 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-1">
                    En tiempo real
                  </p>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">Cotizador</h2>
                </div>
                <motion.div
                  className="flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-success"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-success" />
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Live</span>
                </motion.div>
              </div>
            </div>

            {/* Toggle Tabs */}
            <div className="relative z-10 px-8 sm:px-10 mb-6 flex gap-6 border-b border-border/30">
              {(['depositar', 'enviar'] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setAction(item)}
                  className={cn(
                    "text-sm font-semibold transition-all duration-300 pb-3 border-b-2 relative -mb-[1px] cursor-pointer",
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
            <div className="relative z-10 px-8 sm:px-10 pb-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={action}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 24 }}
                >
                  {/* Origin */}
                  <div className="rounded-2xl border border-border/40 bg-muted/20 p-5 transition-all duration-300 focus-within:bg-muted/40 focus-within:border-border/60 focus-within:shadow-sm">
                    <MoneyField
                      currency={config.originCurrency}
                      label={config.originLabel}
                      onChange={setAmountInput}
                      value={amountInput}
                    />
                  </div>

                  {/* Swap Arrow — centered connector */}
                  <div className="flex items-center justify-center -my-5 relative z-10">
                    <motion.div
                      className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg border-[3px] border-card cursor-pointer"
                      whileHover={{ scale: 1.15, rotate: 180 }}
                      whileTap={{ scale: 0.92 }}
                      transition={SPRING}
                    >
                      <ArrowDownUp className="size-[18px]" />
                    </motion.div>
                  </div>

                  {/* Destination */}
                  <div className="rounded-2xl border border-border/40 bg-muted/20 p-5">
                    <ReadOnlyField
                      currency={config.destinationCurrency}
                      label={config.destinationLabel}
                      value={estimate.amountConverted}
                    />
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Active Rate */}
              <div className="pt-5 flex items-center justify-between text-sm text-muted-foreground font-medium">
                <span className="text-xs">
                  1 USD = {action === 'depositar' ? formatNumber(sellRate) : (buyRate ? formatNumber(buyRate) : 0)} Bs
                </span>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="size-3 text-success" />
                  <span className="text-[10px] font-semibold text-success">En vivo</span>
                </div>
              </div>

              {/* CTA */}
              <div className="pt-6">
                <GuiraButton
                  onClick={() => router.push(action === 'depositar' ? '/depositar' : '/enviar')}
                  className="w-full justify-center h-14 rounded-2xl text-base"
                >
                  Continuar
                </GuiraButton>
              </div>
            </div>

            {/* ── Buy / Sell Rate Strip ── */}
            <div className="relative z-10 mx-8 sm:mx-10 mb-8 flex items-stretch gap-3">
              {/* Buy */}
              <motion.div
                className="flex-1 rounded-xl border border-border/30 bg-muted/10 p-4"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING, delay: 0.5 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-success/10 text-success">
                    <TrendingUp className="size-3" />
                  </div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Compra</p>
                </div>
                <p className="text-xl font-bold tracking-tight text-foreground tabular-nums">
                  {buyRate ? formatNumber(buyRate) : '—'}
                  <span className="text-xs font-medium text-muted-foreground/60 ml-1">Bs</span>
                </p>
              </motion.div>

              {/* Sell */}
              <motion.div
                className="flex-1 rounded-xl border border-border/30 bg-muted/10 p-4"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING, delay: 0.6 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <TrendingDown className="size-3" />
                  </div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Venta</p>
                </div>
                <p className="text-xl font-bold tracking-tight text-foreground tabular-nums">
                  {sellRate ? formatNumber(sellRate) : '—'}
                  <span className="text-xs font-medium text-muted-foreground/60 ml-1">Bs</span>
                </p>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
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
    <div className="space-y-1.5">
      <label className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">{label}</label>
      <div className="flex items-center justify-between gap-3">
        <Input
          className="h-auto w-full border-0 bg-transparent p-0 text-3xl font-bold tracking-tight text-foreground shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/25"
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
    <div className="space-y-1.5">
      <label className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">{label}</label>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 truncate text-3xl font-bold tracking-tight text-primary">
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
