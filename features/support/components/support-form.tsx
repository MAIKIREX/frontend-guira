'use client'

import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supportSchema, type SupportValues } from '../schemas/support.schema'
import { GuiraButton } from '@/components/shared/guira-button'
import { Send } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useAuthStore } from '@/stores/auth-store'
import { SupportService } from '@/services/support.service'
import { toast } from 'sonner'

export function SupportForm({ onSuccess }: { onSuccess?: () => void }) {
  const { user } = useAuthStore()
  const form = useForm<SupportValues>({
    resolver: zodResolver(supportSchema) as unknown as Resolver<SupportValues>,
    defaultValues: {
      subject: '',
      message: '',
      contact_email: user?.email || '',
      contact_phone: '',
    }
  })

  async function onSubmit(data: SupportValues) {
    if (!user) return
    try {
      await SupportService.createTicket({
        subject: data.subject,
        description: `${data.message}\n\n[Contact Email: ${data.contact_email}]\n[Contact Phone: ${data.contact_phone || 'N/A'}]`
      })
      toast.success('Ticket creado con éxito. Te contactaremos pronto.')
      form.reset()
      if (onSuccess) onSuccess()
    } catch {
      toast.error('No se pudo crear el ticket. Intenta de nuevo.')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Abrir Ticket de Soporte
        </h2>
        <p className="text-sm text-muted-foreground mt-1.5">
          ¿Tienes dudas o enfrentas un problema? Estamos para ayudarte.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField control={form.control} name="subject" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-muted-foreground">Asunto</FormLabel>
              <FormControl>
                <Input placeholder="Ej. Problema con Onboarding" className="bg-muted/30" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField control={form.control} name="contact_email" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-muted-foreground">Email de Contacto</FormLabel>
              <FormControl>
                <Input type="email" className="bg-muted/30" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="contact_phone" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-muted-foreground">Teléfono Alternativo (Opcional)</FormLabel>
              <FormControl>
                <Input className="bg-muted/30" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="message" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-muted-foreground">Descripción</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Indícanos los detalles exactos del problema..." 
                  className="min-h-[140px] resize-none bg-muted/30" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <div className="pt-2">
            <GuiraButton type="submit" iconEnd={Send} className="w-full sm:w-auto" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Enviando...' : 'Enviar Ticket'}
            </GuiraButton>
          </div>
        </form>
      </Form>
    </div>
  )
}
