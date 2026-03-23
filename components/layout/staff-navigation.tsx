'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Blocks,
  ChevronDown,
  CircleDollarSign,
  Cog,
  Headset,
  LayoutDashboard,
  ReceiptText,
  ScrollText,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type StaffNavItem = {
  href: string
  label: string
  icon: typeof LayoutDashboard
}

type StaffNavGroup = {
  key: string
  label: string
  icon: typeof LayoutDashboard
  items: StaffNavItem[]
}

const staffNavGroups: StaffNavGroup[] = [
  {
    key: 'operations',
    label: 'Operaciones',
    icon: LayoutDashboard,
    items: [
      { href: '/admin', label: 'Panel', icon: LayoutDashboard },
      { href: '/admin/onboarding', label: 'Onboarding', icon: ShieldCheck },
      { href: '/admin/orders', label: 'Orders', icon: ReceiptText },
    ],
  },
  {
    key: 'governance',
    label: 'Gobernanza',
    icon: ScrollText,
    items: [
      { href: '/admin/support', label: 'Support', icon: Headset },
      { href: '/admin/audit', label: 'Audit', icon: ScrollText },
      { href: '/admin/users', label: 'Users', icon: Users },
    ],
  },
  {
    key: 'system',
    label: 'Sistema',
    icon: Cog,
    items: [
      { href: '/admin/config', label: 'Config', icon: SlidersHorizontal },
      { href: '/admin/psav', label: 'PSAV', icon: CircleDollarSign },
    ],
  },
]

export function StaffNavigation({
  collapsed = false,
  onRequestExpand,
}: {
  collapsed?: boolean
  onRequestExpand?: () => void
}) {
  const pathname = usePathname()

  const activeGroupsState = useMemo(() => {
    return staffNavGroups.reduce<Record<string, boolean>>((acc, group) => {
      acc[group.key] = group.items.some((item) => isLinkActive(pathname, item.href))
      return acc
    }, {})
  }, [pathname])

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(activeGroupsState)

  const toggleGroup = (groupKey: string) => {
    setOpenGroups((current) => ({
      ...current,
      [groupKey]: !current[groupKey],
    }))
  }

  const openGroupAndExpand = (groupKey: string) => {
    setOpenGroups((current) => {
      const nextState = Object.fromEntries(
        staffNavGroups.map((group) => [group.key, group.key === groupKey])
      ) as Record<string, boolean>

      return {
        ...current,
        ...nextState,
      }
    })

    onRequestExpand?.()
  }

  return (
    <nav className="space-y-3">
      {staffNavGroups.map((group) => {
        const groupActive = group.items.some((item) => isLinkActive(pathname, item.href))
        const isOpen = groupActive || !!openGroups[group.key]
        const GroupIcon = group.icon

        if (collapsed) {
          const activeItem = group.items.find((item) => isLinkActive(pathname, item.href))

          return (
            <button
              key={group.key}
              type="button"
              onClick={() => openGroupAndExpand(group.key)}
              title={activeItem ? `${group.label}: ${activeItem.label}` : group.label}
              aria-label={group.label}
              className={cn(
                'flex w-full flex-col items-center justify-center border px-2 py-3 text-[10px] uppercase tracking-[0.14em] transition-all duration-200 border-r-2 border-r-accent cursor-pointer',
                groupActive
                  ? ' bg-accent/10 text-foreground'
                  : 'border-0 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <GroupIcon className="mb-2 size-4 shrink-0" />
              <span className="leading-tight">{group.label}</span>
            </button>
          )
        }

        return (
          <div key={group.key} className="space-y-1.5">
            <button
              type="button"
              onClick={() => toggleGroup(group.key)}
              title={group.label}
              aria-label={group.label}
              aria-expanded={isOpen}
              className={cn(
                'flex w-full items-center justify-between border px-3 py-2.5 text-sm transition-all duration-200 cursor-pointer',
                groupActive
                  ? 'border-accent bg-accent/10  text-foreground'
                  : 'border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
            >
              <span className="flex items-center gap-3">
                <GroupIcon className="size-4 shrink-0" />
                <span className="text-[0.76rem] font-semibold uppercase tracking-[0.18em]">{group.label}</span>
              </span>
              <ChevronDown className={cn('size-4 transition-transform', isOpen && 'rotate-180')} />
            </button>

            {isOpen ? (
              <div className="space-y-1 pl-3">
                {group.items.map((item) => {
                  const active = isLinkActive(pathname, item.href)
                  const ItemIcon = item.icon

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.label}
                      aria-label={item.label}
                      className={cn(
                        'group relative flex items-center gap-3 overflow-hidden border-r-2 px-4 py-3 text-sm transition-all duration-200',
                        active
                          ? 'border-accent bg-accent/10 text-foreground'
                          : 'border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                      )}
                    >
                      <span
                        className={cn(
                          'relative z-10 flex shrink-0 items-center justify-center text-muted-foreground transition-colors duration-200',
                          active && 'text-accent-foreground'
                        )}
                      >
                        <ItemIcon className="size-4" />
                      </span>
                      <span className="relative z-10 text-[0.82rem] font-medium">
                        {item.label}
                      </span>
                    </Link>
                  )
                })}
              </div>
            ) : null}
          </div>
        )
      })}

    </nav>
  )
}

function isLinkActive(pathname: string, href: string) {
  if (href === '/admin') {
    return pathname === href
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}
