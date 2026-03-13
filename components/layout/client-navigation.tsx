'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CreditCard, Headset, LayoutDashboard, ScrollText } from 'lucide-react'
import { cn } from '@/lib/utils'

const clientLinks = [
  { href: '/panel', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pagos', label: 'Pagos', icon: CreditCard },
  { href: '/actividad', label: 'Actividad', icon: ScrollText },
  { href: '/soporte', label: 'Soporte', icon: Headset },
]

export function ClientNavigation() {
  const pathname = usePathname()

  return (
    <nav className="space-y-1">
      {clientLinks.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`)
        const Icon = link.icon

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="size-4" />
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
