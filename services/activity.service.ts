import { createClient } from '@/lib/supabase/browser'
import { ActivityLog, AuditLog } from '@/types/activity-log'

export const ActivityService = {
  async getUserActivity(userId: string): Promise<ActivityLog[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return data as ActivityLog[]
  },
  
  async getAuditLogs(limit: number = 50): Promise<AuditLog[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*, profiles(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data as unknown as AuditLog[]
  }
}
