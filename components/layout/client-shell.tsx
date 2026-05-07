'use client'

import { useState } from 'react'
import { Menu as MenuIcon, PanelLeftClose, PanelLeftOpen, X, HelpCircle } from 'lucide-react'
import { ClientNavigation } from '@/components/layout/client-navigation'
import { SidebarUtilities } from '@/components/layout/sidebar-utilities'
import { TopbarExchangeWidget } from '@/components/layout/topbar-exchange-widget'
import { NotificationBell } from '@/features/notifications/components/notification-bell'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useProfileStore } from '@/stores/profile-store'


export function ClientShell({
  children,
}: {
  children: React.ReactNode
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const { profile } = useProfileStore()

  const userFirstName = profile?.full_name?.split(' ')[0] || 'Usuario'

  return (
    <div className="min-h-screen bg-background">
      <div
        className="grid min-h-screen w-full transition-[grid-template-columns] duration-[280ms] ease-in-out md:[grid-template-columns:var(--sidebar-width)_minmax(0,1fr)]"
        style={{ ['--sidebar-width' as string]: isCollapsed ? '84px' : '260px' }}
      >
        {/* Mobile Sidebar Overlay */}
        {isMobileOpen && (
          <div
            className="fixed inset-0 z-50 bg-foreground/25 backdrop-blur-sm md:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-50 w-[260px] text-sidebar-foreground border-r border-sidebar-border transition-transform duration-[280ms] ease-in-out md:hidden flex flex-col",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
          style={{ background: 'linear-gradient(180deg, #020B2D 0%, #06113A 100%)' }}
        >
          <div className="flex items-center justify-between border-b border-sidebar-border px-6 py-5">
            <div className="flex items-center gap-2.5 min-w-0">
              <img src="/LOGO GUIRRA ISOTIPO.svg" alt="Guira" className="h-[34px] w-auto" />
              <span className="text-[1rem] font-semibold tracking-tight text-sidebar-foreground/90">Guira</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileOpen(false)}
              className="text-sidebar-foreground/60 hover:bg-white/8 hover:text-sidebar-foreground h-8 w-8"
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto py-4">
            <ClientNavigation collapsed={false} />
          </div>

          <SidebarUtilities mobile />
        </aside>

        {/* Desktop Sidebar */}
        <aside
          className="relative hidden text-sidebar-foreground border-r border-sidebar-border md:block"
          style={{ background: 'linear-gradient(180deg, #020B2D 0%, #06113A 100%)' }}
        >
          <div className="sticky top-0 flex min-h-screen flex-col">

            {/* Logo area */}
            <div className="border-b border-sidebar-border px-6 py-6">
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between gap-3'}`}>
                {!isCollapsed && (
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img src="/LOGO GUIRRA ISOTIPO.svg" alt="Guira" className="h-[34px] w-auto" />
                    <span className="text-[1rem] font-semibold tracking-tight text-sidebar-foreground/90">Guira</span>
                  </div>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  className={cn(
                    "shrink-0 rounded-xl border border-sidebar-border/70 bg-white/[0.05] text-sidebar-foreground/50 hover:bg-white/[0.1] hover:text-sidebar-foreground h-8 w-8 p-0 flex items-center justify-center transition-colors",
                    isCollapsed && "w-10 h-10 rounded-2xl"
                  )}
                  onClick={() => setIsCollapsed((value) => !value)}
                  aria-label={isCollapsed ? 'Expandir menu lateral' : 'Colapsar menu lateral'}
                  title={isCollapsed ? 'Expandir menu lateral' : 'Colapsar menu lateral'}
                >
                  {isCollapsed
                    ? <PanelLeftOpen strokeWidth={1.8} className="size-4" />
                    : <PanelLeftClose strokeWidth={1.8} className="size-4" />
                  }
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              <ClientNavigation collapsed={isCollapsed} />
            </div>

            <SidebarUtilities collapsed={isCollapsed} />
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex min-h-screen flex-col">

          {/* ── Topbar ── */}
          <header
            className="sticky top-0 z-30 hidden md:flex items-center justify-between px-8 border-b border-sidebar-border/30"
            style={{
              background: 'linear-gradient(90deg, #020B2D 0%, #06113A 100%)',
              height: '68px',
            }}
          >
            {/* Left: Greeting */}
            <div className="flex flex-col justify-center min-w-0">
              <h2 className="text-[15px] font-bold text-white tracking-tight leading-tight">
                Hola, {userFirstName}
              </h2>
              <p className="text-[11px] text-white/40 font-medium mt-0.5">
                Resumen general de tu operación global
              </p>
            </div>

            {/* Right: Exchange + Notifications + Help + Theme */}
            <div className="flex items-center gap-3">
              <TopbarExchangeWidget />

              <div className="h-6 w-px bg-white/10" />

              <NotificationBell />

              <button
                className="flex items-center justify-center size-9 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
                title="Ayuda"
              >
                <HelpCircle className="size-[1.1rem]" strokeWidth={1.8} />
              </button>

              <ThemeToggle />
            </div>
          </header>

          {/* Mobile menu trigger */}
          <div className="sticky top-4 z-40 flex px-4 md:hidden">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsMobileOpen(true)}
              className="h-9 w-9 rounded-xl border-border/60 bg-background shadow-sm"
            >
              <MenuIcon className="size-4" />
            </Button>
          </div>

          <main className="flex-1 px-5 py-8 md:px-8 md:py-7">
            {children}
          </main>
        </div>

      </div>
    </div>
  )
}
