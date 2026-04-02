/**
 * admin/users.admin.service.ts — NUEVO
 * 
 * Gestión de usuarios desde el panel admin.
 * Incluye: listado, detalle, freeze/unfreeze, actividad y límites transaccionales.
 * 
 * Todos los endpoints requieren rol: admin | super_admin
 */
import { apiGet, apiPost, apiPatch } from '@/lib/api/client'
import type { PaginationParams } from '@/lib/api/types'
import type { Profile } from '@/types/profile'

export interface AdminUserListParams extends PaginationParams {
  search?: string
  status?: string
  kyc_status?: string
  role?: string
}

export interface TransactionLimitsDto {
  daily_limit: number
  monthly_limit: number
  per_transaction_limit: number
  currency: string
}

export const UsersAdminService = {
  /**
   * Lista usuarios con filtros.
   */
  async getUsers(params?: AdminUserListParams): Promise<Profile[]> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { search, status, kyc_status, ...allowedParams } = params || {}
    return apiGet<Profile[]>('/admin/profiles', { params: allowedParams })
  },

  /**
   * Detalle de un usuario específico.
   */
  async getUser(userId: string): Promise<Profile> {
    return apiGet<Profile>(`/admin/profiles/${userId}`)
  },

  /**
   * Congela la cuenta de un usuario (impide operaciones).
   */
  async freezeUser(userId: string, reason?: string): Promise<void> {
    return apiPatch<void>(`/admin/profiles/${userId}/freeze`, { freeze: true, reason })
  },

  /**
   * Descongela la cuenta de un usuario.
   */
  async unfreezeUser(userId: string): Promise<void> {
    return apiPatch<void>(`/admin/profiles/${userId}/freeze`, { freeze: false })
  },

  /**
   * Obtiene el historial de actividad de un usuario.
   */
  async getUserActivity(userId: string, params?: PaginationParams): Promise<unknown[]> {
    return apiGet<unknown[]>(`/admin/activity/${userId}`, { params })
  },

  /**
   * Ajusta los límites transaccionales de un usuario.
   * Se registra automáticamente en el audit log.
   */
  async setTransactionLimits(userId: string, dto: TransactionLimitsDto): Promise<void> {
    return apiPost<void>(`/admin/users/${userId}/limits`, dto)
  },
}
