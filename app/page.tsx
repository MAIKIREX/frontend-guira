import Link from 'next/link'
import { ArrowRight, ShieldCheck, Wallet, Waypoints } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(0,194,255,0.22),_transparent_38%),radial-gradient(circle_at_85%_20%,_rgba(124,58,237,0.18),_transparent_28%),linear-gradient(180deg,_#0b1020_0%,_#121a2b_54%,_#0f172a_100%)] text-slate-50">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10">
        <header className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">Guira</div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Operaciones globales con trazabilidad local</h1>
          </div>
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-md border border-cyan-400/30 bg-slate-950/40 px-4 text-sm font-medium text-slate-100 transition-colors hover:bg-cyan-400/10"
          >
            Ingresar
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.3fr_0.9fr]">
          <div>
            <div className="inline-flex rounded-full border border-cyan-400/25 bg-slate-950/35 px-4 py-1 text-sm text-cyan-200 backdrop-blur">
              Plataforma cliente, staff y administracion
            </div>
            <h2 className="mt-6 max-w-3xl text-5xl font-semibold leading-tight tracking-tight text-slate-50 sm:text-6xl">
              Gestiona onboarding, pagos y control interno desde un solo flujo.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Accede al portal para operar expedientes, revisar actividad, seguir ordenes y administrar configuraciones con soporte sobre Supabase.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-cyan-400 px-5 text-sm font-medium text-slate-950 transition-colors hover:bg-cyan-300"
              >
                Ir al login
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/registro"
                className="inline-flex h-11 items-center justify-center rounded-md border border-violet-400/30 bg-violet-500/10 px-5 text-sm font-medium text-violet-100 transition-colors hover:bg-violet-500/20"
              >
                Crear cuenta
              </Link>
            </div>
          </div>

          <Card className="border-cyan-400/15 bg-slate-950/40 shadow-2xl shadow-cyan-950/20 backdrop-blur">
            <CardContent className="space-y-6 p-6">
              <Feature icon={ShieldCheck} title="Onboarding controlado" description="Flujos KYC/KYB con estados, observaciones y seguimiento operativo." />
              <Feature icon={Wallet} title="Pagos y wallet" description="Expedientes, proveedores, evidencias y PDF dentro del mismo panel." />
              <Feature icon={Waypoints} title="Trazabilidad interna" description="Staff, auditoria y configuracion con permisos por rol y soporte en tiempo real." />
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}

function Feature({ icon: Icon, title, description }: { icon: typeof ShieldCheck; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="rounded-xl bg-cyan-400/10 p-2 text-cyan-300">
          <Icon className="size-5" />
        </div>
        <h3 className="font-medium text-slate-50">{title}</h3>
      </div>
      <p className="text-sm leading-6 text-slate-300">{description}</p>
    </div>
  )
}
