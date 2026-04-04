'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { AuthService } from '@/services/auth.service'
import { toast } from 'sonner'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp'

export function VerifyOtpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''

  const [token, setToken] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleVerify() {
    if (token.length !== 8) {
      toast.error('Por favor ingresa el código completo de 8 dígitos.')
      return
    }
    if (!email) {
      toast.error('No se encontró el correo electrónico. Intenta registrarte de nuevo.')
      return
    }

    setIsSubmitting(true)
    try {
      await AuthService.verifyOTP({ email, token })
      toast.success('¡Cuenta verificada exitosamente!')
      router.push('/onboarding')
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message || 'Código incorrecto o expirado.')
      } else {
        toast.error('Código incorrecto o expirado.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Verifica tu cuenta</h1>
        <p className="text-muted-foreground text-sm">
          Hemos enviado un código de 8 dígitos a:
        </p>
        <p className="font-medium text-foreground text-sm">{email}</p>
      </div>

      <div className="flex flex-col items-center gap-4">
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

        <p className="text-xs text-muted-foreground text-center">
          Ingresa el código que recibiste en tu correo electrónico
        </p>
      </div>

      <Button
        className="w-full"
        onClick={handleVerify}
        disabled={isSubmitting || token.length !== 8}
      >
        {isSubmitting ? 'Verificando...' : 'Verificar código'}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        ¿No recibiste el código?{' '}
        <button
          type="button"
          onClick={() => router.push('/registro')}
          className="text-primary hover:underline"
        >
          Volver al registro
        </button>
      </p>
    </div>
  )
}
