import { createClient } from '@/lib/supabase/browser'
import type { Profile } from '@/types/profile'

export const ProfileService = {
  async getProfile(userId: string): Promise<Profile | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      throw new Error(error.message || 'No se pudo cargar el perfil.')
    }

    return (data as Profile | null) ?? null
  },
}
