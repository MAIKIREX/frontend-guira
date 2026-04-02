/**
 * admin/bridge.admin.service.ts — NUEVO
 * 
 * Panel de aprobación/rechazo de Bridge Payouts para administradores.
 * Corresponde a la nueva vista: /admin/bridge-payouts
 * 
 * Todos los endpoints requieren rol: admin | super_admin
 */
import { apiGet, apiPost } from '@/lib/api/client'
import type { PaginationParams } from '@/lib/api/types'

export interface AdminBridgePayout {
  id: string
  user_id: string
  user_email?: string
  user_full_name?: string
  amount: number
  currency: string
  payment_rail: string
  external_account_id: string
  status: 'pending_approval' | 'approved' | 'rejected' | 'processing' | 'completed' | 'failed'
  reference?: string
  created_at: string
  approved_at?: string
  rejected_at?: string
  rejection_reason?: string
}

export interface PayoutActionDto {
  notes?: string
  rejection_reason?: string
}

export const BridgeAdminService = {
  /**
   * Lista todos los payouts pendientes de aprobación.
   */
  async getPayouts(params?: PaginationParams & { status?: string }): Promise<AdminBridgePayout[]> {
    return apiGet<AdminBridgePayout[]>('/admin/bridge/payouts', { params })
  },

  /**
   * Aprueba un payout — dispara la liquidación real en Bridge.
   */
  async approvePayout(payoutId: string, dto?: PayoutActionDto): Promise<void> {
    return apiPost<void>(`/admin/bridge/payouts/${payoutId}/approve`, dto)
  },

  /**
   * Rechaza un payout y devuelve el saldo al usuario.
   */
  async rejectPayout(payoutId: string, dto: Required<Pick<PayoutActionDto, 'rejection_reason'>>): Promise<void> {
    return apiPost<void>(`/admin/bridge/payouts/${payoutId}/reject`, dto)
  },
}
