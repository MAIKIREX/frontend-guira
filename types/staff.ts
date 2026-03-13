import type { Onboarding } from '@/types/onboarding'
import type { BridgeTransfer } from '@/types/bridge-transfer'
import type { PaymentOrder, FeeConfigRow, AppSettingRow, PsavConfigRow } from '@/types/payment-order'
import type { Profile } from '@/types/profile'
import type { SupportTicket } from '@/types/support'
import type { AuditLog } from '@/types/activity-log'

export interface StaffOnboardingRecord extends Onboarding {
  profiles?: {
    full_name?: string
    email?: string
    onboarding_status?: string
  } | null
}

export interface StaffSupportTicket extends SupportTicket {
  profiles?: {
    full_name?: string
    email?: string
  } | null
}

export interface StaffSnapshot {
  onboarding: StaffOnboardingRecord[]
  payinRoutes: Array<Record<string, unknown>>
  transfers: BridgeTransfer[]
  orders: PaymentOrder[]
  users: Profile[]
  support: StaffSupportTicket[]
  feesConfig: FeeConfigRow[]
  appSettings: AppSettingRow[]
  psavConfigs: PsavConfigRow[]
  auditLogs: AuditLog[]
  gaps: string[]
}

export interface StaffActor {
  userId: string
  role: 'staff' | 'admin'
}

