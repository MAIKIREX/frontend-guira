'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { OnboardingService } from '@/services/onboarding.service'
import { useOnboardingStore } from '@/stores/onboarding-store'
import { useAuthStore } from '@/stores/auth-store'
import { useProfileStore } from '@/stores/profile-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { PersonalForm } from './personal-form'
import { CompanyForm } from './company-form'

export function OnboardingWizard() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { profile } = useProfileStore()
  const { step, type, formData, setStep, setType, setId, updateFormData } = useOnboardingStore()
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<string | null>(null)
  const [observations, setObservations] = useState<string>('')

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

          if (latest.status === 'draft' || latest.status === 'needs_changes') {
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
    if (user && !loading && (status === 'draft' || status === 'needs_changes' || status === null)) {
      if (type) localStorage.setItem(`guira_onboarding_type_${user.id}`, type)
      localStorage.setItem(`guira_onboarding_step_${user.id}`, step.toString())
      localStorage.setItem(`guira_onboarding_data_${user.id}`, JSON.stringify(formData))
    }
  }, [step, type, formData, user, loading, status])

  const shouldRedirectToPanel = profile?.onboarding_status === 'verified' || status === 'verified'

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

  if (status === 'submitted' || status === 'under_review' || status === 'waiting_ubo_kyc') {
    return (
      <div className="max-w-xl mx-auto mt-12 px-4">
        <Card>
          <CardHeader className="text-center">
            <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
            <CardTitle className="text-2xl">En revision</CardTitle>
            <CardDescription>
              Hemos recibido tus datos y documentos. Nuestro equipo los validara a la brevedad.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button variant="outline" onClick={() => router.push('/login')}>Volver</Button>
          </CardContent>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="cursor-pointer hover:border-primary transition" onClick={() => { setType('personal'); setStep(2) }}>
            <CardHeader>
              <CardTitle>Personal</CardTitle>
              <CardDescription>Transacciones como individuo.</CardDescription>
            </CardHeader>
          </Card>
          <Card className="cursor-pointer hover:border-primary transition" onClick={() => { setType('company'); setStep(2) }}>
            <CardHeader>
              <CardTitle>Empresa</CardTitle>
              <CardDescription>Operaciones a nombre de su negocio o entidad legal.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto mt-12 px-4 pb-20">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Registro {type === 'personal' ? 'Personal' : 'Empresarial'}</h1>
          <p className="text-sm text-muted-foreground">Paso {step}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleClear}>Cambiar de tipo (Reiniciar)</Button>
      </div>

      {status === 'needs_changes' && (
        <div className="bg-destructive/10 border-l-4 border-destructive p-4 mb-6 rounded flex items-start">
          <AlertCircle className="w-5 h-5 text-destructive mr-3 mt-0.5" />
          <div>
            <p className="font-semibold text-destructive">Observaciones a corregir:</p>
            <p className="text-sm text-destructive">{observations}</p>
          </div>
        </div>
      )}

      {type === 'personal' && <PersonalForm status={status} userId={user!.id} />}
      {type === 'company' && <CompanyForm status={status} userId={user!.id} />}
    </div>
  )
}
