export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export interface SupportTicket {
  id?: string
  user_id: string
  subject: string
  message: string
  contact_email: string
  contact_phone: string
  status?: TicketStatus
  created_at?: string
  updated_at?: string
}
