'use client'

import { useSyncExternalStore } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  const isDark = (mounted ? resolvedTheme : 'dark') === 'dark'

  return (
    <Button
      type="button"
      variant="outline"
      className="h-9 w-9 border-border bg-background text-foreground/60 hover:bg-accent hover:text-foreground transition-all duration-300"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {isDark ? <Sun strokeWidth={2} className="size-[1.15rem]" /> : <Moon strokeWidth={2} className="size-[1.15rem]" />}
    </Button>
  )
}
