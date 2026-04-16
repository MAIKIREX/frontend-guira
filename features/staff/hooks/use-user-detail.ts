'use client'

/**
 * use-user-detail.ts
 *
 * Hook dedicado para la página de detalle de usuario (/admin/users/:id).
 * Carga el perfil de un usuario individual via GET /admin/profiles/:id 
 * y construye el StaffActor desde los stores de autenticación.
 *
 * Los datos de cada tab (fees, VAs, bank accounts) se cargan bajo demanda
 * por los paneles individuales, no por este hook.
 */
import { useCallback, useEffect, useState } from 'react'
import { UsersAdminService } from '@/services/admin/users.admin.service'
import { useAuthStore } from '@/stores/auth-store'
import { useProfileStore } from '@/stores/profile-store'
import type { Profile } from '@/types/profile'
import type { StaffActor } from '@/types/staff'

export interface UseUserDetailReturn {
  /** Perfil del usuario consultado */
  user: Profile | null
  /** Actor actual (admin/staff autenticado) */
  actor: StaffActor | null
  /** Es admin o super_admin */
  isAdmin: boolean
  /** Cargando datos */
  loading: boolean
  /** Error de carga */
  error: string | null
  /** Recargar el perfil */
  refetch: () => Promise<void>
  /** Actualizar el perfil local optimistamente */
  setUser: (updater: Profile | ((prev: Profile | null) => Profile | null)) => void
}

export function useUserDetail(userId: string): UseUserDetailReturn {
  const [user, setUserState] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { user: authUser } = useAuthStore()
  const { profile: actorProfile } = useProfileStore()

  const actor: StaffActor | null =
    authUser && actorProfile && (actorProfile.role === 'staff' || actorProfile.role === 'admin' || actorProfile.role === 'super_admin')
      ? { userId: authUser.id, role: actorProfile.role }
      : null

  const isAdmin = actor?.role === 'admin' || actor?.role === 'super_admin'

  const load = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    setError(null)

    try {
      const profile = await UsersAdminService.getUser(userId)
      setUserState(profile)
    } catch (err) {
      console.error('Failed to load user detail', err)
      setError('No se pudo cargar el usuario. Verifica que el ID sea válido.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  const setUser = useCallback((updater: Profile | ((prev: Profile | null) => Profile | null)) => {
    if (typeof updater === 'function') {
      setUserState(updater)
    } else {
      setUserState(updater)
    }
  }, [])

  return {
    user,
    actor,
    isAdmin,
    loading,
    error,
    refetch: load,
    setUser,
  }
}
