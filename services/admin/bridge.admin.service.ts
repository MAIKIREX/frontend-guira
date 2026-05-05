/**
 * admin/bridge.admin.service.ts — NUEVO
 * 
 * Panel de aprobación/rechazo de Bridge Payouts para administradores.
 * Corresponde a la nueva vista: /admin/bridge-payouts
 * 
 * Todos los endpoints requieren rol: admin | super_admin
 */
import { apiGet, apiPost, apiPatch } from '@/lib/api/client'
import type { PaginationParams } from '@/lib/api/types'

export interface AdminLiquidationAddress {
  id: string
  user_id: string
  bridge_liquidation_address_id: string
  bridge_customer_id: string
  chain: string
  currency: string
  address: string | null
  destination_payment_rail: string | null
  destination_currency: string | null
  destination_external_account_id: string | null
  destination_address: string | null
  developer_fee_percent: string | null
  is_active: boolean
  created_at: string
}

export interface UpdateLiquidationAddressDto {
  external_account_id?: string
  custom_developer_fee_percent?: string | null
  destination_ach_reference?: string
  destination_wire_message?: string
  destination_sepa_reference?: string
  destination_spei_reference?: string
  destination_reference?: string
  return_address?: string
}

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

  /**
   * Lista las liquidation addresses de un usuario específico (vista admin).
   */
  async getLiquidationAddressesByUser(userId: string): Promise<AdminLiquidationAddress[]> {
    return apiGet<AdminLiquidationAddress[]>(`/admin/bridge/users/${userId}/liquidation-addresses`)
  },

  /**
   * Actualiza una liquidation address en Bridge (fuente de verdad) y luego
   * sincroniza la DB local con la respuesta confirmada de Bridge.
   */
  async updateLiquidationAddress(
    userId: string,
    laId: string,
    dto: UpdateLiquidationAddressDto,
  ): Promise<Record<string, unknown>> {
    return apiPatch<Record<string, unknown>>(
      `/admin/bridge/users/${userId}/liquidation-addresses/${laId}`,
      dto,
    )
  },
}
