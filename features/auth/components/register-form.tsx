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
import { Check, X, Loader2, UserPlus } from 'lucide-react'
import { cn, getErrorMessage } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  }),
}

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

  const strengthPct = passwordRequirements.filter((r) => r.met).length / passwordRequirements.length

  async function onSubmit(data: RegisterFormValues) {
    try {
      await AuthService.signup(data)
      toast.success('Cuenta creada. Revisa tu correo electrónico.')
      router.push(`/registro/verificar?email=${encodeURIComponent(data.email)}`)
    } catch (error: unknown) {
      toast.error(`Error al intentar registrar: ${getErrorMessage(error)}`)
    }
  }

  return (
    <motion.div
      className="w-full max-w-[400px] space-y-8"
      initial="hidden"
      animate="show"
    >
      {/* ── Header ── */}
      <motion.div className="space-y-2" custom={0} variants={fadeUp}>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Crear Cuenta
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Completa tus datos para comenzar a operar en la plataforma
        </p>
      </motion.div>

      {/* ── Form ── */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <motion.div custom={1} variants={fadeUp}>
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Nombre completo
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Tu nombre..."
                      className="h-11 bg-secondary/40 border-border/50 transition-colors focus:bg-background focus:border-primary/40"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </motion.div>

          <motion.div custom={2} variants={fadeUp}>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Correo electrónico
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="usuario@ejemplo.com"
                      className="h-11 bg-secondary/40 border-border/50 transition-colors focus:bg-background focus:border-primary/40"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </motion.div>

          <motion.div custom={3} variants={fadeUp}>
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Contraseña
                  </FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder="••••••••"
                      className="h-11 bg-secondary/40 border-border/50 transition-colors focus:bg-background focus:border-primary/40"
                      {...field}
                    />
                  </FormControl>

                  {/* ── Strength bar ── */}
                  {password.length > 0 && (
                    <div className="mt-3 space-y-2.5">
                      <div className="h-1 w-full overflow-hidden rounded-full bg-border/40">
                        <motion.div
                          className={cn(
                            'h-full rounded-full transition-colors',
                            strengthPct < 0.4
                              ? 'bg-destructive'
                              : strengthPct < 0.8
                                ? 'bg-warning'
                                : 'bg-success',
                          )}
                          initial={{ width: 0 }}
                          animate={{ width: `${strengthPct * 100}%` }}
                          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-1">
                        {passwordRequirements.map((req, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-[11px]"
                          >
                            {req.met ? (
                              <Check className="h-3 w-3 text-success" />
                            ) : (
                              <X className="h-3 w-3 text-muted-foreground/50" />
                            )}
                            <span
                              className={cn(
                                'transition-colors',
                                req.met
                                  ? 'text-success'
                                  : 'text-muted-foreground/60',
                              )}
                            >
                              {req.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <FormMessage />
                </FormItem>
              )}
            />
          </motion.div>

          <motion.div custom={4} variants={fadeUp}>
            <FormField
              control={form.control}
              name="acceptTerms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start gap-3 rounded-lg border border-border/30 bg-secondary/20 px-4 py-3">
                  <FormControl>
                    <Checkbox
                      checked={Boolean(field.value)}
                      onCheckedChange={field.onChange}
                      className="mt-0.5"
                    />
                  </FormControl>
                  <div className="space-y-0.5 leading-none">
                    <FormLabel className="text-[13px] font-normal text-foreground/80 cursor-pointer">
                      Acepto los términos y condiciones de la plataforma
                    </FormLabel>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </motion.div>

          <motion.div custom={5} variants={fadeUp}>
            <Button
              type="submit"
              className="relative w-full h-11 font-medium tracking-wide transition-all active:scale-[0.98] active:-translate-y-[1px]"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Crear cuenta
                </>
              )}
            </Button>
          </motion.div>
        </form>
      </Form>

      {/* ── Login link ── */}
      <motion.p
        className="text-center text-sm text-muted-foreground"
        custom={6}
        variants={fadeUp}
      >
        ¿Ya tienes una cuenta?{' '}
        <Link
          href="/login"
          className="font-medium text-primary/80 transition-colors hover:text-primary"
        >
          Iniciar Sesión
        </Link>
      </motion.p>
    </motion.div>
  )
}
