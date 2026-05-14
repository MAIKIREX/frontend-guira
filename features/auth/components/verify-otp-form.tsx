'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { AuthService } from '@/services/auth.service'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/utils'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp'
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react'
import { motion } from 'framer-motion'

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  }),
}

export function VerifyOtpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''

  const [token, setToken] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleVerify() {
    if (token.length !== 8) {
      toast.warning('Por favor ingresa el código completo de 8 dígitos.')
      return
    }
    if (!email) {
      toast.warning('No se encontró el correo electrónico. Intenta registrarte de nuevo.')
      return
    }

    setIsSubmitting(true)
    try {
      await AuthService.verifyOTP({ email, token })
      toast.success('¡Cuenta verificada exitosamente!')
      router.push('/onboarding')
    } catch (error: unknown) {
      toast.error(`Código incorrecto o expirado: ${getErrorMessage(error)}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <motion.div
      className="w-full max-w-[400px] space-y-8"
      initial="hidden"
      animate="show"
    >
      {/* ── Header ── */}
      <motion.div className="space-y-3 text-center" custom={0} variants={fadeUp}>
        {/* Icon container */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Verifica tu cuenta
        </h1>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Hemos enviado un código de 8 dígitos a:
          </p>
          <p className="text-sm font-medium text-foreground">{email}</p>
        </div>
      </motion.div>

      {/* ── OTP Input ── */}
      <motion.div
        className="flex flex-col items-center gap-4"
        custom={1}
        variants={fadeUp}
      >
        <InputOTP
          maxLength={8}
          value={token}
          onChange={setToken}
          onComplete={handleVerify}
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
            <InputOTPSlot index={6} />
            <InputOTPSlot index={7} />
          </InputOTPGroup>
        </InputOTP>

        <p className="text-[11px] text-muted-foreground/60 text-center">
          Ingresa el código que recibiste en tu correo electrónico
        </p>
      </motion.div>

      {/* ── Submit ── */}
      <motion.div custom={2} variants={fadeUp}>
        <Button
          className="w-full h-11 font-medium tracking-wide transition-all active:scale-[0.98] active:-translate-y-[1px]"
          onClick={handleVerify}
          disabled={isSubmitting || token.length !== 8}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verificando...
            </>
          ) : (
            'Verificar código'
          )}
        </Button>
      </motion.div>

      {/* ── Back link ── */}
      <motion.p
        className="text-center text-sm text-muted-foreground"
        custom={3}
        variants={fadeUp}
      >
        <button
          type="button"
          onClick={() => router.push('/registro')}
          className="inline-flex items-center gap-1.5 font-medium text-primary/80 transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver al registro
        </button>
      </motion.p>
    </motion.div>
  )
}
