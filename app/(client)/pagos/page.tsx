'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowRightLeft, PlusCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function PaymentsPage() {
  const searchParams = useSearchParams()
  const action = searchParams.get('action')

  const title =
    action === 'fund'
      ? 'Agregar fondos'
      : action === 'send'
        ? 'Enviar pago'
        : 'Módulo de pagos'

  const description =
    action === 'fund'
      ? 'El dashboard ya dirige aquí con intención de fondeo. La creación completa del flujo vive en el siguiente hito.'
      : action === 'send'
        ? 'El dashboard ya dirige aquí con intención de envío. La creación completa del flujo vive en el siguiente hito.'
        : 'Esta pantalla queda preparada para conectar el formulario operativo de payment_orders.'

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <ActionCard
            href="/pagos?action=send"
            icon={ArrowRightLeft}
            title="Enviar pago"
            description="Preparar un expediente en `payment_orders`."
          />
          <ActionCard
            href="/pagos?action=fund"
            icon={PlusCircle}
            title="Agregar fondos"
            description="Preparar una operación asociada a wallet o bridge."
          />
        </CardContent>
      </Card>
    </div>
  )
}

function ActionCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string
  icon: typeof ArrowRightLeft
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-border/70 p-4 transition-colors hover:bg-muted/40"
    >
      <div className="mb-3 flex items-center gap-2 font-medium">
        <Icon className="size-4" />
        {title}
      </div>
      <p className="mb-4 text-sm text-muted-foreground">{description}</p>
      <span className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
        Seleccionar
      </span>
    </Link>
  )
}
