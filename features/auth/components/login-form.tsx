'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginFormValues } from '../schemas/login.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { AuthService } from '@/services/auth.service'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/utils'
import Link from 'next/link'
import { Loader2, LogIn } from 'lucide-react'
import { motion } from 'framer-motion'

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  }),
}

export function LoginForm() {
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(data: LoginFormValues) {
    try {
      await AuthService.login(data)
      toast.success('Sesión iniciada')
      // El AuthGuard redigirá al lugar correspondiente
    } catch (error: unknown) {
      toast.error(`Error al iniciar sesión: ${getErrorMessage(error)}`)
    }
  }

  async function onGoogleLogin() {
    try {
      await AuthService.loginWithGoogle()
    } catch (error: unknown) {
      toast.error(`Error con Google: ${getErrorMessage(error)}`)
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
          Iniciar Sesión
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Ingresa tus credenciales para acceder a tu cuenta
        </p>
      </motion.div>

      {/* ── Form ── */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <motion.div custom={1} variants={fadeUp}>
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

          <motion.div custom={2} variants={fadeUp}>
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Contraseña
                    </FormLabel>
                    <Link
                      href="/recuperar"
                      className="text-xs font-medium text-primary/80 transition-colors hover:text-primary"
                    >
                      Recuperar acceso
                    </Link>
                  </div>
                  <FormControl>
                    <PasswordInput
                      placeholder="••••••••"
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
            <Button
              type="submit"
              className="relative w-full h-11 font-medium tracking-wide transition-all active:scale-[0.98] active:-translate-y-[1px]"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Acceder
                </>
              )}
            </Button>
          </motion.div>
        </form>
      </Form>

      {/* ── Divider ── */}
      <motion.div className="relative" custom={4} variants={fadeUp}>
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/40" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-4 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">
            o continúa con
          </span>
        </div>
      </motion.div>

      {/* ── Google button ── */}
      <motion.div custom={5} variants={fadeUp}>
        <Button
          variant="outline"
          type="button"
          className="w-full h-11 gap-3 font-medium border-border/50 bg-secondary/20 transition-all hover:bg-secondary/60 active:scale-[0.98] active:-translate-y-[1px]"
          onClick={onGoogleLogin}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Google
        </Button>
      </motion.div>

      {/* ── Register link ── */}
      <motion.p
        className="text-center text-sm text-muted-foreground"
        custom={6}
        variants={fadeUp}
      >
        ¿No tienes una cuenta?{' '}
        <Link
          href="/registro"
          className="font-medium text-primary/80 transition-colors hover:text-primary"
        >
          Crear cuenta
        </Link>
      </motion.p>
    </motion.div>
  )
}
