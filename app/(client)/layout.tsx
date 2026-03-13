import { ClientNavigation } from '@/components/layout/client-navigation'
import { UserMenu } from '@/features/auth/components/user-menu'
import { NotificationBell } from '@/features/notifications/components/notification-bell'

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Client Sidebar Placeholder */}
      <div className="w-64 border-r bg-muted/20 hidden md:block">
        <div className="p-4 border-b">
          <h2 className="font-bold">Guira</h2>
        </div>
        <div className="p-4">
          <ClientNavigation />
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {/* Client Header */}
        <header className="h-16 border-b flex items-center justify-between px-6">
          <h1 className="text-lg font-medium">Panel Principal</h1>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <UserMenu />
          </div>
        </header>
        
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
