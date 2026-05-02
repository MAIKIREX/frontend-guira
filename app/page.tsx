import Link from 'next/link'
import { ArrowRight, ShieldCheck, Wallet, Waypoints } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10">
        <header className="flex items-center justify-between">
          <div>
            <img src="/asdsadsa.svg" alt="Guira" className="h-8 w-auto" />
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Operaciones globales con trazabilidad local</h1>
          </div>
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-card/80 px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent/20"
          >
            Ingresar
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.3fr_0.9fr]">
          <div>
            <div className="inline-flex rounded-full border border-border bg-card/75 px-4 py-1 text-sm text-foreground/80 backdrop-blur">
              Plataforma cliente, staff y administracion
            </div>
            <h2 className="mt-6 max-w-3xl text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">
              Gestiona onboarding, pagos y control interno desde un solo flujo.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Accede al portal para operar expedientes, revisar actividad, seguir ordenes y administrar configuraciones con soporte sobre Supabase.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Ir al login
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/registro"
                className="inline-flex h-11 items-center justify-center rounded-md border border-accent/40 bg-accent/10 px-5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/20"
              >
                Crear cuenta
              </Link>
            </div>
          </div>

          <Card className="border-border/60 bg-card/80 shadow-2xl shadow-muted/40 backdrop-blur">
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
    <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2 text-primary">
          <Icon className="size-5" />
        </div>
        <h3 className="font-medium text-foreground">{title}</h3>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  )
}
