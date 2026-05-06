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
    <nav className="flex flex-col py-2">
      {clientLinks.map((link, index) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`)
        const Icon = link.icon

        return (
          <div key={link.href} className="relative flex flex-col w-full">

            {/* Link Container */}
            <div className="relative flex items-center px-4 py-0.5">
              {/* Floating Left Indicator (Outside the button) */}
              {active && (
                <div 
                  className="absolute left-0 h-[60%] w-[4px] rounded-r-md bg-[#01C5FF] transition-all duration-300" 
                  style={{ boxShadow: '0 0 10px rgba(1, 197, 255, 0.5)' }}
                />
              )}

              <Link
                href={link.href}
                title={link.label}
                aria-label={link.label}
                className={cn(
                  'w-full group relative flex items-center transition-all duration-200 ease-out',
                  collapsed ? 'justify-center p-3 rounded-2xl' : 'gap-3.5 px-4 py-2.5 rounded-[12px]',
                  active
                    ? 'bg-white/[0.08] text-white shadow-sm ring-1 ring-white/5'
                    : 'text-sidebar-foreground/60 hover:bg-white/[0.03] hover:text-white'
                )}
              >
                {/* Icon */}
                <span
                  className={cn(
                    'relative z-10 flex shrink-0 items-center justify-center transition-all duration-200',
                    active 
                      ? 'text-[#01C5FF]' 
                      : 'text-sidebar-foreground/60 group-hover:text-white'
                  )}
                >
                  <Icon strokeWidth={active ? 2.5 : 2} className={cn('size-[1.15rem]', collapsed && 'size-[1.25rem]')} />
                </span>
                
                {/* Label */}
                {!collapsed && (
                  <span className={cn(
                    "relative z-10 text-[0.875rem] font-medium tracking-tight",
                    active ? "text-white font-semibold" : ""
                  )}>
                    {link.label}
                  </span>
                )}
              </Link>
            </div>
          </div>
        )
      })}
    </nav>
  )
}
