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
import { motion } from 'framer-motion'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useProfileStore } from '@/stores/profile-store'
import type { Profile } from '@/types/profile'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ProfileService } from '@/services/profile.service'
import { ClientBankAccountSection } from './client-bank-account-section'

/* ── Framer Motion orchestration (mirrors client-dashboard) ── */
const SPRING = { type: 'spring' as const, stiffness: 100, damping: 20 }

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.04 } },
}

const fadeSlideUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: SPRING },
}

const fadeSlideRight = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: { ...SPRING, delay: 0.18 } },
}

export function ClientSettingsPanel() {
  const { profile } = useProfileStore()
  const showBankSection = profile?.onboarding_status === 'approved'

  return (
    <motion.div
      className="mx-auto flex w-full max-w-7xl flex-col gap-10"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      {/* ── Hero heading ── */}
      <motion.div variants={fadeSlideUp} className="space-y-0.5">
        <h1 className="text-5xl sm:text-[3.4rem] font-extrabold tracking-tighter leading-[0.95] text-foreground">
          Configuracion
        </h1>
        <p className="text-5xl sm:text-[3.4rem] font-bold tracking-tight text-primary/75 leading-[1]">
          de cuenta
        </p>
        <p className="text-sm font-medium text-muted-foreground/60 max-w-md pt-3">
          Gestion de perfil, seguridad y accesos de tu cuenta Guira.
        </p>
      </motion.div>

      {/* ── Two-column layout ── */}
      <div className="grid items-start gap-10 xl:gap-0 xl:divide-x xl:divide-border/40 xl:grid-cols-[minmax(0,1.08fr)_360px]">

        {/* ── LEFT column ── */}
        <motion.div className="space-y-8 xl:pr-12" variants={staggerContainer}>

          {/* Avatar + Identity hero section */}
          <motion.section
            className="relative overflow-hidden rounded-[2rem] border border-border/40 bg-card/60 p-8 sm:p-10 shadow-[0_8px_40px_-16px_rgba(0,0,0,0.06)]"
            variants={fadeSlideUp}
          >
            <div className="pointer-events-none absolute -top-20 -right-20 size-72 rounded-full bg-primary/[0.06] blur-[90px]" aria-hidden />
            <div className="pointer-events-none absolute -bottom-16 -left-16 size-56 rounded-full bg-accent/[0.04] blur-[70px]" aria-hidden />

            <div className="relative z-10">
              <AvatarUploadCard profile={profile} />
            </div>
          </motion.section>

          {/* Profile data grid card */}
          <motion.section
            className="relative overflow-hidden rounded-[2rem] border border-border/40 bg-card/60 p-8 sm:p-10 shadow-[0_8px_40px_-16px_rgba(0,0,0,0.06)]"
            variants={fadeSlideUp}
          >
            <div className="pointer-events-none absolute -top-16 -right-16 size-52 rounded-full bg-primary/[0.05] blur-[80px]" aria-hidden />
            <div className="pointer-events-none absolute -bottom-12 -left-12 size-44 rounded-full bg-accent/[0.04] blur-[60px]" aria-hidden />

            <div className="relative z-10 space-y-6">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">Datos de mi perfil</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Resumen de la informacion principal asociada a tu cuenta.
                </p>
              </div>

              {/* 2-column data grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoCard icon={UserCircle2} label="Nombre completo" value={profile?.full_name ?? 'Sin nombre'} />
                <InfoCard icon={BellRing} label="Correo electronico" value={profile?.email ?? 'Sin email'} />
                <InfoCard icon={ShieldCheck} label="Rol de cuenta" value={formatProfileValue(profile?.role, 'Sin rol')} />
                <InfoCard icon={Settings2} label="Estado de onboarding" value={formatProfileValue(profile?.onboarding_status, 'Sin estado')} />
              </div>
            </div>
          </motion.section>

          {/* Bank account section */}
          {showBankSection ? (
            <motion.div variants={fadeSlideUp}>
              <div className="relative overflow-hidden rounded-[2rem] border border-border/40 bg-card/60 p-8 sm:p-10 shadow-[0_8px_40px_-16px_rgba(0,0,0,0.06)]">
                <div className="pointer-events-none absolute -top-16 -right-16 size-52 rounded-full bg-primary/[0.05] blur-[80px]" aria-hidden />
                <div className="relative z-10">
                  <ClientBankAccountSection />
                </div>
              </div>
            </motion.div>
          ) : null}
        </motion.div>

        {/* ── RIGHT aside ── */}
        <motion.aside
          className="space-y-6 xl:sticky xl:top-6 xl:pl-12"
          variants={fadeSlideRight}
        >
          {/* Data protection notice */}
          <div className="relative overflow-hidden rounded-[2rem] border border-blue-500/20 bg-blue-500/[0.04] p-7 shadow-[0_8px_40px_-16px_rgba(0,0,0,0.04)]">
            <div className="pointer-events-none absolute -top-12 -right-12 size-40 rounded-full bg-blue-500/[0.08] blur-[60px]" aria-hidden />
            <div className="relative z-10 flex items-start gap-4 text-blue-700 dark:text-blue-400">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10">
                <Info className="size-4" />
              </div>
              <div className="text-sm">
                <p className="mb-1.5 text-base font-semibold tracking-tight">Proteccion de datos personales</p>
                <p className="text-[0.8rem] leading-relaxed opacity-80">
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
          </div>

          {/* Quick access card */}
          <div className="relative overflow-hidden rounded-[2rem] border border-border/40 bg-card/60 p-7 shadow-[0_8px_40px_-16px_rgba(0,0,0,0.06)]">
            <div className="pointer-events-none absolute -top-16 -right-16 size-52 rounded-full bg-primary/[0.05] blur-[70px]" aria-hidden />
            <div className="relative z-10 space-y-5">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">Accesos de cuenta</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Accesos rapidos a las areas principales de tu cuenta.
                </p>
              </div>
              <div className="space-y-2.5">
                <ShortcutCard href="/panel" title="Panel" icon={LayoutDashboard} />
                <ShortcutCard href="/transacciones" title="Transacciones" icon={Waypoints} />
                <ShortcutCard href="/soporte" title="Soporte" icon={LifeBuoy} />
              </div>
            </div>
          </div>
        </motion.aside>
      </div>
    </motion.div>
  )
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserCircle2
  label: string
  value: string
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/30 bg-muted/10 p-4 transition-all duration-300 hover:bg-muted/20 hover:border-border/50">
      <div className="pointer-events-none absolute -top-6 -right-6 size-16 rounded-full bg-primary/[0.04] blur-[30px] transition-opacity group-hover:opacity-100 opacity-0" aria-hidden />
      <div className="relative z-10 space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/30 bg-muted/40 text-muted-foreground">
            <Icon className="size-3.5" />
          </div>
          <span className="text-[0.65rem] uppercase tracking-[0.16em] font-medium text-muted-foreground/70">
            {label}
          </span>
        </div>
        <p className="text-sm font-semibold text-foreground break-all leading-relaxed">
          {value}
        </p>
      </div>
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
      className="group flex items-center justify-between rounded-2xl border border-border/40 bg-muted/10 px-4 py-3.5 transition-all duration-300 hover:bg-muted/30 hover:border-border/60 active:scale-[0.98]"
    >
      <div className="flex items-center gap-3.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/30 bg-muted/40 text-muted-foreground transition-all group-hover:border-primary/20 group-hover:bg-primary/10 group-hover:text-primary">
          <Icon className="size-4" />
        </div>
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>
      <ChevronRight className="size-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
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
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Mi avatar de cuenta</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sube una foto o imagen para identificar tu perfil dentro del panel.
        </p>
      </div>

      {/* Centered avatar hero */}
      <div className="flex flex-col items-center gap-4 pt-2">
        <div className="relative shrink-0">
          <div className="absolute inset-[-16px] rounded-full bg-primary/10 blur-xl" aria-hidden />
          <Avatar className="relative size-28 border-2 border-border/40 shadow-md ring-4 ring-primary/[0.06]">
            <AvatarImage src={profile?.avatar_url || ''} className="object-cover" />
            <AvatarFallback className="bg-muted text-2xl uppercase text-muted-foreground">
              {getAvatarFallback(profile?.full_name)}
            </AvatarFallback>
          </Avatar>
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/55 backdrop-blur-sm">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          )}
        </div>

        {/* Identity text — no truncation */}
        <div className="text-center space-y-1 max-w-full">
          <p className="text-lg font-bold text-foreground leading-snug break-words">
            {profile?.full_name ?? 'Cliente Guira'}
          </p>
          <p className="text-sm text-muted-foreground break-all leading-relaxed">
            {profile?.email ?? 'Correo pendiente de sincronizacion'}
          </p>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center justify-center gap-1.5">
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
      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full rounded-xl border-border/60 bg-muted/20 transition-transform hover:bg-muted/40 active:scale-[0.98]"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <UploadCloud className="mr-2 size-4" />
          {isUploading ? 'Actualizando...' : 'Subir nueva foto'}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Recomendado: formato 1:1, JPG o PNG y hasta 5MB.
        </p>
      </div>
    </div>
  )
}

function ProfileBadge({ label }: { label: string }) {
  return (
    <span className="flex items-center rounded-full border border-border/50 bg-card/80 px-3 py-1 text-[10px] font-semibold text-muted-foreground shadow-sm">
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
