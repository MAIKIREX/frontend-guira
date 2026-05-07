'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowDownLeft, ArrowUpRight, CalendarDays, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LedgerService, type LedgerEntry } from '@/services/ledger.service'

const SPRING = { type: 'spring' as const, stiffness: 100, damping: 20 }

/** Generates a list of the last N months as { label, from, to } */
function getMonthOptions(count = 6) {
  const options: { label: string; value: string; from: string; to: string }[] = []
  const now = new Date()

  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = d.getFullYear()
    const month = d.getMonth()
    const from = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = new Date(year, month + 1, 0).getDate()
    const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    const label = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

    options.push({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      value: `${year}-${String(month + 1).padStart(2, '0')}`,
      from,
      to,
    })
  }

  return options
}

function fmtCurrency(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function MonthlyFlowsCard() {
  const monthOptions = useMemo(() => getMonthOptions(6), [])
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value)
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)

  const selected = monthOptions.find((m) => m.value === selectedMonth) ?? monthOptions[0]

  useEffect(() => {
    setLoading(true)
    // Use end-of-day for `to` so Supabase lte() includes the entire last day
    const toEndOfDay = `${selected.to}T23:59:59`
    LedgerService.getEntries({ from: selected.from, to: toEndOfDay, status: 'settled', limit: 500 } as any)
      .then((raw: any) => {
        // Backend returns { entries: [...], pagination: {...} }
        const items = Array.isArray(raw) ? raw
          : Array.isArray(raw?.entries) ? raw.entries
          : Array.isArray(raw?.data) ? raw.data
          : []
        setEntries(items)
      })
      .catch((err) => console.error('[MonthlyFlows] Error:', err))
      .finally(() => setLoading(false))
  }, [selected.from, selected.to])

  const { totalIn, totalOut, totalOps, txCount } = useMemo(() => {
    let totalIn = 0
    let totalOut = 0

    for (const entry of entries) {
      if (entry.type === 'credit') totalIn += entry.amount
      else totalOut += entry.amount
    }

    return {
      totalIn,
      totalOut,
      totalOps: totalIn + totalOut,
      txCount: entries.length,
    }
  }, [entries])

  return (
    <div className="space-y-5">
      {/* Header with month selector */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Flujo del mes
        </h3>
        <div className="relative">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="appearance-none rounded-lg border border-border/40 bg-card/80 pl-3 pr-8 py-1.5 text-[11px] font-semibold text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <CalendarDays className="absolute right-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/40 pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-4 animate-spin text-muted-foreground/40" />
        </div>
      ) : (
        <motion.div
          className="space-y-5"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
          key={selectedMonth}
        >
          {/* In / Out */}
          <div className="grid grid-cols-2 gap-4">
            {/* Entradas */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded-md bg-success/10 text-success">
                  <ArrowDownLeft className="size-3" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">
                  Entradas
                </span>
              </div>
              <p className={cn(
                'text-xl font-bold tracking-tight tabular-nums',
                totalIn > 0 ? 'text-success' : 'text-muted-foreground/40'
              )}>
                {fmtCurrency(totalIn)}
              </p>
            </div>

            {/* Salidas */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <ArrowUpRight className="size-3" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">
                  Salidas
                </span>
              </div>
              <p className={cn(
                'text-xl font-bold tracking-tight tabular-nums',
                totalOut > 0 ? 'text-foreground' : 'text-muted-foreground/40'
              )}>
                {fmtCurrency(totalOut)}
              </p>
            </div>
          </div>

          {/* Totals strip */}
          <div className="flex items-center justify-between border-t border-border/30 pt-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50">
                Total operado
              </p>
              <p className="text-base font-bold tracking-tight text-foreground tabular-nums">
                {fmtCurrency(totalOps)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50">
                Transacciones
              </p>
              <p className="text-base font-bold tracking-tight text-foreground tabular-nums">
                {txCount}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
