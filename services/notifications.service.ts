import { createClient } from '@/lib/supabase/browser'
import { Notification } from '@/types/notification'

export const NotificationsService = {
  async getLatest(userId: string): Promise<Notification[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error
    return data as Notification[]
  },

  async markAsRead(notificationId: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    if (error) throw error
  },

  async markAllAsRead(userId: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) throw error
  },

  subscribe(userId: string, onInsert: (payload: Notification) => void) {
    const supabase = createClient()
    const channel = supabase.channel('realtime:notifications')
    
    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          onInsert(payload.new as Notification)
        }
      )
      .subscribe()
      
    return () => {
      supabase.removeChannel(channel)
    }
  }
}
