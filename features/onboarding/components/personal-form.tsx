'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { personalOnboardingSchema, type PersonalOnboardingValues } from '../schemas/personal-onboarding.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useOnboardingStore } from '@/stores/onboarding-store'
import { OnboardingService } from '@/services/onboarding.service'
import { toast } from 'sonner'
import { useState, useEffect, useRef } from 'react'
import { FileDropzone } from '@/components/shared/file-dropzone'
import { Loader2, CheckCircle2, FileText } from 'lucide-react'
import { FieldObservationAlert } from './field-observation-alert'
import { TosIframeModal } from './tos-iframe-modal'
import Flag from 'react-world-flags'
import { PhoneInputField } from '@/components/shared/phone-input-field'
import {
  INDIVIDUAL_ID_TYPES,
  INDIVIDUAL_SOURCE_OF_FUNDS,
  INDIVIDUAL_ACCOUNT_PURPOSE,
  EXPECTED_MONTHLY_PAYMENTS,
  EMPLOYMENT_STATUS_OPTIONS,
  BRIDGE_COUNTRIES,
  COUNTRY_SUBDIVISIONS,
} from '@/lib/bridge-constants'
import { OccupationCombobox } from '@/components/shared/occupation-combobox'

import { getRequiredDocumentsForId } from '@/lib/document-requirements'

export function PersonalForm({
  userId,
  onStatusChange,
  fieldObservations = {},
}: {
  status: string | null
  userId: string
  onStatusChange: (status: string) => void
  fieldObservations?: Record<string, string>
}) {
  const { step, setStep, formData, updateFormData, reset } = useOnboardingStore()
  const [isUploading, setIsUploading] = useState(false)
  const [tosUrl, setTosUrl] = useState<string | null>(null)
  const [tosLoading, setTosLoading] = useState(false)
  const [tosModalOpen, setTosModalOpen] = useState(false)
  const [tosContractId, setTosContractId] = useState<string | null>(null)
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({})
  // Documentos ya subidos previamente al servidor (para mostrar estado "ya adjuntado")
  const [existingDocs, setExistingDocs] = useState<Record<string, { fileName: string; id: string }>>({})
  const [docsLoaded, setDocsLoaded] = useState(false)

  const form = useForm<PersonalOnboardingValues>({

    resolver: zodResolver(personalOnboardingSchema),
    defaultValues: {
      first_name:                    (formData.first_name as string) || '',
      middle_name:                   (formData.middle_name as string) || '',
      last_name:                     (formData.last_name as string) || '',
      date_of_birth:                 (formData.date_of_birth as string) || '',
      nationality:                   (formData.nationality as any) || ('' as any),
      country_of_residence:          (formData.country_of_residence as any) || ('' as any),
      id_type:                       (formData.id_type as any) || ('' as any),
      id_number:                     (formData.id_number as string) || '',
      id_expiry_date:                (formData.id_expiry_date as string) || '',
      email:                         (formData.email as string) || '',
      phone:                         (formData.phone as string) || '',
      address1:                      (formData.address1 as string) || '',
      address2:                      (formData.address2 as string) || '',
      city:                          (formData.city as string) || '',
      state:                         (formData.state as string) || '',
      postal_code:                   (formData.postal_code as string) || '',
      country:                       (formData.country as any) || ('' as any),
      most_recent_occupation:        (formData.most_recent_occupation as any) || undefined,
      account_purpose:               (formData.account_purpose as any) || ('' as any),
      account_purpose_other:         (formData.account_purpose_other as string) || '',
      source_of_funds:               (formData.source_of_funds as any) || ('' as any),
      // F3: campo renombrado de estimated_monthly_volume a expected_monthly_payments_usd
      expected_monthly_payments_usd: (formData.expected_monthly_payments_usd as any) || ('' as any),
      tax_id:                        (formData.tax_id as string) || '',
      is_pep:                        (formData.is_pep as boolean) ?? false,
      // F5: employment_status (P1 high-risk, opcional)
      employment_status:             (formData.employment_status as any) || undefined,
    },
  })

  // form.watch debe ir DESPUÉS de useForm — fix lint "used before declaration"
  const selectedIdType = form.watch('id_type')
  const requiredDocuments = getRequiredDocumentsForId(selectedIdType)
  const watchedCountry = form.watch('country')
  const subdivisions = COUNTRY_SUBDIVISIONS[watchedCountry] ?? []

  // Ref para distinguir el montaje inicial de un cambio manual de país.
  // Sin esto, el useEffect borra el valor de state restaurado desde el backend.
  const prevCountryRef = useRef(watchedCountry)

  useEffect(() => {
    if (prevCountryRef.current !== undefined && prevCountryRef.current !== watchedCountry) {
      form.setValue('state', '')
    }
    prevCountryRef.current = watchedCountry
  }, [watchedCountry, form])

  // ── Cargar documentos existentes del servidor al montar ─────────────
  useEffect(() => {
    if (docsLoaded) return
    let cancelled = false
    async function loadExistingDocs() {
      try {
        const docs = await OnboardingService.listDocuments('person')
        if (cancelled) return
        const map: Record<string, { fileName: string; id: string }> = {}
        for (const doc of docs) {
          // Solo toma el primero por tipo (el más reciente, ya vienen ordenados desc)
          if (!map[doc.document_type]) {
            map[doc.document_type] = { fileName: doc.file_name, id: doc.id }
          }
        }
        setExistingDocs(map)
      } catch (_e) {
        // Sin documentos previos — first time
      } finally {
        if (!cancelled) setDocsLoaded(true)
      }
    }
    loadExistingDocs()
    return () => { cancelled = true }
  }, [docsLoaded])

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
      isValid = await form.trigger(['address1', 'city', 'country', 'state'])
    } else if (step === 4) {
      // F3: campo renombrado
      const fieldsToValidate: any = ['most_recent_occupation', 'account_purpose', 'source_of_funds', 'expected_monthly_payments_usd']
      if (form.getValues('account_purpose') === 'other') {
        fieldsToValidate.push('account_purpose_other')
      }
      isValid = await form.trigger(fieldsToValidate)
    }

    if (isValid) {
      updateFormData(form.getValues())
      setStep(step + 1)
    }
  }
  const handleDocSelect = (docType: string, file: File | null) => {
    if (file) {
      setPendingFiles(prev => ({ ...prev, [docType]: file }))
    } else {
      setPendingFiles(prev => {
        const next = { ...prev }
        delete next[docType]
        return next
      })
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
  /** Helper: un doc está cubierto si el usuario seleccionó uno nuevo
   *  O si ya existía uno previamente subido en el servidor. */
  const hasDoc = (docType: string) => !!pendingFiles[docType] || !!existingDocs[docType]

  async function onSubmit(data: PersonalOnboardingValues) {
    const missingDocs = requiredDocuments.filter(doc => !hasDoc(doc.id))
    if (missingDocs.length > 0) {
      toast.error(`Faltan documentos por subir: ${missingDocs.map(d => d.title).join(', ')}`)
      return
    }
    if (!hasDoc('proof_of_address')) {
      toast.error('Debes subir el comprobante de domicilio')
      return
    }
    if (!tosContractId) {
      toast.error('Debes aceptar los Términos de Servicio de Bridge antes de continuar')
      return
    }

    setIsUploading(true)
    try {
      // Paso 0: Subir SOLO los archivos nuevos seleccionados por el usuario
      // (los que ya existen en el servidor no se re-suben)
      if (Object.keys(pendingFiles).length > 0) {
        for (const [docType, file] of Object.entries(pendingFiles)) {
          await OnboardingService.uploadDocument(file, docType, 'person')
        }
      }

      // Paso 1: Guardar datos biográficos
      await OnboardingService.savePersonalInfo({
        first_name:                    data.first_name,
        middle_name:                   data.middle_name || undefined,
        last_name:                     data.last_name,
        date_of_birth:                 data.date_of_birth,
        nationality:                   data.nationality,
        country_of_residence:          data.country_of_residence,
        id_type:                       data.id_type as 'passport' | 'drivers_license' | 'national_id',
        id_number:                     data.id_number,
        id_expiry_date:                data.id_expiry_date || undefined,
        email:                         data.email,
        phone:                         data.phone,
        address1:                      data.address1,
        address2:                      data.address2 || undefined,
        city:                          data.city,
        state:                         data.state || undefined,
        postal_code:                   data.postal_code || undefined,
        country:                       data.country,
        tax_id:                        data.tax_id || undefined,
        source_of_funds:               data.source_of_funds as any,
        account_purpose:               data.account_purpose as any,
        account_purpose_other:         data.account_purpose === 'other' ? (data.account_purpose_other || undefined) : undefined,
        is_pep:                        data.is_pep,
        // F3: campo renombrado — se envía como expected_monthly_payments_usd al backend
        expected_monthly_payments_usd: data.expected_monthly_payments_usd as any,
        // F5: employment_status (P1, opcional)
        employment_status:             (data.employment_status || undefined) as any,
        // F-OCC: most_recent_occupation reemplaza el campo de texto libre anterior
        most_recent_occupation:        (data.most_recent_occupation || undefined) as any,
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
    } finally {
      setIsUploading(false)
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
                <FormItem><FormLabel>Nombre(s)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /><FieldObservationAlert fieldName="first_name" fieldObservations={fieldObservations} /></FormItem>
              )} />
              <FormField control={form.control} name="middle_name" render={({ field }) => (
                <FormItem><FormLabel>Segundo Nombre (opcional)</FormLabel><FormControl><Input {...field} placeholder="Si aplica" /></FormControl><FormMessage /><FieldObservationAlert fieldName="middle_name" fieldObservations={fieldObservations} /></FormItem>
              )} />
              <FormField control={form.control} name="last_name" render={({ field }) => (
                <FormItem><FormLabel>Apellido(s)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /><FieldObservationAlert fieldName="last_name" fieldObservations={fieldObservations} /></FormItem>
              )} />
              <FormField control={form.control} name="date_of_birth" render={({ field }) => (
                <FormItem><FormLabel>Fecha de Nacimiento</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /><FieldObservationAlert fieldName="date_of_birth" fieldObservations={fieldObservations} /></FormItem>
              )} />

              {/* Nacionalidad */}
              <FormField control={form.control} name="nationality" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nacionalidad</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        {field.value ? (() => {
                          const c = BRIDGE_COUNTRIES.find(x => x.value === field.value)
                          return c ? (
                            <div className="flex items-center gap-2">
                              <Flag code={c.value} fallback={<span>🌐</span>} style={{ width: 20, height: 14, objectFit: 'cover' }} className="rounded-sm shrink-0" />
                              <span className="truncate">{c.label}</span>
                            </div>
                          ) : field.value
                        })() : <span className="text-muted-foreground">Selecciona un país</span>}
                      </SelectTrigger>
                    </FormControl>
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
                  <FieldObservationAlert fieldName="nationality" fieldObservations={fieldObservations} />
                </FormItem>
              )} />

              {/* País de Residencia */}
              <FormField control={form.control} name="country_of_residence" render={({ field }) => (
                <FormItem>
                  <FormLabel>País de Residencia</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        {field.value ? (() => {
                          const c = BRIDGE_COUNTRIES.find(x => x.value === field.value)
                          return c ? (
                            <div className="flex items-center gap-2">
                              <Flag code={c.value} fallback={<span>🌐</span>} style={{ width: 20, height: 14, objectFit: 'cover' }} className="rounded-sm shrink-0" />
                              <span className="truncate">{c.label}</span>
                            </div>
                          ) : field.value
                        })() : <span className="text-muted-foreground">Selecciona un país</span>}
                      </SelectTrigger>
                    </FormControl>
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
                  <FieldObservationAlert fieldName="country_of_residence" fieldObservations={fieldObservations} />
                </FormItem>
              )} />

              {/* Tipo de Documento */}
              <FormField control={form.control} name="id_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Documento</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        {field.value ? (
                          <span className="truncate">{INDIVIDUAL_ID_TYPES.find(t => t.value === field.value)?.label || field.value}</span>
                        ) : <span className="text-muted-foreground">Selecciona tipo</span>}
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INDIVIDUAL_ID_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  <FieldObservationAlert fieldName="id_type" fieldObservations={fieldObservations} />
                </FormItem>
              )} />

              <FormField control={form.control} name="id_number" render={({ field }) => (
                <FormItem><FormLabel>Nro. de Documento</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /><FieldObservationAlert fieldName="id_number" fieldObservations={fieldObservations} /></FormItem>
              )} />
              <FormField control={form.control} name="id_expiry_date" render={({ field }) => (
                <FormItem><FormLabel>Vencimiento del Documento</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /><FieldObservationAlert fieldName="id_expiry_date" fieldObservations={fieldObservations} /></FormItem>
              )} />

              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email de Contacto</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /><FieldObservationAlert fieldName="email" fieldObservations={fieldObservations} /></FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <PhoneInputField
                      value={field.value}
                      onChange={field.onChange}
                      countryHint={form.watch('nationality') || form.watch('country_of_residence') || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    El código de país se detecta automáticamente según tu nacionalidad
                  </FormDescription>
                  <FormMessage />
                  <FieldObservationAlert fieldName="phone" fieldObservations={fieldObservations} />
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
                <FormItem className="col-span-2"><FormLabel>Calle y Número</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /><FieldObservationAlert fieldName="address1" fieldObservations={fieldObservations} /></FormItem>
              )} />
              <FormField control={form.control} name="address2" render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Complemento (opcional)</FormLabel><FormControl><Input placeholder="Apto, Piso, etc." {...field} /></FormControl><FormMessage /><FieldObservationAlert fieldName="address2" fieldObservations={fieldObservations} /></FormItem>
              )} />
              <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem><FormLabel>Ciudad</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /><FieldObservationAlert fieldName="city" fieldObservations={fieldObservations} /></FormItem>
              )} />
              <FormField control={form.control} name="state" render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado / Provincia</FormLabel>
                  {subdivisions.length > 0 ? (
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          {field.value
                            ? subdivisions.find(s => s.value === field.value)?.label ?? field.value
                            : <span className="text-muted-foreground">Selecciona un estado / provincia</span>}
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subdivisions.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <FormControl><Input placeholder="Estado / Provincia" {...field} /></FormControl>
                  )}
                  <FormMessage />
                  <FieldObservationAlert fieldName="state" fieldObservations={fieldObservations} />
                </FormItem>
              )} />
              <FormField control={form.control} name="postal_code" render={({ field }) => (
                <FormItem><FormLabel>Código Postal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /><FieldObservationAlert fieldName="postal_code" fieldObservations={fieldObservations} /></FormItem>
              )} />

              <FormField control={form.control} name="country" render={({ field }) => (
                <FormItem>
                  <FormLabel>País</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        {field.value ? (() => {
                          const c = BRIDGE_COUNTRIES.find(x => x.value === field.value)
                          return c ? (
                            <div className="flex items-center gap-2">
                              <Flag code={c.value} fallback={<span>🌐</span>} style={{ width: 20, height: 14, objectFit: 'cover' }} className="rounded-sm shrink-0" />
                              <span className="truncate">{c.label}</span>
                            </div>
                          ) : field.value
                        })() : <span className="text-muted-foreground">Selecciona un país</span>}
                      </SelectTrigger>
                    </FormControl>
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
                  <FieldObservationAlert fieldName="country" fieldObservations={fieldObservations} />
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
              <FormField control={form.control} name="most_recent_occupation" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Ocupación</FormLabel>
                  <FormControl>
                    <OccupationCombobox
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Escribe para buscar entre las ocupaciones disponibles.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="tax_id" render={({ field }) => (
                <FormItem><FormLabel>NIT / SSN / CURP (opcional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="account_purpose" render={({ field }) => (
                <FormItem>
                  <FormLabel>Propósito de la cuenta</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        {field.value ? (
                          <span className="truncate">{INDIVIDUAL_ACCOUNT_PURPOSE.find(p => p.value === field.value)?.label || field.value}</span>
                        ) : <span className="text-muted-foreground">Selecciona un propósito</span>}
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INDIVIDUAL_ACCOUNT_PURPOSE.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {/* P1-A: conditional field when account_purpose = 'other' */}
              {form.watch('account_purpose') === 'other' && (
                <FormField control={form.control} name="account_purpose_other" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Especifica el propósito de la cuenta</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Describe el propósito..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              <FormField control={form.control} name="source_of_funds" render={({ field }) => (
                <FormItem>
                  <FormLabel>Origen de fondos</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        {field.value ? (
                          <span className="truncate">{INDIVIDUAL_SOURCE_OF_FUNDS.find(s => s.value === field.value)?.label || field.value}</span>
                        ) : <span className="text-muted-foreground">Selecciona el origen</span>}
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INDIVIDUAL_SOURCE_OF_FUNDS.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="expected_monthly_payments_usd" render={({ field }) => (
                <FormItem>
                  <FormLabel>Volumen Mensual Estimado (USD)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        {field.value ? (
                          <span className="truncate">{EXPECTED_MONTHLY_PAYMENTS.find(m => m.value === field.value)?.label || field.value}</span>
                        ) : <span className="text-muted-foreground">Selecciona un rango</span>}
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EXPECTED_MONTHLY_PAYMENTS.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {/* F5: employment_status — campo P1 high-risk (opcional) */}
              <FormField control={form.control} name="employment_status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Situación Laboral <span className="text-muted-foreground text-xs font-normal">(opcional)</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        {field.value ? (
                          <span className="truncate">{EMPLOYMENT_STATUS_OPTIONS.find(e => e.value === field.value)?.label || field.value}</span>
                        ) : <span className="text-muted-foreground">Selecciona situación laboral</span>}
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EMPLOYMENT_STATUS_OPTIONS.map(e => (
                        <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    Requerido para perfiles de due diligence reforzada. Opcional para el resto.
                  </FormDescription>
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

            {/* Documentos Dinámicos */}
            <div className="space-y-4">
              {requiredDocuments.map(({ id, title, helperText, accept }) => (
                <div key={id} className="border p-4 rounded bg-muted/20">
                  <label className="block text-sm font-medium mb-2">
                    {title}
                    {pendingFiles[id] && <span className="ml-2 text-emerald-500 text-xs">✓ Nuevo adjuntado</span>}
                    {!pendingFiles[id] && existingDocs[id] && (
                      <span className="ml-2 text-sky-500 text-xs">📎 Ya subido: {existingDocs[id].fileName}</span>
                    )}
                  </label>
                  {!pendingFiles[id] && existingDocs[id] && (
                    <p className="text-xs text-muted-foreground mb-2">
                      Ya tienes un documento de este tipo subido. Si deseas reemplazarlo, selecciona uno nuevo.
                    </p>
                  )}
                  <FileDropzone
                    accept={accept || 'image/*,.pdf'}
                    file={pendingFiles[id] || null}
                    helperText={helperText || 'Máximo 10MB'}
                    onFileSelect={(file) => handleDocSelect(id, file)}
                  />
                  <FieldObservationAlert fieldName={id} fieldObservations={fieldObservations} />
                </div>
              ))}
              
              {/* Comprobante de Domicilio siempre requerido en KYC */}
              <div className="border p-4 rounded bg-muted/20">
                <label className="block text-sm font-medium mb-2">
                  Comprobante de Domicilio
                  {pendingFiles['proof_of_address'] && <span className="ml-2 text-emerald-500 text-xs">✓ Nuevo adjuntado</span>}
                  {!pendingFiles['proof_of_address'] && existingDocs['proof_of_address'] && (
                    <span className="ml-2 text-sky-500 text-xs">📎 Ya subido: {existingDocs['proof_of_address'].fileName}</span>
                  )}
                </label>
                {!pendingFiles['proof_of_address'] && existingDocs['proof_of_address'] && (
                  <p className="text-xs text-muted-foreground mb-2">
                    Ya tienes un comprobante subido. Si deseas reemplazarlo, selecciona uno nuevo.
                  </p>
                )}
                <FileDropzone
                  accept="image/*,.pdf"
                  file={pendingFiles['proof_of_address'] || null}
                  helperText="Factura de servicios, extracto bancario (max 3 meses)"
                  onFileSelect={(file) => handleDocSelect('proof_of_address', file)}
                />
                <FieldObservationAlert fieldName="proof_of_address" fieldObservations={fieldObservations} />
              </div>
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
