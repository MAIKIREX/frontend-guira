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
import { ArrowLeft, Loader2, Mail, Send } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  }),
}

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

  return (
    <div className="w-full max-w-[400px]">
      <AnimatePresence mode="wait">
        {sent ? (
          <motion.div
            key="sent"
            className="space-y-6 text-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] as const }}
          >
            {/* Success icon */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10">
              <Mail className="h-7 w-7 text-success" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Revisa tu correo
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground max-w-[320px] mx-auto">
                Te hemos enviado un enlace para que puedas recuperar tu contraseña de forma segura.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary/80 transition-colors hover:text-primary"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Volver al inicio de sesión
              </Link>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            className="space-y-8"
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: -16 }}
          >
            {/* ── Header ── */}
            <motion.div className="space-y-2" custom={0} variants={fadeUp}>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Recuperar Acceso
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Ingresa tu correo para recibir un enlace de recuperación
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
                  <Button
                    type="submit"
                    className="relative w-full h-11 font-medium tracking-wide transition-all active:scale-[0.98] active:-translate-y-[1px]"
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Enviar enlace
                      </>
                    )}
                  </Button>
                </motion.div>
              </form>
            </Form>

            {/* ── Back link ── */}
            <motion.p
              className="text-center text-sm text-muted-foreground"
              custom={3}
              variants={fadeUp}
            >
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 font-medium text-primary/80 transition-colors hover:text-primary"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Volver al inicio
              </Link>
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
