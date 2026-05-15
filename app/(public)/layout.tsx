import { ThemeToggle } from '@/components/theme/theme-toggle'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-[100dvh] grid grid-cols-1 lg:grid-cols-2">
      {/* ── Left branded panel (hidden on mobile) ── */}
      <div className="relative hidden lg:flex flex-col items-center justify-center overflow-hidden bg-[#020B2D]">
        {/* Subtle radial gradient overlay */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(0,91,255,0.12) 0%, transparent 70%)',
          }}
        />

        {/* Ambient floating orb */}
        <div
          className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'linear-gradient(135deg, #005BFF 0%, #00BFFF 100%)' }}
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full opacity-15 blur-3xl"
          style={{ background: 'linear-gradient(315deg, #005BFF 0%, #00BFFF 100%)' }}
        />

        {/* Logo + Brand copy */}
        <div className="relative z-10 flex flex-col items-center gap-8 px-12">
          <Image
            src="/LOGO GUIRRA 02.png"
            alt="Guira"
            width={320}
            height={320}
            className="drop-shadow-lg"
            style={{ height: "auto" }}
            priority
          />
          <div className="space-y-3 text-center max-w-[340px]">
            <p className="text-[15px] font-normal leading-relaxed text-white/60">
              Plataforma institucional de operaciones
              y transacciones financieras seguras.
            </p>
          </div>
        </div>

        {/* Bottom security badge */}
        <div className="absolute bottom-8 flex items-center gap-2 text-[11px] font-medium tracking-wide text-white/30 uppercase">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400/60" />
          Entorno protegido
        </div>
      </div>

      {/* ── Right content panel ── */}
      <div className="relative flex flex-col bg-background">
        {/* Header with theme toggle */}
        <header className="flex items-center justify-between px-6 py-4 sm:px-8">
          {/* Mobile logo (visible only on mobile) */}
          <div className="lg:hidden">
            <Image
              src="/LOGO GUIRRA ISOTIPO.svg"
              alt="Guira"
              width={32}
              height={32}
              priority
            />
          </div>
          <div className="lg:flex-1" />
          <ThemeToggle />
        </header>

        {/* Form area */}
        <main className="flex flex-1 flex-col items-center justify-center px-6 pb-12 sm:px-8">
          {children}
        </main>

        {/* Footer text */}
        <footer className="px-6 pb-6 text-center sm:px-8">
          <p className="text-[11px] text-muted-foreground/50">
            Guira &copy; {new Date().getFullYear()} &mdash; Todos los derechos reservados
          </p>
        </footer>
      </div>
    </div>
  )
}
