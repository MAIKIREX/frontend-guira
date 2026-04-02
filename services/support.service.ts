/**
 * support.service.ts
 * 
 * MIGRADO: Supabase direct → REST API (GET/POST /support/tickets)
 * 
 * Antes: supabase.from('support_tickets').select().eq('user_id', userId)
 * Ahora: apiGet('/support/tickets') — el backend filtra por JWT
 */
import { apiGet, apiPost } from '@/lib/api/client'
import type { SupportTicket } from '@/types/support'
import type { PaginationParams } from '@/lib/api/types'

export interface CreateTicketDto {
  subject: string
  description: string
  category?: string
  priority?: 'low' | 'medium' | 'high'
}

export const SupportService = {
  /**
   * Tickets del usuario autenticado.
   */
  async getTickets(params?: PaginationParams): Promise<SupportTicket[]> {
    return apiGet<SupportTicket[]>('/support/tickets', { params })
  },

  /**
   * Detalle de un ticket.
   */
  async getTicket(ticketId: string): Promise<SupportTicket> {
    return apiGet<SupportTicket>(`/support/tickets/${ticketId}`)
  },

  /**
   * Crea un nuevo ticket de soporte.
   * El backend asocia automáticamente al usuario autenticado.
   */
  async createTicket(dto: CreateTicketDto): Promise<SupportTicket> {
    return apiPost<SupportTicket>('/support/tickets', dto)
  },
}
