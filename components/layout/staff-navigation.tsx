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

export function StaffNavigation() {
  const pathname = usePathname()

  return (
    <nav className="space-y-1">
      {staffLinks.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`)
        const Icon = link.icon

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors',
              active
                ? 'border-border bg-foreground text-background'
                : 'border-transparent text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground'
            )}
          >
            <Icon className="size-4" />
            {link.label}
          </Link>
        )
      })}

      <div className="rounded-xl border border-dashed border-border/70 p-3 text-xs text-muted-foreground">
        <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
          <Blocks className="size-3.5" />
          Modo lectura
        </div>
        Staff actions, cambios de estado y auditoria activa quedan para el siguiente hito.
      </div>
    </nav>
  )
}
