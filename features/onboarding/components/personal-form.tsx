'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { personalOnboardingSchema, type PersonalOnboardingValues } from '../schemas/personal-onboarding.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useOnboardingStore } from '@/stores/onboarding-store'
import { OnboardingService } from '@/services/onboarding.service'
import { toast } from 'sonner'
import { useState } from 'react'

export function PersonalForm({ userId }: { status: string | null; userId: string }) {
  const { step, setStep, formData, updateFormData, id } = useOnboardingStore()
  const [isUploading, setIsUploading] = useState(false)

  const form = useForm<PersonalOnboardingValues>({
    resolver: zodResolver(personalOnboardingSchema),
    defaultValues: {
      first_names: (formData.first_names as string) || '',
      last_names: (formData.last_names as string) || '',
      dob: (formData.dob as string) || '',
      nationality: (formData.nationality as string) || '',
      occupation: (formData.occupation as string) || '',
      purpose: (formData.purpose as string) || '',
      source_of_funds: (formData.source_of_funds as string) || '',
      estimated_monthly_volume: (formData.estimated_monthly_volume as string) || '',
      street: (formData.street as string) || '',
      city: (formData.city as string) || '',
      state_province: (formData.state_province as string) || '',
      country: (formData.country as string) || '',
      id_number: (formData.id_number as string) || '',
      id_expiry: (formData.id_expiry as string) || '',
      id_document_type: (formData.id_document_type as string) || 'CI',
    },
  })

  // Listen to step changes to sync form -> store
  const handleNext = async () => {
    // Validate current step
    let isValid = false
    if (step === 2) {
      isValid = await form.trigger(['first_names', 'last_names', 'dob', 'nationality', 'id_document_type', 'id_number', 'id_expiry'])
    } else if (step === 3) {
      isValid = await form.trigger(['street', 'city', 'country', 'state_province'])
    } else if (step === 4) {
      isValid = await form.trigger(['occupation', 'purpose', 'source_of_funds', 'estimated_monthly_volume'])
    }

    if (isValid) {
      const currentValues = form.getValues()
      updateFormData(currentValues)
      // trigger save draft
      try {
        await OnboardingService.saveDraft({
          id: id || undefined,
          user_id: userId,
          type: 'personal',
          data: { ...formData, ...currentValues }
        })
        setStep(step + 1)
      } catch {
        toast.error('Error guardando borrador')
      }
    }
  }

  const handleDocUpload = async (docKey: keyof PersonalOnboardingValues, file: File) => {
    if (!file) return
    setIsUploading(true)
    try {
      const path = await OnboardingService.uploadDocument(userId, docKey as string, file, true)
      form.setValue(docKey, path)
      updateFormData({ [docKey]: path })
      
      // Assume onboarding_id exists now because we saved draft on step transitions. If not, save draft first.
      if (id) {
        await OnboardingService.saveDocumentReference({
           onboarding_id: id,
           user_id: userId,
           doc_type: docKey as string,
           storage_path: path,
           mime_type: file.type,
           file_size: file.size
        })
      }
      toast.success('Documento subido')
    } catch {
      toast.error('Error subiendo documento')
    } finally {
      setIsUploading(false)
    }
  }

  async function onSubmit(data: PersonalOnboardingValues) {
    if (!data.id_front || !data.id_back || !data.selfie || !data.proof_of_address) {
       toast.error('Faltan documentos por subir')
       return
    }

    try {
      await OnboardingService.submitOnboarding({
        id: id || undefined,
        user_id: userId,
        type: 'personal',
        data: { ...formData, ...data }
      })
      toast.success('Onboarding enviado con éxito')
      setTimeout(() => window.location.reload(), 1000)
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message || 'Ocurrió un error al enviar')
      } else {
         toast.error('Ocurrió un error al enviar')
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-medium">Información Personal</h2>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="first_names" render={({ field }) => (
                <FormItem><FormLabel>Nombres</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="last_names" render={({ field }) => (
                <FormItem><FormLabel>Apellidos</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="dob" render={({ field }) => (
                <FormItem><FormLabel>Fecha de nacimiento</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="nationality" render={({ field }) => (
                <FormItem><FormLabel>Nacionalidad</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
               <FormField control={form.control} name="id_document_type" render={({ field }) => (
                <FormItem><FormLabel>Tipo de Documento</FormLabel><FormControl>
                  <Input placeholder="CI / Pasaporte" {...field} />
                </FormControl><FormMessage /></FormItem>
              )} />
               <FormField control={form.control} name="id_number" render={({ field }) => (
                <FormItem><FormLabel>Nro Documento</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
               <FormField control={form.control} name="id_expiry" render={({ field }) => (
                <FormItem><FormLabel>Vencimiento Doc.</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="flex justify-end pt-4">
              <Button type="button" onClick={handleNext}>Siguiente</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-medium">Dirección</h2>
            <div className="grid grid-cols-2 gap-4">
               <FormField control={form.control} name="street" render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Calle y Número</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem><FormLabel>Ciudad</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
               <FormField control={form.control} name="state_province" render={({ field }) => (
                <FormItem><FormLabel>Estado / Provincia</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
               <FormField control={form.control} name="country" render={({ field }) => (
                <FormItem><FormLabel>País</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>Atrás</Button>
              <Button type="button" onClick={handleNext}>Siguiente</Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-medium">Información Financiera</h2>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="occupation" render={({ field }) => (
                <FormItem><FormLabel>Ocupación</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
               <FormField control={form.control} name="purpose" render={({ field }) => (
                <FormItem><FormLabel>Propósito de la cuenta</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
               <FormField control={form.control} name="source_of_funds" render={({ field }) => (
                <FormItem><FormLabel>Origen de fondos</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="estimated_monthly_volume" render={({ field }) => (
                <FormItem><FormLabel>Vol. Mensual Est. (USD)</FormLabel><FormControl><Input min={0} step="0.01" type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>Atrás</Button>
              <Button type="button" onClick={handleNext}>Siguiente</Button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <h2 className="text-xl font-medium">Documentos</h2>
            <p className="text-sm text-muted-foreground">Sube tus documentos legibles para acelerar la verificación.</p>
            
            <div className="space-y-4">
              <div className="border p-4 rounded bg-muted/20">
                <FormLabel className="block mb-2">Documento de Identidad (Frente)</FormLabel>
                <Input type="file" accept="image/*,.pdf" onChange={(e) => {
                  if (e.target.files && e.target.files[0]) handleDocUpload('id_front', e.target.files[0])
                }} />
                {form.getValues('id_front') && <p className="text-xs text-green-600 mt-2">✓ Archivo cargado ({String(form.getValues('id_front'))})</p>}
              </div>

               <div className="border p-4 rounded bg-muted/20">
                <FormLabel className="block mb-2">Documento de Identidad (Reverso)</FormLabel>
                <Input type="file" accept="image/*,.pdf" onChange={(e) => {
                  if (e.target.files && e.target.files[0]) handleDocUpload('id_back', e.target.files[0])
                }} />
                 {form.getValues('id_back') && <p className="text-xs text-green-600 mt-2">✓ Archivo cargado ({String(form.getValues('id_back'))})</p>}
              </div>

               <div className="border p-4 rounded bg-muted/20">
                <FormLabel className="block mb-2">Selfie Sosteniendo el Documento</FormLabel>
                <Input type="file" accept="image/*" onChange={(e) => {
                  if (e.target.files && e.target.files[0]) handleDocUpload('selfie', e.target.files[0])
                }} />
                 {form.getValues('selfie') && <p className="text-xs text-green-600 mt-2">✓ Archivo cargado ({String(form.getValues('selfie'))})</p>}
              </div>

               <div className="border p-4 rounded bg-muted/20">
                <FormLabel className="block mb-2">Comprobante de Domicilio</FormLabel>
                <Input type="file" accept="image/*,.pdf" onChange={(e) => {
                  if (e.target.files && e.target.files[0]) handleDocUpload('proof_of_address', e.target.files[0])
                }} />
                 {form.getValues('proof_of_address') && <p className="text-xs text-green-600 mt-2">✓ Archivo cargado ({String(form.getValues('proof_of_address'))})</p>}
              </div>
            </div>

            <div className="flex justify-between pt-4">
               <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>Atrás</Button>
               <Button type="submit" disabled={isUploading || form.formState.isSubmitting}>
                 {form.formState.isSubmitting ? 'Enviando...' : 'Finalizar Envío'}
               </Button>
            </div>
          </div>
        )}
      </form>
    </Form>
  )
}
