'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowDownLeft, ArrowUpRight, Headset, LayoutDashboard, Settings, UsersRound, Wallet, Waypoints } from 'lucide-react'
import { cn } from '@/lib/utils'

const clientLinks = [
  { href: '/panel', label: 'Panel', icon: LayoutDashboard },
  { href: '/cuentas', label: 'Mis Cuentas', icon: Wallet },
  { href: '/depositar', label: 'Depositar', icon: ArrowDownLeft },
  { href: '/enviar', label: 'Enviar / Retirar', icon: ArrowUpRight },
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
    <nav className="space-y-2.5">
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
              'group relative flex overflow-hidden  text-sm transition-all duration-200',
              collapsed ? 'justify-center px-3 py-4' : 'items-center gap-3.5 px-4 py-4',
              active
                ? 'bg-primary/12 text-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-primary)_24%,transparent)]'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            )}
          >
            <span
              className={cn(
                'absolute right-0 top-0 bottom-0 w-1  bg-transparent transition-colors duration-200',
                active && 'bg-primary'
              )}
            />
            <span
              className={cn(
                'relative z-10 flex shrink-0 items-center justify-center text-muted-foreground transition-colors duration-200',
                active && 'text-primary'
              )}
            >
              <Icon strokeWidth={2.5} className={cn('size-7', !collapsed && 'size-[1.6rem]')} />
            </span>
            {!collapsed ? (
              <span className="relative z-10 text-[1.05rem] font-bold">
                {link.label}
              </span>
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}
