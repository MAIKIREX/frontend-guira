import { createClient } from '@/lib/supabase/browser'
import { OnboardingStatus, Onboarding } from '@/types/onboarding'

const supabase = createClient()

export const OnboardingService = {
  async getLatestOnboarding(userId: string): Promise<Onboarding | null> {
    const { data, error } = await supabase
      .from('onboarding')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }
    
    return data || null
  },

  async getDocuments(userId: string) {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      
    if (error) throw error
    return data
  },

  async saveDraft(payload: Partial<Onboarding>) {
    const { data, error } = await supabase
      .from('onboarding')
      .upsert({ ...payload, status: 'draft' as OnboardingStatus, updated_at: new Date().toISOString() })
      .select()
      .single()

    if (error) throw error
    
    // Log activity
    if (payload.user_id) {
      await this.logActivity(payload.user_id, 'guardar_borrador')
    }
    
    return data
  },

  async submitOnboarding(payload: Partial<Onboarding>) {
    const { data, error } = await supabase
      .from('onboarding')
      .upsert({ ...payload, status: 'submitted' as OnboardingStatus, updated_at: new Date().toISOString() })
      .select()
      .single()
      
    if (error) throw error
    
    // Log activity
    if (payload.user_id) {
      await this.logActivity(payload.user_id, 'enviar_onboarding')
    }

    // Attempt to update profile full_name if user gives personal names
    if (payload.data && payload.data.first_names && payload.data.last_names) {
       await supabase.from('profiles').update({
         full_name: `${payload.data.first_names} ${payload.data.last_names}`.trim(),
         onboarding_status: 'submitted'
       }).eq('id', payload.user_id!)
    } else {
       await supabase.from('profiles').update({
         onboarding_status: 'submitted'
       }).eq('id', payload.user_id!)
    }
    
    return data
  },
  
  async submitUBODocs(payload: Partial<Onboarding>) {
    const { data, error } = await supabase
      .from('onboarding')
      .upsert({ ...payload, status: 'under_review' as OnboardingStatus, updated_at: new Date().toISOString() })
      .select()
      .single()
      
    if (error) throw error
    
    if (payload.user_id) {
      await this.logActivity(payload.user_id, 'enviar_docs_socios')
      await supabase.from('profiles').update({
        onboarding_status: 'under_review'
      }).eq('id', payload.user_id!)
    }
    
    return data
  },

  async uploadDocument(userId: string, docKey: string, file: File, isDraft: boolean = false) {
    const timestamp = Date.now()
    const ext = file.name.split('.').pop()
    const typeLabel = isDraft ? 'draft_' : ''
    const storagePath = `${userId}/${docKey}_${typeLabel}${timestamp}.${ext}`

    const { data, error } = await supabase.storage
      .from('onboarding_docs')
      .upload(storagePath, file, { upsert: true })

    if (error) throw error
    return data.path
  },
  
  async uploadUBODocument(userId: string, docKey: string, index: number, file: File, isDraft: boolean = false) {
    const timestamp = Date.now()
    const ext = file.name.split('.').pop()
    const typeLabel = isDraft ? 'draft_' : ''
    const storagePath = `${userId}/ubo_${index}_${docKey}_${typeLabel}${timestamp}.${ext}`

    const { data, error } = await supabase.storage
      .from('onboarding_docs')
      .upload(storagePath, file, { upsert: true })

    if (error) throw error
    return data.path
  },

  async saveDocumentReference(payload: { onboarding_id: string; user_id: string; doc_type: string; storage_path: string; mime_type: string; file_size: number }) {
    const { error } = await supabase
      .from('documents')
      .upsert(payload, { onConflict: 'onboarding_id,doc_type' })
      
    if (error) throw error
  },

  async logActivity(userId: string, action: string, metadata: Record<string, unknown> = {}) {
    await supabase.from('activity_logs').insert({
      user_id: userId,
      action,
      metadata
    })
  }
}
