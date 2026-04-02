/**
 * admin/reconciliation.admin.service.ts — NUEVO
 * 
 * Panel de reconciliación financiera — solo super_admin.
 * Corresponde a la nueva vista: /admin/reconciliation
 * 
 * Verifica que los fondos internos coincidan con lo que Bridge reporta.
 */
import { apiGet, apiPost } from '@/lib/api/client'
import type { PaginationParams } from '@/lib/api/types'

export interface ReconciliationRun {
  id: string
  status: 'running' | 'completed' | 'failed'
  total_checked: number
  discrepancies_count: number
  started_at: string
  completed_at?: string
  triggered_by?: string
}

export interface ReconciliationDiscrepancy {
  id: string
  wallet_id: string
  user_id?: string
  internal_balance: number
  bridge_balance: number
  difference: number
  currency: string
  detected_at: string
}

export interface ReconciliationDetail extends ReconciliationRun {
  discrepancies: ReconciliationDiscrepancy[]
}

export const ReconciliationAdminService = {
  /**
   * Dispara un proceso de reconciliación asíncrono.
   * El backend compara ledgers internos vs Bridge API.
   */
  async runReconciliation(): Promise<ReconciliationRun> {
    return apiPost<ReconciliationRun>('/admin/reconciliation/run')
  },

  /**
   * Lista el historial de reconciliaciones ejecutadas.
   */
  async getHistory(params?: PaginationParams): Promise<ReconciliationRun[]> {
    return apiGet<ReconciliationRun[]>('/admin/reconciliation', { params })
  },

  /**
   * Detalle de un proceso de reconciliación con discrepancias.
   */
  async getDetail(reconciliationId: string): Promise<ReconciliationDetail> {
    return apiGet<ReconciliationDetail>(`/admin/reconciliation/${reconciliationId}`)
  },
}
