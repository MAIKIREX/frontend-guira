/**
 * admin/users.admin.service.ts — NUEVO
 * 
 * Gestión de usuarios desde el panel admin.
 * Incluye: listado, detalle, freeze/unfreeze, actividad y límites transaccionales.
 * 
 * Todos los endpoints requieren rol: admin | super_admin
 */
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api/client'
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

  /**
   * Cambia el rol de un usuario.
   * Solo admin y super_admin pueden invocar.
   * admin puede asignar: client, staff.
   * super_admin puede asignar: client, staff, admin, super_admin.
   */
  async updateRole(userId: string, role: string, reason: string): Promise<Profile> {
    return apiPatch<Profile>(`/admin/profiles/${userId}/role`, { role, reason })
  },

  // ── Fee Overrides (tarifas personalizadas por cliente) ─────────

  /**
   * Lista los overrides de fee de un usuario.
   */
  async getOverrides(userId: string): Promise<FeeOverride[]> {
    return apiGet<FeeOverride[]>(`/admin/fees/overrides/${userId}`)
  },

  /**
   * Crea un override de fee para un usuario.
   * No puede haber dos activos con el mismo operation_type+payment_rail.
   */
  async createOverride(data: CreateFeeOverridePayload): Promise<FeeOverride> {
    return apiPost<FeeOverride>('/admin/fees/overrides', data)
  },

  /**
   * Actualiza un override existente (fee values, is_active, valid_until, notes).
   */
  async updateOverride(overrideId: string, data: Partial<FeeOverride>): Promise<FeeOverride> {
    return apiPatch<FeeOverride>(`/admin/fees/overrides/${overrideId}`, data)
  },

  /**
   * Elimina un override permanentemente. Solo super_admin.
   */
  async deleteOverride(overrideId: string): Promise<void> {
    return apiDelete<void>(`/admin/fees/overrides/${overrideId}`)
  },
}

// ── Tipos ────────────────────────────────────────────────────────

export interface FeeOverride {
  id: string
  user_id: string
  operation_type: string
  payment_rail: string
  currency: string
  fee_type: 'percent' | 'fixed' | 'mixed'
  fee_percent?: number | null
  fee_fixed?: number | null
  min_fee?: number | null
  max_fee?: number | null
  is_active: boolean
  valid_from: string
  valid_until?: string | null
  notes?: string | null
  created_by: string
  created_at: string
}

export type VigentOperationType =
  | 'interbank_bo_out' | 'interbank_w2w' | 'interbank_bo_wallet' | 'interbank_bo_in'
  | 'ramp_on_fiat_us' | 'ramp_on_bo' | 'ramp_on_crypto'
  | 'ramp_off_bo' | 'ramp_off_crypto' | 'ramp_off_fiat_us'

export type VigentPaymentRail = 'psav' | 'bridge'

export interface CreateFeeOverridePayload {
  user_id: string
  operation_type: VigentOperationType
  payment_rail: VigentPaymentRail
  currency: 'USD' | 'BOB' | 'USDC' | 'USDT'
  fee_type: 'percent' | 'fixed' | 'mixed'
  fee_percent?: number
  fee_fixed?: number
  min_fee?: number
  max_fee?: number
  valid_from?: string
  valid_until?: string
  notes?: string
}

