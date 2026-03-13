'use client'

'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supportSchema, type SupportValues } from '../schemas/support.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useAuthStore } from '@/stores/auth-store'
import { SupportService } from '@/services/support.service'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function SupportForm({ onSuccess }: { onSuccess?: () => void }) {
  const { user } = useAuthStore()
  const form = useForm<SupportValues>({
    resolver: zodResolver(supportSchema),
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
        user_id: user.id,
        ...data,
        contact_phone: data.contact_phone || ''
      })
      toast.success('Ticket creado con éxito. Te contactaremos pronto.')
      form.reset()
      if (onSuccess) onSuccess()
    } catch {
      toast.error('No se pudo crear el ticket. Intenta de nuevo.')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Abrir Ticket de Soporte</CardTitle>
        <CardDescription>¿Tienes dudas o enfrentas un problema? Estamos para ayudarte.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField control={form.control} name="subject" render={({ field }) => (
                <FormItem><FormLabel>Asunto</FormLabel><FormControl>
                  <Input placeholder="Ej. Problema con Onboarding" {...field} />
                </FormControl><FormMessage /></FormItem>
              )} />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="contact_email" render={({ field }) => (
                  <FormItem><FormLabel>Email de Contacto</FormLabel><FormControl>
                    <Input type="email" {...field} />
                  </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="contact_phone" render={({ field }) => (
                  <FormItem><FormLabel>Teléfono Alternativo (Opcional)</FormLabel><FormControl>
                    <Input {...field} />
                  </FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <FormField control={form.control} name="message" render={({ field }) => (
                <FormItem><FormLabel>Descripción</FormLabel><FormControl>
                  <Textarea placeholder="Indícanos los detalles exactos del problema..." className="min-h-[120px]" {...field} />
                </FormControl><FormMessage /></FormItem>
              )} />
              
              <div className="flex justify-end pt-2">
                 <Button type="submit" disabled={form.formState.isSubmitting}>
                   {form.formState.isSubmitting ? 'Enviando...' : 'Enviar Ticket'}
                 </Button>
              </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
