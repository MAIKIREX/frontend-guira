'use client'

import Link from 'next/link'
import { useState, useRef } from 'react'
import {
  ChevronRight,
  LayoutDashboard,
  Info,
  Loader2,
  Settings2,
  ShieldCheck,
  BellRing,
  LifeBuoy,
  UploadCloud,
  UserCircle2,
  Waypoints,
} from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn, interactiveCardClassName } from '@/lib/utils'
import { useProfileStore } from '@/stores/profile-store'
import type { Profile } from '@/types/profile'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ProfileService } from '@/services/profile.service'
import { ClientBankAccountSection } from './client-bank-account-section'

export function ClientSettingsPanel() {
  const { profile } = useProfileStore()
  const showBankSection = profile?.onboarding_status === 'approved'

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
      <div className="space-y-2">
        <h1 className="text-4xl sm:text-[3rem] sm:leading-[1.1] font-extrabold tracking-tight text-foreground">
          Configuracion de cuenta
        </h1>
      </div>

      <div className="grid items-start gap-12 xl:gap-0 xl:divide-x xl:divide-border/50 xl:grid-cols-[minmax(0,1.08fr)_360px]">
        <div className="divide-y divide-border/50 xl:pr-12">
          <div
            className={cn(
              'grid gap-12 pb-10 lg:gap-0 lg:divide-x lg:divide-border/50',
              'lg:grid-cols-[minmax(300px,0.88fr)_minmax(0,1.12fr)]',
            )}
          >
            <div className="lg:pr-12">
              <AvatarUploadCard profile={profile} />
            </div>
            <div className="space-y-6 lg:pl-12">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">Datos de mi perfil</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Resumen de la informacion principal asociada a tu cuenta.
                </p>
              </div>
              <div className="space-y-0">
                <InfoRow icon={UserCircle2} label="Nombre" value={profile?.full_name ?? 'Sin nombre'} />
                <InfoRow icon={BellRing} label="Email" value={profile?.email ?? 'Sin email'} />
                <InfoRow icon={ShieldCheck} label="Rol" value={formatProfileValue(profile?.role, 'Sin rol')} />
                <InfoRow
                  icon={Settings2}
                  label="Onboarding"
                  value={formatProfileValue(profile?.onboarding_status, 'Sin estado')}
                  isLast
                />
              </div>
            </div>
          </div>

          {showBankSection ? (
            <div className="pt-10">
              <ClientBankAccountSection />
            </div>
          ) : null}
        </div>

        <aside className="divide-y divide-border/50 xl:sticky xl:top-6 xl:pl-12">
          <div className="flex items-start gap-4 pb-10 text-blue-700 dark:text-blue-400">
            <Info className="mt-0.5 size-5 shrink-0" />
            <div className="text-sm">
              <p className="mb-1 text-base font-semibold">Proteccion de datos personales</p>
              <p className="leading-relaxed opacity-90">
                Por seguridad y cumplimiento regulatorio, los datos criticos del cliente se
                mantienen inmovilizados. Si necesitas modificar informacion sensible, gestionalo
                con el equipo mediante un ticket en soporte.
              </p>
              <Link
                href="/soporte"
                className={cn(
                  buttonVariants({ variant: 'link', size: 'sm' }),
                  'mt-2 px-0 font-semibold text-blue-700 dark:text-blue-400',
                )}
              >
                Ir a Soporte &rarr;
              </Link>
            </div>
          </div>

          <div className="space-y-6 pt-10">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Accesos de cuenta</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Accesos rapidos a las areas principales de tu cuenta.
              </p>
            </div>
            <div className="space-y-2">
              <ShortcutCard
                href="/panel"
                title="Panel"
                icon={LayoutDashboard}
              />
              <ShortcutCard
                href="/transacciones"
                title="Transacciones"
                icon={Waypoints}
              />
              <ShortcutCard
                href="/soporte"
                title="Soporte"
                icon={LifeBuoy}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
  isLast,
}: {
  icon: typeof UserCircle2
  label: string
  value: string
  isLast?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6',
        !isLast && 'border-b border-border/40',
      )}
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground sm:min-w-40">
        <Icon className="size-4 shrink-0" />
        <span>{label}</span>
      </div>
      <div className="break-words text-sm font-medium text-foreground sm:text-right">{value}</div>
    </div>
  )
}

function ShortcutCard({
  href,
  title,
  icon: Icon,
}: {
  href: string
  title: string
  icon: typeof ChevronRight
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex min-h-16 items-center justify-between rounded-lg border border-border/50 px-3 py-3 transition-colors hover:bg-muted/40',
      )}
    >
      <div className="flex items-center gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground transition-colors group-hover:text-foreground">
          <Icon className="size-5" />
        </div>
        <div className="text-base font-medium text-foreground">{title}</div>
      </div>
      <div className="flex size-8 shrink-0 items-center justify-center text-muted-foreground transition-colors group-hover:text-foreground">
          <ChevronRight className="size-5" />
      </div>
    </Link>
  )
}

function AvatarUploadCard({ profile }: { profile: Profile | null }) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { setProfile } = useProfileStore()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const { upload_url, path } = await ProfileService.getAvatarUploadUrl(file.name)
      await ProfileService.uploadAvatarBinary(upload_url, file)

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const avatarUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${path}`
      const updatedProfile = await ProfileService.updateProfile({ avatar_url: avatarUrl })

      setProfile(updatedProfile)
    } catch (error) {
      console.error('Failed to upload avatar:', error)
      alert('Ocurrio un error al intentar actualizar el avatar visual. Intenta nuevamente.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Mi avatar de cuenta</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sube una foto o imagen para identificar tu perfil dentro del panel y mantener esta
          seccion mas personal y clara.
        </p>
      </div>
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="relative">
          <div className="absolute inset-[-14px] rounded-full bg-primary/10 blur-xl" aria-hidden />
          <Avatar className="relative size-28 border border-border/40 shadow-sm">
            <AvatarImage src={profile?.avatar_url || ''} className="object-cover" />
            <AvatarFallback className="bg-muted text-2xl text-muted-foreground uppercase">
              {getAvatarFallback(profile?.full_name)}
            </AvatarFallback>
          </Avatar>
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/55 backdrop-blur-sm">
              <Loader2 className="size-7 animate-spin text-primary" />
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-lg font-semibold text-foreground">
              {profile?.full_name ?? 'Cliente Guira'}
            </p>
            <p className="text-sm text-muted-foreground">
              {profile?.email ?? 'Correo pendiente de sincronizacion'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <ProfileBadge label={formatProfileValue(profile?.role, 'Sin rol')} />
            <ProfileBadge
              label={`Estado ${formatProfileValue(profile?.onboarding_status, 'pendiente')}`}
            />
          </div>
        </div>

        <input
          type="file"
          accept="image/png, image/jpeg, image/jpg, image/webp"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
          disabled={isUploading}
        />
        <div className="flex w-full max-w-sm flex-col items-center gap-3">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <UploadCloud className="mr-2 size-4" />
            {isUploading ? 'Actualizando...' : 'Subir nueva foto'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Recomendado: formato 1:1, JPG o PNG y hasta 5MB.
          </p>
        </div>
      </div>
    </div>
  )
}

function ProfileBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
      {label}
    </span>
  )
}

function formatProfileValue(value: string | null | undefined, fallback: string) {
  if (!value) return fallback
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getAvatarFallback(name?: string | null) {
  if (!name) return 'US'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'US'
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}
