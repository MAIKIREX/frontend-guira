import { createClient } from '@/lib/supabase/browser'
import { Notification } from '@/types/notification'

const NOTIFICATIONS_LIMIT = 20

export const NotificationsService = {
  async getLatest(userId: string): Promise<Notification[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(NOTIFICATIONS_LIMIT)

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

  subscribe(
    userId: string,
    onInsert: (payload: Notification) => void,
    options?: { onDisconnect?: () => void }
  ) {
    const supabase = createClient()
    const channelName = `notifications:${userId}`
    const channel = supabase.channel(channelName)
    let disconnected = false

    void supabase.auth.getSession().then(({ data }) => {
      const accessToken = data.session?.access_token
      if (accessToken) {
        void supabase.realtime.setAuth(accessToken)
      }
    })

    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          onInsert(payload.new as Notification)
        }
      )
      .subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          disconnected = false
          return
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          if (!disconnected) {
            disconnected = true
            options?.onDisconnect?.()
          }

          if (process.env.NODE_ENV === 'development' && error) {
            console.warn('Notifications realtime unavailable; using polling fallback', {
              channel: channelName,
              status,
              error,
            })
          }
        }
      })

    return () => {
      void channel.unsubscribe().catch((error) => {
        console.error('Failed to unsubscribe notifications channel', error)
      })
    }
  },
}
