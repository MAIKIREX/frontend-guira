'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import { useAuthStore } from '@/stores/auth-store'
import { useProfileStore } from '@/stores/profile-store'
import { ProfileService } from '@/services/profile.service'
import type { Profile } from '@/types/profile'
import type { Session, AuthChangeEvent, User } from '@supabase/supabase-js'

const PUBLIC_PATHS = ['/login', '/registro', '/recuperar']
const CLIENT_PATHS = ['/panel', '/pagos', '/actividad', '/soporte', '/onboarding']
const STAFF_PATHS = ['/admin', '/auditoria']
const SESSION_TIMEOUT_MS = 12000
const PROFILE_RETRY_DELAYS_MS = [0, 400, 1200]

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)

  const { setSession, setUser } = useAuthStore()
  const { setProfile } = useProfileStore()
  const supabase = useMemo(() => createClient(), [])
  const publicPath = isPublicPath(pathname)

  useEffect(() => {
    let mounted = true

    async function initProtectedAuth() {
      try {
        const {
          data: { session },
        } = await withTimeout(supabase.auth.getSession(), SESSION_TIMEOUT_MS, 'Tiempo de espera agotado al leer la sesion.')

        if (!mounted) return

        if (!session) {
          setSession(null)
          setUser(null)
          setProfile(null)
          router.push('/login')
          return
        }

        await applyAuthenticatedState({ pathname, router, session, setProfile, setSession, setUser, supabase })
      } catch (error) {
        console.error('Error initializing auth', error instanceof Error ? error.message : error)
        if (!mounted) return
        setSession(null)
        setUser(null)
        setProfile(null)
        router.push('/login')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    if (publicPath) {
      setLoading(false)
      return () => {
        mounted = false
      }
    }

    initProtectedAuth()

    return () => {
      mounted = false
    }
  }, [pathname, publicPath, router, setProfile, setSession, setUser, supabase])

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      if (event === 'SIGNED_OUT') {
        setSession(null)
        setUser(null)
        setProfile(null)
        router.push('/login')
        return
      }

      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && session) {
        try {
          await applyAuthenticatedState({ pathname, router, session, setProfile, setSession, setUser, supabase })
        } catch (error) {
          console.error('Error loading profile after auth change', error instanceof Error ? error.message : error)
          setProfile(null)
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [pathname, router, setProfile, setSession, setUser, supabase])

  if (loading && !publicPath) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>
  }

  return <>{children}</>
}

async function applyAuthenticatedState({
  pathname,
  router,
  session,
  setProfile,
  setSession,
  setUser,
  supabase,
}: {
  pathname: string
  router: ReturnType<typeof useRouter>
  session: Session
  setProfile: (profile: Profile | null) => void
  setSession: (session: Session | null) => void
  setUser: (user: User | null) => void
  supabase: ReturnType<typeof createClient>
}) {
  setSession(session)
  setUser(session.user)

  const profile = await getProfileWithRetry(session.user.id)

  if (!profile) {
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setProfile(null)
    router.push('/login')
    return
  }

  setProfile(profile)

  const destination = await resolveRedirect({
    pathname,
    profile,
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
}

async function getProfileWithRetry(userId: string) {
  let lastError: unknown = null

  for (const delayMs of PROFILE_RETRY_DELAYS_MS) {
    if (delayMs > 0) {
      await sleep(delayMs)
    }

    try {
      const profile = await ProfileService.getProfile(userId)
      if (profile) return profile
    } catch (error) {
      lastError = error
    }
  }

  if (lastError) {
    throw lastError
  }

  return null
}

function isPublicPath(pathname: string) {
  if (pathname === '/') return true
  return PUBLIC_PATHS.some((publicPath) => pathname === publicPath || pathname.startsWith(`${publicPath}/`))
}

function isClientPath(pathname: string) {
  return CLIENT_PATHS.some((clientPath) => pathname === clientPath || pathname.startsWith(`${clientPath}/`))
}

function isStaffPath(pathname: string) {
  return STAFF_PATHS.some((staffPath) => pathname === staffPath || pathname.startsWith(`${staffPath}/`))
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
    if (isClient && pathname !== '/') return '/onboarding'
  }

  if (pathname === '/onboarding') {
    if (isStaffAdmin) return '/admin'
    if (isVerifiedClient) return '/panel'
    return null
  }

  if (isStaffPath(pathname)) {
    return isStaffAdmin ? null : isVerifiedClient ? '/panel' : '/onboarding'
  }

  if (isClientPath(pathname)) {
    if (!isClient) return '/admin'
    if (!isVerifiedClient) return '/onboarding'
  }

  return null
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs)
    }),
  ])
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
