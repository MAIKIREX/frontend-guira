'use client'

import { useProfileStore } from '@/stores/profile-store'
import { AuthService } from '@/services/auth.service'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut } from 'lucide-react'

export function SidebarUtilities({
  collapsed = false,
  mobile = false,
}: {
  collapsed?: boolean
  mobile?: boolean
}) {
  const { profile } = useProfileStore()
  const router = useRouter()

  const displayName = profile?.full_name || 'Usuario'
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() ?? '')
    .join('')
    
  const role = profile?.role === 'admin' 
    ? 'Admin' 
    : profile?.role === 'staff' 
      ? 'Staff' 
      : 'Usuario'

  const handleLogout = async () => {
    try {
      await AuthService.logout()
      router.push('/login')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  return (
    <div
      className={cn(
        'border-t border-sidebar-border/60',
        mobile ? 'px-4 py-4' : collapsed ? 'px-3 py-4' : 'px-4 py-4'
      )}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              'w-full text-left rounded-xl border border-white/[0.08] bg-white/[0.04] transition-all duration-200 hover:bg-white/[0.08] outline-none',
              collapsed ? 'p-2' : 'p-3'
            )}
          >
            <div
              className={cn(
                'flex items-center',
                collapsed ? 'justify-center' : 'gap-3'
              )}
            >
              <div className="relative">
                <Avatar className="size-9 border border-white/10 bg-[#005BFF]/20">
                  <AvatarImage src={(profile as any)?.avatar_url || ''} alt={displayName} />
                  <AvatarFallback className="bg-transparent text-white font-bold text-xs">
                    {initials || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-[#16C784] border-2 border-[#020B2D]" />
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
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          side={mobile || collapsed ? "right" : "top"} 
          className="w-48"
        >
          <DropdownMenuItem 
            onClick={handleLogout} 
            className="text-red-500 hover:text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50 cursor-pointer flex items-center py-2"
          >
            <LogOut className="mr-2 size-4" />
            <span className="font-medium">Salir</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
