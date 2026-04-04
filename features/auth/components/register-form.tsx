'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema, type RegisterFormValues } from '../schemas/register.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Checkbox } from '@/components/ui/checkbox'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { AuthService } from '@/services/auth.service'
import { toast } from 'sonner'
import Link from 'next/link'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

export function RegisterForm() {
  const router = useRouter()
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '', acceptTerms: true },
  })

  const password = form.watch('password') || ''

  const passwordRequirements = [
    { label: 'Al menos 12 caracteres', met: password.length >= 12 },
    { label: 'Al menos una minúscula (a-z)', met: /[a-z]/.test(password) },
    { label: 'Al menos una mayúscula (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'Al menos un número (0-9)', met: /[0-9]/.test(password) },
    { label: 'Un carácter especial (!, @, #, $, etc.)', met: /[^A-Za-z0-9]/.test(password) },
  ]

  async function onSubmit(data: RegisterFormValues) {
    try {
      await AuthService.signup(data)
      toast.success('Cuenta creada. Revisa tu correo electrónico.')
      router.push(`/registro/verificar?email=${encodeURIComponent(data.email)}`)
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message || 'Error al intentar registrar')
      } else {
        toast.error('Error al intentar registrar')
      }
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Registrarse</h1>
        <p className="text-muted-foreground">Crea tu cuenta para comenzar a operar</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre completo</FormLabel>
                <FormControl>
                  <Input placeholder="Tu nombre..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contraseña</FormLabel>
                <FormControl>
                  <PasswordInput placeholder="••••••••" {...field} />
                </FormControl>
                <div className="flex flex-col gap-1.5 mt-2">
                  {passwordRequirements.map((req, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      {req.met ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className={cn(req.met ? "text-green-500" : "text-muted-foreground")}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="acceptTerms"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-4">
                <FormControl>
                  <Checkbox
                    checked={Boolean(field.value)}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Acepto los términos y condiciones de la plataforma
                  </FormLabel>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Registrando...' : 'Crear cuenta'}
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes una cuenta?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Inicia Sesión
        </Link>
      </p>
    </div>
  )
}
