'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import { useAuthStore } from '@/stores/auth-store'
import { useProfileStore } from '@/stores/profile-store'
import { ProfileService } from '@/services/profile.service'
import type { Profile } from '@/types/profile'

const PUBLIC_PATHS = ['/login', '/registro', '/recuperar']
const CLIENT_PATHS = ['/panel', '/pagos', '/actividad', '/soporte']

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  
  const { setSession, setUser } = useAuthStore()
  const { profile, setProfile } = useProfileStore()
  const supabase = createClient()

  useEffect(() => {
    let mounted = true

    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!mounted) return

        if (!session) {
          setSession(null)
          setUser(null)
          setProfile(null)
          if (!isPublicPath(pathname)) {
            router.push('/login')
          }
          setLoading(false)
          return
        }

        setSession(session)
        setUser(session.user)

        const activeProfile = profile ?? await ProfileService.getProfile(session.user.id)
        if (!profile) {
          setProfile(activeProfile)
        }

        if (!mounted) return

        const destination = await resolveRedirect({
          pathname,
          profile: activeProfile,
          onArchived: async () => {
            await supabase.auth.signOut()
            setSession(null)
            setUser(null)
            setProfile(null)
          },
        })

        if (destination && destination !== pathname) {
          router.push(destination)
        }
      } catch (error) {
        console.error('Error initializing auth', error)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setSession(null)
        setUser(null)
        setProfile(null)
        router.push('/login')
      } else if (event === 'SIGNED_IN' && session) {
        setSession(session)
        setUser(session.user)
        const newProfile = await ProfileService.getProfile(session.user.id)
        setProfile(newProfile)

        const destination = await resolveRedirect({
          pathname,
          profile: newProfile,
          onArchived: async () => {
            await supabase.auth.signOut()
          },
        })

        router.push(destination ?? '/panel')
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [pathname, profile, router, setSession, setUser, setProfile, supabase.auth])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>
  }

  return <>{children}</>
}

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((publicPath) => pathname.startsWith(publicPath))
}

function isClientPath(pathname: string) {
  return CLIENT_PATHS.some(
    (clientPath) => pathname === clientPath || pathname.startsWith(`${clientPath}/`)
  )
}

async function resolveRedirect({
  pathname,
  profile,
  onArchived,
}: {
  pathname: string
  profile: Profile
  onArchived: () => Promise<void>
}) {
  if (profile.is_archived) {
    await onArchived()
    return '/login?archived=true'
  }

  const isStaffAdmin = profile.role === 'staff' || profile.role === 'admin'
  const isClient = profile.role === 'client'
  const isVerifiedClient = isClient && profile.onboarding_status === 'verified'

  if (isPublicPath(pathname)) {
    if (isStaffAdmin) return '/admin'
    if (isVerifiedClient) return '/panel'
    if (isClient) return '/onboarding'
  }

  if (pathname === '/onboarding') {
    if (isStaffAdmin) return '/admin'
    if (isVerifiedClient) return '/panel'
    return null
  }

  if (pathname.startsWith('/admin')) {
    return isStaffAdmin ? null : isVerifiedClient ? '/panel' : '/onboarding'
  }

  if (isClientPath(pathname)) {
    if (!isClient) return '/admin'
    if (!isVerifiedClient) return '/onboarding'
  }

  return null
}
