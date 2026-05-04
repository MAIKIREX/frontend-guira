'use client'

import { SupportForm } from '@/features/support/components/support-form'
import { SupportList } from '@/features/support/components/support-list'

export default function SupportPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl sm:text-[3rem] sm:leading-[1.1] font-extrabold tracking-tight text-foreground">
          Centro de Soporte
        </h1>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <SupportForm />
        </div>
        <div className="lg:col-span-2 border-t pt-8 lg:border-t-0 lg:pt-0 lg:border-l lg:border-border/40 lg:pl-8">
          <SupportList />
        </div>
      </div>
    </div>
  )
}
