'use client'

import { useState } from 'react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { ClientNavigation } from '@/components/layout/client-navigation'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { Button } from '@/components/ui/button'
import { UserMenu } from '@/features/auth/components/user-menu'
import { NotificationBell } from '@/features/notifications/components/notification-bell'

export function ClientShell({
  children,
}: {
  children: React.ReactNode
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <div
        className="mx-auto grid min-h-screen max-w-[1600px] transition-[grid-template-columns] duration-200 md:[grid-template-columns:var(--sidebar-width)_minmax(0,1fr)]"
        style={{ ['--sidebar-width' as string]: isCollapsed ? '88px' : '280px' }}
      >
        <aside className="relative hidden border-r border-border/60  md:block">

          <div className="sticky top-0 flex min-h-screen flex-col">
            <div className="border-b border-border/55 px-5 py-6">
              <div className={`flex items-start ${isCollapsed ? 'justify-center' : 'justify-between gap-3'}`}>
                <div className={isCollapsed ? 'hidden' : 'min-w-0'}>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.34em] text-muted-foreground/80">Guira</div>
                  <div className="mt-3 text-lg font-semibold uppercase tracking-[0.18em] text-foreground/92">
                    Navegacion
                  </div>
                  {/*<h2 className="mt-2 text-xl font-semibold tracking-tight">Mesa del cliente</h2>*/}
                  {/*<p className="mt-2 text-sm text-muted-foreground">
                    Navegacion separada por accion: panel, deposito, envio, proveedores, transacciones y soporte.
                  </p>*/}
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

            <div className={`flex-1 ${isCollapsed ? 'py-5' : 'py-5'}`}>
              <ClientNavigation collapsed={isCollapsed} />
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-20 border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="flex items-center justify-end gap-4 px-6 py-4">
              {/*<div className="flex items-start gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="mt-0.5 hidden border border-border/70 text-muted-foreground hover:text-foreground md:inline-flex"
                  onClick={() => setIsCollapsed((value) => !value)}
                  aria-label={isCollapsed ? 'Expandir menu lateral' : 'Colapsar menu lateral'}
                  title={isCollapsed ? 'Expandir menu lateral' : 'Colapsar menu lateral'}
                >
                  {isCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
                </Button>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Portal operativo</div>
                  <h1 className="mt-1 text-xl font-semibold tracking-tight">Workspace del cliente</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Cada seccion separa una intencion operativa para evitar mezclar seguimiento, alta y configuracion.
                  </p>
                </div>
              </div>*/}

              <div className="flex items-center gap-4">
                <ThemeToggle />
                <NotificationBell />
                <UserMenu />
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 md:px-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
