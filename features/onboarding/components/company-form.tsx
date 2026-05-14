'use client'

import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { companyOnboardingSchema, type CompanyOnboardingValues } from '../schemas/company-onboarding.schema'
import { Button } from '@/components/ui/button'
import { GuiraButton } from '@/components/shared/guira-button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useOnboardingStore } from '@/stores/onboarding-store'
import { OnboardingService, type CreateBusinessDto } from '@/services/onboarding.service'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'
import { FileDropzone } from '@/components/shared/file-dropzone'
import { ExternalLink, Eye, FileText, Loader2, Paperclip, PlusCircle, Trash2 } from 'lucide-react'
import { FieldObservationAlert } from './field-observation-alert'
import Flag from 'react-world-flags'
import {
  BUSINESS_TYPES,
  BUSINESS_SOURCE_OF_FUNDS,
  BUSINESS_ACCOUNT_PURPOSE,
  EXPECTED_MONTHLY_PAYMENTS,
  ANNUAL_REVENUE_RANGES,
  HIGH_RISK_ACTIVITIES,
  BRIDGE_COUNTRIES,
  BUSINESS_INDUSTRIES,
  COUNTRY_SUBDIVISIONS,
} from '@/lib/bridge-constants'
import { TosIframeModal } from './tos-iframe-modal'
import { getRequiredDocumentsForId } from '@/lib/document-requirements'

const INDIVIDUAL_ID_TYPES = [
  { value: 'passport', label: 'Pasaporte' },
  { value: 'national_id', label: 'Cédula / Documento Nacional' },
  { value: 'drivers_license', label: 'Licencia de Conducir' },
]

export function CompanyForm({
  status,
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
  // F4: ToS KYB ahora usa TosIframeModal + postMessage (igual que KYC personal)
  const [tosUrl, setTosUrl] = useState<string | null>(null)
  const [tosLoading, setTosLoading] = useState(false)
  const [tosModalOpen, setTosModalOpen] = useState(false)
  const [tosContractId, setTosContractId] = useState<string | null>(null)
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({})
  // Documentos ya subidos previamente al servidor (para mostrar estado "ya adjuntado")
  const [existingDocs, setExistingDocs] = useState<Record<string, { fileName: string; id: string }>>({})
  const [docsLoaded, setDocsLoaded] = useState(false)
  const [previewLoading, setPreviewLoading] = useState<Record<string, boolean>>({})

  const handlePreviewDoc = async (docKey: string, docId: string) => {
    setPreviewLoading(prev => ({ ...prev, [docKey]: true }))
    try {
      const { signed_url } = await OnboardingService.getDocumentSignedUrl(docId)
      window.open(signed_url, '_blank', 'noopener,noreferrer')
    } catch {
      toast.error('No se pudo obtener el enlace del documento')
    } finally {
      setPreviewLoading(prev => ({ ...prev, [docKey]: false }))
    }
  }

  const form = useForm<CompanyOnboardingValues>({
    resolver: zodResolver(companyOnboardingSchema),
    defaultValues: {
      legal_name:                     (formData.legal_name as string) || '',
      trade_name:                     (formData.trade_name as string) || '',
      registration_number:            (formData.registration_number as string) || '',
      tax_id:                         (formData.tax_id as string) || '',
      entity_type:                    (formData.entity_type as CompanyOnboardingValues['entity_type']) || undefined,
      incorporation_date:             (formData.incorporation_date as string) || '',
      country_of_incorporation:       (formData.country_of_incorporation as CompanyOnboardingValues['country_of_incorporation']) || undefined,
      business_description:           (formData.business_description as string) || '',
      business_industry:              (formData.business_industry as string[]) || [],
      primary_website:                (formData.primary_website as string) || '',
      email:                          (formData.email as string) || '',
      phone:                          (formData.phone as string) || '',
      address1:                       (formData.address1 as string) || '',
      address2:                       (formData.address2 as string) || '',
      city:                           (formData.city as string) || '',
      state:                          (formData.state as string) || '',
      postal_code:                    (formData.postal_code as string) || '',
      country:                        (formData.country as CompanyOnboardingValues['country']) || undefined,
      // F8: physical address
      physical_address1:              (formData.physical_address1 as string) || '',
      physical_address2:              (formData.physical_address2 as string) || '',
      physical_city:                  (formData.physical_city as string) || '',
      physical_state:                 (formData.physical_state as string) || '',
      physical_postal_code:           (formData.physical_postal_code as string) || '',
      physical_country:               (formData.physical_country as CompanyOnboardingValues['physical_country']) || undefined,
      account_purpose:                (formData.account_purpose as CompanyOnboardingValues['account_purpose']) || undefined,
      account_purpose_other:          (formData.account_purpose_other as string) || '',
      source_of_funds:                (formData.source_of_funds as CompanyOnboardingValues['source_of_funds']) || undefined,
      // F3: renombrado estimated_monthly_volume → expected_monthly_payments_usd
      expected_monthly_payments_usd:  (formData.expected_monthly_payments_usd as CompanyOnboardingValues['expected_monthly_payments_usd']),
      conducts_money_services:        (formData.conducts_money_services as boolean) ?? false,
      uses_bridge_for_money_services: (formData.uses_bridge_for_money_services as boolean) ?? false,
      // F6: annual revenue (P1)
      estimated_annual_revenue_usd:   (formData.estimated_annual_revenue_usd as CompanyOnboardingValues['estimated_annual_revenue_usd']) || undefined,
      // F7: high_risk_activities (P1)
      high_risk_activities:           (formData.high_risk_activities as string[]) || [],
      legal_rep_first_name:           (formData.legal_rep_first_name as string) || '',
      legal_rep_last_name:            (formData.legal_rep_last_name as string) || '',
      legal_rep_position:             (formData.legal_rep_position as string) || '',
      legal_rep_id_number:            (formData.legal_rep_id_number as string) || '',
      legal_rep_email:                (formData.legal_rep_email as string) || '',
      // FIX N-05: date_of_birth now required for Director
      legal_rep_date_of_birth:        (formData.legal_rep_date_of_birth as string) || '',
      legal_rep_is_pep:               (formData.legal_rep_is_pep as boolean) ?? false,
      ubos: (formData.ubos as CompanyOnboardingValues['ubos']) || [],
    },
  })

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'ubos' })

  // form.watch DESPUÉS de useForm — fix del lint "used before declaration"
  const legalRepIdType = form.watch('legal_rep_id_type')
  const legalRepDocs = getRequiredDocumentsForId(legalRepIdType)
  const ubosWatched = form.watch('ubos') || []
  const watchedCountry = form.watch('country')
  const watchedPhysicalCountry = form.watch('physical_country')
  const subdivisions = COUNTRY_SUBDIVISIONS[watchedCountry] ?? []
  const physicalSubdivisions = COUNTRY_SUBDIVISIONS[watchedPhysicalCountry ?? ''] ?? []

  useEffect(() => { form.setValue('state', '') }, [watchedCountry, form])
  useEffect(() => { form.setValue('physical_state', '') }, [watchedPhysicalCountry, form])

  // ── Cargar documentos existentes del servidor al montar ─────────────
  useEffect(() => {
    if (docsLoaded) return
    let cancelled = false
    async function loadExistingDocs() {
      try {
        const docs = await OnboardingService.listDocuments('business')
        if (cancelled) return
        const map: Record<string, { fileName: string; id: string }> = {}
        for (const doc of docs) {
          if (!map[doc.document_type]) {
            map[doc.document_type] = { fileName: doc.file_name, id: doc.id }
          }
        }
        setExistingDocs(map)
      } catch (_e) {
        // Sin documentos previos
      } finally {
        if (!cancelled) setDocsLoaded(true)
      }
    }
    loadExistingDocs()
    return () => { cancelled = true }
  }, [docsLoaded])

  /** Un doc está cubierto si el usuario seleccionó uno nuevo O ya existía en el servidor. */
  const hasDoc = (docKey: string) => !!pendingFiles[docKey] || !!existingDocs[docKey]

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
      const fieldsToValidate: (keyof CompanyOnboardingValues)[] = ['account_purpose', 'source_of_funds', 'expected_monthly_payments_usd']
      if (form.getValues('account_purpose') === 'other') {
        fieldsToValidate.push('account_purpose_other')
      }
      isValid = await form.trigger(fieldsToValidate)
    } else if (step === 5) {
      isValid = true
    }

    if (isValid) {
      updateFormData(form.getValues())
      setStep(step + 1)
    }
  }

  // ── Upload documentos (selección local) ──────────────────────────
  const handleDocSelect = (docKey: string, file: File | null) => {
    if (file) {
      setPendingFiles(prev => ({ ...prev, [docKey]: file }))
    } else {
      setPendingFiles(prev => {
        const next = { ...prev }
        delete next[docKey]
        return next
      })
    }
  }

  // F4: obtiene ToS link sin redirect_uri (usará postMessage desde el iframe)
  const handleGetTosLink = async () => {
    if (tosUrl) {
      setTosModalOpen(true)
      return
    }
    setTosLoading(true)
    try {
      // Sin redirect_uri — usamos postMessage igual que en KYC personal
      const res = await OnboardingService.getKybTosLink()
      setTosUrl(res.url)
      setTosModalOpen(true)
    } catch (err) {
      console.error(err)
      toast.error('Error obteniendo link de Términos de Servicio')
    } finally {
      setTosLoading(false)
    }
  }

  // F4: callback cuando Bridge confirma la aceptación vía postMessage
  const handleTosAccepted = (signedAgreementId: string) => {
    setTosContractId(signedAgreementId)
    setTosModalOpen(false)
    toast.success('Términos de Servicio aceptados correctamente')
  }

  // ── Submit final KYB ───────────────────────────────────────────
  async function onFinalSubmit(data: CompanyOnboardingValues) {
    if (!hasDoc('incorporation_certificate')) {
      toast.error('Debes subir el documento de constitución / registro de empresa')
      return
    }
    const missingLegalDocs = legalRepDocs.filter(d => !hasDoc(`replegal_${d.id}`))
    if (missingLegalDocs.length > 0) {
      toast.error(`Faltan documentos del Representante Legal: ${missingLegalDocs.map(d => d.title).join(', ')}`)
      return
    }
    
    // Validar documentos de UBOs
    let missingUbo = false
    data.ubos?.forEach((ubo, index) => {
      const docs = getRequiredDocumentsForId(ubo.id_type)
      const missing = docs.filter(d => !hasDoc(`ubo_${index}_${d.id}`))
      if (missing.length > 0) {
        missingUbo = true
        toast.error(`Socio #${index + 1}: Faltan documentos (${missing.map(d => d.title).join(', ')})`)
      }
    })
    if (missingUbo) return
    
    // F4: validar que el ToS fue aceptado vía iframe (signed_agreement_id)
    if (!tosContractId) {
      toast.error('Debes aceptar los Términos de Servicio de Bridge antes de continuar')
      return
    }

    setIsUploading(true)

    try {
      // Paso 0: Subir SOLO los archivos nuevos seleccionados por el usuario
      if (Object.keys(pendingFiles).length > 0) {
        for (const [docKey, file] of Object.entries(pendingFiles)) {
          let subjectType: 'business' | 'person' | 'ubo' = 'business'
          let docType = docKey
          
          if (docKey.startsWith('replegal_')) {
            subjectType = 'person'
            docType = docKey.replace('replegal_', '')
          } else if (docKey.startsWith('ubo_')) {
            subjectType = 'ubo'
            // Extraer el docType real: ubo_0_passport → passport
            docType = docKey.replace(/^ubo_\d+_/, '')
          }
          
          await OnboardingService.uploadDocument(file, docType, subjectType)
        }
      }

      // Paso 1: Guardar datos empresa
      await OnboardingService.saveBusinessInfo({
        legal_name:                     data.legal_name,
        trade_name:                     data.trade_name || undefined,
        registration_number:            data.registration_number || undefined,
        tax_id:                         data.tax_id,
        entity_type:                    data.entity_type as CreateBusinessDto['entity_type'],
        incorporation_date:             data.incorporation_date || undefined,
        country_of_incorporation:       data.country_of_incorporation,
        business_description:           data.business_description || undefined,
        business_industry:              data.business_industry,
        primary_website:                data.primary_website || undefined,
        email:                          data.email,
        phone:                          data.phone || undefined,
        address1:                       data.address1,
        address2:                       data.address2 || undefined,
        city:                           data.city,
        state:                          data.state || undefined,
        postal_code:                    data.postal_code || undefined,
        country:                        data.country,
        // F8: physical address
        physical_address1:              data.physical_address1 || undefined,
        physical_address2:              data.physical_address2 || undefined,
        physical_city:                  data.physical_city || undefined,
        physical_state:                 data.physical_state || undefined,
        physical_postal_code:           data.physical_postal_code || undefined,
        physical_country:               data.physical_country || undefined,
        account_purpose:                data.account_purpose as CreateBusinessDto['account_purpose'],
        account_purpose_other:          data.account_purpose === 'other' ? (data.account_purpose_other || undefined) : undefined,
        source_of_funds:                data.source_of_funds as CreateBusinessDto['source_of_funds'],
        // F3: campo renombrado
        expected_monthly_payments_usd:  data.expected_monthly_payments_usd || undefined,
        conducts_money_services:        data.conducts_money_services,
        uses_bridge_for_money_services: data.uses_bridge_for_money_services,
        // F6: annual revenue (P1)
        estimated_annual_revenue_usd:   data.estimated_annual_revenue_usd as CreateBusinessDto['estimated_annual_revenue_usd'] || undefined,
        // F7: high_risk_activities (P1)
        high_risk_activities:           data.high_risk_activities,
      })

      // Paso 2: Agregar representante legal como director
      await OnboardingService.addDirector({
        first_name: data.legal_rep_first_name,
        last_name:  data.legal_rep_last_name,
        position:   data.legal_rep_position,
        is_signer:  true,
        // FIX N-05: date_of_birth and email are now required by Bridge AssociatedPerson schema
        date_of_birth: data.legal_rep_date_of_birth ?? '',
        email:      data.legal_rep_email,
        id_number:  data.legal_rep_id_number,
        // Fuga B — PEP del director ahora viaja al backend y a Bridge
        is_pep:     data.legal_rep_is_pep ?? false,
        // P0-B: Residential Address mandatory for Director
        address1:   data.legal_rep_address1,
        city:       data.legal_rep_city,
        country:    data.legal_rep_country,
      })

      // Paso 3: Agregar UBOs
      for (const ubo of data.ubos ?? []) {
        await OnboardingService.addUbo({
          first_name:           ubo.first_name,
          last_name:            ubo.last_name,
          ownership_percent:    ubo.ownership_percent,
          // FIX N-05: date_of_birth and email are now required by Bridge AssociatedPerson schema
          date_of_birth:        ubo.date_of_birth ?? '',
          email:                ubo.email ?? '',
          nationality:          ubo.nationality,
          country_of_residence: ubo.country_of_residence,
          id_type:              ubo.id_type,
          id_number:            ubo.id_number,
          // Fuga A — Control prong ahora viaja al backend y se persiste en DB
          has_control:          ubo.has_control ?? false,
          is_pep:               ubo.is_pep ?? false,
          // P0-B: Residential Address mandatory for UBO
          address1:             ubo.address1 ?? '',
          city:                 ubo.city ?? '',
          country:              ubo.country ?? '',
        })
      }

      // Paso 4: Crear expediente KYB (idempotente)
      await OnboardingService.createKybApplication()

      // Paso 5: F4 — Registrar aceptación de ToS KYB con el signed_agreement_id
      await OnboardingService.acceptKybTos(tosContractId ?? undefined)

      // Paso 6: Enviar para revisión
      await OnboardingService.submitKyb()

      toast.success('Solicitud KYB enviada correctamente. Recibirás una notificación con el resultado.')
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
      <form className="space-y-6" onSubmit={form.handleSubmit(onFinalSubmit)}>

        {/* ──────────── STEP 2: Datos de la Empresa ──────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-medium">Información de la Empresa</h2>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="legal_name" render={({ field }) => (
                <FormItem><FormLabel>Razón Social</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /><FieldObservationAlert fieldName="legal_name" fieldObservations={fieldObservations} /></FormItem>
              )} />
              <FormField control={form.control} name="trade_name" render={({ field }) => (
                <FormItem><FormLabel>Nombre Comercial (opcional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /><FieldObservationAlert fieldName="trade_name" fieldObservations={fieldObservations} /></FormItem>
              )} />
              <FormField control={form.control} name="registration_number" render={({ field }) => (
                <FormItem><FormLabel>Nro. de Registro</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /><FieldObservationAlert fieldName="registration_number" fieldObservations={fieldObservations} /></FormItem>
              )} />
              <FormField control={form.control} name="tax_id" render={({ field }) => (
                <FormItem><FormLabel>NIT / Tax ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /><FieldObservationAlert fieldName="tax_id" fieldObservations={fieldObservations} /></FormItem>
              )} />

              <FormField control={form.control} name="entity_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Entidad</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        {field.value ? (
                          <span className="truncate">{BUSINESS_TYPES.find(t => t.value === field.value)?.label || field.value}</span>
                        ) : <span className="text-muted-foreground">Selecciona tipo</span>}
                      </SelectTrigger>
                    </FormControl>
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
                        })() : <span className="text-muted-foreground">Selecciona país</span>}
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
                </FormItem>
              )} />

              <FormField control={form.control} name="business_industry" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Industria / Sector (NAICS)</FormLabel>
                  <Select
                    onValueChange={(val: string | null) => {
                      if (!val) return
                      const current = field.value || []
                      if (current.includes(val)) {
                        field.onChange(current.filter((v: string) => v !== val))
                      } else {
                        field.onChange([...current, val])
                      }
                    }}
                    value=""
                  >
                    <FormControl>
                      <SelectTrigger>
                        {field.value && field.value.length > 0 ? (
                          <span className="truncate">
                            {field.value.map((v: string) => BUSINESS_INDUSTRIES.find(i => i.value === v)?.label || v).join(', ')}
                          </span>
                        ) : <span className="text-muted-foreground">Selecciona una o más industrias</span>}
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {BUSINESS_INDUSTRIES.map(i => (
                        <SelectItem key={i.value} value={i.value}>
                          <div className="flex items-center gap-2">
                            {field.value?.includes(i.value) && <span className="text-green-500">✓</span>}
                            <span>{i.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    Selecciona las industrias que apliquen. Códigos NAICS 2022 requeridos por Bridge.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="primary_website" render={({ field }) => (
                <FormItem><FormLabel>Sitio Web (opcional)</FormLabel><FormControl><Input type="url" placeholder="https://www.ejemplo.com" {...field} /></FormControl><FormDescription className="text-xs">Mejora la velocidad de aprobación KYB</FormDescription><FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="business_description" render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Descripción de Actividad</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email Corporativo</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /><FieldObservationAlert fieldName="email" fieldObservations={fieldObservations} /></FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Teléfono (opcional)</FormLabel><FormControl><Input placeholder="+1 415 555 0100" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="flex justify-end pt-4">
              <GuiraButton type="button" arrowNext onClick={handleNext}>Siguiente</GuiraButton>
            </div>
          </div>
        )}

        {/* ──────────── STEP 3: Dirección + Representante Legal ──────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-medium">Sede y Representante Legal</h2>
            <h3 className="text-base font-medium text-muted-foreground">Dirección Empresarial (Registrada)</h3>
            <p className="text-xs text-muted-foreground">Domicilio legal de la empresa según el registro mercantil.</p>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="address1" render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Calle y Número</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /><FieldObservationAlert fieldName="address1" fieldObservations={fieldObservations} /></FormItem>
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
                </FormItem>
              )} />
              <FormField control={form.control} name="postal_code" render={({ field }) => (
                <FormItem><FormLabel>Código Postal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
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
                        })() : <span className="text-muted-foreground">Selecciona país</span>}
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
                </FormItem>
              )} />
              {/* F8: Dirección Operacional / Física (opcional) */}
            </div>

            <h3 className="text-base font-medium text-muted-foreground pt-4">Dirección Operacional <span className="text-xs font-normal">(opcional — si es distinta a la registrada)</span></h3>
            <p className="text-xs text-muted-foreground">Bridge la utiliza como <code>physical_address</code>. Completa solo si la operación ocurre en un lugar diferente a la sede legal.</p>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="physical_address1" render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Calle y Número (operacional)</FormLabel><FormControl><Input placeholder="Calle Industria 55" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="physical_city" render={({ field }) => (
                <FormItem><FormLabel>Ciudad (operacional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="physical_state" render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado / Provincia (operacional)</FormLabel>
                  {physicalSubdivisions.length > 0 ? (
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          {field.value
                            ? physicalSubdivisions.find(s => s.value === field.value)?.label ?? field.value
                            : <span className="text-muted-foreground">Selecciona un estado / provincia</span>}
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {physicalSubdivisions.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <FormControl><Input placeholder="Estado / Provincia" {...field} /></FormControl>
                  )}
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="physical_postal_code" render={({ field }) => (
                <FormItem><FormLabel>Código Postal (operacional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="physical_country" render={({ field }) => (
                <FormItem>
                  <FormLabel>País (operacional)</FormLabel>
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
                        })() : <span className="text-muted-foreground">Selecciona país</span>}
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
                </FormItem>
              )} />
            </div>

            <h3 className="text-base font-medium text-muted-foreground pt-4">Representante Legal</h3>
            <p className="text-xs text-muted-foreground">Será registrado como director firmante en el expediente KYB.</p>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="legal_rep_first_name" render={({ field }) => (
                <FormItem><FormLabel>Nombres</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /><FieldObservationAlert fieldName="legal_rep_first_name" fieldObservations={fieldObservations} /></FormItem>
              )} />
              <FormField control={form.control} name="legal_rep_last_name" render={({ field }) => (
                <FormItem><FormLabel>Apellidos</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /><FieldObservationAlert fieldName="legal_rep_last_name" fieldObservations={fieldObservations} /></FormItem>
              )} />
              <FormField control={form.control} name="legal_rep_position" render={({ field }) => (
                <FormItem><FormLabel>Cargo</FormLabel><FormControl><Input placeholder="CEO, Director, etc." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="legal_rep_id_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Documento</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        {field.value ? (
                          <span className="truncate">{INDIVIDUAL_ID_TYPES.find(t => t.value === field.value)?.label || field.value}</span>
                        ) : <span className="text-muted-foreground">Tipo doc.</span>}
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INDIVIDUAL_ID_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="legal_rep_id_number" render={({ field }) => (
                <FormItem><FormLabel>Nro. Documento</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="legal_rep_email" render={({ field }) => (
                <FormItem><FormLabel>Email Rep. Legal</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              {/* FIX N-05: date_of_birth required by Bridge AssociatedPerson schema */}
              <FormField control={form.control} name="legal_rep_date_of_birth" render={({ field }) => (
                <FormItem><FormLabel>Fecha de Nacimiento Rep. Legal</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="legal_rep_address1" render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Dirección Residencial</FormLabel><FormControl><Input placeholder="P.ej. Calle 123" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="legal_rep_city" render={({ field }) => (
                <FormItem><FormLabel>Ciudad Residencial</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="legal_rep_country" render={({ field }) => (
                <FormItem>
                  <FormLabel>País Residencial</FormLabel>
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
                        })() : <span className="text-muted-foreground">Selecciona país</span>}
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
                </FormItem>
              )} />
              <FormField control={form.control} name="legal_rep_is_pep" render={({ field }) => (
                <FormItem className="flex flex-row items-start gap-3 rounded-lg border p-3">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="font-normal text-sm">Representante Legal es PEP (Persona Expuesta Políticamente)</FormLabel>
                </FormItem>
              )} />
            </div>
            <div className="flex justify-between pt-4">
              <GuiraButton type="button" variant="secondary" arrowBack onClick={() => setStep(step - 1)}>Atrás</GuiraButton>
              <GuiraButton type="button" arrowNext onClick={handleNext}>Siguiente</GuiraButton>
            </div>
          </div>
        )}

        {/* ────────── STEP 4: Información Financiera ────────── */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-medium">Información Financiera y Compliance</h2>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="account_purpose" render={({ field }) => (
                <FormItem>
                  <FormLabel>Propósito de la cuenta</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        {field.value ? (
                          <span className="truncate">{BUSINESS_ACCOUNT_PURPOSE.find(p => p.value === field.value)?.label || field.value}</span>
                        ) : <span className="text-muted-foreground">Selecciona propósito</span>}
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {BUSINESS_ACCOUNT_PURPOSE.map(p => (
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
                          <span className="truncate">{BUSINESS_SOURCE_OF_FUNDS.find(s => s.value === field.value)?.label || field.value}</span>
                        ) : <span className="text-muted-foreground">Selecciona origen</span>}
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {BUSINESS_SOURCE_OF_FUNDS.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {/* F3: campo renombrado */}
              <FormField control={form.control} name="expected_monthly_payments_usd" render={({ field }) => (
                <FormItem>
                  <FormLabel>Volumen Mensual Estimado (USD/mes)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Ej. 15000"
                      {...field}
                      value={field.value ?? ''}
                      onChange={e => {
                        const val = e.target.value;
                        field.onChange(val === '' ? undefined : Number(val));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* F6: Ingresos anuales estimados (P1 — high-risk) */}
              <FormField control={form.control} name="estimated_annual_revenue_usd" render={({ field }) => (
                <FormItem>
                  <FormLabel>Ingresos Anuales Estimados <span className="text-muted-foreground text-xs font-normal">(opcional)</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        {field.value ? (
                          <span className="truncate">{ANNUAL_REVENUE_RANGES.find(r => r.value === field.value)?.label || field.value}</span>
                        ) : <span className="text-muted-foreground">Selecciona rango anual</span>}
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ANNUAL_REVENUE_RANGES.map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
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

            {/* conducts_money_services_description — requerido por Bridge cuando MSB=true */}
            {form.watch('conducts_money_services') && (
              <FormField control={form.control} name="conducts_money_services_description" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Descripción de servicios de dinero <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Remesas internacionales, cambio de divisas, pagos móviles..." {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Requerido por Bridge: descripción detallada de los servicios financieros que ofrece la empresa.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {/* F7: Actividades de alto riesgo — solo visible si es MSB */}
            {form.watch('conducts_money_services') && (
              <div className="border rounded-lg p-4 space-y-3 bg-amber-50/40 dark:bg-amber-950/20">
                <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  Actividades de Alto Riesgo Regulatorio
                </h4>
                <p className="text-xs text-muted-foreground">
                  Selecciona si la empresa opera en alguna de las siguientes áreas. Requerido para procesos de EDD.
                </p>
                <FormField
                  control={form.control}
                  name="high_risk_activities"
                  render={({ field }) => (
                    <FormItem>
                      <div className="grid grid-cols-2 gap-2">
                        {HIGH_RISK_ACTIVITIES.map(activity => (
                          <div key={activity.value} className="flex items-center gap-2 p-2 rounded-md border hover:bg-muted/40 cursor-pointer">
                            <Checkbox
                              id={`hra-${activity.value}`}
                              checked={(field.value || []).includes(activity.value)}
                              onCheckedChange={(checked) => {
                                const current = field.value || []
                                if (checked) {
                                  field.onChange([...current, activity.value])
                                } else {
                                  field.onChange(current.filter((v: string) => v !== activity.value))
                                }
                              }}
                            />
                            <label htmlFor={`hra-${activity.value}`} className="text-xs cursor-pointer">
                              {activity.label}
                            </label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="flex justify-between pt-4">
              <GuiraButton type="button" variant="secondary" arrowBack onClick={() => setStep(step - 1)}>Atrás</GuiraButton>
              <GuiraButton type="button" arrowNext onClick={handleNext}>Siguiente</GuiraButton>
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
                {pendingFiles['incorporation_certificate'] && <span className="ml-2 text-emerald-500 text-xs">✓ Nuevo adjuntado</span>}
              </label>
              {!pendingFiles['incorporation_certificate'] && existingDocs['incorporation_certificate'] && (
                <ExistingDocPreview
                  fileName={existingDocs['incorporation_certificate'].fileName}
                  loading={!!previewLoading['incorporation_certificate']}
                  onView={() => handlePreviewDoc('incorporation_certificate', existingDocs['incorporation_certificate'].id)}
                />
              )}
              <FileDropzone
                accept="image/*,.pdf"
                file={pendingFiles['incorporation_certificate'] || null}
                helperText="Documento de constitución legal de la empresa"
                onFileSelect={(file) => handleDocSelect('incorporation_certificate', file)}
              />
            </div>

            {legalRepDocs.map((docSpec) => {
              const uploadKey = `replegal_${docSpec.id}`
              return (
                <div key={docSpec.id} className="border p-4 rounded bg-muted/20">
                  <label className="block text-sm font-medium mb-2">
                    Representante Legal: {docSpec.title}
                    {pendingFiles[uploadKey] && <span className="ml-2 text-emerald-500 text-xs">✓ Nuevo adjuntado</span>}
                  </label>
                  {!pendingFiles[uploadKey] && existingDocs[uploadKey] && (
                    <ExistingDocPreview
                      fileName={existingDocs[uploadKey].fileName}
                      loading={!!previewLoading[uploadKey]}
                      onView={() => handlePreviewDoc(uploadKey, existingDocs[uploadKey].id)}
                    />
                  )}
                  <FileDropzone
                    accept={docSpec.accept || 'image/*,.pdf'}
                    file={pendingFiles[uploadKey] || null}
                    helperText={docSpec.helperText || 'ID o pasaporte del representante legal'}
                    onFileSelect={(file) => handleDocSelect(uploadKey, file)}
                  />
                </div>
              )
            })}

            <div className="border p-4 rounded bg-muted/20">
              <label className="block text-sm font-medium mb-2">
                Comprobante Domicilio Fiscal
                {pendingFiles['proof_of_address'] && <span className="ml-2 text-emerald-500 text-xs">✓ Nuevo adjuntado</span>}
              </label>
              {!pendingFiles['proof_of_address'] && existingDocs['proof_of_address'] && (
                <ExistingDocPreview
                  fileName={existingDocs['proof_of_address'].fileName}
                  loading={!!previewLoading['proof_of_address']}
                  onView={() => handlePreviewDoc('proof_of_address', existingDocs['proof_of_address'].id)}
                />
              )}
              <FileDropzone
                accept="image/*,.pdf"
                file={pendingFiles['proof_of_address'] || null}
                helperText="Factura o estado de cuenta reciente"
                onFileSelect={(file) => handleDocSelect('proof_of_address', file)}
              />
            </div>

            <div className="flex justify-between pt-4">
              <GuiraButton type="button" variant="secondary" arrowBack onClick={() => setStep(step - 1)}>Atrás</GuiraButton>
              <GuiraButton type="button" arrowNext disabled={isUploading} onClick={handleNext}>
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Siguiente (UBOs)
              </GuiraButton>
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
                  // FIX N-05: date_of_birth required by Bridge AssociatedPerson schema
                  date_of_birth: '', email: '',
                  is_pep: false, has_control: false, position: '', nationality: undefined,
                  address1: '', city: '', country: '' as CompanyOnboardingValues['ubos'][number]['country']
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
                  {/* FIX N-05: date_of_birth required by Bridge AssociatedPerson schema */}
                  <FormField control={form.control} name={`ubos.${index}.date_of_birth`} render={({ field }) => (
                    <FormItem><FormLabel>Fecha de Nacimiento</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name={`ubos.${index}.nationality`} render={({ field }) => (
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
                            })() : <span className="text-muted-foreground">Selecciona país</span>}
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
                    </FormItem>
                  )} />
                  <FormField control={form.control} name={`ubos.${index}.id_type`} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Documento</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            {field.value ? (
                              <span className="truncate">{INDIVIDUAL_ID_TYPES.find(t => t.value === field.value)?.label || field.value}</span>
                            ) : <span className="text-muted-foreground">Tipo doc.</span>}
                          </SelectTrigger>
                        </FormControl>
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
                    <FormItem><FormLabel>Email UBO <span className="text-destructive text-xs">*</span></FormLabel><FormControl><Input type="email" placeholder="contacto@empresa.com" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name={`ubos.${index}.address1`} render={({ field }) => (
                    <FormItem className="col-span-2"><FormLabel>Dirección Residencial</FormLabel><FormControl><Input placeholder="Calle, Nro, etc." {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name={`ubos.${index}.city`} render={({ field }) => (
                    <FormItem><FormLabel>Ciudad Residencial</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name={`ubos.${index}.country`} render={({ field }) => (
                    <FormItem>
                      <FormLabel>País Residencial</FormLabel>
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
                            })() : <span className="text-muted-foreground">Selecciona país</span>}
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
                    </FormItem>
                  )} />
                  <FormField control={form.control} name={`ubos.${index}.is_pep`} render={({ field }) => (
                    <FormItem className="flex flex-row items-start gap-3 rounded border p-3">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel className="font-normal text-sm">Este UBO es PEP</FormLabel>
                    </FormItem>
                  )} />
                  {/* F9: has_control — UBO con control operacional (no solo ownership) */}
                  <FormField control={form.control} name={`ubos.${index}.has_control`} render={({ field }) => (
                    <FormItem className="flex flex-row items-start gap-3 rounded border p-3">
                      <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                      <div>
                        <FormLabel className="font-normal text-sm">Este UBO tiene control operacional</FormLabel>
                        <p className="text-xs text-muted-foreground">Activa si administra o dirige la empresa aunque no sea el mayor accionista.</p>
                      </div>
                    </FormItem>
                  )} />
                  {/* P2-A: position/title — required by Bridge when has_control is true */}
                  {form.watch(`ubos.${index}.has_control`) && (
                    <FormField control={form.control} name={`ubos.${index}.position`} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cargo en la empresa *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: CFO, Director General" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                </div>
                <div className="pt-2 space-y-4">
                  <h5 className="text-sm font-medium text-muted-foreground border-b pb-1 mb-2">Documentos del Socio</h5>
                  {(() => {
                    const currentIdType = ubosWatched[index]?.id_type
                    const requiredDocs = getRequiredDocumentsForId(currentIdType)
                    
                    return requiredDocs.map(docSpec => {
                      const upKey = `ubo_${index}_${docSpec.id}`
                      return (
                        <div key={docSpec.id}>
                          <label className="block text-sm font-medium mb-2">
                            {docSpec.title}
                            {pendingFiles[upKey] && <span className="ml-2 text-emerald-500 text-xs">✓ Nuevo adjuntado</span>}
                          </label>
                          {!pendingFiles[upKey] && existingDocs[upKey] && (
                            <ExistingDocPreview
                              fileName={existingDocs[upKey].fileName}
                              loading={!!previewLoading[upKey]}
                              onView={() => handlePreviewDoc(upKey, existingDocs[upKey].id)}
                            />
                          )}
                          <FileDropzone
                            accept={docSpec.accept || 'image/*,.pdf'}
                            file={pendingFiles[upKey] || null}
                            helperText={docSpec.helperText || 'Documento del socio'}
                            onFileSelect={(file) => handleDocSelect(upKey, file)}
                          />
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>
            ))}

            {/* Términos de Servicio KYB — F4: usa TosIframeModal igual que KYC personal */}
            <div className="border rounded-lg p-5 space-y-4 bg-muted/10">
              <h3 className="font-semibold text-base">Términos de Servicio Empresarial (Bridge)</h3>
              <p className="text-sm text-muted-foreground">
                El representante legal debe aceptar los Términos de Servicio para empresas de Bridge antes de enviar el expediente.
              </p>
              {tosContractId ? (
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
                  <span>&#10003;</span> Términos aceptados correctamente
                </div>
              ) : (
                <GuiraButton type="button" variant="outline" disabled={tosLoading} onClick={handleGetTosLink} iconStart={tosLoading ? undefined : FileText}>
                  {tosLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Cargando…</> : (tosUrl ? 'Revisar Términos de Servicio' : 'Obtener Términos de Servicio')}
                </GuiraButton>
              )}
              {tosUrl && !tosContractId && (
                <TosIframeModal
                  open={tosModalOpen}
                  tosUrl={tosUrl}
                  onAccepted={handleTosAccepted}
                  onClose={() => setTosModalOpen(false)}
                />
              )}
            </div>

            <div className="flex justify-between pt-4 border-t mt-4">
              <GuiraButton type="button" variant="secondary" arrowBack onClick={() => setStep(step - 1)}>Atrás</GuiraButton>
              <GuiraButton
                type="submit"
                arrowNext
                disabled={isUploading || form.formState.isSubmitting || !tosContractId}
              >
                {form.formState.isSubmitting
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Enviando KYB...</>
                  : 'Enviar Solicitud KYB'}
              </GuiraButton>
            </div>
          </div>
        )}
      </form>
    </Form>
  )
}

function ExistingDocPreview({
  fileName,
  loading,
  onView,
}: {
  fileName: string
  loading: boolean
  onView: () => void
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-sky-200/60 bg-sky-50/50 dark:bg-sky-950/20 dark:border-sky-800/40 px-3 py-2 mb-3 gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <Paperclip className="w-3.5 h-3.5 text-sky-500 shrink-0" />
        <span className="text-xs font-medium text-sky-700 dark:text-sky-400 truncate">{fileName}</span>
      </div>
      <button
        type="button"
        onClick={onView}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-900 dark:hover:text-sky-200 disabled:opacity-50 shrink-0 transition-colors"
      >
        {loading
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <Eye className="w-3.5 h-3.5" />
        }
        {loading ? 'Cargando…' : 'Ver documento'}
      </button>
    </div>
  )
}
