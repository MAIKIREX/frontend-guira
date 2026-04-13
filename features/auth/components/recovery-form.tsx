'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { recoverySchema, type RecoveryFormValues } from '../schemas/recovery.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { AuthService } from '@/services/auth.service'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/utils'
import Link from 'next/link'
import { useState } from 'react'

export function RecoveryForm() {
  const [sent, setSent] = useState(false)
  
  const form = useForm<RecoveryFormValues>({
    resolver: zodResolver(recoverySchema),
    defaultValues: { email: '' },
  })

  async function onSubmit(data: RecoveryFormValues) {
    try {
      await AuthService.recoverPassword(data.email)
      setSent(true)
      toast.success('Correo de recuperación enviado')
    } catch (error: unknown) {
      toast.error(`Ocurrió un error: ${getErrorMessage(error)}`)
    }
  }

  if (sent) {
    return (
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-bold">Revisa tu correo</h1>
        <p className="text-muted-foreground">
          Te hemos enviado un enlace para que puedas recuperar tu contraseña.
        </p>
        <div className="pt-4">
          <Link href="/login" className="text-primary hover:underline">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Recuperar Acceso</h1>
        <p className="text-muted-foreground">Ingresa tu correo para recibir un enlace temporal</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Correo electrónico</FormLabel>
                <FormControl>
                  <Input placeholder="usuario@ejemplo.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Enviando...' : 'Recuperar contraseña'}
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-primary hover:underline">
          Volver al inicio
        </Link>
      </p>
    </div>
  )
}
