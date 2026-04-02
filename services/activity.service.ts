/**
 * activity.service.ts
 * 
 * MIGRADO: Supabase direct → REST API
 * 
 * Antes: supabase.from('activity_logs').select().eq('user_id', userId)
 * Ahora: apiGet('/activity') — JWT determina el usuario
 *        apiGet('/admin/activity/:userId') — solo para admins
 */
import { apiGet } from '@/lib/api/client'
import type { ActivityLog } from '@/types/activity-log'
import type { PaginationParams } from '@/lib/api/types'

export interface ActivityFilter extends PaginationParams {
  action?: string
  from?: string
  to?: string
}

export const ActivityService = {
  /**
   * Actividad del usuario autenticado.
   * El backend determina el userId por JWT.
   */
  async getUserActivity(params?: ActivityFilter): Promise<ActivityLog[]> {
    return apiGet<ActivityLog[]>('/activity', { params })
  },

  /**
   * Actividad de un usuario específico (solo admins/staff).
   * Requiere rol 'admin' o 'super_admin'.
   */
  async getUserActivityAdmin(userId: string, params?: ActivityFilter): Promise<ActivityLog[]> {
    return apiGet<ActivityLog[]>(`/admin/activity/${userId}`, { params })
  },

  /**
   * Obtiene todos los logs de auditoria del sistema (staff actions, etc).
   */
  async getAuditLogs(params?: PaginationParams): Promise<any[]> {
    return apiGet<any[]>('/admin/audit-logs', { params })
  },
}
