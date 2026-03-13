export type Role = 'client' | 'staff' | 'admin'

export interface Profile {
  id: string
  email: string
  role: Role
  full_name: string
  onboarding_status: string
  bridge_customer_id?: string
  created_at: string
  is_archived: boolean
  metadata?: Record<string, unknown>
}
