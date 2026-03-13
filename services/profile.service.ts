import { createClient } from '@/lib/supabase/browser'

const supabase = createClient()

export const ProfileService = {
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
      
    if (error) throw error
    return data
  }
}
