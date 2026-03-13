'use client'

import { SupportForm } from '@/features/support/components/support-form'
import { SupportList } from '@/features/support/components/support-list'

export default function SupportPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <SupportForm />
        </div>
        <div className="lg:col-span-2">
          <SupportList />
        </div>
      </div>
    </div>
  )
}
