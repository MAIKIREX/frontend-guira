import { ClientShell } from '@/components/layout/client-shell'

export const dynamic = 'force-dynamic'

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ClientShell>{children}</ClientShell>
}

