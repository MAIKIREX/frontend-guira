/**
 * admin/config.admin.service.ts — NUEVO
 * 
 * Configuración global del sistema: fees, tasas, PSAV, audit logs, settings.
 * Reemplaza la parte de configuración de staff.service.ts y admin.service.ts.
 * 
 * Todos los endpoints requieren rol: admin | super_admin
 */
import { apiGet, apiPost, apiPatch } from '@/lib/api/client'
import type { PaginationParams } from '@/lib/api/types'

export interface FeeConfig {
  id: string
  type: string
  percentage: number
  flat_amount?: number
  currency?: string
  is_active: boolean
}

export interface ExchangeRatePair {
  id: string
  from_currency: string
  to_currency: string
  rate: number
  spread_percent?: number
  provider: string
  updated_at: string
}

export interface PsavConfig {
  id: string
  account_name: string
  account_number: string
  bank_name: string
  currency: string
  is_active: boolean
}

export interface AuditLogEntry {
  id: string
  user_id?: string
  table_name: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  old_values?: Record<string, unknown>
  new_values?: Record<string, unknown>
  ip_address?: string
  created_at: string
}

export interface AppSetting {
  key: string
  value: string
  description?: string
  updated_at: string
}

export interface AuditLogFilter extends PaginationParams {
  user_id?: string
  table_name?: string
  action?: string
  from?: string
  to?: string
}

export const ConfigAdminService = {

  // ── Fees ──────────────────────────────────────────────────────

  async getFeesConfig(): Promise<FeeConfig[]> {
    return apiGet<FeeConfig[]>('/admin/fees')
  },

  async updateFeeConfig(feeId: string, updates: Partial<Pick<FeeConfig, 'percentage' | 'flat_amount' | 'is_active'>>): Promise<FeeConfig> {
    return apiPatch<FeeConfig>(`/admin/fees/${feeId}`, updates)
  },

  // NOTA: La gestión de fee overrides por cliente se movió a UsersAdminService

  // ── Exchange Rates ─────────────────────────────────────────────

  async getExchangeRates(): Promise<ExchangeRatePair[]> {
    return apiGet<ExchangeRatePair[]>('/admin/payment-orders/exchange-rates')
  },

  async syncExchangeRates(): Promise<void> {
    return apiPost<void>('/admin/payment-orders/exchange-rates/sync')
  },

  async updateExchangeRate(pair: string, rate: number, spread_percent?: number): Promise<ExchangeRatePair> {
    return apiPost<ExchangeRatePair>(`/admin/payment-orders/exchange-rates/${pair}`, { rate, spread_percent })
  },

  // ── PSAV ──────────────────────────────────────────────────────

  async getPsavConfigs(): Promise<PsavConfig[]> {
    return apiGet<PsavConfig[]>('/admin/payment-orders/psav-accounts')
  },

  async updatePsavConfig(psavId: string, updates: Partial<PsavConfig>): Promise<PsavConfig> {
    return apiPost<PsavConfig>(`/admin/payment-orders/psav-accounts`, updates)
  },

  // ── App Settings ──────────────────────────────────────────────

  async getSettings(): Promise<AppSetting[]> {
    return apiGet<AppSetting[]>('/admin/settings')
  },

  async updateSetting(key: string, value: string): Promise<AppSetting> {
    return apiPatch<AppSetting>(`/admin/settings/${key}`, { value })
  },

  // ── Audit Logs ────────────────────────────────────────────────

  /**
   * Lista el audit log con filtros avanzados.
   * Diferente de activity_logs: este registra cambios del staff al sistema.
   */
  async getAuditLogs(params?: AuditLogFilter): Promise<AuditLogEntry[]> {
    return apiGet<AuditLogEntry[]>('/admin/audit-logs', { params })
  },

  /**
   * Audit log de un usuario específico.
   */
  async getUserAuditLogs(userId: string, params?: PaginationParams): Promise<AuditLogEntry[]> {
    return apiGet<AuditLogEntry[]>(`/admin/audit-logs/user/${userId}`, { params })
  },
}
