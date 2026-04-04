import { VerifyOtpForm } from '@/features/auth/components/verify-otp-form'
import { Suspense } from 'react'

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8">Cargando...</div>}>
      <VerifyOtpForm />
    </Suspense>
  )
}
