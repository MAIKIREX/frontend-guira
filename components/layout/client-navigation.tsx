'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowDownToLine, ArrowUpFromLine, Headset, LayoutDashboard, Settings, UsersRound, Waypoints } from 'lucide-react'
import { cn } from '@/lib/utils'

const clientLinks = [
  { href: '/panel', label: 'Panel', icon: LayoutDashboard },
  { href: '/depositar', label: 'Depositar', icon: ArrowDownToLine },
  { href: '/enviar', label: 'Enviar', icon: ArrowUpFromLine },
  { href: '/proveedores', label: 'Proveedores', icon: UsersRound },
  { href: '/transacciones', label: 'Transacciones', icon: Waypoints },
  { href: '/configuracion', label: 'Configuracion', icon: Settings },
  { href: '/soporte', label: 'Soporte', icon: Headset },
]

export function ClientNavigation({
  collapsed = false,
}: {
  collapsed?: boolean
}) {
  const pathname = usePathname()

  return (
    <nav className="space-y-2">
      {!collapsed ? (
        <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Cliente
        </div>
      ) : null}
      {clientLinks.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`)
        const Icon = link.icon

        return (
          <Link
            key={link.href}
            href={link.href}
            title={link.label}
            aria-label={link.label}
            className={cn(
              'group flex rounded-2xl border text-sm transition-colors',
              collapsed ? 'justify-center px-2 py-3' : 'items-center gap-3 px-3 py-3',
              active
                ? 'border-sky-300/70 bg-sky-50 text-foreground dark:border-sky-900/70 dark:bg-sky-950/30'
                : 'border-transparent text-muted-foreground hover:border-border/70 hover:bg-muted/30 hover:text-foreground'
            )}
          >
            <span className={cn('rounded-xl border border-border/60 bg-background/80 p-2 text-muted-foreground', active && 'border-sky-300/60 bg-white text-sky-700 dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-300')}>
              <Icon className="size-4" />
            </span>
            {!collapsed ? <span className="font-medium">{link.label}</span> : null}
          </Link>
        )
      })}
    </nav>
  )
}
