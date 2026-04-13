/**
 * admin/bridge-transfers.admin.service.ts
 * 
 * Servicio admin para consultar las transferencias Bridge (bridge_transfers).
 * Endpoint: GET /admin/bridge/transfers
 */
import { apiGet } from '@/lib/api/client'
import type { AdminBridgeTransfer } from '@/types/bridge-transfer'

export const BridgeTransfersAdminService = {
  /**
   * Lista todas las transferencias Bridge (todas las cuentas).
   * Opcionalmente filtra por status.
   */
  async getTransfers(params?: { status?: string }): Promise<AdminBridgeTransfer[]> {
    return apiGet<AdminBridgeTransfer[]>('/admin/bridge/transfers', { params })
  },
}
