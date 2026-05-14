'use client'

import { useEffect, useState, useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Loader2 } from 'lucide-react'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { LedgerService, type LedgerEntry } from '@/services/ledger.service'

/* ── Chart Config ── */
const chartConfig = {
  balance: {
    label: 'Balance',
    color: 'oklch(0.65 0.15 210)',
  },
} satisfies ChartConfig

interface BalanceDataPoint {
  date: string
  label: string
  balance: number
}

/**
 * Builds a cumulative daily‑balance array from raw ledger entries.
 * Credits add, debits subtract. Entries are sorted chronologically.
 */
function buildBalanceTimeline(
  entries: LedgerEntry[],
  startBalance: number
): BalanceDataPoint[] {
  if (!entries.length) return []

  const sorted = [...entries].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  // Group by day
  const dailyMap = new Map<string, number>()
  for (const entry of sorted) {
    const day = entry.created_at.slice(0, 10) // YYYY-MM-DD
    const delta = entry.type === 'credit' ? entry.amount : -entry.amount
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + delta)
  }

  let runningBalance = startBalance
  const points: BalanceDataPoint[] = []

  // Walk chronologically through each day with at least one ledger movement
  for (const [day, dailyDelta] of dailyMap) {
    runningBalance += dailyDelta
    const dateObj = new Date(day + 'T12:00:00')
    points.push({
      date: day,
      label: dateObj.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
      }),
      balance: Math.max(0, Math.round(runningBalance * 100) / 100),
    })
  }

  return points
}

interface BalanceLineChartProps {
  /** Current total balance (used to compute initial value working backwards) */
  currentBalance: number
}

export function BalanceLineChart({ currentBalance }: BalanceLineChartProps) {
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const toDate = now.toISOString().slice(0, 10)

    LedgerService.getEntries({
      from: thirtyDaysAgo.toISOString().slice(0, 10),
      to: `${toDate}T23:59:59`,
      status: 'settled',
      limit: 500,
    })
      .then((response) => {
        setEntries(response.entries ?? [])
      })
      .catch((err) => console.error('[BalanceLineChart] Error loading ledger:', err))
      .finally(() => setLoading(false))
  }, [])

  const chartData = useMemo(() => {
    if (!entries.length) return []

    // Compute the starting balance by subtracting all deltas from current
    let totalDelta = 0
    for (const e of entries) {
      totalDelta += e.type === 'credit' ? e.amount : -e.amount
    }
    const startBalance = currentBalance - totalDelta

    return buildBalanceTimeline(entries, startBalance)
  }, [entries, currentBalance])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[120px]">
        <Loader2 className="size-4 animate-spin text-muted-foreground/40" />
      </div>
    )
  }

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-[120px]">
        <p className="text-[11px] text-muted-foreground/40 font-medium">
          Sin movimientos en los últimos 30 días
        </p>
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="h-[120px] w-full aspect-auto">
      <AreaChart
        data={chartData}
        margin={{ top: 8, right: 4, bottom: 0, left: 4 }}
      >
        <defs>
          <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-balance)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--color-balance)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/20" />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
          interval="preserveStartEnd"
        />
        <YAxis hide domain={['dataMin - 0.5', 'dataMax + 0.5']} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => [`$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Balance']}
              labelKey="date"
            />
          }
        />
        <Area
          type="monotone"
          dataKey="balance"
          stroke="var(--color-balance)"
          strokeWidth={2}
          fill="url(#balanceGradient)"
          dot={false}
          activeDot={{
            r: 4,
            strokeWidth: 2,
            className: 'fill-background stroke-primary',
          }}
        />
      </AreaChart>
    </ChartContainer>
  )
}
