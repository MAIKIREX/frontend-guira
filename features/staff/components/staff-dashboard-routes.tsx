'use client'

import { StaffDashboardPage } from '@/features/staff/components/staff-dashboard-page'
import {
  StaffAuditTable,
  StaffConfigPanel,
  StaffOnboardingTable,
  StaffOrdersTable,
  StaffOverviewPanel,
  StaffPayinsPanel,
  StaffPsavPanel,
  StaffSupportTable,
  StaffTransfersPanel,
  StaffUsersTable,
} from '@/features/staff/components/staff-dashboard-sections'
import { StaffConfigPanelV2 } from '@/features/staff/components/staff-config-panel'

export function StaffOverviewRoute() {
  return (
    <StaffDashboardPage>
      {({ snapshot, isPrivileged, reload }) => (
        <StaffOverviewPanel snapshot={snapshot} isPrivileged={isPrivileged} reload={reload} />
      )}
    </StaffDashboardPage>
  )
}

export function StaffOnboardingRoute() {
  return (
    <StaffDashboardPage>
      {({ snapshot }) => <StaffOnboardingTable snapshot={snapshot} />}
    </StaffDashboardPage>
  )
}

export function StaffOrdersRoute() {
  return (
    <StaffDashboardPage>
      {({ snapshot, actor, replaceOrder }) => (
        <StaffOrdersTable snapshot={snapshot} actor={actor} replaceOrder={replaceOrder} />
      )}
    </StaffDashboardPage>
  )
}

export function StaffPayinsRoute() {
  return (
    <StaffDashboardPage>
      {({ snapshot }) => <StaffPayinsPanel snapshot={snapshot} />}
    </StaffDashboardPage>
  )
}

export function StaffTransfersRoute() {
  return (
    <StaffDashboardPage>
      {({ snapshot }) => <StaffTransfersPanel snapshot={snapshot} />}
    </StaffDashboardPage>
  )
}

export function StaffSupportRoute() {
  return (
    <StaffDashboardPage>
      {({ snapshot, actor, replaceSupportTicket }) => (
        <StaffSupportTable snapshot={snapshot} actor={actor} replaceSupportTicket={replaceSupportTicket} />
      )}
    </StaffDashboardPage>
  )
}

export function StaffAuditRoute() {
  return (
    <StaffDashboardPage>
      {({ snapshot }) => <StaffAuditTable snapshot={snapshot} />}
    </StaffDashboardPage>
  )
}

export function StaffUsersRoute() {
  return (
    <StaffDashboardPage>
      {({ snapshot, isAdmin, actor, addUser }) => (
        <StaffUsersTable
          snapshot={snapshot}
          isAdmin={isAdmin}
          actor={actor}
          addUser={addUser}
        />
      )}
    </StaffDashboardPage>
  )
}

export function StaffConfigRoute() {
  return (
    <StaffDashboardPage>
      {({ snapshot, actor, isPrivileged, reload, replaceAppSetting, replaceFeeConfig }) => (
        <StaffConfigPanelV2
          snapshot={snapshot}
          actor={actor}
          isPrivileged={isPrivileged}
          reload={reload}
          replaceAppSetting={replaceAppSetting}
          replaceFeeConfig={replaceFeeConfig}
        />
      )}
    </StaffDashboardPage>
  )
}

export function StaffPsavRoute() {
  return (
    <StaffDashboardPage>
      {({ snapshot, actor, isPrivileged, replacePsavConfig, removePsavConfig }) => (
        <StaffPsavPanel
          snapshot={snapshot}
          actor={actor}
          isPrivileged={isPrivileged}
          replacePsavConfig={replacePsavConfig}
          removePsavConfig={removePsavConfig}
        />
      )}
    </StaffDashboardPage>
  )
}
