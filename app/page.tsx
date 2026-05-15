'use client'

import Image from 'next/image'
import { ShieldCheck, BarChart3, Globe2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { GuiraButton } from '@/components/shared/guira-button'

/* ── Animation variants ── */
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.5,
      ease: EASE,
    },
  }),
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  show: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: i * 0.08,
      duration: 0.5,
      ease: EASE,
    },
  }),
}

export default function HomePage() {
  const router = useRouter()
  return (
    <div className="min-h-[100dvh] grid grid-cols-1 lg:grid-cols-[1fr_1.15fr]">
      {/* ═══════════════════════════════════════════════════
          LEFT — Branded navy panel (hidden on mobile)
         ═══════════════════════════════════════════════════ */}
      <div className="relative hidden lg:flex flex-col items-center justify-center overflow-hidden bg-[#020B2D]">
        {/* Radial gradient overlay */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 90% 70% at 50% 35%, rgba(0,91,255,0.14) 0%, transparent 70%)',
          }}
        />

        {/* Floating ambient orbs */}
        <div
          className="pointer-events-none absolute -top-20 -right-20 h-[420px] w-[420px] rounded-full opacity-[0.18] blur-[100px]"
          style={{ background: 'linear-gradient(135deg, #005BFF 0%, #00BFFF 100%)' }}
        />
        <div
          className="pointer-events-none absolute -bottom-28 -left-28 h-80 w-80 rounded-full opacity-[0.12] blur-[80px]"
          style={{ background: 'linear-gradient(315deg, #005BFF 0%, #00BFFF 100%)' }}
        />

        {/* Subtle grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Logo + Brand content */}
        <motion.div
          className="relative z-10 flex flex-col items-center gap-10 px-12"
          initial="hidden"
          animate="show"
        >
          <motion.div custom={0} variants={scaleIn}>
            <Image
              src="/LOGO GUIRRA 02.png"
              alt="Guira"
              width={320}
              height={320}
              className="drop-shadow-lg"
              style={{ height: "auto" }}
              priority
            />
          </motion.div>

          <motion.div
            className="space-y-4 text-center max-w-[360px]"
            custom={1}
            variants={fadeUp}
          >
            <p className="text-[15px] font-normal leading-relaxed text-white/55">
              Plataforma institucional de operaciones
              y transacciones financieras seguras.
            </p>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            className="flex items-center gap-6 mt-2"
            custom={2}
            variants={fadeUp}
          >
            {[
              { label: 'KYC / KYB', icon: ShieldCheck },
              { label: 'Multi-divisa', icon: Globe2 },
              { label: 'Trazabilidad', icon: BarChart3 },
            ].map(({ label, icon: Icon }) => (
              <div key={label} className="flex items-center gap-2 text-white/35">
                <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span className="text-[11px] font-medium tracking-wide uppercase">
                  {label}
                </span>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Bottom badge */}
        <div className="absolute bottom-8 flex items-center gap-2 text-[11px] font-medium tracking-wide text-white/25 uppercase">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400/60" />
          Entorno protegido
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          RIGHT — Content panel
         ═══════════════════════════════════════════════════ */}
      <div className="relative flex flex-col bg-background">
        {/* Nav header */}
        <header className="flex items-center justify-between px-6 py-5 sm:px-10">
          {/* Mobile logo */}
          <div className="lg:hidden">
            <Image
              src="/LOGO GUIRRA ISOTIPO.svg"
              alt="Guira"
              width={32}
              height={32}
              priority
            />
          </div>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <GuiraButton variant="outline" size="sm" onClick={() => router.push('/login')}>
              Ingresar
            </GuiraButton>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex flex-1 flex-col justify-center px-6 pb-16 sm:px-10 lg:px-16 xl:px-20">
          <motion.div
            className="max-w-[560px]"
            initial="hidden"
            animate="show"
          >
            {/* Badge */}
            <motion.div custom={0} variants={fadeUp}>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3.5 py-1 text-[12px] font-medium text-primary tracking-wide">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                Plataforma de operaciones
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              className="mt-7 text-[2.25rem] sm:text-[2.75rem] lg:text-[3.125rem] font-semibold leading-[1.1] tracking-tight text-foreground"
              custom={1}
              variants={fadeUp}
            >
              Gestiona operaciones
              <br />
              <span className="text-primary">desde un solo flujo.</span>
            </motion.h1>

            {/* Body */}
            <motion.p
              className="mt-5 max-w-[480px] text-[15px] leading-relaxed text-muted-foreground"
              custom={2}
              variants={fadeUp}
            >
              Accede al portal para operar expedientes, administrar pagos,
              revisar actividad y controlar configuraciones con soporte
              en tiempo real.
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              className="mt-8 flex flex-wrap items-center gap-3"
              custom={3}
              variants={fadeUp}
            >
              <GuiraButton arrowNext onClick={() => router.push('/login')}>
                Ir al login
              </GuiraButton>
              <GuiraButton variant="secondary" onClick={() => router.push('/registro')}>
                Crear cuenta
              </GuiraButton>
            </motion.div>

            {/* Feature list — minimal, no card boxes */}
            <motion.div
              className="mt-14 space-y-0 border-t border-border/40 pt-8"
              custom={4}
              variants={fadeUp}
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <FeatureItem
                  icon={ShieldCheck}
                  title="Onboarding"
                  description="Flujos KYC/KYB con estados y seguimiento operativo."
                />
                <FeatureItem
                  icon={BarChart3}
                  title="Control interno"
                  description="Staff, auditoría y configuración por rol."
                />
                <FeatureItem
                  icon={Globe2}
                  title="Pagos globales"
                  description="Expedientes, proveedores y evidencias unificados."
                />
              </div>
            </motion.div>
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="px-6 pb-6 sm:px-10">
          <p className="text-[11px] text-muted-foreground/40">
            Guira &copy; {new Date().getFullYear()} &mdash; Todos los derechos reservados
          </p>
        </footer>
      </div>
    </div>
  )
}

/* ── Feature item — clean, no card wrappers ── */
function FeatureItem({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof ShieldCheck
  title: string
  description: string
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/8 text-primary">
          <Icon className="h-4 w-4" strokeWidth={1.8} />
        </div>
        <h3 className="text-[13px] font-semibold text-foreground tracking-tight">
          {title}
        </h3>
      </div>
      <p className="text-[13px] leading-relaxed text-muted-foreground/80">
        {description}
      </p>
    </div>
  )
}
