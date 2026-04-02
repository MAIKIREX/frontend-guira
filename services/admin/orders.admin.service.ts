/**
 * admin/orders.admin.service.ts — NUEVO
 * 
 * Gestión de órdenes de pago desde el panel admin.
 * Reemplaza la parte de órdenes de staff.service.ts y admin.service.ts.
 * 
 * Todos los endpoints requieren rol: admin | super_admin
 */
import { apiGet, apiPost } from '@/lib/api/client'
import type { PaginationParams } from '@/lib/api/types'
import type { PaymentOrder } from '@/types/payment-order'

export interface AdminOrderListParams extends PaginationParams {
  status?: string
  user_id?: string
  order_type?: string
  from?: string
  to?: string
}

export const OrdersAdminService = {
  /**
   * Lista todas las órdenes del sistema.
   */
  async getAllOrders(params?: AdminOrderListParams): Promise<PaymentOrder[]> {
    return apiGet<PaymentOrder[]>('/admin/payment-orders', { params })
  },

  /**
   * Detalle de una orden.
   */
  async getOrder(orderId: string): Promise<PaymentOrder> {
    return apiGet<PaymentOrder>(`/admin/payment-orders/${orderId}`)
  },

  /**
   * Aprueba una orden manualmente.
   */
  async approveOrder(orderId: string, notes?: string): Promise<PaymentOrder> {
    return apiPost<PaymentOrder>(`/admin/payment-orders/${orderId}/approve`, { notes })
  },

  /**
   * Rechaza una orden con razón.
   */
  async rejectOrder(orderId: string, rejection_reason: string): Promise<PaymentOrder> {
    return apiPost<PaymentOrder>(`/admin/payment-orders/${orderId}/fail`, { reason: rejection_reason })
  },
}
