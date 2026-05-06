'use client'

import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useNotificationsStore } from '@/stores/notifications-store'
import { NotificationsService } from '@/services/notifications.service'
import { useAuthStore } from '@/stores/auth-store'
import { isApiError } from '@/lib/api/types'

const NOTIFICATIONS_POLL_INTERVAL_MS = 30000

export function NotificationBell() {
  const { user } = useAuthStore()
  const { notifications, unreadCount, setNotifications, addNotification, markAsRead, markAllAsRead } = useNotificationsStore()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let mounted = true

    async function loadNotifications() {
      if (!user) return

      try {
        const data = await NotificationsService.getLatest()
        if (mounted) setNotifications(data)
      } catch (err) {
        if (isApiError(err) && err.code === 'NETWORK_ERROR') {
          // Fallo silencioso en caso de error de red (e.g. cold start del backend)
          return
        }
        console.error('Error loading notifications', err)
      }
    }

    void loadNotifications()
    const pollInterval = window.setInterval(() => {
      void loadNotifications()
    }, NOTIFICATIONS_POLL_INTERVAL_MS)

    if (user) {
      const unsubscribe = NotificationsService.subscribe(
        user.id,
        (newNotification) => {
          if (mounted) addNotification(newNotification)
        },
        {
          onDisconnect: () => {
            void loadNotifications()
          },
        }
      )

      return () => {
        mounted = false
        window.clearInterval(pollInterval)
        unsubscribe()
      }
    }

    return () => {
      mounted = false
      window.clearInterval(pollInterval)
    }
  }, [user, setNotifications, addNotification])

  const handleMarkAsRead = async (id: string, isRead: boolean) => {
    if (isRead) return
    try {
      await NotificationsService.markAsRead(id)
      markAsRead(id)
    } catch (err) {
      console.error(err)
    }
  }

  const handleMarkAll = async () => {
    if (!user || unreadCount === 0) return
    try {
      await NotificationsService.markAllAsRead()
      markAllAsRead()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="relative group inline-flex h-9 w-9 items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 text-sidebar-foreground/60 hover:bg-white/5 hover:text-white">
        <Bell strokeWidth={2} className="size-[1.15rem]" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-2 w-2 h-2 bg-[#E84040] rounded-full border border-sidebar animate-pulse" />
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex justify-between items-center px-4 py-3 border-b">
          <h4 className="font-semibold text-sm">Notificaciones</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-auto py-1" onClick={handleMarkAll}>
              Marcar todo leido
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No tienes notificaciones
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`px-4 py-3 border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors ${!notif.is_read ? 'bg-primary/5' : ''}`}
                  onClick={() => handleMarkAsRead(notif.id, notif.is_read)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-sm">{notif.title}</span>
                    {!notif.is_read && <Badge variant="destructive" className="h-2 w-2 p-0 rounded-full" />}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{notif.message}</p>
                  <span className="text-[10px] text-muted-foreground/60 mt-2 block">
                    {new Date(notif.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
