/**
 * admin/support.admin.service.ts — NUEVO
 * 
 * Gestión de tickets de soporte desde el panel admin.
 * Reemplaza getAllTickets() de support.service.ts y la parte de soporte de staff.service.ts.
 * 
 * Todos los endpoints requieren rol: admin | super_admin
 */
import { apiGet, apiPost, apiPatch } from '@/lib/api/client'
import type { PaginationParams } from '@/lib/api/types'
import type { SupportTicket } from '@/types/support'

export interface SupportTicketListParams extends PaginationParams {
  status?: 'open' | 'in_progress' | 'resolved' | 'closed'
  user_id?: string
}

export const SupportAdminService = {
  /**
   * Lista todos los tickets del sistema (admin view).
   */
  async getAllTickets(params?: SupportTicketListParams): Promise<SupportTicket[]> {
    const { limit, user_id, ...allowedParams } = params || {}
    return apiGet<SupportTicket[]>('/admin/support/tickets', { params: allowedParams })
  },

  /**
   * Responde a un ticket de soporte.
   */
  async replyTicket(ticketId: string, message: string): Promise<SupportTicket> {
    return apiPost<SupportTicket>(`/admin/support/tickets/${ticketId}/comments`, { body: message, is_internal: false })
  },

  /**
   * Actualiza el estado de un ticket.
   */
  async updateTicketStatus(ticketId: string, status: 'in_progress' | 'resolved' | 'closed'): Promise<SupportTicket> {
    if (status === 'resolved') {
      return apiPatch<SupportTicket>(`/admin/support/tickets/${ticketId}/resolve`, { resolution_notes: 'Resolved from dashboard' })
    }
    return apiPatch<SupportTicket>(`/admin/support/tickets/${ticketId}/status`, { status })
  },
}
