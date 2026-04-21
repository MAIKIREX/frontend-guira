import { StaffShell } from '@/components/layout/staff-shell'

export const dynamic = 'force-dynamic'

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <StaffShell>{children}</StaffShell>
}
