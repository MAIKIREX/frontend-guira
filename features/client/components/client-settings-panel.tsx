'use client'

import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import { BellRing, Settings2, ShieldCheck, UserCircle2, Info, Loader2, UploadCloud } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn, interactiveRowClassName } from '@/lib/utils'
import { useProfileStore } from '@/stores/profile-store'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ProfileService } from '@/services/profile.service'

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
      <div className="flex flex-col gap-6">
        <div className="flex items-start gap-4 rounded-xl border border-blue-500/20 bg-blue-500/10 p-5 text-blue-700 dark:text-blue-400">
          <Info className="mt-0.5 size-5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold mb-1 text-base">Protección de datos personales</p>
            <p className="leading-relaxed opacity-90">
              Por motivos de seguridad y cumplimiento regulatorio, tus datos personales y de cuenta se encuentran inmovilizados. Si necesitas modificar información crítica (como tu nombre, teléfono o correo electrónico), por favor contacta a nuestro equipo mediante un ticket en la sección de Soporte.
            </p>
            <Link href="/soporte" className={cn(buttonVariants({ variant: 'link', size: 'sm' }), "px-0 mt-2 text-blue-700 dark:text-blue-400 font-semibold")}>
              Ir a Soporte &rarr;
            </Link>
          </div>
        </div>

        <AvatarUploadCard profile={profile} />

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

function AvatarUploadCard({ profile }: { profile: any }) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { setProfile } = useProfileStore()
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      // 1. Get signed url
      const { upload_url, path } = await ProfileService.getAvatarUploadUrl(file.name)
      
      // 2. Upload directly to Supabase
      await ProfileService.uploadAvatarBinary(upload_url, file)
      
      // 3. Construct public url
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const avatarUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${path}`
      
      // 4. Update profile in db
      const updatedProfile = await ProfileService.updateProfile({ avatar_url: avatarUrl })
      
      // 5. Update local store
      setProfile(updatedProfile)
    } catch (error) {
      console.error('Failed to upload avatar:', error)
      alert('Ocurrió un error al intentar actualizar el avatar visual. Intenta nuevamente.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mi Avatar Visual</CardTitle>
        <CardDescription>
          Sube una fotografía o imagen para identificar tu perfil en el panel y en la plataforma.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-6">
        <div className="relative">
          <Avatar className="size-20 border shadow-sm">
            <AvatarImage src={profile?.avatar_url || ''} className="object-cover" />
            <AvatarFallback className="bg-muted text-xl text-muted-foreground uppercase">
              {profile?.full_name?.substring(0, 2) || 'US'}
            </AvatarFallback>
          </Avatar>
          {isUploading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-background/50 backdrop-blur-sm">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          )}
        </div>
        
        <div className="space-y-3">
          <input 
            type="file" 
            accept="image/png, image/jpeg, image/jpg, image/webp" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileChange}
            disabled={isUploading}
          />
          <Button 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <UploadCloud className="mr-2 size-4" />
            {isUploading ? 'Actualizando...' : 'Subir nueva foto'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Recomendado: 1:1, JPG o PNG. Máx 5MB.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

