'use client'

/**
 * use-staff-dashboard.ts
 * 
 * MIGRADO: StaffService.getReadOnlySnapshot() eliminado.
 * Reemplazado por hooks separados por dominio usando servicios admin granulares.
 *
 * Este hook centraliza la carga del panel admin con llamadas paralelas a:
 * - OrdersAdminService.getAllOrders()
 * - UsersAdminService.getUsers()
 * - ComplianceAdminService.getReviews()
 * - SupportAdminService.getAllTickets()
 * - ConfigAdminService.getFeesConfig() / getPsavConfigs() / getSettings()
 */
import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '@/lib/api/client'
import { UsersAdminService } from '@/services/admin/users.admin.service'
import { ComplianceAdminService } from '@/services/admin/compliance.admin.service'
import { SupportAdminService } from '@/services/admin/support.admin.service'
import { ConfigAdminService } from '@/services/admin/config.admin.service'
import type { PaymentOrder } from '@/types/payment-order'
import type { Profile } from '@/types/profile'
import type { AdminComplianceReview } from '@/services/admin/compliance.admin.service'
import type { AdminBridgePayout } from '@/services/admin/bridge.admin.service'
import type { StaffOnboardingRecord, StaffSupportTicket } from '@/types/staff'
import type { FeeConfigRow, AppSettingRow, PsavConfigRow } from '@/types/payment-order'
import type { AuditLog } from '@/types/activity-log'

export interface StaffDashboardState {
  orders: PaymentOrder[]
  users: Profile[]
  complianceReviews: AdminComplianceReview[]
  supportTickets: unknown[]
  feesConfig: unknown[]
  psavConfigs: unknown[]
  appSettings: unknown[]
  auditLogs: unknown[]
}

export function useStaffDashboard() {
  const [state, setState] = useState<StaffDashboardState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Carga paralela de todos los dominios admin
      const [
        ordersRes,
        usersRes,
        complianceRes,
        supportRes,
        feesRes,
        psavRes,
        appSettingsRes,
        auditLogsRes,
      ] = await Promise.all([
        apiGet<PaymentOrder[]>('/admin/payment-orders', { params: { limit: 100 } }),
        UsersAdminService.getUsers({ limit: 100 }),
        ComplianceAdminService.getReviews(), // C6 FIX: No enviamos filtro muerto
        SupportAdminService.getAllTickets({ status: 'open', limit: 50 }),
        ConfigAdminService.getFeesConfig(),
        ConfigAdminService.getPsavConfigs(),
        ConfigAdminService.getSettings(),
        ConfigAdminService.getAuditLogs({ limit: 200 }),
      ])

      const extractData = (res: unknown) => (res && Array.isArray((res as { data?: unknown }).data)) ? (res as { data: unknown[] }).data : (Array.isArray(res) ? res : [])

      setState({
        orders: extractData(ordersRes),
        users: extractData(usersRes),
        complianceReviews: extractData(complianceRes),
        supportTickets: extractData(supportRes),
        feesConfig: extractData(feesRes),
        psavConfigs: extractData(psavRes),
        appSettings: extractData(appSettingsRes),
        auditLogs: extractData(auditLogsRes),
      })
    } catch (err) {
      console.error('Failed to load staff dashboard', err)
      setError('No se pudo cargar el panel staff.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // ── Optimistic updates por dominio ────────────────────────────

  const replaceOrder = useCallback((updatedOrder: PaymentOrder) => {
    setState((current) => {
      if (!current) return current
      return {
        ...current,
        orders: current.orders.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)),
      }
    })
  }, [])

  const replaceUser = useCallback((updatedUser: Profile) => {
    setState((current) => {
      if (!current) return current
      return {
        ...current,
        users: current.users.map((u) => (u.id === updatedUser.id ? updatedUser : u)),
      }
    })
  }, [])

  const replaceComplianceReview = useCallback((updatedReview: AdminComplianceReview) => {
    setState((current) => {
      if (!current) return current
      return {
        ...current,
        complianceReviews: current.complianceReviews.map((r) =>
          r.id === updatedReview.id ? updatedReview : r
        ),
      }
    })
  }, [])

  const replaceSupportTicket = useCallback((updatedTicket: unknown) => {
    setState((current) => {
      if (!current) return current
      return {
        ...current,
        supportTickets: current.supportTickets.map((t) =>
          (t as { id?: string }).id === (updatedTicket as { id?: string }).id ? updatedTicket : t
        ),
      }
    })
  }, [])

  // ── Backwards compatibility para componentes legacy ────────────
  const replaceOnboarding = useCallback(() => { console.warn('replaceOnboarding is deprecated') }, [])
  const addUser = useCallback(() => { console.warn('addUser is deprecated') }, [])
  const removeUser = useCallback(() => { console.warn('removeUser is deprecated') }, [])
  const replaceFeeConfig = useCallback(() => { console.warn('replaceFeeConfig is deprecated') }, [])
  const replaceAppSetting = useCallback(() => { console.warn('replaceAppSetting is deprecated') }, [])
  const replacePsavConfig = useCallback(() => { console.warn('replacePsavConfig is deprecated') }, [])
  const removePsavConfig = useCallback(() => { console.warn('removePsavConfig is deprecated') }, [])

  return {
    /** @deprecated Usar state directamente. snapshot se mantiene para compatibilidad temporal. */
    snapshot: state ? {
      onboarding: mapReviewsToOnboardingRecords(state.complianceReviews), // C7 FIX: mapper explícito
      orders: state.orders,
      support: state.supportTickets as unknown as StaffSupportTicket[],
      users: state.users,
      feesConfig: state.feesConfig as unknown as FeeConfigRow[],
      appSettings: state.appSettings as unknown as AppSettingRow[],
      psavConfigs: state.psavConfigs as unknown as PsavConfigRow[],
      auditLogs: state.auditLogs as unknown as AuditLog[],
    } : null,
    state,
    loading,
    error,
    reload: load,
    replaceOrder,
    replaceUser,
    replaceComplianceReview,
    replaceSupportTicket,
    // Legacy updaters
    replaceOnboarding,
    addUser,
    removeUser,
    replaceFeeConfig,
    replaceAppSetting,
    replacePsavConfig,
    removePsavConfig,
  }
}

// ── C7 FIX: Mapper explícito AdminComplianceReview → StaffOnboardingRecord ──

function mapReviewsToOnboardingRecords(
  reviews: AdminComplianceReview[],
): StaffOnboardingRecord[] {
  return reviews.map((rev) => ({
    id: rev.id,
    user_id: rev.user_id ?? 'unknown-user',
    type: rev.type ?? (rev.subject_type === 'kyb_applications' ? 'company' : 'personal'),
    status: (rev.application_status ?? rev.status ?? 'in_review') as StaffOnboardingRecord['status'],
    data: {},
    observations: undefined,
    created_at: rev.opened_at ?? new Date().toISOString(),
    updated_at: rev.updated_at ?? rev.opened_at ?? new Date().toISOString(),
    profiles: rev.profiles
      ? {
          full_name: rev.profiles.full_name || rev.profiles.business_name,
          email: rev.profiles.email,
          onboarding_status: undefined,
        }
      : null,
  }))
}
