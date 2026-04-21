'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { OnboardingService } from '@/services/onboarding.service'
import { useOnboardingStore } from '@/stores/onboarding-store'
import { useAuthStore } from '@/stores/auth-store'
import { useProfileStore } from '@/stores/profile-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { CheckCircle2, AlertCircle, User, Building2 } from 'lucide-react'
import { StepProgressRail } from '@/features/payments/components/step-progress-rail'
import { interactiveClickableCardClassName } from '@/lib/utils'
import { PersonalForm } from './personal-form'
import { CompanyForm } from './company-form'

export function OnboardingWizard() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { profile, setProfile } = useProfileStore()
  const { step, type, formData, setStep, setType, setId, updateFormData } = useOnboardingStore()
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

          // 'pending' y 'needs_review' permiten al wizard continuar editando
          if (latest.status === 'pending' || latest.status === 'needs_review') {
            setId(latest.id)
            setType(latest.type)
            if (latest.data) {
              updateFormData(latest.data as Record<string, unknown>)
            }
            const savedStep = localStorage.getItem(`guira_onboarding_step_${user.id}`)
            if (savedStep) setStep(parseInt(savedStep, 10))
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
  }, [user, setId, setType, updateFormData, setStep])

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
  if (status === 'submitted' || status === 'in_review' || status === 'pending_bridge') {
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

  if (status === 'rejected') {
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-6">
          {/* Tarjeta Personal (Indigo accent) */}
          <button
            type="button"
            className="group relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-indigo-50/50 to-background p-6 text-left shadow-sm transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 hover:-translate-y-1 hover:border-indigo-300/60 hover:shadow-md dark:from-indigo-500/10 dark:hover:border-indigo-500/40"
            onClick={() => { setType('personal'); setStep(2) }}
          >
            <div className="absolute -bottom-8 -right-8 size-40 text-indigo-500 opacity-[0.03] transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-110 dark:text-indigo-400">
              <User className="h-full w-full" />
            </div>

            <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-indigo-100/80 text-indigo-700 shadow-sm transition-colors group-hover:bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-400">
              <User className="size-6" />
            </div>
            <div className="space-y-2 relative z-10">
              <h3 className="text-xl font-bold tracking-tight text-foreground transition-colors group-hover:text-indigo-700 dark:group-hover:text-indigo-400">
                Personal
              </h3>
              <p className="text-sm font-medium leading-relaxed text-muted-foreground">
                Para individuos que buscan enviar, depositar o resguardar valor.
              </p>
            </div>
          </button>

          {/* Tarjeta Empresa (Emerald accent) */}
          <button
            type="button"
            className="group relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-emerald-50/50 to-background p-6 text-left shadow-sm transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 hover:-translate-y-1 hover:border-emerald-300/60 hover:shadow-md dark:from-emerald-500/10 dark:hover:border-emerald-500/40"
            onClick={() => { setType('company'); setStep(2) }}
          >
            <div className="absolute -bottom-8 -right-8 size-40 text-emerald-500 opacity-[0.03] transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-110 dark:text-emerald-400">
              <Building2 className="h-full w-full" />
            </div>

            <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-emerald-100/80 text-emerald-700 shadow-sm transition-colors group-hover:bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-400">
              <Building2 className="size-6" />
            </div>
            <div className="space-y-2 relative z-10">
              <h3 className="text-xl font-bold tracking-tight text-foreground transition-colors group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                Empresa
              </h3>
              <p className="text-sm font-medium leading-relaxed text-muted-foreground">
                Operaciones a nombre de su corporación, negocio o entidad legal.
              </p>
            </div>
          </button>
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
        <Button variant="ghost" size="sm" onClick={handleClear}>Cambiar de tipo (Reiniciar)</Button>
      </div>

      <StepProgressRail currentStep={getOnboardingStepKey(step)} getStepLabel={getOnboardingStepLabel} steps={getOnboardingSteps(type)} />

      {status === 'needs_review' && (
        <div className="bg-destructive/10 border-l-4 border-destructive p-4 mb-6 rounded flex items-start">
          <AlertCircle className="w-5 h-5 text-destructive mr-3 mt-0.5" />
          <div>
            <p className="font-semibold text-destructive">Observaciones a corregir:</p>
            <p className="text-sm text-destructive">{observations}</p>
          </div>
        </div>
      )}

      {type === 'personal' && <PersonalForm onStatusChange={handleStatusChange} status={status} userId={user!.id} />}
      {type === 'company' && <CompanyForm onStatusChange={handleStatusChange} status={status} userId={user!.id} />}
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
