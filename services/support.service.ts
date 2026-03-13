import { createClient } from '@/lib/supabase/browser'
import { SupportTicket } from '@/types/support'

export const SupportService = {
  async getTickets(userId: string): Promise<SupportTicket[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as SupportTicket[]
  },

  async createTicket(ticket: Omit<SupportTicket, 'id' | 'created_at' | 'updated_at' | 'status'>) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('support_tickets')
      .insert({ ...ticket, status: 'open' })
      .select()
      .single()

    if (error) throw error
    
    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: ticket.user_id,
      action: 'create_ticket',
      metadata: { subject: ticket.subject }
    })
    
    return data as SupportTicket
  },
  
  // For staff uses
  async getAllTickets(limit: number = 50): Promise<SupportTicket[]> {
     const supabase = createClient()
     const { data, error } = await supabase
      .from('support_tickets')
      .select('*, profiles(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(limit)
      
      if (error) throw error
      return data as SupportTicket[]
  }
}
