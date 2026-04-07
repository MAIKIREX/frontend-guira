'use client'

import { useState, useCallback } from 'react'
import {
  Copy,
  CheckCheck,
  Landmark,
  Trash2,
  Globe,
  ArrowDownToLine,
  Info,
  AlertTriangle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogMedia,
} from '@/components/ui/alert-dialog'
import {
  type VirtualAccount,
  SOURCE_CURRENCY_OPTIONS,
  DESTINATION_CURRENCY_OPTIONS,
  DESTINATION_RAIL_OPTIONS,
} from '@/services/bridge.service'

// ── Helpers ──────────────────────────────────────────────────────

const CURRENCY_FLAGS: Record<string, string> = Object.fromEntries(
  SOURCE_CURRENCY_OPTIONS.map((o) => [o.value, o.flag])
)

const CURRENCY_LABELS: Record<string, string> = Object.fromEntries(
  SOURCE_CURRENCY_OPTIONS.map((o) => [o.value, o.label])
)

const DEST_CURRENCY_LABELS: Record<string, string> = Object.fromEntries(
  DESTINATION_CURRENCY_OPTIONS.map((o) => [o.value, o.label])
)

const RAIL_LABELS: Record<string, string> = Object.fromEntries(
  DESTINATION_RAIL_OPTIONS.map((o) => [o.value, o.label])
)

// ── CopyButton ───────────────────────────────────────────────────

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available
    }
  }, [value])

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
      onClick={handleCopy}
      title={label ? `Copiar ${label}` : 'Copiar'}
    >
      {copied ? (
        <CheckCheck className="size-3 text-emerald-400" />
      ) : (
        <Copy className="size-3" />
      )}
    </Button>
  )
}

// ── InstructionRow ───────────────────────────────────────────────

function InstructionRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate font-mono text-xs text-foreground/90">{value}</p>
      </div>
      <CopyButton value={value} label={label} />
    </div>
  )
}

// ── VirtualAccountCard ───────────────────────────────────────────

interface VirtualAccountCardProps {
  va: VirtualAccount
  onDeactivate: (id: string) => Promise<void>
}

export function VirtualAccountCard({ va, onDeactivate }: VirtualAccountCardProps) {
  const [deactivating, setDeactivating] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  const currencyFlag = CURRENCY_FLAGS[va.source_currency] ?? '💰'
  const currencyLabel = CURRENCY_LABELS[va.source_currency] ?? va.source_currency.toUpperCase()
  const destCurrencyLabel = DEST_CURRENCY_LABELS[va.destination_currency] ?? va.destination_currency.toUpperCase()
  const railLabel = RAIL_LABELS[va.destination_payment_rail] ?? va.destination_payment_rail

  const handleDeactivate = useCallback(async () => {
    setDeactivating(true)
    try {
      await onDeactivate(va.id)
      setDialogOpen(false)
    } catch {
      // error handled by parent
    } finally {
      setDeactivating(false)
    }
  }, [va.id, onDeactivate])

  return (
    <Card className="relative overflow-hidden border-border/60 bg-card transition-shadow hover:shadow-md">
      {/* Fondo decorativo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          background:
            'radial-gradient(ellipse at top right, currentColor 0%, transparent 70%)',
        }}
      />

      {/* Header */}
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-lg">
            {currencyFlag}
          </div>
          <div>
            <CardTitle className="text-base font-semibold">
              Cuenta Virtual {va.source_currency.toUpperCase()}
            </CardTitle>
            <CardDescription className="text-xs">
              {currencyLabel}
            </CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-[11px]"
          >
            Activa
          </Badge>
          {va.is_external_sweep && (
            <Badge
              variant="outline"
              className="border-amber-500/20 bg-amber-500/10 text-amber-400 text-[11px]"
            >
              <Globe className="mr-1 size-3" />
              Externa
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Instrucciones de depósito */}
        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <Landmark className="size-3.5 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground">Instrucciones de Depósito</p>
          </div>
          <div className="space-y-1.5">
            <InstructionRow label="Titular de la Cuenta" value={va.account_holder_name} />
            <InstructionRow label="Banco" value={va.bank_name} />
            <InstructionRow label="Dirección del Banco" value={va.bank_address} />
            <InstructionRow label="Beneficiario" value={va.beneficiary_name} />
            <InstructionRow label="Dirección del Beneficiario" value={va.beneficiary_address} />
            <InstructionRow label="Núm. Cuenta" value={va.account_number} />
            <InstructionRow label="Routing Number" value={va.routing_number} />
            <InstructionRow label="IBAN" value={va.iban} />
            <InstructionRow label="CLABE" value={va.clabe} />
            <InstructionRow label="Código PIX (br_code)" value={va.br_code} />
            <InstructionRow label="Sort Code" value={va.sort_code} />
          </div>

          {/* Mensaje de depósito (COP/Bre-B) — campo crítico */}
          {va.deposit_message && (
            <div className="mt-2 flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-amber-300">Mensaje de Depósito Obligatorio</p>
                <p className="mt-0.5 text-[11px] text-amber-200/80">
                  Incluye exactamente este mensaje en la descripción de tu transferencia COP. Sin él, el depósito no puede ser identificado.
                </p>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <code className="truncate font-mono text-xs font-bold text-amber-200">{va.deposit_message}</code>
                  <CopyButton value={va.deposit_message} label="Mensaje de depósito" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Payment rails */}
        {va.payment_rails && va.payment_rails.length > 0 && (
          <div className="flex items-center gap-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Rails:</p>
            <div className="flex flex-wrap gap-1">
              {va.payment_rails.map((rail) => (
                <Badge
                  key={rail}
                  variant="outline"
                  className="text-[10px] font-normal uppercase"
                >
                  {rail.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Destino */}
        <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
          <div className="mb-1.5 flex items-center gap-1.5">
            <ArrowDownToLine className="size-3.5 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground">Destino de conversión</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground/80">
            <span>
              Moneda: <span className="font-semibold">{destCurrencyLabel}</span>
            </span>
            <span>
              Red: <span className="font-semibold">{railLabel}</span>
            </span>
            {va.is_external_sweep && va.external_destination_label && (
              <span>
                Wallet: <span className="font-semibold">{va.external_destination_label}</span>
              </span>
            )}
            {!va.is_external_sweep && (
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <Landmark className="size-3" />
                Wallet Guira
              </span>
            )}
          </div>
        </div>

        {/* Fee */}
        {va.developer_fee_percent != null && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info className="size-3" />
            <span>Fee de servicio: <span className="font-medium text-foreground/80">{va.developer_fee_percent}%</span></span>
          </div>
        )}

        {/* Desactivar */}
        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <AlertDialogTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-destructive/70 hover:text-destructive hover:bg-destructive/5"
              />
            }
          >
            <Trash2 className="mr-1.5 size-3.5" />
            Desactivar cuenta virtual
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogMedia className="bg-destructive/10">
                <Trash2 className="size-5 text-destructive" />
              </AlertDialogMedia>
              <AlertDialogTitle>
                ¿Desactivar cuenta virtual?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta cuenta virtual dejará de aceptar depósitos. Los fondos ya recibidos no se verán afectados. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={handleDeactivate}
                disabled={deactivating}
              >
                {deactivating ? 'Desactivando…' : 'Desactivar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
