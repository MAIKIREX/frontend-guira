'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { BellRing, Settings2, ShieldCheck, UserCircle2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { buttonVariants } from '@/components/ui/button'
import { cn, interactiveRowClassName } from '@/lib/utils'
import { useProfileStore } from '@/stores/profile-store'

interface ClientPreferences {
  compact_amounts: boolean
  open_transactions_first: boolean
  highlight_pending_approvals: boolean
}

const DEFAULT_PREFERENCES: ClientPreferences = {
  compact_amounts: false,
  open_transactions_first: true,
  highlight_pending_approvals: true,
}

export function ClientSettingsPanel() {
  const { profile } = useProfileStore()
  const [preferences, setPreferences] = useState<ClientPreferences>(DEFAULT_PREFERENCES)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('guira-client-preferences')
      if (stored) {
        setPreferences({ ...DEFAULT_PREFERENCES, ...(JSON.parse(stored) as Partial<ClientPreferences>) })
      }
    } catch (error) {
      console.error('Failed to load client preferences', error)
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem('guira-client-preferences', JSON.stringify(preferences))
  }, [hydrated, preferences])

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <Card className="border-border/80 bg-muted/10">
        <CardHeader>
          <CardTitle>Ajustes de perfil</CardTitle>
          <CardDescription>
            Esta vista concentra los datos reales del cliente y preferencias locales de experiencia sin inventar nuevas tablas.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <InfoCard icon={UserCircle2} label="Nombre" value={profile?.full_name ?? 'Sin nombre'} />
          <InfoCard icon={BellRing} label="Email" value={profile?.email ?? 'Sin email'} />
          <InfoCard icon={ShieldCheck} label="Rol" value={profile?.role ?? 'Sin rol'} />
          <InfoCard icon={Settings2} label="Onboarding" value={profile?.onboarding_status ?? 'Sin estado'} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferencias de cuenta</CardTitle>
          <CardDescription>
            Se guardan localmente en este navegador para ordenar mejor tu operacion diaria.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PreferenceRow
            checked={preferences.compact_amounts}
            description="Muestra montos con menos ruido visual en paneles y resumenes."
            label="Montos compactos"
            onCheckedChange={(checked) => setPreferences((current) => ({ ...current, compact_amounts: checked }))}
          />
          <PreferenceRow
            checked={preferences.open_transactions_first}
            description="Prioriza transacciones como centro de seguimiento al volver al dashboard."
            label="Foco en transacciones"
            onCheckedChange={(checked) => setPreferences((current) => ({ ...current, open_transactions_first: checked }))}
          />
          <PreferenceRow
            checked={preferences.highlight_pending_approvals}
            description="Resalta operaciones que esperan tu aceptacion de cotizacion final."
            label="Resaltar aprobaciones"
            onCheckedChange={(checked) => setPreferences((current) => ({ ...current, highlight_pending_approvals: checked }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Accesos de cuenta</CardTitle>
          <CardDescription>Atajos a las areas donde realmente ajustas o resuelves temas de operacion.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3 xl:col-span-2">
          <ShortcutCard href="/onboarding" title="Perfil operativo" description="Completa o revisa tu onboarding si tu estado cambia." />
          <ShortcutCard href="/transacciones" title="Transacciones" description="Revisa ordenes, aprobaciones y bitacora operativa." />
          <ShortcutCard href="/soporte" title="Soporte" description="Abre tickets cuando necesites ayuda o seguimiento." />
        </CardContent>
      </Card>
    </div>
  )
}

function PreferenceRow({ checked, description, label, onCheckedChange }: { checked: boolean; description: string; label: string; onCheckedChange: (checked: boolean) => void }) {
  return (
    <label className={cn('flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4', interactiveRowClassName)}>
      <Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} />
      <div>
        <div className="font-medium text-foreground">{label}</div>
        <div className="mt-1 text-sm text-muted-foreground">{description}</div>
      </div>
    </label>
  )
}

function InfoCard({ icon: Icon, label, value }: { icon: typeof UserCircle2; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/85 p-4">
      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </div>
      <div className="text-sm font-medium text-foreground">{value}</div>
    </div>
  )
}

function ShortcutCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/85 p-4">
      <div className="font-medium text-foreground">{title}</div>
      <div className="mt-2 text-sm text-muted-foreground">{description}</div>
      <Link href={href} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-4 inline-flex')}>
        Abrir
      </Link>
    </div>
  )
}

