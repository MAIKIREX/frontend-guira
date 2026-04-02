'use client'

import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth-store'
import { useProfileStore } from '@/stores/profile-store'
import { useStaffDashboard } from '@/features/staff/hooks/use-staff-dashboard'
import type { StaffActor, StaffSnapshot } from '@/types/staff'

export interface StaffDashboardLoadedState {
  snapshot: StaffSnapshot
  actor: StaffActor
  isAdmin: boolean
  isPrivileged: boolean
  reload: () => Promise<void>
  replaceOnboarding: (record: StaffSnapshot['onboarding'][number]) => void
  replaceOrder: (order: StaffSnapshot['orders'][number]) => Promise<void> | void
  replaceSupportTicket: (ticket: StaffSnapshot['support'][number]) => Promise<void> | void
  addUser: (user: StaffSnapshot['users'][number]) => void
  replaceUser: (user: StaffSnapshot['users'][number]) => void
  removeUser: (userId: string) => void
  replaceFeeConfig: (record: StaffSnapshot['feesConfig'][number]) => void
  replaceAppSetting: (record: StaffSnapshot['appSettings'][number]) => void
  replacePsavConfig: (record: StaffSnapshot['psavConfigs'][number]) => void
  removePsavConfig: (recordId: string) => void
}

export function StaffDashboardPage({
  children,
}: {
  children: (state: StaffDashboardLoadedState) => ReactNode
}) {
  const { user } = useAuthStore()
  const { profile } = useProfileStore()
  const {
    snapshot,
    loading,
    error,
    reload,
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
  } = useStaffDashboard()

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !snapshot || !user || !profile || (profile.role !== 'staff' && profile.role !== 'admin' && profile.role !== 'super_admin')) {
    return (
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>No se pudo cargar el Staff Panel</CardTitle>
          <CardDescription>{error ?? 'No hay permisos o datos disponibles para el panel interno.'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={reload} type="button">Reintentar</Button>
        </CardContent>
      </Card>
    )
  }

  const actor: StaffActor = { userId: user.id, role: profile.role }

  return (
    <>
      {children({
        snapshot: snapshot as any,
        actor,
        isAdmin: actor.role === 'admin' || actor.role === 'super_admin',
        isPrivileged: actor.role === 'admin' || actor.role === 'staff' || actor.role === 'super_admin',
        reload,
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
      })}
    </>
  )
}
