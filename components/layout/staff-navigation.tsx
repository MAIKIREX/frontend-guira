'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
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
      { href: '/admin/onboarding', label: 'Onboarding & Compliance', icon: ShieldCheck },
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

      return { ...current, ...nextState }
    })

    onRequestExpand?.()
  }

  return (
    <nav className="flex flex-col gap-0.5 px-3 py-2">
      {staffNavGroups.map((group, groupIndex) => {
        const groupActive = group.items.some((item) => isLinkActive(pathname, item.href))
        const isOpen = groupActive || !!openGroups[group.key]
        const GroupIcon = group.icon

        if (collapsed) {
          return (
            <button
              key={group.key}
              type="button"
              onClick={() => openGroupAndExpand(group.key)}
              title={group.label}
              aria-label={group.label}
              className={cn(
                'flex w-full items-center justify-center rounded-2xl p-3 transition-all duration-200 ease-out cursor-pointer',
                groupActive
                  ? 'text-white shadow-[0_8px_20px_rgba(0,91,255,0.25)]'
                  : 'text-white/[0.78] hover:bg-white/[0.08] hover:text-white'
              )}
              style={groupActive ? { background: 'linear-gradient(90deg, #005BFF 0%, #00BFFF 100%)' } : undefined}
            >
              <GroupIcon strokeWidth={groupActive ? 2.2 : 1.8} className="size-[1.1rem]" />
            </button>
          )
        }

        return (
          <div key={group.key} className={cn('flex flex-col', groupIndex > 0 && 'mt-3')}>
            {/* Group label */}
            <button
              type="button"
              onClick={() => toggleGroup(group.key)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between px-2 py-1.5 transition-colors duration-200 cursor-pointer"
            >
              <span className="text-[0.6rem] font-extrabold uppercase tracking-[0.16em] text-white/30">
                {group.label}
              </span>
              <ChevronDown
                strokeWidth={2}
                className={cn(
                  'size-3 text-white/25 transition-transform duration-200',
                  isOpen && 'rotate-180'
                )}
              />
            </button>

            {/* Items */}
            {isOpen && (
              <div className="mt-0.5 flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = isLinkActive(pathname, item.href)
                  const ItemIcon = item.icon

                  return (
                    <div key={item.href} className="relative flex items-center px-0 py-0.5">
                      <Link
                        href={item.href}
                        title={item.label}
                        aria-label={item.label}
                        className={cn(
                          'w-full group relative flex items-center gap-3.5 px-4 py-2.5 rounded-[10px] transition-all duration-200 ease-out',
                          active
                            ? 'text-white shadow-[0_8px_20px_rgba(0,91,255,0.25)]'
                            : 'text-white/[0.78] hover:bg-white/[0.08] hover:text-white'
                        )}
                        style={active ? { background: 'linear-gradient(90deg, #005BFF 0%, #00BFFF 100%)' } : undefined}
                      >
                        <span
                          className={cn(
                            'relative z-10 flex shrink-0 items-center justify-center transition-all duration-200',
                            active ? 'text-white' : 'text-white/[0.78] group-hover:text-white'
                          )}
                        >
                          <ItemIcon
                            strokeWidth={active ? 2.2 : 1.8}
                            className="size-[1.1rem]"
                          />
                        </span>
                        <span
                          className={cn(
                            'relative z-10 text-[0.85rem] tracking-tight',
                            active ? 'font-semibold text-white' : 'font-medium'
                          )}
                        >
                          {item.label}
                        </span>
                      </Link>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}

function isLinkActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}
