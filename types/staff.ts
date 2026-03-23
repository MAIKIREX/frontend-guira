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
    metadata?: Record<string, unknown>
  } | null
  client_photo_url?: string | null
}

export interface StaffUserRecord extends Profile {
  client_photo_url?: string | null
}

export interface StaffDocumentRecord {
  id?: string
  onboarding_id: string
  user_id: string
  doc_type: string
  storage_path: string
  mime_type?: string | null
  file_size?: number | null
  created_at?: string
  signed_url?: string | null
}

export interface StaffOnboardingDetail {
  record: StaffOnboardingRecord
  documents: StaffDocumentRecord[]
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
  users: StaffUserRecord[]
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

