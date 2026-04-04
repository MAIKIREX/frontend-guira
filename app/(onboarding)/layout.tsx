import { ThemeToggle } from '@/components/theme/theme-toggle'

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header mínimo — solo logo y tema */}
      <header className="border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.34em] text-muted-foreground/80">
              Guira
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-xs text-muted-foreground/60">Configuración de cuenta</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Contenido sin aside */}
      <main className="mx-auto w-full max-w-4xl px-4 py-10">
        {children}
      </main>
    </div>
  )
}
