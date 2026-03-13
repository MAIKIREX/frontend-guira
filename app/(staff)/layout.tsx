import { UserMenu } from '@/features/auth/components/user-menu'
import { NotificationBell } from '@/features/notifications/components/notification-bell'
import { StaffNavigation } from '@/components/layout/staff-navigation'

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen max-w-[1600px] md:grid-cols-[260px_1fr]">
        <aside className="hidden border-r border-border/70 md:block">
          <div className="sticky top-0 p-4">
            <div className="mb-6 rounded-2xl border border-border/70 bg-muted/20 p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Guira</div>
              <div className="mt-1 text-lg font-semibold tracking-tight">Control interno</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Vista operativa para staff y admin con foco en trazabilidad y lectura rapida.
              </p>
            </div>
            <StaffNavigation />
          </div>
        </aside>

        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-10 border-b border-border/70 bg-background/90 backdrop-blur">
            <div className="flex h-16 items-center justify-between px-4 md:px-6">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Panel staff</div>
                <h1 className="text-lg font-medium tracking-tight">Lectura operativa</h1>
              </div>
              <div className="flex items-center gap-4">
                <NotificationBell />
                <UserMenu />
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  )
}
