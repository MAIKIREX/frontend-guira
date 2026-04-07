'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Loader2,
  RefreshCw,
  Landmark,
  ArrowDownToLine,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import {
  BridgeService,
  type VirtualAccount,
  type SourceCurrency,
} from '@/services/bridge.service'
import { VirtualAccountCard } from './virtual-account-card'
import { CreateVirtualAccountDialog } from './create-virtual-account-dialog'

interface VirtualAccountsSectionProps {
  isApproved: boolean
}

export function VirtualAccountsSection({ isApproved }: VirtualAccountsSectionProps) {
  const [accounts, setAccounts] = useState<VirtualAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const loadAccounts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await BridgeService.listVirtualAccounts()
      setAccounts(data ?? [])
    } catch (err) {
      setError((err as Error)?.message ?? 'No se pudieron cargar las cuentas virtuales')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isApproved) {
      void loadAccounts()
    } else {
      setLoading(false)
    }
  }, [isApproved, loadAccounts])

  const existingCurrencies = accounts.map((a) => a.source_currency) as SourceCurrency[]

  const handleCreated = useCallback((va: VirtualAccount) => {
    setAccounts((prev) => [va, ...prev])
  }, [])

  const handleDeactivate = useCallback(async (id: string) => {
    await BridgeService.deactivateVirtualAccount(id)
    setAccounts((prev) => prev.filter((a) => a.id !== id))
  }, [])

  return (
    <div className="space-y-5">
      {/* Sub-header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg border border-border/60 bg-muted/40">
            <Landmark className="size-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">Cuentas Virtuales</p>
            <p className="text-xs text-muted-foreground">
              Cuentas bancarias para recibir depósitos con auto-conversión a crypto
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => void loadAccounts()}
            disabled={loading}
            title="Actualizar"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          {isApproved && (
            <CreateVirtualAccountDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              existingCurrencies={existingCurrencies}
              onCreated={handleCreated}
            />
          )}
        </div>
      </div>

      {/* No KYC */}
      {!isApproved && (
        <Card className="border-dashed border-border/60">
          <CardContent className="flex min-h-[16vh] flex-col items-center justify-center gap-3 text-center">
            <div className="flex size-10 items-center justify-center rounded-full border border-border/60 bg-muted/40">
              <Landmark className="size-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Verificación requerida</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Completa tu verificación KYC/KYB para poder crear cuentas virtuales y recibir depósitos bancarios.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {isApproved && loading && (
        <div className="flex min-h-[20vh] items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error */}
      {isApproved && !loading && error && (
        <Card className="border-destructive/30">
          <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm font-medium text-destructive">Error al cargar cuentas</p>
            <p className="text-xs text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={() => void loadAccounts()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty */}
      {isApproved && !loading && !error && accounts.length === 0 && (
        <Card className="border-dashed border-border/60">
          <CardContent className="flex min-h-[20vh] flex-col items-center justify-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-full border border-border/60 bg-muted/40">
              <ArrowDownToLine className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">No tienes cuentas virtuales aún</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Crea una cuenta virtual para recibir depósitos bancarios que se convertirán automáticamente a criptomonedas.
              </p>
            </div>
            <Button
              size="sm"
              className="mt-2"
              onClick={() => setDialogOpen(true)}
            >
              Crear primera cuenta
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Grid de VAs */}
      {isApproved && !loading && !error && accounts.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {accounts.map((va) => (
            <VirtualAccountCard
              key={va.id}
              va={va}
              onDeactivate={handleDeactivate}
            />
          ))}
        </div>
      )}

      {/* Footer note */}
      {isApproved && !loading && accounts.length > 0 && (
        <p className="text-center text-[11px] text-muted-foreground/60">
          Las cuentas virtuales son administradas por Bridge. Cada depósito se convierte automáticamente y se registra en tu historial.
        </p>
      )}
    </div>
  )
}
