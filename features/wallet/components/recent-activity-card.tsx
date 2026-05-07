'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowDownLeft, ArrowUpRight, ArrowDownUp, ChevronRight, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PaymentsService } from '@/services/payments.service'
import type { PaymentOrder } from '@/types/payment-order'

const SPRING = { type: 'spring' as const, stiffness: 100, damping: 20 }

const FLOW_LABELS: Record<string, string> = {
  fiat_bo_to_bridge_wallet: 'Depósito Bs a Wallet',
  fiat_us_to_bridge_wallet: 'Depósito USD a Wallet',
  crypto_to_bridge_wallet: 'Depósito Crypto',
  bridge_wallet_to_fiat_bo: 'Retiro a Bolivia',
  bridge_wallet_to_fiat_us: 'Retiro a EE.UU.',
  bridge_wallet_to_crypto: 'Retiro Crypto',
  wallet_to_fiat: 'Envío a Proveedor',
  bolivia_to_world: 'Envío al Exterior',
  world_to_bolivia: 'Recepción del Exterior',
  bolivia_to_wallet: 'Bolivia a Wallet',
  world_to_wallet: 'Exterior a Wallet',
  wallet_to_wallet: 'Transferencia entre Wallets',
  BO_TO_WORLD: 'Envío al Exterior',
  WORLD_TO_BO: 'Recepción del Exterior',
  US_TO_WALLET: 'Depósito a Wallet',
}

const INFLOW_FLOWS = new Set([
  'fiat_bo_to_bridge_wallet', 'fiat_us_to_bridge_wallet',
  'crypto_to_bridge_wallet', 'world_to_bolivia', 'world_to_wallet',
])

const FX_FLOWS = new Set([
  'wallet_to_wallet',
])

const STATUS_MAP: Record<string, { text: string; cls: string }> = {
  completed: { text: 'Completada', cls: 'text-[#16C784]' },
  processing: { text: 'Procesando', cls: 'text-amber-500' },
  pending: { text: 'Pendiente', cls: 'text-amber-500' },
  created: { text: 'Creada', cls: 'text-muted-foreground' },
  waiting_deposit: { text: 'Esperando depósito', cls: 'text-amber-500' },
  deposit_received: { text: 'Depósito recibido', cls: 'text-primary' },
  sent: { text: 'Enviada', cls: 'text-primary' },
  failed: { text: 'Fallida', cls: 'text-destructive' },
  cancelled: { text: 'Cancelada', cls: 'text-destructive' },
}

function relTime(d: string): string {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (diff < 1) return 'Ahora'
  if (diff < 60) return `Hace ${diff}m`
  const h = Math.floor(diff / 60)
  if (h < 24) return `Hace ${h}h`
  const days = Math.floor(h / 24)
  if (days < 7) return `Hace ${days}d`
  return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

/**
 * Returns the color scheme for the activity item:
 * Green = inflow/deposit, Blue = outflow/payment, Purple = FX conversion
 */
function getFlowColor(flow: string, inflow: boolean) {
  if (FX_FLOWS.has(flow)) {
    return {
      bg: 'bg-[var(--purple-100)] dark:bg-[rgba(139,92,246,0.12)]',
      border: 'border-[var(--purple-500)]/20',
      text: 'text-[var(--purple-500)]',
      icon: ArrowDownUp,
    }
  }
  if (inflow) {
    return {
      bg: 'bg-[var(--green-100)] dark:bg-[rgba(22,199,132,0.12)]',
      border: 'border-[#16C784]/20',
      text: 'text-[#16C784]',
      icon: ArrowDownLeft,
    }
  }
  return {
    bg: 'bg-primary/5',
    border: 'border-primary/20',
    text: 'text-primary',
    icon: ArrowUpRight,
  }
}

export function RecentActivityCard() {
  const router = useRouter()
  const [orders, setOrders] = useState<PaymentOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    PaymentsService.getOrders({ limit: 5 } as any)
      .then((raw: any) => {
        const items: PaymentOrder[] = Array.isArray(raw) ? raw
          : Array.isArray(raw?.data) ? raw.data
          : Array.isArray(raw?.items) ? raw.items : []
        items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        setOrders(items.slice(0, 5))
      })
      .catch((e) => console.error('[RecentActivity]', e))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">
          Actividad reciente
        </h3>
        <button
          onClick={() => router.push('/transacciones')}
          className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer"
        >
          Ver todas las actividades
          <ChevronRight className="size-3" />
        </button>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="size-9 rounded-full bg-muted/40" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-32 rounded bg-muted/40" />
                <div className="h-2.5 w-20 rounded bg-muted/30" />
              </div>
              <div className="h-3 w-16 rounded bg-muted/40" />
            </div>
          ))}
        </div>
      )}

      {!loading && orders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <div className="flex size-12 items-center justify-center rounded-full border border-border/30 bg-muted/10">
            <Inbox className="size-5 text-muted-foreground/30" />
          </div>
          <p className="text-xs text-muted-foreground/50 font-medium">Sin actividad reciente</p>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div className="space-y-1">
          {orders.map((order, i) => {
            const flow = order.flow_type ?? order.order_type ?? ''
            const inflow = INFLOW_FLOWS.has(flow) || order.order_type === 'WORLD_TO_BO'
            const label = FLOW_LABELS[flow] ?? order.business_purpose ?? 'Operación'
            const st = STATUS_MAP[order.status] ?? { text: order.status, cls: 'text-muted-foreground' }
            const amt = order.amount ?? order.amount_origin ?? 0
            const cur = order.currency ?? order.origin_currency ?? 'USD'
            const fmtAmt = `${cur === 'USD' ? '$' : ''}${amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${cur !== 'USD' ? ` ${cur}` : ''}`
            const colorScheme = getFlowColor(flow, inflow)
            const IconComponent = colorScheme.icon

            return (
              <motion.div
                key={order.id}
                className="group flex items-center gap-3 py-3 px-3 -mx-3 rounded-xl transition-all duration-200 hover:bg-muted/20 cursor-pointer"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...SPRING, delay: i * 0.06 }}
                onClick={() => router.push('/transacciones')}
              >
                {/* Color-coded circle icon */}
                <div className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-full border',
                  colorScheme.bg,
                  colorScheme.border,
                  colorScheme.text,
                )}>
                  <IconComponent className="size-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground leading-tight truncate">{label}</p>
                  <p className={cn('text-[10px] font-semibold mt-0.5', st.cls)}>
                    {st.text}
                    <span className="text-muted-foreground/40 ml-2 font-medium">{relTime(order.created_at)}</span>
                  </p>
                </div>

                <span className={cn('text-sm font-bold tracking-tight tabular-nums shrink-0', inflow ? 'text-[#16C784]' : 'text-foreground')}>
                  {inflow ? '+' : '-'}{fmtAmt}
                </span>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
