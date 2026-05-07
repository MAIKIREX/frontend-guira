import { apiGet } from '@/lib/api/client'
import type { GlobalFlowStat } from '@/features/wallet/lib/payment-arc-routes'

export async function getGlobalFlowStats(month?: string): Promise<GlobalFlowStat[]> {
  const params = month ? `?month=${month}` : ''
  return apiGet<GlobalFlowStat[]>(`/admin/payment-orders/global-flow-stats${params}`)
}

export async function getGlobalFlowMonths(): Promise<string[]> {
  return apiGet<string[]>('/admin/payment-orders/global-flow-months')
}
