/**
 * notifications.service.ts
 * 
 * MIGRADO PARCIALMENTE:
 * - CRUD (getLatest, markAsRead, markAllAsRead) → REST API
 * - subscribe() → SE MANTIENE con Supabase Realtime (no tiene equivalente en el backend)
 * 
 * El backend no ofrece WebSocket/SSE, por lo que Realtime de Supabase se conserva
 * únicamente para el canal de notificaciones en tiempo real.
 */
import { createClient } from '@/lib/supabase/browser'
import { apiGet, apiPatch } from '@/lib/api/client'
import type { Notification } from '@/types/notification'
import type { PaginationParams } from '@/lib/api/types'

export const NotificationsService = {
  /**
   * Obtiene las últimas notificaciones del usuario autenticado.
   */
  async getLatest(params?: PaginationParams & { unread_only?: boolean }): Promise<Notification[]> {
    const res = await apiGet<any>('/notifications', { params })
    return (res && Array.isArray(res.data)) ? res.data : (Array.isArray(res) ? res : [])
  },

  /**
   * Marca una notificación como leída.
   */
  async markAsRead(notificationId: string): Promise<void> {
    return apiPatch<void>(`/notifications/${notificationId}/read`)
  },

  /**
   * Marca todas las notificaciones del usuario como leídas.
   */
  async markAllAsRead(): Promise<void> {
    return apiPatch<void>('/notifications/read-all')
  },

  /**
   * SUPABASE REALTIME — SE MANTIENE (no hay equivalente en el backend NestJS).
   * Suscripción en tiempo real a nuevas notificaciones del usuario.
   * Devuelve una función de cleanup para cancelar la suscripción.
   */
  subscribe(
    userId: string,
    onInsert: (payload: Notification) => void,
    options?: { onDisconnect?: () => void }
  ) {
    const supabase = createClient()
    const channelName = `notifications:${userId}`
    const channel = supabase.channel(channelName)
    let disconnected = false

    // Sincronizar token para Realtime
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
