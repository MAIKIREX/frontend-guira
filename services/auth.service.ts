import { createClient } from '@/lib/supabase/browser'

const supabase = createClient()

export const AuthService = {
  async getSession() {
    return supabase.auth.getSession()
  },
  
  async login({ email, password }: { email: string; password: string; [key: string]: unknown }) {
    // Uses login-proxy edge function as dictated by docs
    const { data: funcData, error: funcError } = await supabase.functions.invoke('login-proxy', {
      body: { email, password }
    })
    
    if (funcError) throw new Error(funcError.message || 'Error al iniciar sesión')
      
    // Si el edge function devuelve tokens explícitos y no usa headers automáticos:
    if (funcData?.session) {
      const { error: sessionError } = await supabase.auth.setSession(funcData.session)
      if (sessionError) throw sessionError
      return funcData.session
    }

    // Como fallback nativo si la edge function simplemente lo validó
    // pero no devolvió la sesión para setear manualmente:
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data.session
  },

  async loginWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/panel`
      }
    })
    if (error) throw error
    return data
  },

  async signup({ email, password, fullName }: { email: string; password: string; fullName: string; [key: string]: unknown }) {
    // Signup needs to save the profile later or it's handled by triggers
    // The instructions say: "admin-create-user" for admins, but for normal signup:
    // It creates auth, triggers probably create the profile. We'll pass full_name in metadata.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    })
    if (error) throw error
    return data
  },

  async logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async checkUserExists(email: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('check_user_exists', { p_email: email })
    if (error) throw error
    return Boolean(data)
  },

  async recoverPassword(email: string) {
    // Primero validamos con el RPC
    const exists = await this.checkUserExists(email)
    if (!exists) {
      throw new Error('No existe una cuenta con este correo')
    }
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/recuperar/update`,
    })
    if (error) throw error
  },

  async updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  }
}
