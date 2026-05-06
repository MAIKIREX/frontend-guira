'use client'

import { useState } from 'react'
import { Menu as MenuIcon, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { ClientNavigation } from '@/components/layout/client-navigation'
import { SidebarUtilities } from '@/components/layout/sidebar-utilities'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'


export function ClientShell({
  children,
}: {
  children: React.ReactNode
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <div
        className="grid min-h-screen w-full transition-[grid-template-columns] duration-[280ms] ease-in-out md:[grid-template-columns:var(--sidebar-width)_minmax(0,1fr)]"
        style={{ ['--sidebar-width' as string]: isCollapsed ? '84px' : '268px' }}
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
          "fixed inset-y-0 left-0 z-50 w-[268px] bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform duration-[280ms] ease-in-out md:hidden flex flex-col",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex items-center justify-between border-b border-sidebar-border px-5 py-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <img src="/LOGO GUIRRA ISOTIPO.svg" alt="Guira" className="h-6 w-auto" />
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
        <aside className="relative hidden bg-sidebar text-sidebar-foreground border-r border-sidebar-border md:block">
          <div className="sticky top-0 flex min-h-screen flex-col">

            {/* Logo area */}
            <div className="border-b border-sidebar-border px-5 py-5">
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between gap-3'}`}>
                {!isCollapsed && (
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img src="/LOGO GUIRRA ISOTIPO.svg" alt="Guira" className="h-6 w-auto" />
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

          <main className="flex-1 px-5 py-8 md:px-10">
            {children}
          </main>
        </div>

      </div>
    </div>
  )
}
