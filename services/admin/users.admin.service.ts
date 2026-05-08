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

  // ── VA Fee Defaults (globales) ─────────────────────

  /**
   * Lista todos los fees globales por defecto (6 monedas × 2 destinos).
   */
  async listVaFeeDefaults(): Promise<VaFeeDefault[]> {
    return apiGet<VaFeeDefault[]>('/admin/bridge/va-fee-defaults')
  },

  /**
   * Actualiza un fee global por defecto.
   */
  async updateVaFeeDefault(data: { source_currency: string; destination_type: string; fee_percent: number }): Promise<VaFeeDefault> {
    return apiPatch<VaFeeDefault>('/admin/bridge/va-fee-defaults', data)
  },

  // ── VA Fee Overrides (por usuario) ─────────────────

  /**
   * Lista los fee overrides configurados para un usuario.
   */
  async listVaFeeOverrides(userId: string): Promise<VaFeeOverride[]> {
    return apiGet<VaFeeOverride[]>(`/admin/bridge/users/${userId}/va-fee-overrides`)
  },

  /**
   * Establece o actualiza un fee override para un usuario.
   */
  async setVaFeeOverride(userId: string, data: SetVaFeeOverridePayload): Promise<VaFeeOverride> {
    return apiPatch<VaFeeOverride>(`/admin/bridge/users/${userId}/va-fee-overrides`, data)
  },

  /**
   * Elimina un fee override de un usuario.
   */
  async clearVaFeeOverride(userId: string, source_currency: string, destination_type: string): Promise<void> {
    return apiDelete<void>(`/admin/bridge/users/${userId}/va-fee-overrides`, {
      data: { source_currency, destination_type },
    })
  },

  // ── VA Fee Matrix (resuelto) ─────────────────────

  /**
   * Obtiene la matriz completa de fees resueltos (12 combinaciones) con fuente.
   */
  async getVaFeeMatrix(userId: string): Promise<VaFeeMatrixEntry[]> {
    return apiGet<VaFeeMatrixEntry[]>(`/admin/bridge/users/${userId}/va-fee-matrix`)
  },

  /**
   * Actualiza una VA existente (fee, destination_address, destination_currency).
   * Usa el endpoint genérico PATCH /admin/bridge/virtual-accounts/:id
   */
  async updateVirtualAccount(vaId: string, data: UpdateVirtualAccountPayload): Promise<unknown> {
    return apiPatch<unknown>(`/admin/bridge/virtual-accounts/${vaId}`, data)
  },

  /**
   * Lista las VAs activas de un usuario (admin).
   */
  async listUserVirtualAccounts(userId: string): Promise<AdminVirtualAccount[]> {
    return apiGet<AdminVirtualAccount[]>(`/admin/bridge/users/${userId}/virtual-accounts`)
  },

  // ── Limit Overrides (límites personalizados por cliente VIP) ─────

  /**
   * Lista los overrides de límite de un usuario.
   */
  async getLimitOverrides(userId: string): Promise<LimitOverride[]> {
    return apiGet<LimitOverride[]>(`/admin/payment-orders/limit-overrides/${userId}`)
  },

  /**
   * Crea un override de límite para un cliente VIP.
   * No puede haber dos activos con el mismo flow_type.
   */
  async createLimitOverride(data: CreateLimitOverridePayload): Promise<LimitOverride> {
    return apiPost<LimitOverride>('/admin/payment-orders/limit-overrides', data)
  },

  /**
   * Actualiza un override de límite (valores, is_active, valid_until, notes).
   */
  async updateLimitOverride(overrideId: string, data: Partial<LimitOverride>): Promise<LimitOverride> {
    return apiPatch<LimitOverride>(`/admin/payment-orders/limit-overrides/${overrideId}`, data)
  },

  /**
   * Elimina un override de límite permanentemente. Solo super_admin.
   */
  async deleteLimitOverride(overrideId: string): Promise<void> {
    return apiDelete<void>(`/admin/payment-orders/limit-overrides/${overrideId}`)
  },
}

// ── Tipos ────────────────────────────────────────────────────────

export interface VaFeeDefault {
  id: string
  source_currency: string
  destination_type: string
  fee_percent: number
  updated_by: string | null
  updated_at: string
}

export interface VaFeeOverride {
  id: string
  user_id: string
  source_currency: string
  destination_type: string
  fee_percent: number
  reason: string | null
  set_by: string | null
  created_at: string
  updated_at: string
}

export interface VaFeeMatrixEntry {
  source_currency: string
  destination_type: string
  resolved_fee: number | null
  source: 'override' | 'default'
}

export interface SetVaFeeOverridePayload {
  source_currency: string
  destination_type: string
  fee_percent: number
  reason: string
}

export interface AdminVirtualAccount {
  id: string
  bridge_virtual_account_id: string
  source_currency: string
  destination_currency: string
  destination_address: string | null
  destination_payment_rail: string
  developer_fee_percent: number | null
  is_external_sweep: boolean
  status: string
  created_at: string
}

export interface UpdateVirtualAccountPayload {
  developer_fee_percent?: number
  destination_address?: string
  destination_currency?: string
  destination_payment_rail?: string
  reason: string
}

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
  | 'wallet_to_fiat_off'


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

export type LimitOverrideFlowType =
  | 'bolivia_to_world'
  | 'bolivia_to_wallet'
  | 'wallet_to_wallet'
  | 'world_to_bolivia'
  | 'fiat_bo_to_bridge_wallet'
  | 'crypto_to_bridge_wallet'
  | 'bridge_wallet_to_fiat_bo'
  | 'bridge_wallet_to_crypto'
  | 'bridge_wallet_to_fiat_us'

export interface LimitOverride {
  id: string
  user_id: string
  flow_type: LimitOverrideFlowType
  min_usd?: number | null
  max_usd?: number | null
  is_active: boolean
  valid_from: string
  valid_until?: string | null
  notes?: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface CreateLimitOverridePayload {
  user_id: string
  flow_type: LimitOverrideFlowType
  min_usd?: number | null
  max_usd?: number | null
  valid_from?: string
  valid_until?: string
  notes?: string
}
