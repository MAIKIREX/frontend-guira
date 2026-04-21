/**
 * Tipos de onboarding para Guira.
 *
 * AUDIT FIX (2025-04-05) — H13:
 * OnboardingStatus ahora usa los valores reales definidos en el CHECK constraint
 * de la tabla `profiles.onboarding_status` de la BD, sincronizados también con
 * los valores de `kyc_applications.status` y `kyb_applications.status`.
 *
 * Valores previos eliminados (no existían en BD):
 *   ❌ 'draft', 'under_review', 'waiting_ubo_kyc', 'verified', 'needs_changes'
 *
 * Referencia BD:
 *   profiles.onboarding_status CHECK:
 *     'pending', 'in_progress', 'kyc_started', 'kyb_started',
 *     'kyc_submitted', 'kyb_submitted', 'in_review', 'approved', 'rejected', 'suspended'
 *
 *   kyc_applications.status / kyb_applications.status CHECK:
 *     'pending', 'in_progress', 'submitted', 'approved', 'rejected', 'needs_review'
 *
 *   Bridge CustomerStatus (referencia):
 *     'active', 'awaiting_questionnaire', 'awaiting_ubo', 'incomplete',
 *     'not_started', 'offboarded', 'paused', 'rejected', 'under_review'
 */

export type OnboardingType = 'personal' | 'company'

/** Estado del onboarding del perfil (profiles.onboarding_status). */
export type OnboardingStatus =
  | 'pending'
  | 'in_progress'
  | 'kyc_started'
  | 'kyb_started'
  | 'kyc_submitted'
  | 'kyb_submitted'
  | 'in_review'
  | 'pending_bridge'
  | 'approved'
  | 'rejected'
  | 'suspended'

/** Estado de una aplicación KYC/KYB individual (kyc_applications.status / kyb_applications.status). */
export type ApplicationStatus =
  | 'pending'
  | 'in_progress'
  | 'submitted'
  | 'pending_bridge'
  | 'approved'
  | 'rejected'
  | 'needs_review'

/** Estado de un customer en Bridge API (referencia — no persisted en Guira DB). */
export type BridgeCustomerStatus =
  | 'active'
  | 'awaiting_questionnaire'
  | 'awaiting_ubo'
  | 'incomplete'
  | 'not_started'
  | 'offboarded'
  | 'paused'
  | 'rejected'
  | 'under_review'

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
