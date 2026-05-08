import { apiGet } from '@/lib/api/client'
import type { GlobalFlowStat } from '@/features/wallet/lib/payment-arc-routes'

export async function getGlobalFlowStats(month?: string): Promise<GlobalFlowStat[]> {
  try {
    const params = month ? `?month=${month}` : ''
    return await apiGet<GlobalFlowStat[]>(`/payment-orders/my-flow-stats${params}`)
  } catch (err) {
    // Graceful fallback: endpoint may not be deployed yet (ParseUUIDPipe match on :id)
    console.warn('[StatsService] getGlobalFlowStats unavailable:', (err as Error)?.message ?? err)
    return []
  }
}

export async function getGlobalFlowMonths(): Promise<string[]> {
  try {
    return await apiGet<string[]>('/payment-orders/my-flow-months')
  } catch (err) {
    console.warn('[StatsService] getGlobalFlowMonths unavailable:', (err as Error)?.message ?? err)
    return []
  }
}
