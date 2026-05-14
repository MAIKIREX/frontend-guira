import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Valida que el path de redirección post-OAuth sea seguro.
 * Previene open redirects verificando que:
 * - Empiece con '/'
 * - No contenga '//' (protocol-relative URLs)
 * - No contenga '..' (path traversal)
 * - No contenga ':' (scheme injection)
 */
function sanitizeRedirectPath(next: string | null): string {
  const fallback = '/panel'
  if (!next) return fallback

  // Debe empezar con / y no contener patterns peligrosos
  if (
    !next.startsWith('/') ||
    next.startsWith('//') ||
    next.includes('..') ||
    next.includes(':')
  ) {
    return fallback
  }

  return next
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = sanitizeRedirectPath(searchParams.get('next'))

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession error:', error.message)
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
  }

  // ─── Corrección G1 + G3: Notificar al backend del login OAuth ───
  // Esto permite:
  // 1. Registrar el evento en auth_audit_log (auditoría)
  // 2. Verificar/completar el perfil si el trigger handle_new_user
  //    no capturó el full_name correctamente
  try {
    const { data: { session } } = await supabase.auth.getSession()

    if (session) {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001/api'

      // Notificar al backend para registrar el evento OAuth y asegurar perfil
      await fetch(`${backendUrl}/auth/oauth-callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'x-forwarded-for': request.headers.get('x-forwarded-for') ?? '',
          'user-agent': request.headers.get('user-agent') ?? '',
        },
        body: JSON.stringify({
          provider: 'google',
        }),
      })
    }
  } catch (callbackError) {
    // Best-effort: no bloqueamos el login si el backend no responde
    console.error('[auth/callback] Backend notification failed:', callbackError)
  }

  // El AuthGuard redirigirá a /onboarding si onboarding_status !== 'approved'.
  return NextResponse.redirect(`${origin}${next}`)
}

