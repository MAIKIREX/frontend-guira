'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { OnboardingService } from '@/services/onboarding.service'
import { useOnboardingStore } from '@/stores/onboarding-store'
import { useAuthStore } from '@/stores/auth-store'
import { useProfileStore } from '@/stores/profile-store'
import { Button } from '@/components/ui/button'
import { GuiraButton } from '@/components/shared/guira-button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { CheckCircle2, AlertCircle, User, Building2, RotateCcw } from 'lucide-react'
import { motion } from 'framer-motion'
import { StepProgressRail } from '@/features/payments/components/step-progress-rail'
import { interactiveClickableCardClassName } from '@/lib/utils'
import { PersonalForm } from './personal-form'
import { CompanyForm } from './company-form'

// Mapping de nombre de campo → número de paso del wizard (KYC personal)
const KYC_FIELD_STEP: Record<string, number> = {
  first_name: 2, middle_name: 2, last_name: 2, date_of_birth: 2,
  nationality: 2, country_of_residence: 2, id_type: 2, id_number: 2,
  id_expiry_date: 2, email: 2, phone: 2,
  address1: 3, address2: 3, city: 3, state: 3, postal_code: 3, country: 3,
  most_recent_occupation: 4, account_purpose: 4, account_purpose_other: 4,
  source_of_funds: 4, expected_monthly_payments_usd: 4, employment_status: 4,
  tax_id: 4, is_pep: 4,
  id_front: 5, id_back: 5, selfie: 5, proof_of_address: 5,
}

// Mapping de nombre de campo → número de paso del wizard (KYB empresa)
const KYB_FIELD_STEP: Record<string, number> = {
  legal_name: 2, trade_name: 2, registration_number: 2, tax_id: 2,
  entity_type: 2, incorporation_date: 2, country_of_incorporation: 2,
  business_description: 2,
  address1: 3, city: 3, state: 3, country: 3, postal_code: 3, email: 3,
  source_of_funds: 4, account_purpose: 4, expected_monthly_payments_usd: 4,
  company_cert: 5, legal_rep_id: 5, proof_of_address: 5,
  legal_rep_first_name: 3, legal_rep_last_name: 3,
}

function firstStepWithObservations(
  fieldObservations: Record<string, string>,
  type: 'personal' | 'company' | null,
): number | null {
  const map = type === 'company' ? KYB_FIELD_STEP : KYC_FIELD_STEP
  const steps = Object.keys(fieldObservations)
    .map((key) => map[key])
    .filter((s): s is number => s !== undefined)
  return steps.length > 0 ? Math.min(...steps) : null
}

function stepsWithObservationAlerts(
  fieldObservations: Record<string, string>,
  type: 'personal' | 'company' | null,
): Set<'identity' | 'address' | 'finance' | 'documents' | 'ubo'> {
  const map = type === 'company' ? KYB_FIELD_STEP : KYC_FIELD_STEP
  const stepNumToKey: Record<number, 'identity' | 'address' | 'finance' | 'documents' | 'ubo'> = {
    2: 'identity', 3: 'address', 4: 'finance', 5: 'documents', 6: 'ubo',
  }
  const result = new Set<'identity' | 'address' | 'finance' | 'documents' | 'ubo'>()
  for (const fieldKey of Object.keys(fieldObservations)) {
    const stepNum = map[fieldKey]
    if (stepNum !== undefined) result.add(stepNumToKey[stepNum])
  }
  return result
}

export function OnboardingWizard() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { profile, setProfile } = useProfileStore()
  const { step, type, formData, fieldObservations, setStep, setType, setId, updateFormData, setFieldObservations } = useOnboardingStore()
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<string | null>(null)
  const [observations, setObservations] = useState<string>('')

  const handleStatusChange = (nextStatus: string) => {
    setStatus(nextStatus)
    if (profile) {
      setProfile({
        ...profile,
        onboarding_status: nextStatus,
      })
    }
  }

  useEffect(() => {
    let mounted = true
    async function init() {
      if (!user) return
      try {
        const latest = await OnboardingService.getLatestOnboarding(user.id)
        if (!mounted) return

        if (latest) {
          setStatus(latest.status)
          if (latest.observations) setObservations(latest.observations)
          if (latest.fieldObservations) setFieldObservations(latest.fieldObservations)

          // 'pending' y 'needs_review' permiten al wizard continuar editando
          if (latest.status === 'pending' || latest.status === 'needs_review') {
            setId(latest.id)
            setType(latest.type)
            if (latest.data) {
              updateFormData(latest.data as Record<string, unknown>)
            }

            // Si hay observaciones de campos, navegar al paso más temprano que las contiene
            const targetStep = latest.status === 'needs_review' && Object.keys(latest.fieldObservations ?? {}).length > 0
              ? (firstStepWithObservations(latest.fieldObservations, latest.type) ?? 2)
              : (() => {
                  const savedStep = localStorage.getItem(`guira_onboarding_step_${user.id}`)
                  const parsed = savedStep ? parseInt(savedStep, 10) : 2
                  return parsed === 1 ? 2 : parsed
                })()
            setStep(targetStep)
          }
        } else {
          const savedType = localStorage.getItem(`guira_onboarding_type_${user.id}`)
          const savedData = localStorage.getItem(`guira_onboarding_data_${user.id}`)
          const savedStep = localStorage.getItem(`guira_onboarding_step_${user.id}`)

          if (savedType) setType(savedType as 'personal' | 'company')
          if (savedData) updateFormData(JSON.parse(savedData))
          if (savedStep) setStep(parseInt(savedStep, 10))
        }
      } catch (error) {
        console.error('Error loading onboarding:', error)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    init()
    return () => { mounted = false }
  }, [user, setId, setType, updateFormData, setStep, setFieldObservations])

  useEffect(() => {
    if (user && !loading && (status === 'pending' || status === 'needs_review' || status === null)) {
      if (type) localStorage.setItem(`guira_onboarding_type_${user.id}`, type)
      localStorage.setItem(`guira_onboarding_step_${user.id}`, step.toString())
      localStorage.setItem(`guira_onboarding_data_${user.id}`, JSON.stringify(formData))
    }
  }, [step, type, formData, user, loading, status])

  // 'approved' es el estado final que establece el backend (nunca 'verified')
  const shouldRedirectToPanel = profile?.onboarding_status === 'approved' || status === 'approved'

  useEffect(() => {
    if (shouldRedirectToPanel) {
      router.replace('/panel')
    }
  }, [router, shouldRedirectToPanel])

  const handleClear = () => {
    if (user) {
      localStorage.removeItem(`guira_onboarding_type_${user.id}`)
      localStorage.removeItem(`guira_onboarding_step_${user.id}`)
      localStorage.removeItem(`guira_onboarding_data_${user.id}`)
      setType(null)
      setStep(1)
      updateFormData({})
    }
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Cargando estado...</div>

  if (shouldRedirectToPanel) {
    return <div className="p-8 text-center text-muted-foreground">Redirigiendo al panel...</div>
  }

  // 'in_review', 'submitted' y 'pending_bridge' son los estados operativos del backend
  if (status === 'submitted' || status === 'in_review' || status === 'pending_bridge' || status === 'sent_to_bridge') {
    return (
      <div className="max-w-xl mx-auto mt-12 px-4">
        <Card>
          <CardHeader className="text-center">
            <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
            <CardTitle className="text-2xl">Solicitud en Revisión</CardTitle>
            <CardDescription>
              Hemos recibido tus datos y documentos. El equipo de cumplimiento está procesando tu solicitud.
              Recibirás una notificación por correo electrónico cuando haya novedades.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (status === 'rejected' || status === 'bridge_rejected') {
    return (
      <div className="max-w-xl mx-auto mt-12 px-4">
        <Card className="border-destructive/40">
          <CardHeader className="text-center">
            <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <CardTitle className="text-2xl">Solicitud Rechazada</CardTitle>
            <CardDescription>
              Tu solicitud fue rechazada por el equipo de compliance.
              {observations && <span className="block mt-2 font-medium">Motivo: {observations}</span>}
              Contáctanos si necesitas más información.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!type && step === 1) {
    return (
      <div className="max-w-xl mx-auto mt-12 px-4">
        <h1 className="text-3xl font-bold mb-6">Completa tu perfil</h1>
        <p className="text-muted-foreground mb-8">
          Para operar en Guira necesitamos conocerte y validar tu identidad por regulacion financiera.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <OnboardingTypeCard
            icon={User}
            title="Personal"
            description="Para individuos que buscan enviar, depositar o resguardar valor."
            onClick={() => { setType('personal'); setStep(2) }}
          />
          <OnboardingTypeCard
            icon={Building2}
            title="Empresa"
            description="Operaciones a nombre de su corporación, negocio o entidad legal."
            onClick={() => { setType('company'); setStep(2) }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto mt-12 px-4 pb-20">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Registro {type === 'personal' ? 'Personal' : 'Empresarial'}</h1>
          <p className="text-sm text-muted-foreground">Completa cada etapa con el mismo formato operativo del panel.</p>
        </div>
        <GuiraButton variant="outline" size="sm" iconStart={RotateCcw} onClick={handleClear}>Cambiar de tipo</GuiraButton>
      </div>

      <StepProgressRail
        currentStep={getOnboardingStepKey(step)}
        getStepLabel={getOnboardingStepLabel}
        steps={getOnboardingSteps(type)}
        stepsWithAlerts={status === 'needs_review' ? stepsWithObservationAlerts(fieldObservations, type) : undefined}
      />

      {status === 'needs_review' && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border-l-4 border-amber-500 p-4 mb-6 rounded-md flex items-start shadow-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 mr-3 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-amber-800 dark:text-amber-400">Acción Requerida</h3>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1 whitespace-pre-wrap">{observations || "Por favor, revisa y corrige la información de tu solicitud."}</p>
          </div>
        </div>
      )}

      {type === 'personal' && <PersonalForm onStatusChange={handleStatusChange} status={status} userId={user!.id} fieldObservations={status === 'needs_review' ? fieldObservations : {}} />}
      {type === 'company' && <CompanyForm onStatusChange={handleStatusChange} status={status} userId={user!.id} fieldObservations={status === 'needs_review' ? fieldObservations : {}} />}
    </div>
  )
}

function getOnboardingSteps(type: 'personal' | 'company' | null): ('identity' | 'address' | 'finance' | 'documents' | 'ubo')[] {
  return type === 'company'
    ? ['identity', 'address', 'finance', 'documents', 'ubo']
    : ['identity', 'address', 'finance', 'documents']
}

function getOnboardingStepKey(step: number) {
  switch (step) {
    case 2:
      return 'identity'
    case 3:
      return 'address'
    case 4:
      return 'finance'
    case 5:
      return 'documents'
    case 6:
      return 'ubo'
    default:
      return 'identity'
  }
}

function getOnboardingStepLabel(step: 'identity' | 'address' | 'finance' | 'documents' | 'ubo') {
  switch (step) {
    case 'identity':
      return 'Identidad'
    case 'address':
      return 'Direccion'
    case 'finance':
      return 'Finanzas'
    case 'documents':
      return 'Documentos'
    case 'ubo':
      return 'UBOs'
  }
}

function OnboardingTypeCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: React.ElementType
  title: string
  description: string
  onClick: () => void
}) {
  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--spot-x', `${e.clientX - rect.left}px`)
    e.currentTarget.style.setProperty('--spot-y', `${e.clientY - rect.top}px`)
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      onMouseMove={handleMouseMove}
      className={cn(
        'group relative w-full rounded-2xl border border-border/50 bg-background text-left overflow-hidden',
        'cursor-pointer active:scale-[0.98]',
        'transition-[border-color,box-shadow] duration-300',
        'hover:border-primary/40 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]',
      )}
      whileHover={{ y: -4, scale: 1.015, transition: { type: 'spring', stiffness: 260, damping: 20 } }}
      whileTap={{ scale: 0.975 }}
      style={{ '--spot-x': '50%', '--spot-y': '50%' } as React.CSSProperties}
    >
      {/* Spotlight glow */}
      <div
        className="pointer-events-none absolute inset-0 z-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: 'radial-gradient(320px circle at var(--spot-x) var(--spot-y), hsl(var(--primary) / 0.08), transparent 60%)',
        }}
      />

      {/* Directional shine sweep */}
      <div className="pointer-events-none absolute inset-0 z-0 -translate-x-full skew-x-[-18deg] bg-gradient-to-r from-transparent via-foreground/[0.06] to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />

      <div className="relative z-10 flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-start justify-between">
          <motion.div
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-colors duration-300 group-hover:bg-primary/10 group-hover:text-primary"
            whileHover={{ rotate: [0, -8, 8, -4, 0], transition: { duration: 0.5, ease: 'easeInOut' } }}
          >
            <Icon className="size-[22px]" strokeWidth={1.5} />
          </motion.div>
          {/* Arrow indicator */}
          <div className="mt-1 flex size-5 items-center justify-center rounded-full border border-border/60 bg-transparent transition-all duration-300 group-hover:border-primary/40" />
        </div>
        <div className="space-y-1.5">
          <div className="text-base font-semibold tracking-tight text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
            {title}
          </div>
          <div className="text-[13.5px] leading-relaxed text-muted-foreground line-clamp-2">
            {description}
          </div>
        </div>
      </div>
    </motion.button>
  )
}
