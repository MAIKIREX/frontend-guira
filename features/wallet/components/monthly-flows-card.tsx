'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ArrowDownLeft, ArrowUpRight, CalendarDays, BarChart3, Layers } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
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

/* ── Currency helpers ─────────────────────────────────── */

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  USDC: '$',
  USDT: '$',
  BOB: 'Bs',
  EUR: '€',
  BRL: 'R$',
}

const CURRENCY_FLAGS: Record<string, string> = {
  USD: '🇺🇸',
  USDC: '🪙',
  USDT: '🪙',
  BOB: '🇧🇴',
  EUR: '🇪🇺',
  BRL: '🇧🇷',
}

function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency.toUpperCase()] ?? currency
}

function fmtCurrency(n: number, currency: string = 'USD'): string {
  const sym = getCurrencySymbol(currency)
  const formatted = n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${sym}${formatted}`
}

/* ── Month options ────────────────────────────────────── */

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

/* ── Per-currency summary ─────────────────────────────── */

interface CurrencySummary {
  currency: string
  credits: number
  debits: number
  volume: number
  txCount: number
}

function buildCurrencySummaries(entries: LedgerEntry[]): CurrencySummary[] {
  const map = new Map<string, CurrencySummary>()

  for (const entry of entries) {
    const cur = (entry.currency || 'USD').toUpperCase()
    if (!map.has(cur)) {
      map.set(cur, { currency: cur, credits: 0, debits: 0, volume: 0, txCount: 0 })
    }
    const s = map.get(cur)!
    const amount = Number(entry.amount) || 0
    if (entry.type === 'credit') {
      s.credits += amount
    } else {
      s.debits += amount
    }
    s.volume += amount
    s.txCount += 1
  }

  // Sort: highest volume first
  return Array.from(map.values()).sort((a, b) => b.volume - a.volume)
}

/* ── Weekly data for chart ────────────────────────────── */

interface WeeklyData {
  label: string
  credits: number
  debits: number
}

function buildWeeklyData(entries: LedgerEntry[], from: string, to: string): WeeklyData[] {
  const startDate = new Date(from + 'T00:00:00')
  const endDate = new Date(to + 'T23:59:59')
  const weeks: WeeklyData[] = []

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
        const amount = Number(entry.amount) || 0
        if (entry.type === 'credit') credits += amount
        else debits += amount
      }
    }

    weeks.push({
      label,
      credits: Math.round(credits * 100) / 100,
      debits: Math.round(debits * 100) / 100,
    })
    current.setDate(current.getDate() + 7)
  }

  return weeks
}

/* ── Dynamic chart config based on available currencies ── */

function buildChartConfig(summaries: CurrencySummary[]): ChartConfig {
  const primaryCurrency = summaries[0]?.currency || 'USD'
  return {
    credits: {
      label: `Cobros (${primaryCurrency})`,
      color: '#005BFF',
    },
    debits: {
      label: `Pagos (${primaryCurrency})`,
      color: '#00BFFF',
    },
  }
}

/* ── Main component ───────────────────────────────────── */

export function MonthlyFlowsCard() {
  const monthOptions = useMemo(() => getMonthOptions(6), [])
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value)
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'cobros_pagos' | 'volumen'>('cobros_pagos')
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null) // null = all

  const selected = monthOptions.find((m) => m.value === selectedMonth) ?? monthOptions[0]

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    const toEndOfDay = `${selected.to}T23:59:59`

    // Solo transacciones completadas exitosamente (settled)
    LedgerService.getEntries({ from: selected.from, to: toEndOfDay, status: 'settled', limit: 500 })
      .then((response) => {
        const items = response.entries ?? []
        console.log(`[MonthlyFlows] Fetched ${items.length} entries for ${selected.from} → ${selected.to}`)
        setEntries(items)
      })
      .catch((err) => console.error('[MonthlyFlows] Error:', err))
      .finally(() => setLoading(false))
  }, [selected.from, selected.to])

  const { summaries, totalIn, totalOut, totalOps, txCount, weeklyData, chartConfig } = useMemo(() => {
    const summaries = buildCurrencySummaries(entries)

    // Filter entries by selected currency if one is picked
    const filteredEntries = selectedCurrency
      ? entries.filter((e) => (e.currency || 'USD').toUpperCase() === selectedCurrency)
      : entries

    let totalIn = 0
    let totalOut = 0

    for (const entry of filteredEntries) {
      const amount = Number(entry.amount) || 0
      if (entry.type === 'credit') totalIn += amount
      else totalOut += amount
    }

    const weeklyData = buildWeeklyData(filteredEntries, selected.from, selected.to)
    const chartConfig = buildChartConfig(summaries)

    return {
      summaries,
      totalIn,
      totalOut,
      totalOps: totalIn + totalOut,
      txCount: filteredEntries.length,
      weeklyData,
      chartConfig,
    }
  }, [entries, selected.from, selected.to, selectedCurrency])

  // Determine display currency label
  const displayCurrency = selectedCurrency ?? (summaries.length === 1 ? summaries[0].currency : null)

  return (
    <div className="space-y-5">
      {/* Header with title + tabs + currency filter + month selector */}
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

        <div className="flex items-center gap-2 flex-wrap">
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

          {/* Currency filter — only show if multiple currencies exist */}
          {summaries.length > 1 && (
            <div className="flex rounded-lg bg-muted/30 border border-border/40 p-0.5">
              <button
                onClick={() => setSelectedCurrency(null)}
                className={cn(
                  "text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all cursor-pointer",
                  selectedCurrency === null
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Todas
              </button>
              {summaries.map((s) => (
                <button
                  key={s.currency}
                  onClick={() => setSelectedCurrency(s.currency)}
                  className={cn(
                    "text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all cursor-pointer",
                    selectedCurrency === s.currency
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s.currency}
                </button>
              ))}
            </div>
          )}

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
      ) : entries.length === 0 ? (
        /* Empty state when no entries exist at all */
        <motion.div
          className="flex flex-col items-center justify-center py-12 text-center"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
        >
          <div className="flex size-12 items-center justify-center rounded-full bg-muted/30 mb-3">
            <BarChart3 className="size-5 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-semibold text-muted-foreground/60">
            Sin movimientos en este período
          </p>
          <p className="text-xs text-muted-foreground/40 mt-1">
            Las transacciones aparecerán aquí cuando se registren operaciones.
          </p>
        </motion.div>
      ) : (
        <motion.div
          className="space-y-5"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
          key={`${selectedMonth}-${activeTab}-${selectedCurrency}`}
        >
          {/* KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50">
                Volumen total
              </p>
              <p className="text-lg font-bold tracking-tight text-foreground tabular-nums">
                {displayCurrency ? fmtCurrency(totalOps, displayCurrency) : fmtCurrency(totalOps, 'USD')}
              </p>
              {!displayCurrency && summaries.length > 1 && (
                <p className="text-[9px] text-muted-foreground/40">multi-divisa</p>
              )}
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
                {displayCurrency ? fmtCurrency(totalIn, displayCurrency) : fmtCurrency(totalIn, 'USD')}
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
                {displayCurrency ? fmtCurrency(totalOut, displayCurrency) : fmtCurrency(totalOut, 'USD')}
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

          {/* Per-currency breakdown table — show when "Todas" is selected and multiple currencies exist */}
          {!selectedCurrency && summaries.length > 1 && (
            <div className="border-t border-border/30 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="size-3.5 text-muted-foreground/50" />
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50">
                  Desglose por divisa
                </p>
              </div>
              <div className="grid gap-2">
                {summaries.map((s) => (
                  <button
                    key={s.currency}
                    onClick={() => setSelectedCurrency(s.currency)}
                    className="flex items-center justify-between rounded-xl border border-border/30 bg-muted/10 px-4 py-2.5 transition-all hover:bg-muted/25 hover:border-border/50 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base">{CURRENCY_FLAGS[s.currency] ?? '💱'}</span>
                      <div className="text-left">
                        <p className="text-[12px] font-bold text-foreground">{s.currency}</p>
                        <p className="text-[10px] text-muted-foreground">{s.txCount} transacciones</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground/50">Cobros</p>
                        <p className="text-[12px] font-bold text-[#16C784] tabular-nums">
                          +{fmtCurrency(s.credits, s.currency)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground/50">Pagos</p>
                        <p className="text-[12px] font-bold text-foreground tabular-nums">
                          -{fmtCurrency(s.debits, s.currency)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground/50">Volumen</p>
                        <p className="text-[12px] font-bold text-primary tabular-nums">
                          {fmtCurrency(s.volume, s.currency)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

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
                          `${getCurrencySymbol(displayCurrency || 'USD')}${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
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
