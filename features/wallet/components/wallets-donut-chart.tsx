'use client'

import { useMemo } from 'react'
import { Pie, PieChart, Cell, Label } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

/* ── Token color palette (desaturated, premium feel) ── */
const TOKEN_COLORS: Record<string, string> = {
  USDC: 'oklch(0.62 0.14 250)',
  USDT: 'oklch(0.62 0.14 160)',
  EURC: 'oklch(0.58 0.12 280)',
  USDB: 'oklch(0.60 0.10 210)',
  PYUSD: 'oklch(0.58 0.10 235)',
  UERC: 'oklch(0.55 0.12 300)',
}

const FALLBACK_COLOR = 'oklch(0.60 0.06 250)'

interface WalletsDonutChartProps {
  /** Token balances aggregated across all wallets: { USDC: 7.06, USDT: 0, ... } */
  aggregatedTokens: Record<string, number>
}

export function WalletsDonutChart({ aggregatedTokens }: WalletsDonutChartProps) {
  const { chartData, total, chartConfig } = useMemo(() => {
    const entries = Object.entries(aggregatedTokens).filter(([, v]) => v > 0)
    const total = entries.reduce((acc, [, v]) => acc + v, 0)

    const chartData = entries.map(([currency, value]) => ({
      name: currency,
      value: Math.round(value * 100) / 100,
      fill: TOKEN_COLORS[currency] ?? FALLBACK_COLOR,
      percentage: total > 0 ? Math.round((value / total) * 100) : 0,
    }))

    // Build ChartConfig dynamically from active tokens
    const chartConfig: ChartConfig = {}
    for (const entry of chartData) {
      chartConfig[entry.name] = {
        label: entry.name,
        color: entry.fill,
      }
    }

    return { chartData, total, chartConfig }
  }, [aggregatedTokens])

  // Don't render if no tokens have balance
  if (!chartData.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <div className="size-20 rounded-full border-2 border-dashed border-border/30 flex items-center justify-center">
          <span className="text-lg font-bold text-muted-foreground/30">$0</span>
        </div>
        <p className="text-[10px] text-muted-foreground/40 font-medium">
          Sin fondos distribuidos
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <ChartContainer config={chartConfig} className="h-[180px] w-[180px] aspect-square">
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => [
                  `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                  String(name),
                ]}
              />
            }
          />
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            strokeWidth={2}
            stroke="var(--background)"
          >
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
            <Label
              content={({ viewBox }) => {
                if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                  return (
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy ?? 0) - 4}
                        className="fill-muted-foreground text-[9px] font-bold uppercase tracking-wider"
                      >
                        Total
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy ?? 0) + 14}
                        className="fill-foreground text-lg font-bold"
                      >
                        ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </tspan>
                    </text>
                  )
                }
                return null
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>

      {/* Legend — inline pills below donut */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        {chartData.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2">
            <div
              className="size-2.5 rounded-full shrink-0"
              style={{ backgroundColor: entry.fill }}
            />
            <span className="text-[11px] font-semibold text-foreground tracking-tight">
              {entry.name}
            </span>
            <span className="text-[10px] text-muted-foreground/60 font-medium tabular-nums">
              ${entry.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[9px] text-muted-foreground/40 font-bold tabular-nums">
              {entry.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
