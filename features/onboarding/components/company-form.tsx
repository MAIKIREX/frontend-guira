'use client'

import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { companyOnboardingSchema, type CompanyOnboardingValues } from '../schemas/company-onboarding.schema'
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
import { ExternalLink, Loader2, PlusCircle, Trash2 } from 'lucide-react'
import Flag from 'react-world-flags'
import {
  BUSINESS_TYPES,
  BUSINESS_SOURCE_OF_FUNDS,
  BUSINESS_ACCOUNT_PURPOSE,
  EXPECTED_MONTHLY_PAYMENTS,
  BRIDGE_COUNTRIES,
} from '@/lib/bridge-constants'

const INDIVIDUAL_ID_TYPES = [
  { value: 'passport', label: 'Pasaporte' },
  { value: 'national_id', label: 'Cédula / Documento Nacional' },
  { value: 'drivers_license', label: 'Licencia de Conducir' },
]

const BUSINESS_INDUSTRIES = [
  { value: 'technology', label: 'Tecnología' },
  { value: 'finance', label: 'Finanzas / Fintech' },
  { value: 'agriculture', label: 'Agricultura' },
  { value: 'manufacturing', label: 'Manufactura' },
  { value: 'retail', label: 'Comercio / Retail' },
  { value: 'services', label: 'Servicios profesionales' },
  { value: 'real_estate', label: 'Bienes raíces' },
  { value: 'healthcare', label: 'Salud' },
  { value: 'education', label: 'Educación' },
  { value: 'logistics', label: 'Logística / Transporte' },
  { value: 'energy', label: 'Energía' },
  { value: 'other', label: 'Otro' },
]

export function CompanyForm({
  status,
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
  const [tosAccepted, setTosAccepted] = useState(false)
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, boolean>>({})

  const form = useForm<CompanyOnboardingValues>({
    resolver: zodResolver(companyOnboardingSchema),
    defaultValues: {
      legal_name:                     (formData.legal_name as string) || '',
      trade_name:                     (formData.trade_name as string) || '',
      registration_number:            (formData.registration_number as string) || '',
      tax_id:                         (formData.tax_id as string) || '',
      entity_type:                    (formData.entity_type as any) || ('' as any),
      incorporation_date:             (formData.incorporation_date as string) || '',
      country_of_incorporation:       (formData.country_of_incorporation as any) || ('' as any),
      business_description:           (formData.business_description as string) || '',
      business_industry:              (formData.business_industry as string) || '',
      email:                          (formData.email as string) || '',
      phone:                          (formData.phone as string) || '',
      address1:                       (formData.address1 as string) || '',
      address2:                       (formData.address2 as string) || '',
      city:                           (formData.city as string) || '',
      state:                          (formData.state as string) || '',
      postal_code:                    (formData.postal_code as string) || '',
      country:                        (formData.country as any) || ('' as any),
      account_purpose:                (formData.account_purpose as any) || ('' as any),
      source_of_funds:                (formData.source_of_funds as any) || ('' as any),
      estimated_monthly_volume:       (formData.estimated_monthly_volume as any) || ('' as any),
      conducts_money_services:        (formData.conducts_money_services as boolean) ?? false,
      uses_bridge_for_money_services: (formData.uses_bridge_for_money_services as boolean) ?? false,
      legal_rep_first_name:           (formData.legal_rep_first_name as string) || '',
      legal_rep_last_name:            (formData.legal_rep_last_name as string) || '',
      legal_rep_position:             (formData.legal_rep_position as string) || '',
      legal_rep_id_number:            (formData.legal_rep_id_number as string) || '',
      legal_rep_email:                (formData.legal_rep_email as string) || '',
      legal_rep_is_pep:               (formData.legal_rep_is_pep as boolean) ?? false,
      ubos: (formData.ubos as CompanyOnboardingValues['ubos']) || [],
    },
  })

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'ubos' })

  // ── Navegación entre pasos ─────────────────────────────────────
  const handleNext = async () => {
    let isValid = false
    if (step === 2) {
      isValid = await form.trigger([
        'legal_name', 'tax_id', 'entity_type', 'country_of_incorporation',
        'business_description', 'business_industry', 'email',
      ])
    } else if (step === 3) {
      isValid = await form.trigger([
        'address1', 'city', 'country',
        'legal_rep_first_name', 'legal_rep_last_name', 'legal_rep_position', 'legal_rep_id_number',
      ])
    } else if (step === 4) {
      isValid = await form.trigger(['account_purpose', 'source_of_funds', 'estimated_monthly_volume'])
    } else if (step === 5) {
      isValid = true
    }

    if (isValid) {
      updateFormData(form.getValues())
      setStep(step + 1)
    }
  }

  // ── Upload documentos empresa ──────────────────────────────────
  const handleDocUpload = async (
    docType: 'incorporation_certificate' | 'national_id' | 'proof_of_address',
    file: File,
  ) => {
    if (!file) return
    setIsUploading(true)
    try {
      await OnboardingService.uploadDocument(file, docType, 'business')
      setUploadedDocs(prev => ({ ...prev, [docType]: true }))
      toast.success('Documento de empresa subido correctamente')
    } catch (err) {
      console.error(err)
      toast.error('Error subiendo documento')
    } finally {
      setIsUploading(false)
    }
  }

  // ── Upload documentos UBO ──────────────────────────────────────
  const handleUboDocUpload = async (index: number, file: File) => {
    if (!file) return
    setIsUploading(true)
    try {
      await OnboardingService.uploadDocument(file, 'national_id', 'ubo')
      setUploadedDocs(prev => ({ ...prev, [`ubo_${index}`]: true }))
      toast.success(`Documento UBO #${index + 1} subido`)
    } catch (err) {
      console.error(err)
      toast.error('Error subiendo documento de UBO')
    } finally {
      setIsUploading(false)
    }
  }

  // ── Obtener link ToS KYB ───────────────────────────────────────
  const handleGetTosLink = async () => {
    setTosLoading(true)
    try {
      const res = await OnboardingService.getKybTosLink(window.location.href)
      setTosUrl(res.url)
    } catch (err) {
      console.error(err)
      toast.error('Error obteniendo link de Términos de Servicio')
    } finally {
      setTosLoading(false)
    }
  }

  // ── Submit final KYB ───────────────────────────────────────────
  async function onFinalSubmit(data: CompanyOnboardingValues) {
    if (!uploadedDocs['incorporation_certificate']) {
      toast.error('Debes subir el documento de constitución / registro de empresa')
      return
    }
    if (!tosAccepted) {
      toast.error('Debes aceptar los Términos de Servicio de Bridge antes de continuar')
      return
    }

    try {
      // Paso 1: Guardar datos empresa
      await OnboardingService.saveBusinessInfo({
        legal_name:                     data.legal_name,
        trade_name:                     data.trade_name,
        registration_number:            data.registration_number,
        tax_id:                         data.tax_id,
        entity_type:                    data.entity_type,
        incorporation_date:             data.incorporation_date,
        country_of_incorporation:       data.country_of_incorporation,
        business_description:           data.business_description,
        business_industry:              data.business_industry,
        email:                          data.email,
        phone:                          data.phone,
        address1:                       data.address1,
        address2:                       data.address2,
        city:                           data.city,
        state:                          data.state,
        postal_code:                    data.postal_code,
        country:                        data.country,
        account_purpose:                data.account_purpose,
        source_of_funds:                data.source_of_funds,
        conducts_money_services:        data.conducts_money_services,
        uses_bridge_for_money_services: data.uses_bridge_for_money_services,
      })

      // Paso 2: Agregar representante legal como director
      await OnboardingService.addDirector({
        first_name: data.legal_rep_first_name,
        last_name:  data.legal_rep_last_name,
        position:   data.legal_rep_position,
        is_signer:  true,
        id_number:  data.legal_rep_id_number,
        email:      data.legal_rep_email || undefined,
      })

      // Paso 3: Agregar UBOs
      for (const ubo of data.ubos ?? []) {
        await OnboardingService.addUbo({
          first_name:       ubo.first_name,
          last_name:        ubo.last_name,
          ownership_percent: ubo.ownership_percent,
          date_of_birth:    ubo.date_of_birth,
          nationality:      ubo.nationality,
          country_of_residence: ubo.country_of_residence,
          id_type:          ubo.id_type,
          id_number:        ubo.id_number,
          email:            ubo.email || undefined,
          is_pep:           ubo.is_pep,
        })
      }

      // Paso 4: Crear expediente KYB (idempotente)
      await OnboardingService.createKybApplication()

      // Paso 5: Registrar aceptación de ToS KYB
      await OnboardingService.acceptKybTos()

      // Paso 6: Enviar para revisión
      await OnboardingService.submitKyb()

      toast.success('Solicitud KYB enviada correctamente. Recibirás una notificación con el resultado.')
      onStatusChange('submitted')
      reset()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ocurrió un error al enviar la solicitud'
      toast.error(message)
    }
  }

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(onFinalSubmit)}>

        {/* ──────────── STEP 2: Datos de la Empresa ──────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-medium">Información de la Empresa</h2>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="legal_name" render={({ field }) => (
                <FormItem><FormLabel>Razón Social</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="trade_name" render={({ field }) => (
                <FormItem><FormLabel>Nombre Comercial (opcional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="registration_number" render={({ field }) => (
                <FormItem><FormLabel>Nro. de Registro</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="tax_id" render={({ field }) => (
                <FormItem><FormLabel>NIT / Tax ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="entity_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Entidad</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona tipo" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {BUSINESS_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="incorporation_date" render={({ field }) => (
                <FormItem><FormLabel>Fecha de Constitución</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="country_of_incorporation" render={({ field }) => (
                <FormItem>
                  <FormLabel>País de Constitución</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona país" /></SelectTrigger></FormControl>
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

              <FormField control={form.control} name="business_industry" render={({ field }) => (
                <FormItem>
                  <FormLabel>Industria / Sector</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona sector" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {BUSINESS_INDUSTRIES.map(i => (
                        <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="business_description" render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Descripción de Actividad</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email Corporativo</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Teléfono (opcional)</FormLabel><FormControl><Input placeholder="+1 415 555 0100" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="flex justify-end pt-4">
              <Button type="button" onClick={handleNext}>Siguiente</Button>
            </div>
          </div>
        )}

        {/* ──────────── STEP 3: Dirección + Representante Legal ──────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-medium">Sede y Representante Legal</h2>
            <h3 className="text-base font-medium text-muted-foreground">Dirección Empresarial</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="address1" render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Calle y Número</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
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
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona país" /></SelectTrigger></FormControl>
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

            <h3 className="text-base font-medium text-muted-foreground pt-4">Representante Legal</h3>
            <p className="text-xs text-muted-foreground">Será registrado como director firmante en el expediente KYB.</p>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="legal_rep_first_name" render={({ field }) => (
                <FormItem><FormLabel>Nombres</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="legal_rep_last_name" render={({ field }) => (
                <FormItem><FormLabel>Apellidos</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="legal_rep_position" render={({ field }) => (
                <FormItem><FormLabel>Cargo</FormLabel><FormControl><Input placeholder="CEO, Director, etc." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="legal_rep_id_number" render={({ field }) => (
                <FormItem><FormLabel>Nro. Documento</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="legal_rep_email" render={({ field }) => (
                <FormItem><FormLabel>Email Rep. Legal (opcional)</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="legal_rep_is_pep" render={({ field }) => (
                <FormItem className="flex flex-row items-start gap-3 rounded-lg border p-3">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="font-normal text-sm">Representante Legal es PEP (Persona Expuesta Políticamente)</FormLabel>
                </FormItem>
              )} />
            </div>
            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>Atrás</Button>
              <Button type="button" onClick={handleNext}>Siguiente</Button>
            </div>
          </div>
        )}

        {/* ──────────── STEP 4: Información Financiera ──────────── */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-medium">Información Financiera y Compliance</h2>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="account_purpose" render={({ field }) => (
                <FormItem>
                  <FormLabel>Propósito de la cuenta</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona propósito" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {BUSINESS_ACCOUNT_PURPOSE.map(p => (
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
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona origen" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {BUSINESS_SOURCE_OF_FUNDS.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="estimated_monthly_volume" render={({ field }) => (
                <FormItem>
                  <FormLabel>Volumen Estimado (USD/mes)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona rango" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {EXPECTED_MONTHLY_PAYMENTS.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="conducts_money_services" render={({ field }) => (
                <FormItem className="col-span-2 flex flex-row items-start gap-3 rounded-lg border p-3">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <div>
                    <FormLabel>¿La empresa es un Money Services Business (MSB)?</FormLabel>
                    <FormDescription>Activa revisiones de compliance adicionales.</FormDescription>
                  </div>
                </FormItem>
              )} />
              <FormField control={form.control} name="uses_bridge_for_money_services" render={({ field }) => (
                <FormItem className="col-span-2 flex flex-row items-start gap-3 rounded-lg border p-3">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <div>
                    <FormLabel>¿Usará Bridge para prestar servicios financieros a terceros?</FormLabel>
                    <FormDescription>Requiere aprobación adicional por parte del equipo de compliance.</FormDescription>
                  </div>
                </FormItem>
              )} />
            </div>
            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>Atrás</Button>
              <Button type="button" onClick={handleNext}>Siguiente</Button>
            </div>
          </div>
        )}

        {/* ──────────── STEP 5: Documentos empresa ──────────── */}
        {step === 5 && (
          <div className="space-y-6">
            <h2 className="text-xl font-medium">Documentos de la Empresa</h2>
            <p className="text-sm text-muted-foreground">Sube los documentos legales de la empresa. Formatos aceptados: JPG, PNG, PDF — máx 10 MB.</p>

            <div className="border p-4 rounded bg-muted/20">
              <label className="block text-sm font-medium mb-2">
                Acta de Constitución / Registro Mercantil
                {uploadedDocs['incorporation_certificate'] && <span className="ml-2 text-emerald-500 text-xs">✓ Subido</span>}
              </label>
              <FileDropzone accept="image/*,.pdf" helperText="Documento de constitución legal de la empresa" onFileSelect={(file) => {
                if (file) handleDocUpload('incorporation_certificate', file)
              }} />
            </div>

            <div className="border p-4 rounded bg-muted/20">
              <label className="block text-sm font-medium mb-2">
                Documento del Representante Legal
                {uploadedDocs['national_id'] && <span className="ml-2 text-emerald-500 text-xs">✓ Subido</span>}
              </label>
              <FileDropzone accept="image/*,.pdf" helperText="ID o pasaporte del representante legal" onFileSelect={(file) => {
                if (file) handleDocUpload('national_id', file)
              }} />
            </div>

            <div className="border p-4 rounded bg-muted/20">
              <label className="block text-sm font-medium mb-2">
                Comprobante Domicilio Fiscal
                {uploadedDocs['proof_of_address'] && <span className="ml-2 text-emerald-500 text-xs">✓ Subido</span>}
              </label>
              <FileDropzone accept="image/*,.pdf" helperText="Factura o estado de cuenta reciente" onFileSelect={(file) => {
                if (file) handleDocUpload('proof_of_address', file)
              }} />
            </div>

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>Atrás</Button>
              <Button type="button" disabled={isUploading} onClick={handleNext}>
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Siguiente (UBOs)
              </Button>
            </div>
          </div>
        )}

        {/* ──────────── STEP 6: UBOs + ToS + Envío ──────────── */}
        {step === 6 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-medium">Beneficiarios Finales (UBOs)</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Registra a los socios o personas con &gt; 10% de participación o control directivo.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({
                  first_name: '', last_name: '', ownership_percent: 0,
                  is_pep: false, nationality: undefined,
                })}
              >
                <PlusCircle className="w-4 h-4 mr-1" /> Agregar UBO
              </Button>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="border rounded-lg p-4 space-y-4 relative">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 text-destructive"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <h4 className="font-semibold">Socio #{index + 1}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name={`ubos.${index}.first_name`} render={({ field }) => (
                    <FormItem><FormLabel>Nombre(s)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name={`ubos.${index}.last_name`} render={({ field }) => (
                    <FormItem><FormLabel>Apellido(s)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name={`ubos.${index}.ownership_percent`} render={({ field }) => (
                    <FormItem>
                      <FormLabel>% de Participación</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name={`ubos.${index}.nationality`} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nacionalidad</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecciona país" /></SelectTrigger></FormControl>
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
                    </FormItem>
                  )} />
                  <FormField control={form.control} name={`ubos.${index}.id_type`} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Documento</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Tipo doc." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {INDIVIDUAL_ID_TYPES.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name={`ubos.${index}.id_number`} render={({ field }) => (
                    <FormItem><FormLabel>Nro. Documento</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name={`ubos.${index}.email`} render={({ field }) => (
                    <FormItem><FormLabel>Email UBO (opcional)</FormLabel><FormControl><Input type="email" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name={`ubos.${index}.is_pep`} render={({ field }) => (
                    <FormItem className="flex flex-row items-start gap-3 rounded border p-3">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel className="font-normal text-sm">Este UBO es PEP</FormLabel>
                    </FormItem>
                  )} />
                </div>
                {/* Documento del UBO */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Documento de Identidad del UBO
                    {uploadedDocs[`ubo_${index}`] && <span className="ml-2 text-emerald-500 text-xs">✓ Subido</span>}
                  </label>
                  <FileDropzone
                    accept="image/*,.pdf"
                    helperText="ID o pasaporte del socio"
                    onFileSelect={(file) => { if (file) handleUboDocUpload(index, file) }}
                  />
                </div>
              </div>
            ))}

            {/* Términos de Servicio KYB */}
            <div className="border rounded-lg p-5 space-y-4 bg-muted/10">
              <h3 className="font-semibold text-base">Términos de Servicio Empresarial (Bridge)</h3>
              <p className="text-sm text-muted-foreground">
                El representante legal debe aceptar los Términos de Servicio para empresas de Bridge antes de enviar el expediente.
              </p>
              {!tosUrl ? (
                <Button type="button" variant="outline" disabled={tosLoading} onClick={handleGetTosLink}>
                  {tosLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Obtener link de Términos de Servicio
                </Button>
              ) : (
                <a href={tosUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary underline text-sm">
                  <ExternalLink className="w-4 h-4" />
                  Abrir Términos de Servicio Empresarial
                </a>
              )}
              <div className="flex items-start gap-3 pt-2">
                <Checkbox id="tos-kyb" checked={tosAccepted} onCheckedChange={(v) => setTosAccepted(!!v)} />
                <label htmlFor="tos-kyb" className="text-sm leading-snug cursor-pointer">
                  El representante legal ha leído y acepta los Términos de Servicio de Bridge para entidades empresariales.
                </label>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t mt-4">
              <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>Atrás</Button>
              <Button
                type="submit"
                disabled={isUploading || form.formState.isSubmitting || !tosAccepted}
              >
                {form.formState.isSubmitting
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Enviando KYB...</>
                  : 'Enviar Solicitud KYB'}
              </Button>
            </div>
          </div>
        )}
      </form>
    </Form>
  )
}
