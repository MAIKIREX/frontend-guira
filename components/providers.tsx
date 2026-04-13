'use client'

import * as React from 'react'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import { AuthGuard } from '@/components/shared/auth-guard'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <AuthGuard>
        {children}
      </AuthGuard>
      <Toaster
        position="top-right"
        toastOptions={{
          classNames: {
            toast: 'bg-background border border-border text-foreground font-sans rounded-xl shadow-lg',
            title: 'font-semibold',
            description: 'text-muted-foreground',
            success: 'bg-success/10 border-success/20 text-success [&>svg]:text-success',
            error: 'bg-destructive/10 border-destructive/20 text-destructive [&>svg]:text-destructive',
            warning: 'bg-warning/10 border-warning/20 text-warning [&>svg]:text-warning',
            info: 'bg-primary/10 border-primary/20 text-primary [&>svg]:text-primary',
          }
        }}
      />
    </ThemeProvider>
  )
}
