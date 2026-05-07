'use client'

import { useProfileStore } from '@/stores/profile-store'
import { cn } from '@/lib/utils'

export function SidebarUtilities({
  collapsed = false,
  mobile = false,
}: {
  collapsed?: boolean
  mobile?: boolean
}) {
  const { profile } = useProfileStore()

  const displayName = profile?.full_name || 'Usuario'
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() ?? '')
    .join('')
  const role = profile?.role === 'admin' ? 'Admin' : 'Usuario'

  return (
    <div
      className={cn(
        'border-t border-sidebar-border/60',
        mobile ? 'px-4 py-4' : collapsed ? 'px-3 py-4' : 'px-4 py-4'
      )}
    >
      {/* User Card */}
      <div
        className={cn(
          'rounded-xl border border-white/[0.08] bg-white/[0.04] transition-all duration-200',
          collapsed ? 'p-2' : 'p-3'
        )}
      >
        <div
          className={cn(
            'flex items-center',
            collapsed ? 'justify-center' : 'gap-3'
          )}
        >
          {/* Avatar */}
          <div className="relative flex shrink-0 size-9 items-center justify-center rounded-full bg-[#005BFF]/20 text-white text-xs font-bold">
            {initials || 'U'}
            {/* Online indicator */}
            <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-[#16C784] border-2 border-sidebar" />
          </div>

          {!collapsed && !mobile && (
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-white truncate leading-tight">
                {displayName}
              </p>
              <p className="text-[10px] font-medium text-white/40 mt-0.5">
                {role}
              </p>
            </div>
          )}

          {mobile && (
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-white truncate leading-tight">
                {displayName}
              </p>
              <p className="text-[10px] font-medium text-white/40 mt-0.5">
                {role}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
