'use client'

import { Loader2, Landmark, RefreshCw, Wallet } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useBridge } from '@/features/payments/hooks/use-bridge'

export function BridgeDashboard() {
  const { state, loading, error, reload } = useBridge()

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>Error cargando Bridge</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={reload} type="button">Reintentar</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 lg:px-12 xl:px-32">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Cuentas Internacionales</h1>
          <p className="text-muted-foreground">Gestiona tus cuentas externas (ACH, SEPA) apoyadas por Bridge.</p>
        </div>
        <Button variant="outline" onClick={reload}>
          <RefreshCw className="mr-2 size-4" /> Actualizar
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="size-5 text-primary" />
              Cuentas Externas Vinculadas
            </CardTitle>
            <CardDescription>Cuentas bancarias fiat para liquidación.</CardDescription>
          </CardHeader>
          <CardContent>
            {state.externalAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tienes cuentas externas vinculadas.</p>
            ) : (
              <ul className="space-y-3">
                {state.externalAccounts.map((account) => (
                  <li key={account.id} className="rounded-lg border p-3 text-sm">
                    <div className="font-medium">{account.bank_name ?? 'Banco'}</div>
                    <div className="text-muted-foreground font-mono text-xs mt-1">
                      {account.account_number ? `****${account.account_number.slice(-4)}` : (account.iban ? `****${account.iban.slice(-4)}` : 'Sin cuenta')} (Riel: {account.payment_rail})
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="size-5 text-primary" />
              Direcciones de Liquidación (Crypto)
            </CardTitle>
            <CardDescription>Wallets externas para recibir retiros.</CardDescription>
          </CardHeader>
          <CardContent>
            {state.liquidationAddresses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tienes direcciones crypto vinculadas.</p>
            ) : (
              <ul className="space-y-3">
                {state.liquidationAddresses.map((addr) => (
                  <li key={addr.id} className="rounded-lg border p-3 text-sm">
                    <div className="font-medium">{addr.currency} on {addr.chain}</div>
                    <div className="text-muted-foreground font-mono text-xs mt-1 break-all">
                      {addr.address}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Retiros (Payouts)</CardTitle>
          <CardDescription>Transferencias salientes a través de Bridge.</CardDescription>
        </CardHeader>
        <CardContent>
          {state.payouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tienes retiros registrados.</p>
          ) : (
            <div className="rounded-md border">
              <div className="grid grid-cols-4 border-b bg-muted/50 p-3 text-sm font-medium">
                <div>Monto</div>
                <div>Moneda</div>
                <div>Estado</div>
                <div>Fecha</div>
              </div>
              <ul className="divide-y">
                {state.payouts.map((payout) => (
                  <li key={payout.id} className="grid grid-cols-4 p-3 text-sm items-center">
                    <div className="font-mono">{payout.amount}</div>
                    <div>{payout.currency}</div>
                    <div>
                      <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary uppercase">
                        {payout.status}
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      {new Date(payout.created_at).toLocaleDateString()}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
