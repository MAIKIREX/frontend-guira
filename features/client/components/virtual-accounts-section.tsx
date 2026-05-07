'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw,
  Landmark,
  ArrowDownToLine,
  Plus,
} from 'lucide-react'
import { GuiraLoadingInline } from '@/components/shared/guira-loading'
import { motion } from 'framer-motion'
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

const SPRING = { type: 'spring' as const, stiffness: 100, damping: 20 }

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

  // Monedas con VA interna (Bridge) existente — solo aplica al crear VAs internas
  const internalCurrencies = accounts
    .filter((a) => !a.is_external_sweep)
    .map((a) => a.source_currency) as SourceCurrency[]

  // Mapa de VAs externas existentes por moneda (para informar al diálogo)
  const externalCountBySource: Record<string, number> = {}
  accounts
    .filter((a) => a.is_external_sweep)
    .forEach((a) => {
      externalCountBySource[a.source_currency] = (externalCountBySource[a.source_currency] ?? 0) + 1
    })

  const handleCreated = useCallback((va: VirtualAccount) => {
    setAccounts((prev) => [va, ...prev])
  }, [])

  const handleDeactivate = useCallback(async (id: string) => {
    await BridgeService.deactivateVirtualAccount(id)
    setAccounts((prev) => prev.filter((a) => a.id !== id))
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-extrabold text-foreground tracking-tight">Cuentas Virtuales</h2>
          <p className="text-sm text-muted-foreground/60 mt-1.5 font-medium">
            Cuentas bancarias para recibir depósitos con auto-conversión a crypto
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => void loadAccounts()}
            disabled={loading}
            title="Actualizar"
            className="rounded-full size-8 text-muted-foreground/50 hover:text-foreground"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          {isApproved && (
            <CreateVirtualAccountDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              internalCurrencies={internalCurrencies}
              externalCountBySource={externalCountBySource}
              onCreated={handleCreated}
            />
          )}
        </div>
      </div>

      {/* No KYC */}
      {!isApproved && (
        <div className="flex min-h-[24vh] flex-col items-center justify-center gap-5 text-center py-12">
          <div className="relative flex size-16 items-center justify-center rounded-full border border-border/40 bg-muted/20 ring-4 ring-muted/30">
            <Landmark className="size-6 text-muted-foreground/40" />
          </div>
          <div className="max-w-sm">
            <p className="text-lg font-semibold tracking-tight text-foreground">Verificación requerida</p>
            <p className="mt-2 text-sm text-muted-foreground/70 leading-relaxed">
              Completa tu proceso de verificación KYC/KYB corporativo para habilitar la creación de Cuentas Virtuales y empezar a recibir depósitos bancarios.
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {isApproved && loading && (
        <div className="flex min-h-[20vh] items-center justify-center">
          <GuiraLoadingInline />
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
        <div className="flex min-h-[24vh] flex-col items-center justify-center gap-5 text-center py-12">
          <div className="relative flex size-16 items-center justify-center rounded-full border border-border/40 bg-muted/20 ring-4 ring-muted/30">
            <ArrowDownToLine className="size-6 text-muted-foreground/40" />
          </div>
          <div className="max-w-sm">
            <p className="text-lg font-semibold tracking-tight text-foreground">No tienes cuentas virtuales aún</p>
            <p className="mt-2 text-sm text-muted-foreground/70 leading-relaxed">
              Crea tu primera cuenta virtual local o internacional. Los depósitos recibidos aquí se convertirán automáticamente a cripto en tus Wallets correspondientes.
            </p>
          </div>
          <Button
            size="sm"
            className="mt-4 rounded-full px-6 font-semibold shadow-sm"
            onClick={() => setDialogOpen(true)}
          >
            Crear primera cuenta
          </Button>
        </div>
      )}

      {/* Grid de VAs — staggered entry */}
      {isApproved && !loading && !error && accounts.length > 0 && (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((va, index) => (
            <motion.div
              key={va.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: index * 0.1 }}
            >
              <VirtualAccountCard
                va={va}
                onDeactivate={handleDeactivate}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Footer note */}
      {isApproved && !loading && accounts.length > 0 && (
        <p className="text-center text-[10px] text-muted-foreground/40 pt-2">
          Las cuentas virtuales son administradas por Bridge. Cada depósito se convierte automáticamente y se registra en tu historial.
        </p>
      )}
    </div>
  )
}
