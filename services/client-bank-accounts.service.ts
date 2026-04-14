/**
 * client-bank-accounts.service.ts
 *
 * Servicio para gestionar la cuenta bancaria del cliente (Bolivia).
 * Endpoints: /client-bank-accounts/...
 */
import { apiGet, apiPost, apiPatch } from '@/lib/api/client'

export interface ClientBankAccount {
  id: string
  user_id: string
  bank_name: string
  account_number: string
  account_holder: string
  currency: string
  country: string
  account_type: string
  is_primary: boolean
  is_verified: boolean
  status: 'approved' | 'pending_approval'
  pending_changes: Record<string, string> | null
  change_reason: string | null
  last_change_requested_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateBankAccountInput {
  bank_name: string
  account_number: string
  account_holder: string
  account_type?: 'savings' | 'checking'
}

export interface UpdateBankAccountInput {
  bank_name?: string
  account_number?: string
  account_holder?: string
  account_type?: 'savings' | 'checking'
  change_reason: string
}

export const ClientBankAccountsService = {
  /**
   * Registra una nueva cuenta bancaria para el usuario autenticado.
   */
  async create(data: CreateBankAccountInput): Promise<ClientBankAccount> {
    return apiPost<ClientBankAccount>('/client-bank-accounts', data)
  },

  /**
   * Lista las cuentas bancarias del usuario autenticado.
   */
  async list(): Promise<ClientBankAccount[]> {
    return apiGet<ClientBankAccount[]>('/client-bank-accounts')
  },

  /**
   * Obtiene la cuenta bancaria primaria BOB del usuario.
   * Retorna null si no tiene cuenta registrada.
   */
  async getPrimary(): Promise<ClientBankAccount | null> {
    return apiGet<ClientBankAccount | null>('/client-bank-accounts/primary')
  },

  /**
   * Solicita actualización de la cuenta bancaria.
   * Los cambios quedan pendientes de aprobación por el staff.
   * Límite: 1 solicitud por mes calendario.
   */
  async requestUpdate(id: string, data: UpdateBankAccountInput): Promise<ClientBankAccount> {
    return apiPatch<ClientBankAccount>(`/client-bank-accounts/${id}`, data)
  },
}
