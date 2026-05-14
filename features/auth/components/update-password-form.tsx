'use client'

import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updatePasswordSchema, type UpdatePasswordFormValues } from '../schemas/update-password.schema'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/ui/password-input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { AuthService } from '@/services/auth.service'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { Loader2, ShieldCheck } from 'lucide-react'
import { motion } from 'framer-motion'

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  }),
}

export function UpdatePasswordForm() {
  const router = useRouter()

  const form = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(updatePasswordSchema) as unknown as Resolver<UpdatePasswordFormValues>,
    defaultValues: { password: '' },
  })

  async function onSubmit(data: UpdatePasswordFormValues) {
    try {
      await AuthService.updatePassword(data.password)
      toast.success('Contraseña actualizada. Ya puedes ingresar al sistema.')
      router.push('/login')
    } catch (error: unknown) {
      toast.error(`Error al actualizar: ${getErrorMessage(error)}`)
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
          Nueva contraseña
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Establece una nueva contraseña segura para tu cuenta
        </p>
      </motion.div>

      {/* ── Form ── */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <motion.div custom={1} variants={fadeUp}>
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Nueva contraseña
                  </FormLabel>
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

          <motion.div custom={2} variants={fadeUp}>
            <Button
              type="submit"
              className="relative w-full h-11 font-medium tracking-wide transition-all active:scale-[0.98] active:-translate-y-[1px]"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Actualizar Contraseña
                </>
              )}
            </Button>
          </motion.div>
        </form>
      </Form>
    </motion.div>
  )
}
