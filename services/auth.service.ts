/**
 * auth.service.ts
 * 
 * MIGRADO PARCIALMENTE:
 * - Login / OAuth / Logout / Password → SE MANTIENEN con Supabase Auth SDK
 *   (flujo de sesión estándar — el backend valida el JWT generado por Supabase)
 * 
 * - signup() → EXTENDIDO: Supabase Auth crea el usuario + POST /auth/register
 *   notifica al backend para crear perfil, wallet inicial e iniciar onboarding.
 * 
 * - checkUserExists() → ELIMINADO (era un RPC de Supabase, se delega al backend)
 */
import { createClient } from '@/lib/supabase/browser'
import { apiPost, apiGet } from '@/lib/api/client'
import type { Profile } from '@/types/profile'

export const AuthService = {
  async getSession() {
    const supabase = createClient()
    return supabase.auth.getSession()
  },

  async login({ email, password }: { email: string; password: string }) {
    // Hallazgo A07-04: Login a través del backend para aplicar rate limiting,
    // logging de intentos fallidos y auditoría de eventos de autenticación.
    const result = await apiPost<{
      access_token: string
      refresh_token: string
      expires_in: number
      user_id: string
    }>('/auth/login', { email, password })

    // Establecer la sesión en el cliente Supabase local con los tokens recibidos
    const supabase = createClient()
    await supabase.auth.setSession({
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    })

    const { data: { session } } = await supabase.auth.getSession()
    return session
  },

  async loginWithGoogle() {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
    return data
  },

  /**
   * Registro de nuevo usuario.
   * 
   * Flujo:
   * 1. Supabase Auth crea el usuario (session + JWT)
   * 2. POST /auth/register notifica al backend NestJS que cree el perfil,
   *    wallet inicial, e inicie el flujo de onboarding KYC.
   * 
   * @param fullName  Nombre completo del usuario
   * @param email     Email
   * @param password  Contraseña
   */
  async signup({ email, password, fullName }: { email: string; password: string; fullName: string }) {
    const supabase = createClient()

    // Paso 1: Crear usuario en Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/login?verified=true`,
      },
    })
    if (error) throw error

    // ─── Validación: detectar email ya registrado ───
    // Supabase NO lanza error cuando el email ya existe; en su lugar retorna
    // un objeto user con `identities: []` (array vacío). Sin esta verificación,
    // el usuario vería "Cuenta creada" cuando en realidad no se creó nada.
    if (
      data.user &&
      (!data.user.identities || data.user.identities.length === 0)
    ) {
      throw new Error(
        'Ya existe una cuenta registrada con este correo electrónico. Por favor, inicia sesión o recupera tu contraseña.',
      )
    }

    // Paso 2: Notificar al backend para setup inicial (perfil, wallet, onboarding)
    // El interceptor de axios tomará el JWT recién creado automáticamente
    try {
      await apiPost('/auth/register', {
        full_name: fullName,
        email,
      })
    } catch (backendError: unknown) {
      // Si el backend responde 409 (Conflict), significa que ya existe la cuenta
      // en el backend — propagar el error al usuario en vez de silenciarlo.
      const status = (backendError as { response?: { status?: number } })?.response?.status
      if (status === 409) {
        throw new Error(
          'Ya existe una cuenta registrada con este correo electrónico. Por favor, inicia sesión o recupera tu contraseña.',
        )
      }
      // Para otros errores no-conflicto, el usuario quedó en Supabase pero sin perfil.
      // Se puede reintentar en el siguiente login (el middleware de onboarding lo maneja).
      console.error('[AuthService] Backend registration failed after Supabase signup:', backendError)
    }

    return data
  },

  /**
   * Verifica el OTP (One-Time Password) enviado por correo para completar el registro
   */
  async verifyOTP({ email, token }: { email: string; token: string }) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email', // 'email' es el tipo correcto para verificación de signup por OTP
    })
    if (error) throw error
    return data.session
  },

  async logout() {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  /**
   * Obtiene el perfil del usuario autenticado desde el backend.
   * Verificación útil post-login para saber si el backend tiene su perfil.
   */
  async getMe(): Promise<Profile> {
    return apiGet<Profile>('/auth/me')
  },

  async recoverPassword(email: string) {
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/recuperar/update`,
    })
    if (error) throw error
  },

  async updatePassword(password: string) {
    // Hallazgo A07-02: Enviar la actualización de contraseña a través del backend
    // para aplicar la validación de complejidad server-side (@IsStrongPassword)
    // en vez de llamar supabase.auth.updateUser() directamente desde el cliente.
    await apiPost('/auth/reset-password', { new_password: password })
  },
}
