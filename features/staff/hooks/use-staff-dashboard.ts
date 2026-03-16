'use client'

import { useCallback, useEffect, useState } from 'react'
import { StaffService } from '@/services/staff.service'
import type { AppSettingRow, FeeConfigRow, PaymentOrder, PsavConfigRow } from '@/types/payment-order'
import type { Profile } from '@/types/profile'
import type { StaffOnboardingRecord, StaffSnapshot, StaffSupportTicket } from '@/types/staff'

export function useStaffDashboard() {
  const [snapshot, setSnapshot] = useState<StaffSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await StaffService.getReadOnlySnapshot()
      setSnapshot(data)
    } catch (err) {
      console.error('Failed to load staff dashboard', err)
      setError('No se pudo cargar el panel staff de solo lectura.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const replaceOnboarding = useCallback((updatedRecord: StaffOnboardingRecord) => {
    setSnapshot((current) => {
      if (!current) return current
      return {
        ...current,
        onboarding: current.onboarding.map((record) => (record.id === updatedRecord.id ? updatedRecord : record)),
        users: current.users.map((user) =>
          user.id === updatedRecord.user_id
            ? { ...user, onboarding_status: updatedRecord.status }
            : user
        ),
      }
    })
  }, [])

  const replaceOrder = useCallback((updatedOrder: PaymentOrder) => {
    setSnapshot((current) => {
      if (!current) return current
      return {
        ...current,
        orders: current.orders.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)),
      }
    })
  }, [])

  const replaceSupportTicket = useCallback((updatedTicket: StaffSupportTicket) => {
    setSnapshot((current) => {
      if (!current) return current
      return {
        ...current,
        support: current.support.map((ticket) => (ticket.id === updatedTicket.id ? updatedTicket : ticket)),
      }
    })
  }, [])

  const addUser = useCallback((profile: Profile) => {
    setSnapshot((current) => {
      if (!current) return current
      return {
        ...current,
        users: [profile, ...current.users.filter((user) => user.id !== profile.id)],
      }
    })
  }, [])

  const replaceUser = useCallback((updatedUser: Profile) => {
    setSnapshot((current) => {
      if (!current) return current
      return {
        ...current,
        users: current.users.map((user) => (user.id === updatedUser.id ? updatedUser : user)),
      }
    })
  }, [])

  const removeUser = useCallback((userId: string) => {
    setSnapshot((current) => {
      if (!current) return current
      return {
        ...current,
        users: current.users.filter((user) => user.id !== userId),
      }
    })
  }, [])

  const replaceFeeConfig = useCallback((updatedRecord: FeeConfigRow) => {
    setSnapshot((current) => {
      if (!current) return current
      return {
        ...current,
        feesConfig: current.feesConfig.map((record) => (record.id === updatedRecord.id ? updatedRecord : record)),
      }
    })
  }, [])

  const replaceAppSetting = useCallback((updatedRecord: AppSettingRow) => {
    setSnapshot((current) => {
      if (!current) return current

      const nextRecords = [...current.appSettings]
      const recordId = String(updatedRecord.id ?? updatedRecord.key ?? updatedRecord.name ?? '')
      const existingIndex = nextRecords.findIndex(
        (record) => String(record.id ?? record.key ?? record.name ?? '') === recordId
      )

      if (existingIndex >= 0) {
        nextRecords[existingIndex] = updatedRecord
      } else {
        nextRecords.unshift(updatedRecord)
      }

      return {
        ...current,
        appSettings: nextRecords,
      }
    })
  }, [])

  const replacePsavConfig = useCallback((updatedRecord: PsavConfigRow) => {
    setSnapshot((current) => {
      if (!current) return current

      const exists = current.psavConfigs.some((record) => record.id === updatedRecord.id)
      return {
        ...current,
        psavConfigs: exists
          ? current.psavConfigs.map((record) => (record.id === updatedRecord.id ? updatedRecord : record))
          : [updatedRecord, ...current.psavConfigs],
      }
    })
  }, [])

  const removePsavConfig = useCallback((recordId: string) => {
    setSnapshot((current) => {
      if (!current) return current
      return {
        ...current,
        psavConfigs: current.psavConfigs.filter((record) => record.id !== recordId),
      }
    })
  }, [])

  return {
    snapshot,
    loading,
    error,
    reload: load,
    replaceOnboarding,
    replaceOrder,
    replaceSupportTicket,
    addUser,
    replaceUser,
    removeUser,
    replaceFeeConfig,
    replaceAppSetting,
    replacePsavConfig,
    removePsavConfig,
  }
}
