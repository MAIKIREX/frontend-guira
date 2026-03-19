'use client'

import { useState } from 'react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { StaffNavigation } from '@/components/layout/staff-navigation'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { Button } from '@/components/ui/button'
import { UserMenu } from '@/features/auth/components/user-menu'
import { NotificationBell } from '@/features/notifications/components/notification-bell'

export function StaffShell({
  children,
}: {
  children: React.ReactNode
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className="mx-auto grid min-h-screen max-w-[1600px] transition-[grid-template-columns] duration-200 md:[grid-template-columns:var(--sidebar-width)_minmax(0,1fr)]"
        style={{ ['--sidebar-width' as string]: isCollapsed ? '88px' : '260px' }}
      >
        <aside className="relative hidden border-r border-border/60 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-sidebar)_92%,white)_0%,color-mix(in_oklab,var(--color-muted)_55%,white)_100%)] md:block">
          <div className="absolute inset-y-0 left-0 w-3 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-primary)_24%,transparent)_0%,color-mix(in_oklab,var(--color-accent)_22%,transparent)_100%)]" />
          <div className="sticky top-0 p-4">
            <div className={`mb-6 rounded-[1.9rem] bg-background/55 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-border)_85%,transparent)] ${isCollapsed ? 'p-3' : 'p-5'}`}>
              <div className={`flex items-start ${isCollapsed ? 'justify-center' : 'justify-between gap-3'}`}>
                <div className={isCollapsed ? 'hidden' : 'min-w-0'}>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.34em] text-muted-foreground/80">Guira</div>
                  <div className="mt-3 text-lg font-semibold uppercase tracking-[0.16em] text-foreground/92">Control interno</div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Vista operativa para staff y admin con foco en trazabilidad y lectura rapida.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 rounded-full border border-border/70 bg-background/70 text-muted-foreground hover:bg-background hover:text-foreground"
                  onClick={() => setIsCollapsed((value) => !value)}
                  aria-label={isCollapsed ? 'Expandir menu lateral' : 'Colapsar menu lateral'}
                  title={isCollapsed ? 'Expandir menu lateral' : 'Colapsar menu lateral'}
                >
                  {isCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
                </Button>
              </div>
            </div>

            <StaffNavigation collapsed={isCollapsed} />
          </div>
        </aside>

        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-10 border-b border-border/70 bg-background/90 backdrop-blur">
            <div className="flex h-16 items-center justify-between px-4 md:px-6">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="hidden border border-border/70 text-muted-foreground hover:text-foreground md:inline-flex"
                  onClick={() => setIsCollapsed((value) => !value)}
                  aria-label={isCollapsed ? 'Expandir menu lateral' : 'Colapsar menu lateral'}
                  title={isCollapsed ? 'Expandir menu lateral' : 'Colapsar menu lateral'}
                >
                  {isCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
                </Button>
                <div>
                  <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Panel staff</div>
                  <h1 className="text-lg font-medium tracking-tight">Lectura operativa</h1>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <ThemeToggle />
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
