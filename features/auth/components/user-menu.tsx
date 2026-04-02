'use client'

import { useProfileStore } from '@/stores/profile-store'
import { AuthService } from '@/services/auth.service'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { LogOut, User } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function UserMenu() {
  const { profile } = useProfileStore()
  const router = useRouter()

  if (!profile) return null

  const getInitials = (name?: string | null) => {
    if (!name) return 'GU'
    return name.slice(0, 2).toUpperCase()
  }

  const handleLogout = async () => {
    try {
      await AuthService.logout()
      toast.success('Sesion cerrada')
      router.push('/login')
    } catch (error) {
      console.error(error)
      toast.error('Error al cerrar sesion')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
        <Avatar className="h-8 w-8">
          <AvatarFallback>{getInitials(profile.full_name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{profile.full_name}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {profile.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <User className="mr-2 h-4 w-4" />
            <span>Perfil</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4 text-destructive" />
            <span className="text-destructive">Cerrar Sesion</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
