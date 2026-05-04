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
      className="h-10 w-10 border-border/70 bg-background/80 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {isDark ? <Sun strokeWidth={2.5} className="size-6" /> : <Moon strokeWidth={2.5} className="size-6" />}
    </Button>
  )
}
