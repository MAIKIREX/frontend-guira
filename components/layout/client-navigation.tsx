'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowDownLeft,
  ArrowUpRight,
  LayoutDashboard,
  Settings,
  Headset,
  UsersRound,
  Waypoints,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const mainLinks = [
  { href: '/panel', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/depositar', label: 'Depositar', icon: ArrowDownLeft },
  { href: '/enviar', label: 'Pagos / Envíos', icon: ArrowUpRight },
  { href: '/proveedores', label: 'Proveedores', icon: UsersRound },
  { href: '/transacciones', label: 'Trazabilidad', icon: Waypoints },
]

const utilityLinks = [
  { href: '/configuracion', label: 'Configuración', icon: Settings },
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
        <Link
          href={href}
          title={label}
          aria-label={label}
          className={cn(
            'w-full group relative flex items-center transition-all duration-200 ease-out',
            collapsed ? 'justify-center p-3 rounded-2xl' : 'gap-3.5 px-4 py-2.5 rounded-[10px]',
            active
              ? 'text-white shadow-[0_8px_20px_rgba(0,91,255,0.25)]'
              : 'text-white/[0.78] hover:bg-white/[0.08] hover:text-white'
          )}
          style={active ? {
            background: 'linear-gradient(90deg, #005BFF 0%, #00BFFF 100%)',
          } : undefined}
        >
          <span
            className={cn(
              'relative z-10 flex shrink-0 items-center justify-center transition-all duration-200',
              active ? 'text-white' : 'text-white/[0.78] group-hover:text-white'
            )}
          >
            <Icon
              strokeWidth={active ? 2.2 : 1.8}
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
      <div className="flex flex-col flex-1 gap-0.5">
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
      <div className="flex flex-col gap-0.5">
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
