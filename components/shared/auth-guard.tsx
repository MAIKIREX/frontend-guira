'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import { useAuthStore } from '@/stores/auth-store'
import { useProfileStore } from '@/stores/profile-store'
import { ProfileService } from '@/services/profile.service'
import type { Profile } from '@/types/profile'
import type { Session } from '@supabase/supabase-js'

const PUBLIC_PATHS = ['/login', '/registro', '/recuperar']
const CLIENT_PATHS = ['/panel', '/depositar', '/enviar', '/proveedores', '/transacciones', '/configuracion', '/pagos', '/actividad', '/soporte', '/onboarding']
const STAFF_PATHS = ['/admin', '/auditoria']
const PROFILE_RETRY_DELAYS_MS = [0, 400, 1200, 2400]

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const bootstrappedRef = useRef(false)

  const { setSession, setUser } = useAuthStore()
  const { profile: storedProfile, setProfile } = useProfileStore()
  const supabase = useMemo(() => createClient(), [])
  const isSyncingRef = useRef(false)
  const publicPath = isPublicPath(pathname)

  // Usamos refs para evitar loops en los efectos
  const storedProfileRef = useRef(storedProfile)
  useEffect(() => { storedProfileRef.current = storedProfile }, [storedProfile])

  const handleRedirect = useCallback(async (profile: Profile, nextPathname: string) => {
    const dest = await resolveRedirect({
      pathname: nextPathname,
      profile,
      onArchived: async () => {
        await supabase.auth.signOut()
        setSession(null)
        setUser(null)
        setProfile(null)
      }
    })

    if (dest && dest !== nextPathname) {
      router.replace(dest)
    }
  }, [router, setProfile, setSession, setUser, supabase.auth])

  const syncProfileAndRedirect = useCallback(async (session: Session, nextPathname: string) => {
    if (isSyncingRef.current) return
    
    // Si ya tenemos el perfil cargado y es el correcto, no re-sincronizar
    if (storedProfileRef.current && storedProfileRef.current.id === session.user.id) {
      console.log('AuthGuard: Profile already synced and matches user, skipping redundant sync')
      await handleRedirect(storedProfileRef.current, nextPathname)
      return
    }

    try {
      isSyncingRef.current = true
      console.log('AuthGuard: syncProfileAndRedirect starting for', session.user.id)
      
      const profile = await getProfileWithRetry(session.user.id, session.access_token)
      if (profile) {
        setSession(session)
        setUser(session.user)
        setProfile(profile)
        await handleRedirect(profile, nextPathname)
        return
      }

      console.error('AuthGuard: profile sync failed - signing out')
      await supabase.auth.signOut()
      setSession(null)
      setUser(null)
      setProfile(null)
      router.replace('/login')
    } catch (error) {
      console.error('AuthGuard: syncProfileAndRedirect CRITICAL ERROR', error)
    } finally {
      isSyncingRef.current = false
    }
  }, [handleRedirect, router, setProfile, setSession, setUser, supabase.auth])

  // Efecto único para inicializar y escuchar cambios de auth
  useEffect(() => {
    let mounted = true
    const timeoutId = setTimeout(() => {
      if (mounted && loading) {
        console.warn('AuthGuard: Global boot timeout reached')
        setLoading(false)
        bootstrappedRef.current = true
      }
    }, 15000)

    async function initializeAndListen() {
      try {
        console.log('AuthGuard: initializing auth...')
        
        // 1. Obtener la sesión inicial primero de forma secuencial
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) console.error('AuthGuard: getSession error', sessionError)
        
        if (mounted && session && !isSyncingRef.current) {
          await syncProfileAndRedirect(session, window.location.pathname)
        } else if (mounted && !session && !isPublicPath(window.location.pathname)) {
          router.replace('/login')
        }

        // 2. SOLO DESPUES de la inicialización, nos suscribimos a cambios
        if (mounted) {
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('AuthGuard: onAuthStateChange event:', event)
            
            if (event === 'SIGNED_OUT') {
              setSession(null)
              setUser(null)
              setProfile(null)
              if (!isPublicPath(window.location.pathname)) {
                router.replace('/login')
              }
              return
            }

            // Ignoramos INITIAL_SESSION aquí porque ya lo manejamos con getSession arriba
            if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
              await syncProfileAndRedirect(session, window.location.pathname)
            }
          })

          return () => {
            subscription.unsubscribe()
          }
        }
      } catch (error) {
        console.error('AuthGuard: initializeAndListen error', error)
      } finally {
        if (mounted) {
          clearTimeout(timeoutId)
          setLoading(false)
          bootstrappedRef.current = true
        }
      }
    }

    const cleanupPromise = initializeAndListen()

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      void cleanupPromise.then(cleanup => cleanup?.())
    }
  }, [supabase, router, setProfile, setSession, setUser, syncProfileAndRedirect, loading])

  if (loading || (!storedProfile && !publicPath)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <div className="size-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-sm font-medium animate-pulse">Cargando aplicación...</p>
      </div>
    )
  }

  return <>{children}</>
}

async function getProfileWithRetry(userId: string, token?: string) {
  let lastError: unknown = null

  for (let i = 0; i < PROFILE_RETRY_DELAYS_MS.length; i++) {
    const delayMs = PROFILE_RETRY_DELAYS_MS[i]
    if (delayMs > 0) {
      console.log(`AuthGuard: retry ${i} in ${delayMs}ms`)
      await sleep(delayMs)
    }

    try {
      console.log(`AuthGuard: getProfile attempt ${i}`)
      const profile = await ProfileService.getProfile(token)
      if (profile) {
        console.log('AuthGuard: profile found on attempt', i)
        return profile
      }
      console.log(`AuthGuard: profile not found on attempt ${i}`)
    } catch (error) {
      if (i < PROFILE_RETRY_DELAYS_MS.length - 1) {
        console.warn(`AuthGuard: error on attempt ${i}`, error instanceof Error ? error.message : String(error))
      } else {
        console.error(`AuthGuard: error on attempt ${i}`, error)
      }
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

  const isStaffAdmin = profile.role === 'staff' || profile.role === 'admin' || profile.role === 'super_admin'
  const isClient = profile.role === 'client'
  const isVerifiedClient = isClient && profile.onboarding_status === 'approved'

  if (isPublicPath(pathname)) {
    if (isStaffAdmin) return '/admin/orders'
    if (isVerifiedClient) return '/panel'
    if (isClient && pathname !== '/') return '/onboarding'
  }

  if (pathname === '/onboarding') {
    if (isStaffAdmin) return '/admin/orders'
    if (isVerifiedClient) return '/panel'
    return null
  }

  if (isStaffPath(pathname)) {
    return isStaffAdmin ? null : isVerifiedClient ? '/panel' : '/onboarding'
  }

  if (isClientPath(pathname)) {
    if (!isClient) return '/admin/orders'
    if (!isVerifiedClient) return '/onboarding'
  }

  return null
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
