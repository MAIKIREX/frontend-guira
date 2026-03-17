import { ClientShell } from '@/components/layout/client-shell'

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ClientShell>{children}</ClientShell>
}

