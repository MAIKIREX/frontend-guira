'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { personalOnboardingSchema, type PersonalOnboardingValues } from '../schemas/personal-onboarding.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useOnboardingStore } from '@/stores/onboarding-store'
import { OnboardingService } from '@/services/onboarding.service'
import { toast } from 'sonner'
import { useState } from 'react'
import { FileDropzone } from '@/components/shared/file-dropzone'
import { Loader2, CheckCircle2, FileText } from 'lucide-react'
import { TosIframeModal } from './tos-iframe-modal'
import Flag from 'react-world-flags'
import {
  INDIVIDUAL_ID_TYPES,
  INDIVIDUAL_SOURCE_OF_FUNDS,
  INDIVIDUAL_ACCOUNT_PURPOSE,
  EXPECTED_MONTHLY_PAYMENTS,
  BRIDGE_COUNTRIES,
} from '@/lib/bridge-constants'

// ── Tipos de documento válidos del backend ──────────────────────────
const DOCUMENT_TYPES_KYC = [
  { key: 'national_id',        label: 'Documento de Identidad (Frente + Reverso)' },
  { key: 'passport',           label: 'Pasaporte' },
  { key: 'drivers_license',    label: 'Licencia de Conducir' },
  { key: 'proof_of_address',   label: 'Comprobante de Domicilio' },
]

export function PersonalForm({
  userId,
  onStatusChange,
}: {
  status: string | null
  userId: string
  onStatusChange: (status: string) => void
}) {
  const { step, setStep, formData, updateFormData, reset } = useOnboardingStore()
  const [isUploading, setIsUploading] = useState(false)
  const [tosUrl, setTosUrl] = useState<string | null>(null)
  const [tosLoading, setTosLoading] = useState(false)
  const [tosModalOpen, setTosModalOpen] = useState(false)
  const [tosContractId, setTosContractId] = useState<string | null>(null)
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, boolean>>({})

  const form = useForm<PersonalOnboardingValues>({
    resolver: zodResolver(personalOnboardingSchema),
    defaultValues: {
      first_name:              (formData.first_name as string) || '',
      last_name:               (formData.last_name as string) || '',
      date_of_birth:           (formData.date_of_birth as string) || '',
      nationality:             (formData.nationality as any) || ('' as any),
      country_of_residence:    (formData.country_of_residence as any) || ('' as any),
      id_type:                 (formData.id_type as any) || ('' as any),
      id_number:               (formData.id_number as string) || '',
      id_expiry_date:          (formData.id_expiry_date as string) || '',
      email:                   (formData.email as string) || '',
      phone:                   (formData.phone as string) || '',
      address1:                (formData.address1 as string) || '',
      address2:                (formData.address2 as string) || '',
      city:                    (formData.city as string) || '',
      state:                   (formData.state as string) || '',
      postal_code:             (formData.postal_code as string) || '',
      country:                 (formData.country as any) || ('' as any),
      occupation:              (formData.occupation as string) || '',
      account_purpose:         (formData.account_purpose as any) || ('' as any),
      source_of_funds:         (formData.source_of_funds as any) || ('' as any),
      estimated_monthly_volume:(formData.estimated_monthly_volume as any) || ('' as any),
      tax_id:                  (formData.tax_id as string) || '',
      is_pep:                  (formData.is_pep as boolean) ?? false,
    },
  })

  // ── Avanzar entre pasos con validación parcial ────────────────────
  const handleNext = async () => {
    let isValid = false
    if (step === 2) {
      isValid = await form.trigger([
        'first_name', 'last_name', 'date_of_birth', 'nationality',
        'country_of_residence', 'id_type', 'id_number', 'id_expiry_date',
        'email', 'phone',
      ])
    } else if (step === 3) {
      isValid = await form.trigger(['address1', 'city', 'country'])
    } else if (step === 4) {
      isValid = await form.trigger(['occupation', 'account_purpose', 'source_of_funds', 'estimated_monthly_volume'])
    }

    if (isValid) {
      updateFormData(form.getValues())
      setStep(step + 1)
    }
  }

  // ── Upload de documentos vía backend (nuevo endpoint) ─────────────
  const handleDocUpload = async (
    docType: 'national_id' | 'passport' | 'drivers_license' | 'proof_of_address',
    file: File,
  ) => {
    if (!file) return
    setIsUploading(true)
    try {
      await OnboardingService.uploadDocument(file, docType, 'person')
      setUploadedDocs(prev => ({ ...prev, [docType]: true }))
      toast.success(`Documento (${docType}) subido correctamente`)
    } catch (err: unknown) {
      console.error(err)
      toast.error('Error subiendo documento')
    } finally {
      setIsUploading(false)
    }
  }

  // ── Obtener ToS link de Bridge y abrir modal ─────────────────────
  const handleOpenTosModal = async () => {
    // Si ya tenemos la URL cacheada, abrir directo
    if (tosUrl) {
      setTosModalOpen(true)
      return
    }
    setTosLoading(true)
    try {
      // Sin redirect_uri — usamos postMessage del iframe
      const res = await OnboardingService.getKycTosLink()
      setTosUrl(res.url)
      setTosModalOpen(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error obteniendo los Términos de Servicio'
      toast.error(msg)
    } finally {
      setTosLoading(false)
    }
  }

  // ── Callback cuando Bridge confirma aceptación via postMessage ────
  const handleTosAccepted = (signedAgreementId: string) => {
    setTosContractId(signedAgreementId)
    setTosModalOpen(false)
    toast.success('Términos de Servicio aceptados correctamente')
  }

  // ── Submit final: flujo completo al backend ───────────────────────
  async function onSubmit(data: PersonalOnboardingValues) {
    if (!uploadedDocs['national_id'] && !uploadedDocs['passport']) {
      toast.error('Debes subir al menos un documento de identidad (ID o Pasaporte)')
      return
    }
    if (!uploadedDocs['proof_of_address']) {
      toast.error('Debes subir el comprobante de domicilio')
      return
    }
    if (!tosContractId) {
      toast.error('Debes aceptar los Términos de Servicio de Bridge antes de continuar')
      return
    }

    try {
      // Paso 1: Guardar datos biográficos
      await OnboardingService.savePersonalInfo({
        first_name:           data.first_name,
        last_name:            data.last_name,
        date_of_birth:        data.date_of_birth,
        nationality:          data.nationality,
        country_of_residence: data.country_of_residence,
        id_type:              data.id_type as 'passport' | 'drivers_license' | 'national_id',
        id_number:            data.id_number,
        id_expiry_date:       data.id_expiry_date,
        email:                data.email,
        phone:                data.phone,
        address1:             data.address1,
        address2:             data.address2,
        city:                 data.city,
        state:                data.state,
        postal_code:          data.postal_code,
        country:              data.country,
        tax_id:               data.tax_id,
        source_of_funds:      data.source_of_funds,
        account_purpose:      data.account_purpose,
        is_pep:               data.is_pep,
      })

      // Paso 2: Crear expediente (idempotente — si ya existe lo devuelve)
      await OnboardingService.createKycApplication()

      // Paso 3: Registrar aceptación de ToS (con el ID del contrato firmado de Bridge)
      await OnboardingService.acceptKycTos(tosContractId ?? undefined)

      // Paso 4: Enviar para revisión
      await OnboardingService.submitKyc()

      toast.success('Solicitud KYC enviada correctamente. Recibirás una notificación con el resultado.')
      onStatusChange('submitted')
      reset()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ocurrió un error al enviar la solicitud'
      toast.error(message)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

        {/* ──────────── STEP 2: Identidad + Contacto ──────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-medium">Información Personal</h2>
            <div className="grid grid-cols-2 gap-4">

              <FormField control={form.control} name="first_name" render={({ field }) => (
                <FormItem><FormLabel>Nombre(s)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="last_name" render={({ field }) => (
                <FormItem><FormLabel>Apellido(s)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="date_of_birth" render={({ field }) => (
                <FormItem><FormLabel>Fecha de Nacimiento</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              {/* Nacionalidad */}
              <FormField control={form.control} name="nationality" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nacionalidad</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un país" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {BRIDGE_COUNTRIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>
                          <div className="flex items-center gap-2">
                            <Flag code={c.value} fallback={<span>🌐</span>} style={{ width: 24, height: 16, objectFit: 'cover' }} className="rounded-sm" />
                            <span>{c.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {/* País de Residencia */}
              <FormField control={form.control} name="country_of_residence" render={({ field }) => (
                <FormItem>
                  <FormLabel>País de Residencia</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un país" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {BRIDGE_COUNTRIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>
                          <div className="flex items-center gap-2">
                            <Flag code={c.value} fallback={<span>🌐</span>} style={{ width: 24, height: 16, objectFit: 'cover' }} className="rounded-sm" />
                            <span>{c.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Tipo de Documento */}
              <FormField control={form.control} name="id_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Documento</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona tipo" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {INDIVIDUAL_ID_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="id_number" render={({ field }) => (
                <FormItem><FormLabel>Nro. de Documento</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="id_expiry_date" render={({ field }) => (
                <FormItem><FormLabel>Vencimiento del Documento</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email de Contacto</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl><Input placeholder="+1 415 555 0100" {...field} /></FormControl>
                  <FormDescription>Incluir código de país</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              {/* PEP */}
              <FormField control={form.control} name="is_pep" render={({ field }) => (
                <FormItem className="col-span-2 flex flex-row items-start gap-3 rounded-lg border p-3">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div>
                    <FormLabel className="font-medium">Persona Expuesta Políticamente (PEP)</FormLabel>
                    <FormDescription>
                      Marca esta casilla si eres funcionario público, familiar de uno o tienes vínculos cercanos con un funcionario público.
                    </FormDescription>
                  </div>
                </FormItem>
              )} />
            </div>
            <div className="flex justify-end pt-4">
              <Button type="button" onClick={handleNext}>Siguiente</Button>
            </div>
          </div>
        )}

        {/* ──────────── STEP 3: Dirección ──────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-medium">Dirección de Residencia</h2>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="address1" render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Calle y Número</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="address2" render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Complemento (opcional)</FormLabel><FormControl><Input placeholder="Apto, Piso, etc." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem><FormLabel>Ciudad</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="state" render={({ field }) => (
                <FormItem><FormLabel>Estado / Provincia</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="postal_code" render={({ field }) => (
                <FormItem><FormLabel>Código Postal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="country" render={({ field }) => (
                <FormItem>
                  <FormLabel>País</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un país" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {BRIDGE_COUNTRIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>
                          <div className="flex items-center gap-2">
                            <Flag code={c.value} fallback={<span>🌐</span>} style={{ width: 24, height: 16, objectFit: 'cover' }} className="rounded-sm" />
                            <span>{c.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>Atrás</Button>
              <Button type="button" onClick={handleNext}>Siguiente</Button>
            </div>
          </div>
        )}

        {/* ──────────── STEP 4: Finanzas ──────────── */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-medium">Información Financiera</h2>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="occupation" render={({ field }) => (
                <FormItem><FormLabel>Ocupación</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="tax_id" render={({ field }) => (
                <FormItem><FormLabel>NIT / SSN / CURP (opcional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="account_purpose" render={({ field }) => (
                <FormItem>
                  <FormLabel>Propósito de la cuenta</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un propósito" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {INDIVIDUAL_ACCOUNT_PURPOSE.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="source_of_funds" render={({ field }) => (
                <FormItem>
                  <FormLabel>Origen de fondos</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona el origen" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {INDIVIDUAL_SOURCE_OF_FUNDS.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="estimated_monthly_volume" render={({ field }) => (
                <FormItem>
                  <FormLabel>Volumen Mensual Estimado (USD)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un rango" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {EXPECTED_MONTHLY_PAYMENTS.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>Atrás</Button>
              <Button type="button" onClick={handleNext}>Siguiente</Button>
            </div>
          </div>
        )}

        {/* ──────────── STEP 5: Documentos + ToS + Envío ──────────── */}
        {step === 5 && (
          <div className="space-y-6">
            <h2 className="text-xl font-medium">Documentos y Aceptación</h2>
            <p className="text-sm text-muted-foreground">
              Sube tus documentos y acepta los Términos de Servicio para completar tu solicitud KYC.
            </p>

            {/* Documentos de Identidad */}
            <div className="space-y-4">
              {DOCUMENT_TYPES_KYC.map(({ key, label }) => (
                <div key={key} className="border p-4 rounded bg-muted/20">
                  <label className="block text-sm font-medium mb-2">
                    {label}
                    {uploadedDocs[key] && <span className="ml-2 text-emerald-500 text-xs">✓ Subido</span>}
                  </label>
                  <FileDropzone
                    accept="image/*,.pdf"
                    helperText="JPG, PNG o PDF — máx 10 MB"
                    onFileSelect={(file) => {
                      if (file) handleDocUpload(key as any, file)
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Términos de Servicio de Bridge — iframe embebido */}
            <div className="border rounded-lg p-5 space-y-4 bg-muted/10">
              <h3 className="font-semibold text-base">Términos de Servicio (Bridge)</h3>
              <p className="text-sm text-muted-foreground">
                Para completar tu verificación, debes leer y aceptar los Términos de Servicio de
                Bridge, nuestro proveedor de cumplimiento regulatorio.
              </p>

              {tosContractId ? (
                /* ── Estado: aceptado ── */
                <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 p-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      Términos de Servicio aceptados
                    </p>
                    <p className="text-xs text-emerald-600/70 dark:text-emerald-500/70 font-mono mt-0.5 truncate max-w-xs">
                      ID: {tosContractId}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-auto text-xs text-muted-foreground"
                    onClick={handleOpenTosModal}
                  >
                    Revisar
                  </Button>
                </div>
              ) : (
                /* ── Estado: pendiente ── */
                <Button
                  type="button"
                  variant="outline"
                  disabled={tosLoading}
                  onClick={handleOpenTosModal}
                  className="gap-2"
                >
                  {tosLoading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <FileText className="w-4 h-4" />
                  }
                  {tosLoading ? 'Cargando…' : 'Revisar y Aceptar Términos de Servicio'}
                </Button>
              )}

              {/* Modal con iframe de Bridge */}
              {tosUrl && (
                <TosIframeModal
                  tosUrl={tosUrl}
                  open={tosModalOpen}
                  onClose={() => setTosModalOpen(false)}
                  onAccepted={handleTosAccepted}
                />
              )}
            </div>

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>Atrás</Button>
              <Button
                type="submit"
                disabled={isUploading || form.formState.isSubmitting || !tosContractId}
              >
                {form.formState.isSubmitting
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Enviando...</>
                  : 'Enviar Solicitud KYC'}
              </Button>
            </div>
          </div>
        )}

      </form>
    </Form>
  )
}
