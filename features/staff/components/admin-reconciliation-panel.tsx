'use client'

import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAdminReconciliation } from '@/features/staff/hooks/use-admin-reconciliation'
import { format } from 'date-fns'

export function AdminReconciliationPanel() {
  const { state, loading, error, reload } = useAdminReconciliation()

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !state) {
    return (
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>Error de Reconciliación</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={reload}>Reintentar</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Reconciliación Financiera</h1>
          <p className="text-sm text-muted-foreground">Reportes EOD de liquidez cruzada entre rieles y bóvedas (Aún no implementado).</p>
        </div>
        <Button variant="outline" onClick={reload}>Actualizar</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Auditoría de Activos (Placeholder)</CardTitle>
          <CardDescription>Esta vista consolidará los balances PSAV frente a saldos interbancarios.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border p-8 text-center text-muted-foreground">
            {state.reports.length === 0 ? 'Sin recortes reportados.' : 'Mostrando reportes...'}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
