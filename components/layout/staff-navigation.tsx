'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Blocks, Headset, LayoutDashboard, ScrollText } from 'lucide-react'
import { cn } from '@/lib/utils'

const staffLinks = [
  { href: '/admin', label: 'Panel', icon: LayoutDashboard },
  { href: '/admin/soporte', label: 'Soporte', icon: Headset },
  { href: '/auditoria', label: 'Auditoria', icon: ScrollText },
]

export function StaffNavigation({
  collapsed = false,
}: {
  collapsed?: boolean
}) {
  const pathname = usePathname()

  return (
    <nav className="space-y-2.5">
      {staffLinks.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`)
        const Icon = link.icon

        return (
          <Link
            key={link.href}
            href={link.href}
            title={link.label}
            aria-label={link.label}
            className={cn(
              'group relative flex overflow-hidden rounded-[1.35rem] text-sm transition-all duration-200',
              collapsed ? 'justify-center px-3 py-3.5' : 'items-center gap-3 px-4 py-3.5',
              active
                ? 'bg-accent/12 text-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-accent)_24%,transparent)]'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            )}
          >
            <span
              className={cn(
                'absolute right-0 top-2 bottom-2 w-1 rounded-full bg-transparent transition-colors duration-200',
                active && 'bg-accent'
              )}
            />
            <span
              className={cn(
                'relative z-10 flex shrink-0 items-center justify-center text-muted-foreground transition-colors duration-200',
                active && 'text-accent-foreground'
              )}
            >
              <Icon className={cn('size-4', !collapsed && 'size-[1.05rem]')} />
            </span>
            {!collapsed ? (
              <span className="relative z-10 text-[0.82rem] font-semibold uppercase tracking-[0.16em]">
                {link.label}
              </span>
            ) : null}
          </Link>
        )
      })}

      {!collapsed ? (
        <div className="mt-5 rounded-[1.6rem] bg-muted/45 px-4 py-4 text-xs text-muted-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-border)_85%,transparent)]">
          <div className="mb-2 flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-foreground">
            <Blocks className="size-3.5" />
            Modo lectura
          </div>
          Staff actions, cambios de estado y auditoria activa quedan para el siguiente hito.
        </div>
      ) : (
        <div
          className="mt-5 flex justify-center rounded-[1.35rem] bg-muted/45 p-3 text-muted-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-border)_85%,transparent)]"
          title="Modo lectura"
          aria-label="Modo lectura"
        >
          <Blocks className="size-4" />
        </div>
      )}
    </nav>
  )
}
