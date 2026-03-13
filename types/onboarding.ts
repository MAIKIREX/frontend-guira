export type OnboardingType = 'personal' | 'company'
export type OnboardingStatus = 'draft' | 'submitted' | 'under_review' | 'waiting_ubo_kyc' | 'verified' | 'rejected' | 'needs_changes'

export interface Onboarding {
  id: string
  user_id: string
  type: OnboardingType
  status: OnboardingStatus
  data: Record<string, unknown>
  observations?: string
  bridge_customer_id?: string
  created_at: string
  updated_at: string
}
