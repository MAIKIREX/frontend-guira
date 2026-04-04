/**
 * admin.service.ts
 *
 * COMPLETAMENTE MIGRADO — Todas las operaciones usan el backend NestJS via REST API.
 * No hay referencias directas a Supabase DB Client.
 *
 * Mapeo de Endpoints:
 * - Fees:        /admin/fees
 * - Settings:    /admin/settings
 * - PSAV:        /admin/psav
 * - Profiles:    /admin/profiles (freeze/unfreeze, role)
 * - Audit logs:  /admin/audit-logs
 *
 * Nota: createUser, archiveUser y resetPassword invocan Edge Functions de Supabase
 * por ser operaciones que requieren privilegios de Supabase Admin. Esto es correcto
 * y se conserva como patrón de delegación de Auth.
 */
import { createClient } from '@/lib/supabase/browser'
import { apiGet, apiPatch, apiPost, apiDelete } from '@/lib/api/client'
import type { AppSettingRow, FeeConfigRow, PsavConfigRow } from '@/types/payment-order'
import type { Profile } from '@/types/profile'
import type { StaffActor } from '@/types/staff'

export const AdminService = {
  // ── GESTIÓN DE USUARIOS (via Supabase Edge Functions — requieren Admin SDK) ──

  async createUser(args: {
    actor: StaffActor
    email: string
    password: string
    fullName: string
    role: 'client' | 'staff' | 'admin' | 'super_admin'
    reason: string
  }) {
    assertAdmin(args.actor)
    const supabase = createClient()
    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: {
        email: args.email,
        password: args.password,
        full_name: args.fullName,
        role: args.role,
      },
    })
    if (error) throw error
    return data
  },

  async archiveOrDeleteUser(args: {
    actor: StaffActor
    user: Profile
    action: 'archive' | 'delete'
    reason: string
  }) {
    assertAdmin(args.actor)
    const supabase = createClient()
    const { data, error } = await supabase.functions.invoke('admin-delete-user', {
      body: {
        userId: args.user.id,
        action: args.action,
      },
    })
    if (error) throw error
    return data
  },

  async unarchiveUser(args: { actor: StaffActor; user: Profile; reason: string }) {
    assertAdmin(args.actor)
    const supabase = createClient()
    const { data, error } = await supabase.functions.invoke('admin-unarchive-user', {
      body: { userId: args.user.id },
    })
    if (error) throw error
    return data
  },

  async resetPassword(args: { actor: StaffActor; email: string; reason: string }) {
    assertAdmin(args.actor)
    const supabase = createClient()
    const { data, error } = await supabase.functions.invoke('admin-reset-password', {
      body: { email: args.email },
    })
    if (error) throw error
    return data
  },

  // ── FEES CONFIG (via NestJS /admin/fees) ───────────────────────────────────

  async updateFeeConfig(args: {
    actor: StaffActor
    record: FeeConfigRow
    value: number
    currency: string
    reason: string
  }) {
    assertPrivileged(args.actor)
    return apiPatch<FeeConfigRow>(`/admin/fees/${args.record.id}`, {
      value: args.value,
      currency: args.currency,
    })
  },

  // ── APP SETTINGS (via NestJS /admin/settings) ───────────────────────────────

  async updateAppSetting(args: {
    actor: StaffActor
    record: AppSettingRow
    value: unknown
    reason: string
  }) {
    assertPrivileged(args.actor)
    const key = String(args.record.key ?? args.record.name ?? '')
    return apiPatch<AppSettingRow>(`/admin/settings/${key}`, {
      value: args.value,
    })
  },

  // ── TASAS PARALELAS (Forex API externo → NestJS /admin/settings) ────────────
  // La sincronización se llama al backend que ya tiene el endpoint de Exchange Rates.

  async syncExchangeRates(args: {
    actor: StaffActor
    reason?: string
  }) {
    assertPrivileged(args.actor)
    return apiPost<{ 
      message: string; 
      buy_rate_bob_usd: number; 
      sell_rate_usd_bob: number 
    }>('/admin/payment-orders/exchange-rates/sync')
  },

  // ── PSAV CONFIGS (via NestJS /admin/psav) ───────────────────────────────────

  async upsertPsavConfig(args: {
    actor: StaffActor
    payload: Record<string, unknown>
    reason: string
  }) {
    assertPrivileged(args.actor)
    if (args.payload.id) {
      // No hay PATCH para PSAV en el backend; se recrea
      return apiPost<PsavConfigRow>('/admin/payment-orders/psav-accounts', args.payload)
    }
    return apiPost<PsavConfigRow>('/admin/payment-orders/psav-accounts', args.payload)
  },

  async deletePsavConfig(args: { actor: StaffActor; record: PsavConfigRow; reason: string }) {
    assertPrivileged(args.actor)
    return apiDelete<void>(`/admin/psav/${args.record.id}`)
  },

  // ── LECTURA DE DATOS (via NestJS) ────────────────────────────────────────────

  async getAllSettings(): Promise<AppSettingRow[]> {
    return apiGet<AppSettingRow[]>('/admin/settings')
  },

  async getAllFees(): Promise<FeeConfigRow[]> {
    return apiGet<FeeConfigRow[]>('/admin/fees')
  },

  async getPublicSettings(): Promise<Record<string, string>> {
    return apiGet<Record<string, string>>('/settings/public')
  },
}

// ── Helpers de Autorización ──────────────────────────────────────────────────

function assertAdmin(actor: StaffActor) {
  if (actor.role !== 'admin' && actor.role !== 'super_admin') {
    throw new Error('Esta accion requiere rol admin o super_admin.')
  }
}

function assertPrivileged(actor: StaffActor) {
  if (actor.role !== 'admin' && actor.role !== 'staff' && actor.role !== 'super_admin') {
    throw new Error('Esta accion requiere rol admin, staff o super_admin.')
  }
}

// ── Forex Types ──────────────────────────────────────────────────────────────

interface ForexRatesResponse {
  buy?: { data?: { result?: { exchangeRate?: number | string } } }
  sell?: { data?: { result?: { exchangeRate?: number | string } } }
}

function readExchangeRate(value: unknown, side: 'buy' | 'sell') {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value.trim().replace(',', '.'))
        : Number.NaN

  if (!Number.isFinite(parsed)) {
    throw new Error(`El endpoint no devolvio un exchangeRate valido para ${side}.`)
  }
  return parsed
}
