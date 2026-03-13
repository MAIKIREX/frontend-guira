import { createClient } from '@/lib/supabase/browser'

const supabase = createClient()

export const AuthService = {
  async getSession() {
    return supabase.auth.getSession()
  },

  async login({ email, password }: { email: string; password: string; [key: string]: unknown }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data.session
  },

  async loginWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/panel`,
      },
    })
    if (error) throw error
    return data
  },

  async signup({ email, password, fullName }: { email: string; password: string; fullName: string; [key: string]: unknown }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
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
  },
}
