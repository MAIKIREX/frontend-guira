'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowDownLeft, ArrowUpRight, CalendarDays, BarChart3 } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Legend } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { GuiraLoadingInline } from '@/components/shared/guira-loading'
import { cn } from '@/lib/utils'
import { LedgerService, type LedgerEntry } from '@/services/ledger.service'

const SPRING = { type: 'spring' as const, stiffness: 100, damping: 20 }

const chartConfig = {
  credits: {
    label: 'Cobros (USD)',
    color: '#005BFF',
  },
  debits: {
    label: 'Pagos (USD)',
    color: '#00BFFF',
  },
} satisfies ChartConfig

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

interface WeeklyData {
  label: string
  credits: number
  debits: number
}

/**
 * Groups ledger entries into weekly buckets for bar chart display
 */
function buildWeeklyData(entries: LedgerEntry[], from: string, to: string): WeeklyData[] {
  const startDate = new Date(from + 'T00:00:00')
  const endDate = new Date(to + 'T23:59:59')
  const weeks: WeeklyData[] = []

  // Generate week boundaries
  const current = new Date(startDate)
  while (current <= endDate) {
    const weekStart = new Date(current)
    const weekEnd = new Date(current)
    weekEnd.setDate(weekEnd.getDate() + 6)
    if (weekEnd > endDate) weekEnd.setTime(endDate.getTime())

    const label = `${weekStart.getDate()} ${weekStart.toLocaleDateString('es-ES', { month: 'short' })}`

    let credits = 0
    let debits = 0

    for (const entry of entries) {
      const entryDate = new Date(entry.created_at)
      if (entryDate >= weekStart && entryDate <= weekEnd) {
        if (entry.type === 'credit') credits += entry.amount
        else debits += entry.amount
      }
    }

    weeks.push({ label, credits: Math.round(credits * 100) / 100, debits: Math.round(debits * 100) / 100 })
    current.setDate(current.getDate() + 7)
  }

  return weeks
}

export function MonthlyFlowsCard() {
  const monthOptions = useMemo(() => getMonthOptions(6), [])
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value)
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'volumen' | 'cobros_pagos'>('cobros_pagos')

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

  const { totalIn, totalOut, totalOps, txCount, weeklyData } = useMemo(() => {
    let totalIn = 0
    let totalOut = 0

    for (const entry of entries) {
      if (entry.type === 'credit') totalIn += entry.amount
      else totalOut += entry.amount
    }

    const weeklyData = buildWeeklyData(entries, selected.from, selected.to)

    return {
      totalIn,
      totalOut,
      totalOps: totalIn + totalOut,
      txCount: entries.length,
      weeklyData,
    }
  }, [entries, selected.from, selected.to])

  return (
    <div className="space-y-5">
      {/* Header with title + tabs + month selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BarChart3 className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Analytics de tesorería</h3>
            <p className="text-xs text-muted-foreground">KPIs clave del período</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Tabs */}
          <div className="flex rounded-lg bg-muted/30 border border-border/40 p-0.5">
            {(['cobros_pagos', 'volumen'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "text-[11px] font-semibold px-3 py-1 rounded-md transition-all cursor-pointer",
                  activeTab === tab
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab === 'cobros_pagos' ? 'Cobros vs Pagos' : 'Volumen'}
              </button>
            ))}
          </div>

          {/* Month selector */}
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
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <GuiraLoadingInline />
        </div>
      ) : (
        <motion.div
          className="space-y-5"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
          key={`${selectedMonth}-${activeTab}`}
        >
          {/* KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50">
                Volumen total
              </p>
              <p className="text-lg font-bold tracking-tight text-foreground tabular-nums">
                {fmtCurrency(totalOps)}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <div className="flex size-4 items-center justify-center rounded bg-[var(--green-100)] text-[#16C784]">
                  <ArrowDownLeft className="size-2.5" />
                </div>
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50">
                  Cobros
                </p>
              </div>
              <p className={cn(
                'text-lg font-bold tracking-tight tabular-nums',
                totalIn > 0 ? 'text-[#16C784]' : 'text-muted-foreground/40'
              )}>
                {fmtCurrency(totalIn)}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <div className="flex size-4 items-center justify-center rounded bg-primary/10 text-primary">
                  <ArrowUpRight className="size-2.5" />
                </div>
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50">
                  Pagos
                </p>
              </div>
              <p className={cn(
                'text-lg font-bold tracking-tight tabular-nums',
                totalOut > 0 ? 'text-foreground' : 'text-muted-foreground/40'
              )}>
                {fmtCurrency(totalOut)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50">
                Transacciones
              </p>
              <p className="text-lg font-bold tracking-tight text-foreground tabular-nums">
                {txCount}
              </p>
            </div>
          </div>

          {/* Bar Chart */}
          {weeklyData.length > 0 && (
            <div className="border-t border-border/30 pt-4">
              <ChartContainer config={chartConfig} className="h-[180px] w-full aspect-auto">
                <BarChart
                  data={weeklyData}
                  margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/20" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  />
                  <YAxis
                    hide
                    domain={[0, 'auto']}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => [
                          `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                          name === 'credits' ? 'Cobros' : 'Pagos',
                        ]}
                      />
                    }
                  />
                  <Bar
                    dataKey="credits"
                    fill="var(--color-credits)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                  <Bar
                    dataKey="debits"
                    fill="var(--color-debits)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                </BarChart>
              </ChartContainer>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
