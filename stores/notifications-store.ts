import { create } from 'zustand'
import { Notification } from '@/types/notification'

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  setNotifications: (notifications: Notification[]) => void
  addNotification: (notification: Notification) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
}

export const useNotificationsStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications) => set(() => {
    const unreadCount = notifications.filter(n => !n.is_read).length
    return { notifications, unreadCount }
  }),
  addNotification: (notification) => set((state) => {
    const notifications = [notification, ...state.notifications]
    const unreadCount = notifications.filter(n => !n.is_read).length
    return { notifications, unreadCount }
  }),
  markAsRead: (id) => set((state) => {
    const notifications = state.notifications.map(n => n.id === id ? { ...n, is_read: true } : n)
    const unreadCount = notifications.filter(n => !n.is_read).length
    return { notifications, unreadCount }
  }),
  markAllAsRead: () => set((state) => {
    const notifications = state.notifications.map(n => ({ ...n, is_read: true }))
    return { notifications, unreadCount: 0 }
  })
}))
