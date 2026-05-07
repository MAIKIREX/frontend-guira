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
  const userFirstName = profile?.full_name?.split(' ')[0] || profile?.business_name || 'Usuario'

  return (
    <motion.div
      className="mx-auto w-full max-w-screen-xl pb-12 pt-8"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] gap-10 xl:gap-16">
        
        {/* ── LEFT COLUMN: Balances & Activity ── */}
        <motion.div className="space-y-10" variants={staggerContainer}>
          
          {/* Greeting */}
          <motion.div className="space-y-1" variants={fadeSlideUp}>
             <h1 className="text-4xl sm:text-[3rem] font-extrabold tracking-tight text-foreground leading-none">
               ¡Hola, {userFirstName}!
             </h1>
             <p className="text-base font-medium text-muted-foreground mt-2">
               Resumen de tus cuentas operativas
             </p>
          </motion.div>

          {/* Balance Section (Bento Card) */}
          <motion.section
            className="rounded-[2.5rem] border border-border/50 bg-card shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] p-8 sm:p-10 relative overflow-hidden"
            variants={fadeSlideUp}
            whileHover={{ scale: 1.008, transition: { type: 'spring', stiffness: 300, damping: 25 } }}
          >
            <div className="relative z-10">
              <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.2em] text-muted-foreground mb-3">
                Balance Operativo Total
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-6xl sm:text-[5rem] font-extrabold tracking-tighter text-foreground leading-none">
                  ${balanceInt}
                </span>
                <span className="text-3xl sm:text-4xl font-medium text-muted-foreground/80 tracking-tight">
                  {balanceDec} USD
                </span>
              </div>

              {/* Sub-stats (Ingresos/Egresos style) */}
              <div className="flex gap-8 sm:gap-12 mt-10 pt-8 border-t border-border/50">
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">Operaciones del Mes</p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                    <span className="text-success mr-1">+</span>{ordersThisMonth}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">Órdenes Pendientes</p>
                  <p className={cn("text-2xl sm:text-3xl font-bold tracking-tight", pendingOrders > 0 ? "text-destructive" : "text-foreground")}>
                    {pendingOrders > 0 ? `-${pendingOrders}` : "0"}
                  </p>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Children slot (Wallets + Virtual Accounts) */}
          {children && (
            <motion.section className="pt-4" variants={fadeSlideUp}>
              {children}
            </motion.section>
          )}
        </motion.div>

        {/* ── RIGHT COLUMN: Floating Card (Convertidor) ── */}
        <motion.div variants={fadeSlideRight}>
          <div className="sticky top-8 overflow-hidden rounded-[2.5rem] border border-border/50 bg-card shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] text-foreground">
            {/* Header */}
            <div className="px-8 sm:px-10 pt-10 pb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary"
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                >
                  <RefreshCw className="size-5" />
                </motion.div>
                <h2 className="text-2xl font-bold tracking-tight">Convertidor</h2>
              </div>
            </div>

            {/* Toggle Tabs */}
            <div className="px-8 sm:px-10 mb-6 flex gap-6 border-b border-border/30">
              {(['depositar', 'enviar'] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setAction(item)}
                  className={cn(
                    "text-sm font-semibold transition-colors pb-3 border-b-2 relative -mb-[1px]",
                    action === item ? "text-foreground border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
                  )}
                >
                  {item === 'depositar' ? 'Depositar' : 'Retirar'}
                </button>
              ))}
            </div>

            {/* Form Fields */}
            <div className="px-8 sm:px-10 pb-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={action}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 24 }}
                >
                  {/* Origin */}
                  <div className="rounded-[1.5rem] border border-border/60 bg-muted/30 p-6 transition-colors focus-within:bg-muted/50 focus-within:border-border">
                    <MoneyField
                      currency={config.originCurrency}
                      label={config.originLabel}
                      onChange={setAmountInput}
                      value={amountInput}
                    />
                  </div>

                  {/* Swap Arrow — centered connector between fields */}
                  <div className="flex items-center justify-center -my-5 relative z-10">
                    <motion.div
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md border-[3px] border-card cursor-pointer"
                      whileHover={{ scale: 1.18, rotate: 180 }}
                      whileTap={{ scale: 0.92 }}
                      transition={SPRING}
                    >
                      <ArrowDownUp className="size-[18px]" />
                    </motion.div>
                  </div>

                  {/* Destination */}
                  <div className="rounded-[1.5rem] border border-border/60 bg-muted/30 p-6">
                    <ReadOnlyField
                      currency={config.destinationCurrency}
                      label={config.destinationLabel}
                      value={estimate.amountConverted}
                    />
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Active Rate */}
              <div className="pt-6 flex items-center justify-between text-sm text-muted-foreground font-medium">
                <span>Tasa: 1 USD = {action === 'depositar' ? formatNumber(sellRate) : (buyRate ? formatNumber(buyRate) : 0)} Bs</span>
                <motion.div
                  className="flex items-center gap-1.5 bg-success/10 px-2.5 py-1 rounded-md text-success font-semibold text-xs"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <TrendingUp className="size-3.5" />
                  <span>En vivo</span>
                </motion.div>
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
            <motion.div
              className="mx-8 sm:mx-10 mb-8 rounded-2xl border border-border/40 bg-muted/20 p-5"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.5 }}
            >
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-4">
                Tasas del Dólar Hoy
              </p>
              <div className="grid grid-cols-2 gap-4">
                {/* Buy */}
                <motion.div
                  className="flex items-start gap-3"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...SPRING, delay: 0.6 }}
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
                    <TrendingUp className="size-4" />
                  </div>
                  <div>
                    <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground">Compra</p>
                    <p className="text-lg font-bold tracking-tight text-foreground">
                      {buyRate ? formatNumber(buyRate) : '—'} <span className="text-xs font-medium text-muted-foreground">Bs</span>
                    </p>
                  </div>
                </motion.div>
                {/* Sell */}
                <motion.div
                  className="flex items-start gap-3"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...SPRING, delay: 0.7 }}
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <TrendingDown className="size-4" />
                  </div>
                  <div>
                    <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground">Venta</p>
                    <p className="text-lg font-bold tracking-tight text-foreground">
                      {sellRate ? formatNumber(sellRate) : '—'} <span className="text-xs font-medium text-muted-foreground">Bs</span>
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
            
            {/* Bottom Edge Indicator */}
            <div className="h-1 w-full bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 opacity-50" />
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
    <div className="space-y-1">
      <label className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="flex items-center justify-between gap-3">
        <Input
          className="h-auto w-full border-0 bg-transparent p-0 text-3xl font-bold tracking-tight text-foreground shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/30"
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
      <label className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
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
    <div className="flex shrink-0 items-center gap-2 rounded-lg bg-background px-2.5 py-1.5 border border-border/50 shadow-sm">
      <div className="flex size-4 items-center justify-center overflow-hidden rounded-sm bg-muted">
        <Flag code={flagCode} className="h-full w-full object-cover" />
      </div>
      <span className="text-sm font-semibold text-foreground">{currency}</span>
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
