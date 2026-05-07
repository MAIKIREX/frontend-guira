'use client'

import { ShieldCheck, FileCheck, CircleAlert } from 'lucide-react'
import { GuiraLoadingInline } from '@/components/shared/guira-loading'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useCompliance } from '@/features/onboarding/hooks/use-compliance'

export function ComplianceDashboard() {
  const { state, loading, error, isApproved, isPending } = useCompliance()

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <GuiraLoadingInline />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>Error cargando estado de compliance</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6 lg:px-12 xl:px-32">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Compliance & Identidad</h1>
        <p className="text-muted-foreground">Revisa el estado de tus verificaciones KYC y KYB.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              Estado KYC
            </CardTitle>
          </CardHeader>
          <CardContent>
            {state.kyc ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estado:</span>
                  <span className="font-medium uppercase">{state.kyc.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID Verificación:</span>
                  <span className="font-mono text-xs">{state.kyc.bridge_kyc_id ?? 'No asignado'}</span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No tienes proceso KYC iniciado.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="size-5 text-primary" />
              Estado KYB
            </CardTitle>
          </CardHeader>
          <CardContent>
            {state.kyb ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estado:</span>
                  <span className="font-medium uppercase">{state.kyb.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Compañía:</span>
                  <span className="font-medium">{state.kyb.business_name}</span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No tienes proceso KYB iniciado.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Documentos Subidos</CardTitle>
          <CardDescription>Documentación enviada para revisión.</CardDescription>
        </CardHeader>
        <CardContent>
          {state.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay documentos cargados.</p>
          ) : (
            <ul className="space-y-2">
              {state.documents.map(doc => (
                <li key={doc.id} className="flex items-center justify-between rounded-lg border p-3">
                  <span className="font-medium">{doc.document_type}</span>
                  <span className="text-xs text-muted-foreground uppercase">{doc.status}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
