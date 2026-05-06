'use client'

import { ThemeToggle } from '@/components/theme/theme-toggle'
import { UserMenu } from '@/features/auth/components/user-menu'
import { NotificationBell } from '@/features/notifications/components/notification-bell'
import { cn } from '@/lib/utils'

export function SidebarUtilities({
  collapsed = false,
  mobile = false,
}: {
  collapsed?: boolean
  mobile?: boolean
}) {
  return (
    <div
      className={cn(
        'border-t border-sidebar-border',
        mobile ? 'px-5 py-4' : collapsed ? 'px-3 py-4' : 'px-5 py-4'
      )}
    >
      <div
        className={cn(
          'flex items-center',
          mobile ? 'justify-between gap-3' : collapsed ? 'flex-col gap-3' : 'justify-between gap-3'
        )}
      >
        <ThemeToggle />
        <NotificationBell />
        <UserMenu />
      </div>
    </div>
  )
}
