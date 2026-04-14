/**
 * bank-accounts.admin.service.ts
 *
 * Servicio de administración para cuentas bancarias de clientes.
 * Endpoints: /admin/client-bank-accounts/...
 */
import { apiGet, apiPatch } from '@/lib/api/client'
import type { ClientBankAccount } from '@/services/client-bank-accounts.service'

export interface PendingBankAccount extends ClientBankAccount {
  profiles?: {
    email: string
    full_name: string | null
  }
}

export const BankAccountsAdminService = {
  /**
   * Lista todas las cuentas bancarias con cambios pendientes de aprobación.
   */
  async listPending(): Promise<PendingBankAccount[]> {
    return apiGet<PendingBankAccount[]>('/admin/client-bank-accounts/pending')
  },

  /**
   * Ver las cuentas bancarias de un usuario específico.
   */
  async getByUser(userId: string): Promise<ClientBankAccount[]> {
    return apiGet<ClientBankAccount[]>(`/admin/client-bank-accounts/user/${userId}`)
  },

  /**
   * Aprobar los cambios pendientes de una cuenta bancaria.
   */
  async approve(accountId: string): Promise<ClientBankAccount> {
    return apiPatch<ClientBankAccount>(`/admin/client-bank-accounts/${accountId}/approve`, {})
  },

  /**
   * Rechazar los cambios pendientes de una cuenta bancaria.
   */
  async reject(accountId: string, reason: string): Promise<ClientBankAccount> {
    return apiPatch<ClientBankAccount>(`/admin/client-bank-accounts/${accountId}/reject`, { reason })
  },
}
