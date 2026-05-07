'use client'

import { GuiraLoadingInline } from '@/components/shared/guira-loading'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAdminBridgePayouts } from '@/features/staff/hooks/use-admin-bridge-payouts'
import { format } from 'date-fns'

export function AdminBridgePanel() {
  const { state, loading, error, reload } = useAdminBridgePayouts()

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <GuiraLoadingInline />
      </div>
    )
  }

  if (error || !state) {
    return (
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>Error de Bridge</CardTitle>
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
          <h1 className="text-2xl font-semibold tracking-tight">Bridge Payouts</h1>
          <p className="text-sm text-muted-foreground">Monitor global de retiros internacionales (SEPA, ACH).</p>
        </div>
        <Button variant="outline" onClick={reload}>Actualizar</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Payouts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            {state.payouts.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No hay payouts registrados.</div>
            ) : (
              <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">ID Payout</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Developer (User)</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Monto</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Estado</th>
                      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Creado</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {state.payouts.map(p => (
                      <tr key={p.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <td className="p-4 align-middle font-mono text-xs">{p.id.slice(0, 8)}</td>
                        <td className="p-4 align-middle text-xs break-all">{p.user_id}</td>
                        <td className="p-4 align-middle font-mono">{p.amount} {p.currency}</td>
                        <td className="p-4 align-middle">
                          <span className="text-[10px] px-2 py-0.5 rounded-full uppercase bg-primary/10 text-primary font-bold tracking-wider">
                            {p.status}
                          </span>
                        </td>
                        <td className="p-4 align-middle text-right text-muted-foreground">
                          {format(new Date(p.created_at), 'dd/MM/yyyy HH:mm')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
