export type Role = 'client' | 'staff' | 'admin' | 'super_admin'

export interface Profile {
  id: string
  email: string
  role: Role
  full_name: string
  onboarding_status: string
  bridge_customer_id?: string
  avatar_url?: string
  va_developer_fee_percent?: number | null
  created_at: string
  is_archived: boolean
  metadata?: Record<string, unknown>
}
