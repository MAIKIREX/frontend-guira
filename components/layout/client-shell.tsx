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
        className="grid min-h-screen w-full transition-[grid-template-columns] duration-200 md:[grid-template-columns:var(--sidebar-width)_minmax(0,1fr)]"
        style={{ ['--sidebar-width' as string]: isCollapsed ? '88px' : '280px' }}
      >
        {/* Mobile Sidebar Overlay */}
        {isMobileOpen && (
          <div
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm md:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-50 w-[280px] bg-background border-r transition-transform duration-300 ease-in-out md:hidden flex flex-col",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex items-center justify-between border-b px-5 py-4">
            <img src="/asdsadsa.svg" alt="Guira" className="h-6 w-auto" />
            <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(false)}>
              <X className="size-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto py-4">
            <ClientNavigation collapsed={false} />
          </div>

          <SidebarUtilities mobile />
        </aside>

        {/* Desktop Sidebar */}
        <aside className="relative hidden border-r border-border/60  md:block">
          <div className="sticky top-0 flex min-h-screen flex-col">
            <div className="border-b border-border/55 px-5 py-6">
              <div className={`flex items-start ${isCollapsed ? 'justify-center' : 'justify-between gap-3'}`}>
                <div className={isCollapsed ? 'hidden' : 'min-w-0'}>
                  <img src="/asdsadsa.svg" alt="Guira" className="h-6 w-auto" />
                  <div className="mt-3 text-lg font-semibold uppercase tracking-[0.18em] text-foreground/92">
                    Navegacion
                  </div>
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

            <div className={`flex-1 overflow-y-auto ${isCollapsed ? 'py-5' : 'py-5'}`}>
              <ClientNavigation collapsed={isCollapsed} />
            </div>

            <SidebarUtilities collapsed={isCollapsed} />
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex min-h-screen flex-col">
          <div className="sticky top-4 z-40 flex px-4 md:hidden">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsMobileOpen(true)}
              className="border-border/70 bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80"
            >
              <MenuIcon className="size-6" />
            </Button>
          </div>

          <main className="flex-1 px-4 py-8 md:px-8">
            {children}
          </main>
        </div>

      </div>
    </div>
  )
}
