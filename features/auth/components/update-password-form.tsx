'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updatePasswordSchema, type UpdatePasswordFormValues } from '../schemas/update-password.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { AuthService } from '@/services/auth.service'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function UpdatePasswordForm() {
  const router = useRouter()
  
  const form = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { password: '' },
  })

  async function onSubmit(data: UpdatePasswordFormValues) {
    try {
      await AuthService.updatePassword(data.password)
      toast.success('Contraseña actualizada. Ya puedes ingresar al sistema.')
      router.push('/login')
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message || 'Error al actualizar')
      } else {
        toast.error('Error al actualizar')
      }
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Nueva contraseña</h1>
        <p className="text-muted-foreground">Escribe tu nueva contraseña para este correo</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contraseña</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Guardando...' : 'Cambiar Contraseña'}
          </Button>
        </form>
      </Form>
    </div>
  )
}
