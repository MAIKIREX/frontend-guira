'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Globe } from 'lucide-react'
import type { ExpressionSpecification } from 'maplibre-gl'
import {
  Map,
  MapArc,
  MapMarker,
  MapPopup,
  MarkerContent,
  MarkerLabel,
} from '@/components/ui/map'
import { GuiraLoadingInline } from '@/components/shared/guira-loading'
import { cn } from '@/lib/utils'
import { getGlobalFlowStats, getGlobalFlowMonths } from '@/services/stats.service'
import {
  buildArcs,
  BOLIVIA_COORDS,
  type PaymentArc,
} from '@/features/wallet/lib/payment-arc-routes'

// ── Color tokens ──────────────────────────────────────────────────────────────
const ARC_COLORS = {
  bolivia_to_world: '#2563eb', // azul  – salidas  (visible en claro y oscuro)
  world_to_bolivia: '#16a34a', // verde – entradas (visible en claro y oscuro)
} as const

const arcColorExpr: ExpressionSpecification = [
  'match',
  ['get', 'flow_type'],
  'bolivia_to_world', ARC_COLORS.bolivia_to_world,
  'world_to_bolivia', ARC_COLORS.world_to_bolivia,
  '#888',
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtMonth(value: string) {
  const [year, month] = value.split('-')
  const d = new Date(Number(year), Number(month) - 1, 1)
  const label = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function fmtAmount(amount: number, currency: string) {
  return `${amount.toLocaleString('es-BO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} ${currency}`
}

interface SelectedArc {
  arc: PaymentArc
  longitude: number
  latitude: number
}

// ── Component ─────────────────────────────────────────────────────────────────
export function GlobalPaymentFlowCard() {
  const [months, setMonths] = useState<string[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [arcs, setArcs] = useState<PaymentArc[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<SelectedArc | null>(null)

  // Load available months once
  useEffect(() => {
    getGlobalFlowMonths()
      .then((ms) => {
        setMonths(ms)
        if (ms.length > 0) setSelectedMonth(ms[0])
      })
      .catch((err) => {
        console.warn('[GlobalPaymentFlowCard] getGlobalFlowMonths unavailable:', err)
        setMonths([])
      })
  }, [])

  // Load arc data whenever the month changes
  useEffect(() => {
    if (!selectedMonth && months.length > 0) return
    setLoading(true)
    setSelected(null)
    getGlobalFlowStats(selectedMonth || undefined)
      .then((stats) => {
        const built = buildArcs(stats)
        console.debug('[GlobalPaymentFlowCard] stats:', stats, 'arcs:', built)
        setArcs(built)
      })
      .catch((err) => {
        console.warn('[GlobalPaymentFlowCard] getGlobalFlowStats unavailable:', err)
        setArcs([])
      })
      .finally(() => setLoading(false))
  }, [selectedMonth, months.length])

  // Deduplicated endpoint markers
  const endpoints = useMemo(() => {
    const seen = new Set<string>()
    const points: { label: string; coords: [number, number] }[] = []

    // Bolivia always visible
    seen.add('Bolivia')
    points.push({ label: 'Bolivia', coords: BOLIVIA_COORDS })

    for (const arc of arcs) {
      if (!seen.has(arc.origin_label)) {
        seen.add(arc.origin_label)
        points.push({ label: arc.origin_label, coords: arc.from as [number, number] })
      }
      if (!seen.has(arc.destination_label)) {
        seen.add(arc.destination_label)
        points.push({ label: arc.destination_label, coords: arc.to as [number, number] })
      }
    }
    return points
  }, [arcs])

  const totalIn  = arcs.filter((a) => a.flow_type === 'world_to_bolivia').reduce((s, a) => s + a.transaction_count, 0)
  const totalOut = arcs.filter((a) => a.flow_type === 'bolivia_to_world').reduce((s, a) => s + a.transaction_count, 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Globe className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Flujo de pagos globales</h3>
            <p className="text-xs text-muted-foreground">Transacciones interbank Bolivia ↔ Mundo</p>
          </div>
        </div>

        {/* Month selector */}
        <div className="relative">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="appearance-none rounded-lg border border-border/40 bg-card/80 pl-3 pr-8 py-1.5 text-[11px] font-semibold text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
            disabled={months.length === 0}
          >
            {months.length === 0 && (
              <option value="">Sin datos</option>
            )}
            {months.map((m) => (
              <option key={m} value={m}>
                {fmtMonth(m)}
              </option>
            ))}
          </select>
          <CalendarDays className="absolute right-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/40 pointer-events-none" />
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-0.5">
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50">
            Total ops
          </p>
          <p className="text-lg font-bold tracking-tight text-foreground tabular-nums">
            {totalIn + totalOut}
          </p>
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full" style={{ background: ARC_COLORS.world_to_bolivia }} />
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50">
              Entradas
            </p>
          </div>
          <p className="text-lg font-bold tracking-tight tabular-nums" style={{ color: ARC_COLORS.world_to_bolivia }}>
            {totalIn}
          </p>
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full" style={{ background: ARC_COLORS.bolivia_to_world }} />
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50">
              Salidas
            </p>
          </div>
          <p className="text-lg font-bold tracking-tight tabular-nums" style={{ color: ARC_COLORS.bolivia_to_world }}>
            {totalOut}
          </p>
        </div>
      </div>

      {/* Map — always visible */}
      <div className="relative h-[380px] w-full overflow-hidden rounded-xl">
        <Map center={[-30, 10]} zoom={1.2}>
          {arcs.length > 0 && (
            <MapArc<PaymentArc>
              data={arcs}
              paint={{
                'line-color': arcColorExpr,
                'line-width': 2,
                'line-opacity': 0.9,
              }}
              hoverPaint={{
                'line-width': 4,
                'line-opacity': 1,
              }}
              onHover={(event) =>
                setSelected(
                  event
                    ? {
                        arc: event.arc,
                        longitude: event.longitude,
                        latitude: event.latitude,
                      }
                    : null,
                )
              }
            />
          )}

          {endpoints.map((point) => (
            <MapMarker
              key={point.label}
              longitude={point.coords[0]}
              latitude={point.coords[1]}
            >
              <MarkerContent>
                <div
                  className={cn(
                    'size-2 rounded-full shadow-sm',
                    point.label === 'Bolivia'
                      ? 'bg-primary'
                      : 'bg-foreground/70',
                  )}
                />
                <MarkerLabel
                  position="top"
                  className="text-foreground/80 tracking-tight text-[10px]"
                >
                  {point.label}
                </MarkerLabel>
              </MarkerContent>
            </MapMarker>
          ))}

          {selected && (
            <MapPopup
              longitude={selected.longitude}
              latitude={selected.latitude}
              offset={12}
              closeOnClick={false}
              className="p-0"
            >
              <div className="flex items-center gap-2 px-2.5 py-1.5 text-xs">
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{
                    background: ARC_COLORS[selected.arc.flow_type],
                  }}
                />
                <span className="font-semibold">
                  {selected.arc.origin_label} → {selected.arc.destination_label}
                </span>
                <span className="text-muted-foreground border-l pl-2">
                  {selected.arc.transaction_count}{' '}
                  {selected.arc.transaction_count === 1 ? 'op.' : 'ops.'}
                </span>
                <span className="text-muted-foreground border-l pl-2">
                  {fmtAmount(selected.arc.total_amount, selected.arc.source_currency)}
                </span>
              </div>
            </MapPopup>
          )}
        </Map>

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-sm">
            <GuiraLoadingInline />
          </div>
        )}

        {/* No-data overlay */}
        {!loading && arcs.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-border/60 bg-background/70 px-5 py-3 backdrop-blur-sm">
              <Globe className="size-5 text-muted-foreground/40" />
              <p className="text-[11px] text-muted-foreground/60">Sin transacciones en este período</p>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="bg-background/80 absolute bottom-3 left-3 flex items-center gap-3 rounded-full border px-3 py-1 text-[11px] shadow-sm backdrop-blur">
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full" style={{ background: ARC_COLORS.world_to_bolivia }} />
            Entradas
          </div>
          <span className="bg-border h-3 w-px" />
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full" style={{ background: ARC_COLORS.bolivia_to_world }} />
            Salidas
          </div>
        </div>
      </div>
    </div>
  )
}
