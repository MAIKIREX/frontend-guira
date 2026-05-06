'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Headset,
  LayoutDashboard,
  Settings,
  UsersRound,
  Waypoints,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const mainLinks = [
  { href: '/panel', label: 'Panel', icon: LayoutDashboard },
  { href: '/depositar', label: 'Depositar', icon: ArrowDownLeft },
  { href: '/enviar', label: 'Enviar / Retirar', icon: ArrowUpRight },
  { href: '/proveedores', label: 'Proveedores', icon: UsersRound },
  { href: '/transacciones', label: 'Transacciones', icon: Waypoints },
]

const utilityLinks = [
  { href: '/configuracion', label: 'Configuracion', icon: Settings },
  { href: '/soporte', label: 'Soporte', icon: Headset },
]

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
}: {
  href: string
  label: string
  icon: React.ElementType
  active: boolean
  collapsed: boolean
}) {
  return (
    <div className="relative flex flex-col w-full">
      <div className="relative flex items-center px-4 py-0.5">
        {active && (
          <div
            className="absolute left-0 h-[55%] w-[3px] rounded-r-full bg-accent transition-all duration-300"
            style={{ boxShadow: '0 0 8px rgba(0, 214, 255, 0.45)' }}
          />
        )}
        <Link
          href={href}
          title={label}
          aria-label={label}
          className={cn(
            'w-full group relative flex items-center transition-all duration-200 ease-out',
            collapsed ? 'justify-center p-3 rounded-2xl' : 'gap-3.5 px-4 py-2.5 rounded-[12px]',
            active
              ? 'bg-white/[0.07] text-white'
              : 'text-sidebar-foreground/55 hover:bg-white/[0.04] hover:text-white'
          )}
        >
          <span
            className={cn(
              'relative z-10 flex shrink-0 items-center justify-center transition-all duration-200',
              active
                ? 'text-accent'
                : 'text-sidebar-foreground/55 group-hover:text-white/80'
            )}
          >
            <Icon
              strokeWidth={active ? 2.5 : 1.8}
              className={cn('size-[1.1rem]', collapsed && 'size-[1.2rem]')}
            />
          </span>

          {!collapsed && (
            <span
              className={cn(
                'relative z-10 text-[0.85rem] tracking-tight',
                active ? 'font-semibold text-white' : 'font-medium'
              )}
            >
              {label}
            </span>
          )}
        </Link>
      </div>
    </div>
  )
}

export function ClientNavigation({
  collapsed = false,
}: {
  collapsed?: boolean
}) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col h-full py-2">
      {/* Main links */}
      <div className="flex flex-col flex-1">
        {mainLinks.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`)
          return (
            <NavLink
              key={link.href}
              href={link.href}
              label={link.label}
              icon={link.icon}
              active={active}
              collapsed={collapsed}
            />
          )
        })}
      </div>

      {/* Separator */}
      <div className={cn('my-3', collapsed ? 'mx-4' : 'mx-5')}>
        <div className="h-px bg-sidebar-border/60" />
      </div>

      {/* Utility links */}
      <div className="flex flex-col">
        {!collapsed && (
          <p className="px-8 pb-1.5 text-[0.6rem] font-extrabold uppercase tracking-[0.16em] text-sidebar-foreground/30">
            Ajustes
          </p>
        )}
        {utilityLinks.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`)
          return (
            <NavLink
              key={link.href}
              href={link.href}
              label={link.label}
              icon={link.icon}
              active={active}
              collapsed={collapsed}
            />
          )
        })}
      </div>
    </nav>
  )
}
