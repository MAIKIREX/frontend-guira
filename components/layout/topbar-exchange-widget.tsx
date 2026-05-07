'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'
import { useExchangeRates } from '@/features/payments/hooks/use-exchange-rates'

export function TopbarExchangeWidget() {
  const { rates, loading } = useExchangeRates()

  if (loading || !rates.sellRate) return null

  const sellRate = rates.sellRate ?? 0
  const buyRate = rates.buyRate ?? 0

  return (
    <div className="flex items-center gap-4">
      {/* Sell rate (USD → Bs) */}
      <div className="flex items-center gap-2 rounded-lg bg-white/[0.06] border border-white/[0.08] px-3 py-1.5">
        <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">USD/BOB</span>
        <span className="text-sm font-bold text-white tabular-nums">
          {sellRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <div className="flex items-center gap-0.5">
          <TrendingUp className="size-3 text-[#16C784]" />
          <span className="text-[10px] font-semibold text-[#16C784]">Venta</span>
        </div>
      </div>

      {/* Buy rate */}
      <div className="hidden xl:flex items-center gap-2 rounded-lg bg-white/[0.06] border border-white/[0.08] px-3 py-1.5">
        <span className="text-sm font-bold text-white tabular-nums">
          {buyRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <div className="flex items-center gap-0.5">
          <TrendingDown className="size-3 text-[#00BFFF]" />
          <span className="text-[10px] font-semibold text-[#00BFFF]">Compra</span>
        </div>
      </div>
    </div>
  )
}
