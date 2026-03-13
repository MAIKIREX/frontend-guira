export type NotificationType = 'status_change' | 'onboarding_update' | 'new_order' | 'support_update' | 'system'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  link?: string
  is_read: boolean
  created_at: string
}
