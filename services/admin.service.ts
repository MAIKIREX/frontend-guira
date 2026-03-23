import { createClient } from '@/lib/supabase/browser'
import type { AppSettingRow, FeeConfigRow, PsavConfigRow } from '@/types/payment-order'
import type { Profile } from '@/types/profile'
import type { StaffActor } from '@/types/staff'

export const AdminService = {
  async createUser(args: {
    actor: StaffActor
    email: string
    password: string
    fullName: string
    role: 'client' | 'staff' | 'admin'
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

    const { data: profile } = await supabase.from('profiles').select('*').eq('email', args.email).maybeSingle()

    await insertAdminAudit({
      actor: args.actor,
      action: 'create',
      tableName: 'profiles',
      recordId: String(profile?.id ?? args.email),
      previousValues: {},
      newValues: profile ? normalizeRecord(profile) : { email: args.email, role: args.role },
      reason: args.reason,
    })

    return { data, profile: profile as Profile | null }
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

    await insertAdminAudit({
      actor: args.actor,
      action: args.action === 'archive' ? 'logical_cancel' : 'update',
      tableName: 'profiles',
      recordId: args.user.id,
      previousValues: normalizeRecord(args.user),
      newValues: args.action === 'archive' ? { ...normalizeRecord(args.user), is_archived: true } : { deleted: true },
      reason: args.reason,
    })

    return data
  },

  async unarchiveUser(args: { actor: StaffActor; user: Profile; reason: string }) {
    assertAdmin(args.actor)
    const supabase = createClient()
    const { data, error } = await supabase.functions.invoke('admin-unarchive-user', {
      body: { userId: args.user.id },
    })
    if (error) throw error

    await insertAdminAudit({
      actor: args.actor,
      action: 'update',
      tableName: 'profiles',
      recordId: args.user.id,
      previousValues: normalizeRecord(args.user),
      newValues: { ...normalizeRecord(args.user), is_archived: false },
      reason: args.reason,
    })

    return data
  },

  async resetPassword(args: { actor: StaffActor; email: string; reason: string }) {
    assertAdmin(args.actor)
    const supabase = createClient()
    const { data, error } = await supabase.functions.invoke('admin-reset-password', {
      body: { email: args.email },
    })
    if (error) throw error

    await insertAdminAudit({
      actor: args.actor,
      action: 'update',
      tableName: 'profiles',
      recordId: args.email,
      previousValues: { email: args.email },
      newValues: { email: args.email, reset_requested: true },
      reason: args.reason,
    })

    return data
  },

  async updateFeeConfig(args: {
    actor: StaffActor
    record: FeeConfigRow
    value: number
    currency: string
    reason: string
  }) {
    assertPrivileged(args.actor)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('fees_config')
      .update({ value: args.value, currency: args.currency })
      .eq('id', args.record.id)
      .select('*')
      .single()
    if (error) throw error

    await insertAdminAudit({
      actor: args.actor,
      action: 'update',
      tableName: 'fees_config',
      recordId: args.record.id,
      previousValues: normalizeRecord(args.record),
      newValues: normalizeRecord(data),
      reason: args.reason,
    })

    return data as FeeConfigRow
  },

  async updateAppSetting(args: {
    actor: StaffActor
    record: AppSettingRow
    value: unknown
    reason: string
  }) {
    assertPrivileged(args.actor)
    const supabase = createClient()
    const payload = { ...args.record, value: args.value }
    const { data, error } = await supabase.from('app_settings').upsert(payload).select('*').single()
    if (error) throw error

    await insertAdminAudit({
      actor: args.actor,
      action: 'update',
      tableName: 'app_settings',
      recordId: String(args.record.id ?? args.record.key ?? args.record.name ?? 'app-setting'),
      previousValues: normalizeRecord(args.record),
      newValues: normalizeRecord(data),
      reason: args.reason,
    })

    return data as AppSettingRow
  },

  async syncParallelRatesFromForexApi(args: {
    actor: StaffActor
    appSettings: AppSettingRow[]
    reason?: string
  }) {
    assertPrivileged(args.actor)

    const response = await fetch('https://api-mdp-2.onrender.com/api/forex/exchange-rate/all?asset=USDT', {
      method: 'GET',
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`No se pudo consultar el endpoint externo (${response.status}).`)
    }

    const payload = (await response.json()) as ForexRatesResponse
    const buyRate = readExchangeRate(payload.buy?.data?.result?.exchangeRate, 'buy')
    const sellRate = readExchangeRate(payload.sell?.data?.result?.exchangeRate, 'sell')

    const previousBuyRecord = findAppSetting(args.appSettings, 'parallel_buy_rate')
    const previousSellRecord = findAppSetting(args.appSettings, 'parallel_sell_rate')

    const supabase = createClient()
    const { data, error } = await supabase
      .from('app_settings')
      .upsert(
        [
          {
            ...previousBuyRecord,
            key: 'parallel_buy_rate',
            value: buyRate,
          },
          {
            ...previousSellRecord,
            key: 'parallel_sell_rate',
            value: sellRate,
          },
        ],
        { onConflict: 'key' }
      )
      .select('*')

    if (error) throw error

    const updatedRecords = (data ?? []) as AppSettingRow[]
    const updatedBuyRecord = findAppSetting(updatedRecords, 'parallel_buy_rate')
    const updatedSellRecord = findAppSetting(updatedRecords, 'parallel_sell_rate')
    const reason = args.reason ?? 'Sincronizacion manual de tasas paralelas desde endpoint externo USDT.'

    if (!updatedBuyRecord || !updatedSellRecord) {
      throw new Error('La sincronizacion no devolvio ambas tasas actualizadas.')
    }

    await insertAdminAudit({
      actor: args.actor,
      action: 'update',
      tableName: 'app_settings',
      recordId: String(
        updatedBuyRecord.id ?? updatedBuyRecord.key ?? updatedBuyRecord.name ?? 'parallel_buy_rate'
      ),
      previousValues: normalizeRecord(previousBuyRecord),
      newValues: normalizeRecord(updatedBuyRecord),
      reason,
    })

    await insertAdminAudit({
      actor: args.actor,
      action: 'update',
      tableName: 'app_settings',
      recordId: String(
        updatedSellRecord.id ?? updatedSellRecord.key ?? updatedSellRecord.name ?? 'parallel_sell_rate'
      ),
      previousValues: normalizeRecord(previousSellRecord),
      newValues: normalizeRecord(updatedSellRecord),
      reason,
    })

    return {
      buy: updatedBuyRecord,
      sell: updatedSellRecord,
      sourceRates: {
        buy: buyRate,
        sell: sellRate,
      },
    }
  },

  async upsertPsavConfig(args: {
    actor: StaffActor
    payload: Record<string, unknown>
    reason: string
  }) {
    assertPrivileged(args.actor)
    const supabase = createClient()
    const action = args.payload.id ? 'update' : 'create'
    const { data, error } = await supabase.from('psav_configs').upsert(args.payload).select('*').single()
    if (error) throw error

    await insertAdminAudit({
      actor: args.actor,
      action,
      tableName: 'psav_configs',
      recordId: String((data as Record<string, unknown>).id ?? 'psav-config'),
      previousValues: action === 'create' ? {} : args.payload,
      newValues: normalizeRecord(data),
      reason: args.reason,
    })

    return data as PsavConfigRow
  },

  async deletePsavConfig(args: { actor: StaffActor; record: PsavConfigRow; reason: string }) {
    assertPrivileged(args.actor)
    const supabase = createClient()
    const { error } = await supabase.from('psav_configs').delete().eq('id', args.record.id)
    if (error) throw error

    await insertAdminAudit({
      actor: args.actor,
      action: 'logical_cancel',
      tableName: 'psav_configs',
      recordId: args.record.id,
      previousValues: normalizeRecord(args.record),
      newValues: { deleted: true },
      reason: args.reason,
    })
  },
}

function assertAdmin(actor: StaffActor) {
  if (actor.role !== 'admin') {
    throw new Error('Esta accion requiere rol admin.')
  }
}

function assertPrivileged(actor: StaffActor) {
  if (actor.role !== 'admin' && actor.role !== 'staff') {
    throw new Error('Esta accion requiere rol admin o staff.')
  }
}

async function insertAdminAudit(args: {
  actor: StaffActor
  action: 'create' | 'update' | 'logical_cancel'
  tableName: string
  recordId: string
  previousValues: Record<string, unknown>
  newValues: Record<string, unknown>
  reason: string
}) {
  const supabase = createClient()
  const affectedFields = Object.keys(args.newValues).filter(
    (key) => JSON.stringify(args.previousValues[key]) !== JSON.stringify(args.newValues[key])
  )
  const { error } = await supabase.from('audit_logs').insert({
    performed_by: args.actor.userId,
    role: args.actor.role,
    action: args.action,
    table_name: args.tableName,
    record_id: normalizeAuditRecordId(args.recordId),
    affected_fields: affectedFields,
    previous_values: args.previousValues,
    new_values: args.newValues,
    reason: args.reason,
    source: 'ui',
  })
  if (error) throw error
}

function normalizeRecord(value: unknown) {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

interface ForexRatesResponse {
  buy?: {
    data?: {
      result?: {
        exchangeRate?: number | string
      }
    }
  }
  sell?: {
    data?: {
      result?: {
        exchangeRate?: number | string
      }
    }
  }
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

function findAppSetting(records: AppSettingRow[], key: string) {
  const normalizedKey = key.trim().toLowerCase()
  return (
    records.find((record) => String(record.key ?? record.name ?? '').trim().toLowerCase() === normalizedKey) ?? null
  )
}

function normalizeAuditRecordId(recordId: string) {
  return isUuid(recordId) ? recordId : crypto.randomUUID()
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim())
}
