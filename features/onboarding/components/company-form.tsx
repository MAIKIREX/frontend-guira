'use client'

import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { companyOnboardingSchema, type CompanyOnboardingValues } from '../schemas/company-onboarding.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useOnboardingStore } from '@/stores/onboarding-store'
import { OnboardingService } from '@/services/onboarding.service'
import { toast } from 'sonner'
import { useState } from 'react'

export function CompanyForm({ status, userId, onStatusChange }: { status: string | null; userId: string; onStatusChange: (status: string) => void }) {
  const { step, setStep, formData, updateFormData, id, reset } = useOnboardingStore()
  const [isUploading, setIsUploading] = useState(false)

  const form = useForm<CompanyOnboardingValues>({
    resolver: zodResolver(companyOnboardingSchema),
    defaultValues: {
      company_legal_name: (formData.company_legal_name as string) || '',
      registration_number: (formData.registration_number as string) || '',
      country_of_incorporation: (formData.country_of_incorporation as string) || '',
      entity_type: (formData.entity_type as string) || '',
      incorporation_date: (formData.incorporation_date as string) || '',
      business_description: (formData.business_description as string) || '',
      business_street: (formData.business_street as string) || '',
      business_city: (formData.business_city as string) || '',
      business_country: (formData.business_country as string) || '',
      legal_rep_first_names: (formData.legal_rep_first_names as string) || '',
      legal_rep_last_names: (formData.legal_rep_last_names as string) || '',
      legal_rep_position: (formData.legal_rep_position as string) || '',
      legal_rep_id_number: (formData.legal_rep_id_number as string) || '',
      purpose: (formData.purpose as string) || '',
      source_of_funds: (formData.source_of_funds as string) || '',
      estimated_monthly_volume: (formData.estimated_monthly_volume as string) || '',
      tax_id: (formData.tax_id as string) || '',
      ubos: (formData.ubos as CompanyOnboardingValues['ubos']) || [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'ubos',
  })

  const handleNext = async () => {
    let isValid = false
    if (step === 2) {
      isValid = await form.trigger(['company_legal_name', 'registration_number', 'tax_id', 'country_of_incorporation', 'entity_type', 'incorporation_date', 'business_description'])
    } else if (step === 3) {
      isValid = await form.trigger(['business_street', 'business_city', 'business_country', 'legal_rep_first_names', 'legal_rep_last_names', 'legal_rep_position', 'legal_rep_id_number'])
    } else if (step === 4) {
      isValid = await form.trigger(['purpose', 'source_of_funds', 'estimated_monthly_volume'])
    } else if (step === 5) {
      isValid = true
    }

    if (isValid) {
      const currentValues = form.getValues()
      updateFormData(currentValues)
      try {
        await OnboardingService.saveDraft({
          id: id || undefined,
          user_id: userId,
          type: 'company',
          data: { ...formData, ...currentValues },
        })
        setStep(step + 1)
      } catch {
        toast.error('Error guardando borrador')
      }
    }
  }

  const handleDocUpload = async (docKey: keyof CompanyOnboardingValues, file: File) => {
    if (!file) return
    setIsUploading(true)
    try {
      const path = await OnboardingService.uploadDocument(userId, docKey as string, file, true)
      form.setValue(docKey, path)
      updateFormData({ [docKey]: path })

      if (id) {
        await OnboardingService.saveDocumentReference({
          onboarding_id: id,
          user_id: userId,
          doc_type: docKey as string,
          storage_path: path,
          mime_type: file.type,
          file_size: file.size,
        })
      }
      toast.success('Documento subido')
    } catch {
      toast.error('Error subiendo documento')
    } finally {
      setIsUploading(false)
    }
  }

  const handleUBODocUpload = async (index: number, docKey: 'passport' | 'id_front', file: File) => {
    if (!file) return
    setIsUploading(true)
    try {
      const path = await OnboardingService.uploadUBODocument(userId, docKey, index, file, true)

      const currentUbos = form.getValues('ubos') || []
      currentUbos[index] = { ...currentUbos[index], [docKey]: path }
      form.setValue('ubos', currentUbos)

      if (id) {
        await OnboardingService.saveDocumentReference({
          onboarding_id: id,
          user_id: userId,
          doc_type: `ubo_${index}_${docKey}`,
          storage_path: path,
          mime_type: file.type,
          file_size: file.size,
        })
      }
      toast.success('Documento de UBO subido')
    } catch {
      toast.error('Error subiendo documento de UBO')
    } finally {
      setIsUploading(false)
    }
  }

  async function onSubmitStep5(e: React.MouseEvent) {
    e.preventDefault()

    const data = form.getValues()
    if (!data.company_cert || !data.legal_rep_id || !data.proof_of_address) {
      toast.error('Faltan documentos obligatorios')
      return
    }

    try {
      await OnboardingService.submitOnboarding({
        id: id || undefined,
        user_id: userId,
        type: 'company',
        data: { ...formData, ...data },
      })
      toast.success('Datos base enviados. Continua con los UBOs.')
      onStatusChange('submitted')
      setStep(6)
    } catch {
      toast.error('Ocurrio un error al enviar datos de empresa')
    }
  }

  async function onFinalUBOSubmit(data: CompanyOnboardingValues) {
    if (status !== 'submitted' && status !== 'under_review' && status !== 'waiting_ubo_kyc' && status !== 'needs_changes') {
    }

    try {
      await OnboardingService.submitUBODocs({
        id: id || undefined,
        user_id: userId,
        type: 'company',
        data: { ...formData, ...data },
      })
      toast.success('Declaracion UBO enviada con exito')
      onStatusChange('under_review')
      reset()
    } catch {
      toast.error('Error enviando UBOs')
    }
  }

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(onFinalUBOSubmit)}>
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-medium">Informacion de la Empresa</h2>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="company_legal_name" render={({ field }) => (
                <FormItem><FormLabel>Razon Social</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="registration_number" render={({ field }) => (
                <FormItem><FormLabel>Num. Registro</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="tax_id" render={({ field }) => (
                <FormItem><FormLabel>NIT / Tax ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="entity_type" render={({ field }) => (
                <FormItem><FormLabel>Tipo de Entidad</FormLabel><FormControl><Input placeholder="SRL, SA, LLC..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="incorporation_date" render={({ field }) => (
                <FormItem><FormLabel>Fecha de Constitucion</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="country_of_incorporation" render={({ field }) => (
                <FormItem><FormLabel>Pais Const.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="business_description" render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Descripcion Actividad</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="flex justify-end pt-4">
              <Button type="button" onClick={handleNext}>Siguiente</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-medium">Direccion Legal y Representante</h2>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="business_street" render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Calle (Empresa)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="business_city" render={({ field }) => (
                <FormItem><FormLabel>Ciudad</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="business_country" render={({ field }) => (
                <FormItem><FormLabel>Pais</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <h3 className="text-lg font-medium pt-4">Representante Legal</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="legal_rep_first_names" render={({ field }) => (
                <FormItem><FormLabel>Nombres Rep.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="legal_rep_last_names" render={({ field }) => (
                <FormItem><FormLabel>Apellidos Rep.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="legal_rep_position" render={({ field }) => (
                <FormItem><FormLabel>Cargo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="legal_rep_id_number" render={({ field }) => (
                <FormItem><FormLabel>Documento Rep.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>Atras</Button>
              <Button type="button" onClick={handleNext}>Siguiente</Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-medium">Informacion Financiera</h2>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="purpose" render={({ field }) => (
                <FormItem><FormLabel>Proposito de cuenta</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="source_of_funds" render={({ field }) => (
                <FormItem><FormLabel>Origen de fondos</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="estimated_monthly_volume" render={({ field }) => (
                <FormItem><FormLabel>Volumen Estimado (USD)</FormLabel><FormControl><Input min={0} step="0.01" type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>Atras</Button>
              <Button type="button" onClick={handleNext}>Siguiente</Button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <h2 className="text-xl font-medium">Documentos de la Empresa</h2>

            <div className="space-y-4">
              <div className="border p-4 rounded bg-muted/20">
                <FormLabel className="block mb-2">Constitucion / Registro Empresa</FormLabel>
                <Input type="file" accept="image/*,.pdf" onChange={(e) => {
                  if (e.target.files && e.target.files[0]) handleDocUpload('company_cert', e.target.files[0])
                }} />
{form.getValues('company_cert') && <p className="mt-2 text-xs text-emerald-400">Archivo cargado</p>}
              </div>

              <div className="border p-4 rounded bg-muted/20">
                <FormLabel className="block mb-2">Documento Poder (Repr. Legal)</FormLabel>
                <Input type="file" accept="image/*,.pdf" onChange={(e) => {
                  if (e.target.files && e.target.files[0]) handleDocUpload('legal_rep_id', e.target.files[0])
                }} />
{form.getValues('legal_rep_id') && <p className="mt-2 text-xs text-emerald-400">Archivo cargado</p>}
              </div>

              <div className="border p-4 rounded bg-muted/20">
                <FormLabel className="block mb-2">Comprobante Domicilio Fiscal</FormLabel>
                <Input type="file" accept="image/*,.pdf" onChange={(e) => {
                  if (e.target.files && e.target.files[0]) handleDocUpload('proof_of_address', e.target.files[0])
                }} />
{form.getValues('proof_of_address') && <p className="mt-2 text-xs text-emerald-400">Archivo cargado</p>}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>Atras</Button>
              <Button type="button" disabled={isUploading} onClick={onSubmitStep5}>
                Siguiente (UBOs)
              </Button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-medium">Declaracion de Socios (UBO)</h2>
              <Button type="button" variant="outline" onClick={() => append({ first_names: '', last_names: '', percentage: '', nationality: '' })}>+ Agregar UBO</Button>
            </div>
            <p className="text-sm text-muted-foreground">Registre a los beneficiarios finales (&gt; 10% prop., o control directivo).</p>

            {fields.map((field, index) => (
              <div key={field.id} className="border p-4 rounded relative space-y-4">
                <Button type="button" variant="ghost" size="sm" className="absolute top-2 right-2 text-destructive" onClick={() => remove(index)}>Quitar</Button>
                <h4 className="font-semibold">Socio #{index + 1}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name={`ubos.${index}.first_names`} render={({ field }) => (
                    <FormItem><FormLabel>Nombres</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name={`ubos.${index}.last_names`} render={({ field }) => (
                    <FormItem><FormLabel>Apellidos</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name={`ubos.${index}.percentage`} render={({ field }) => (
                    <FormItem><FormLabel>% Propiedad</FormLabel><FormControl><Input max={100} min={0} step="0.01" type="number" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name={`ubos.${index}.nationality`} render={({ field }) => (
                    <FormItem><FormLabel>Nacionalidad</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <FormLabel className="block mb-2 text-xs text-muted-foreground">ID Front / Pasaporte</FormLabel>
                    <Input type="file" accept="image/*,.pdf" onChange={(e) => {
                      if (e.target.files && e.target.files[0]) handleUBODocUpload(index, 'id_front', e.target.files[0])
                    }} />
{form.getValues(`ubos.${index}.id_front`) && <p className="mt-2 text-xs text-emerald-400">Cargado</p>}
                  </div>
                </div>
              </div>
            ))}

            <div className="flex justify-between pt-4 mt-8 border-t">
              <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>Atras</Button>
              <Button type="submit" disabled={isUploading || form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Enviando UBOs...' : 'Finalizar Revision Empresarial'}
              </Button>
            </div>
          </div>
        )}
      </form>
    </Form>
  )
}
