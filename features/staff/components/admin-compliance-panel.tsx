'use client'

import { Loader2, ShieldAlert, CheckCircle, XCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAdminCompliance } from '@/features/staff/hooks/use-admin-compliance'
import { toast } from 'sonner'

export function AdminCompliancePanel() {
  const { state, loading, error, reload, approveReview, rejectReview } = useAdminCompliance()

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
          <CardTitle>Error de Compliance</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={reload}>Reintentar</Button>
        </CardContent>
      </Card>
    )
  }

  const handleApprove = async (id: string) => {
    if (!confirm('¿Aprobar esta verificación?')) return
    try {
      await approveReview(id, 'Validado manualmente por admin.')
      toast.success('Verificación aprobada.')
    } catch (err: any) {
      toast.error(err.message ?? 'Error inesperado al aprobar.')
    }
  }

  const handleReject = async (id: string) => {
    const reason = prompt('Motivo del rechazo (se mostrará al cliente):')
    if (!reason) return
    try {
      await rejectReview(id, reason)
      toast.success('Verificación rechazada.')
    } catch (err: any) {
      toast.error(err.message ?? 'Error inesperado al rechazar.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Compliance & Identidad</h1>
          <p className="text-sm text-muted-foreground">Revisiones manuales KYC y KYB requeridas.</p>
        </div>
        <Button variant="outline" onClick={reload}>Actualizar</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>KYB Pendientes</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{state.stats.pendingKybs}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>KYC Pendientes</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{state.stats.pendingKycs}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cola de Revisión</CardTitle>
          <CardDescription>Clientes que han completado el envío de documentos y esperan validación.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            {state.reviews.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No hay revisiones en la cola.</div>
            ) : (
              <ul className="divide-y">
                {state.reviews.map((r) => (
                  <li key={r.id} className="grid grid-cols-5 p-4 items-center">
                    <div className="col-span-1">
                      <span className="font-semibold uppercase">{r.type}</span>
                    </div>
                    <div className="col-span-1 text-sm text-muted-foreground">
                      ID: {r.id.slice(0, 8)}
                    </div>
                    <div className="col-span-1">
                      <span className={`text-xs px-2 py-1 uppercase rounded-full ${r.status === 'under_review' ? 'bg-amber-500/20 text-amber-600' : 'bg-muted'}`}>
                        {r.status}
                      </span>
                    </div>
                    <div className="col-span-2 flex justify-end gap-2">
                      {r.status === 'under_review' && (
                        <>
                          <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleApprove(r.id)}>
                            <CheckCircle className="mr-2 size-4" /> Aprobar
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleReject(r.id)}>
                            <XCircle className="mr-2 size-4" /> Rechazar
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
