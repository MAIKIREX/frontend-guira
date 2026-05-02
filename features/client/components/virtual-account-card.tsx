'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  Copy,
  CheckCheck,
  Landmark,
  Trash2,
  Globe,
  ArrowDownToLine,
  Info,
  AlertTriangle,
  Eye,
  Share2,
} from 'lucide-react'
import { toast } from 'sonner'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import Flag from 'react-world-flags'
import {
  type VirtualAccount,
  SOURCE_CURRENCY_OPTIONS,
  DESTINATION_CURRENCY_OPTIONS,
  DESTINATION_RAIL_OPTIONS,
} from '@/services/bridge.service'

// ── Flag mapping ─────────────────────────────────────────────────

const CURRENCY_TO_ISO: Record<string, string> = {
  usd: 'US',
  eur: 'EU',
  gbp: 'GB',
  mxn: 'MX',
  cop: 'CO',
  brl: 'BR',
  clp: 'CL',
  pen: 'PE',
  ars: 'AR',
  cad: 'CA',
}

function getFlagCode(currency: string) {
  return CURRENCY_TO_ISO[currency.toLowerCase()] ?? 'UN'
}

// ── Label maps ───────────────────────────────────────────────────

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

// ── Currency-specific deposit rail labels ────────────────────────

const DEPOSIT_RAIL_LABELS: Record<string, string> = {
  usd: 'ACH / Wire',
  eur: 'SEPA',
  mxn: 'SPEI',
  brl: 'PIX',
  gbp: 'Faster Payments',
  cop: 'Bre-B',
}

// ── Currency-specific helpers ────────────────────────────────────

/**
 * Returns the PRIMARY account identifier for a given currency.
 * Each currency stores its key banking identifier in a different column.
 */
function getPrimaryAccountId(va: VirtualAccount): { label: string; value: string | null } {
  switch (va.source_currency) {
    case 'usd':
      return { label: 'Account Number', value: va.account_number }
    case 'eur':
      return { label: 'IBAN', value: va.iban }
    case 'mxn':
      return { label: 'CLABE', value: va.clabe }
    case 'brl':
      return { label: 'Código PIX', value: va.br_code }
    case 'gbp':
      return { label: 'Account Number', value: va.account_number }
    case 'cop':
      return { label: 'Núm. Cuenta', value: va.account_number }
    default:
      return { label: 'Cuenta', value: va.account_number ?? va.iban ?? va.clabe ?? va.br_code }
  }
}

/**
 * Resolves the best available "holder name" for display.
 * USD does NOT return `account_holder_name` from Bridge, so we fall back to `beneficiary_name`.
 */
function getHolderName(va: VirtualAccount): string {
  return va.account_holder_name ?? va.beneficiary_name ?? 'N/A'
}

/**
 * Returns an ordered list of deposit instruction fields relevant to a specific currency.
 * This prevents showing irrelevant fields (e.g., IBAN for a USD account).
 */
function getDepositInstructions(va: VirtualAccount): { label: string; value: string | null | undefined }[] {
  const common = [
    { label: 'Titular / Beneficiario', value: va.account_holder_name ?? va.beneficiary_name },
  ]

  switch (va.source_currency) {
    case 'usd':
      return [
        ...common,
        { label: 'Banco', value: va.bank_name },
        { label: 'Dirección del Banco', value: va.bank_address },
        { label: 'Beneficiario', value: va.beneficiary_name },
        { label: 'Dirección del Beneficiario', value: va.beneficiary_address },
        { label: 'Routing Number', value: va.routing_number },
        { label: 'Núm. Cuenta', value: va.account_number },
      ]
    case 'eur':
      return [
        ...common,
        { label: 'Banco', value: va.bank_name },
        { label: 'Dirección del Banco', value: va.bank_address },
        { label: 'IBAN', value: va.iban },
      ]
    case 'mxn':
      return [
        ...common,
        { label: 'CLABE', value: va.clabe },
      ]
    case 'brl':
      return [
        ...common,
        { label: 'Código PIX', value: va.br_code },
      ]
    case 'gbp':
      return [
        ...common,
        { label: 'Banco', value: va.bank_name },
        { label: 'Núm. Cuenta', value: va.account_number },
        { label: 'Sort Code', value: va.sort_code },
      ]
    case 'cop':
      return [
        ...common,
        { label: 'Banco', value: va.bank_name },
        { label: 'Núm. Cuenta', value: va.account_number },
      ]
    default:
      // Fallback: show everything (legacy behavior)
      return [
        ...common,
        { label: 'Banco', value: va.bank_name },
        { label: 'Dirección del Banco', value: va.bank_address },
        { label: 'Beneficiario', value: va.beneficiary_name },
        { label: 'Dirección del Beneficiario', value: va.beneficiary_address },
        { label: 'Routing Number', value: va.routing_number },
        { label: 'Núm. Cuenta', value: va.account_number },
        { label: 'IBAN', value: va.iban },
        { label: 'CLABE', value: va.clabe },
        { label: 'Código PIX', value: va.br_code },
        { label: 'Sort Code', value: va.sort_code },
      ]
  }
}

function generateShareText(va: VirtualAccount, depositInstructions: {label: string, value: string | null | undefined}[]): string {
  const instructions = depositInstructions
    .filter(i => Boolean(i.value))
    .map(i => `${i.label}: ${i.value}`)
    .join('\n')

  let text = `Datos para transferencia bancaria (${va.source_currency.toUpperCase()}):\n\n${instructions}`

  if (va.deposit_message) {
    text += `\n\n🚨 IMPORTANTE: Referencia Obligatoria\nDebes incluir el siguiente código como 'Referencia' o 'Mensaje' en tu transferencia. Sin él, los fondos podrían retrasarse:\n\n${va.deposit_message}`
  }

  return text
}

// ── Gradient accents per currency ────────────────────────────────

const CURRENCY_ACCENT: Record<string, { from: string; to: string; text: string }> = {
  usd: { from: 'from-blue-500/10', to: 'to-emerald-500/5', text: 'text-blue-500' },
  eur: { from: 'from-indigo-500/10', to: 'to-blue-500/5', text: 'text-indigo-500' },
  mxn: { from: 'from-emerald-500/10', to: 'to-red-500/5', text: 'text-emerald-600' },
  brl: { from: 'from-yellow-500/10', to: 'to-green-500/5', text: 'text-yellow-600' },
  gbp: { from: 'from-teal-500/10', to: 'to-cyan-500/5', text: 'text-teal-500' },
  cop: { from: 'from-amber-500/10', to: 'to-blue-500/5', text: 'text-amber-600' },
}

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

function InstructionRow({ label, value, isLast }: { label: string; value: string | null | undefined; isLast?: boolean }) {
  if (!value) return null
  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/10 ${!isLast ? 'border-b border-border/30' : ''}`}>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">{label}</p>
        <p className="mt-0.5 truncate font-mono text-xs font-semibold text-foreground/90">{value}</p>
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
  const depositRailLabel = DEPOSIT_RAIL_LABELS[va.source_currency] ?? va.source_currency.toUpperCase()
  const accent = CURRENCY_ACCENT[va.source_currency] ?? CURRENCY_ACCENT.usd

  // Currency-aware computed values
  const primaryId = useMemo(() => getPrimaryAccountId(va), [va])
  const holderName = useMemo(() => getHolderName(va), [va])
  const depositInstructions = useMemo(() => getDepositInstructions(va), [va])

  const handleShareAll = useCallback(async () => {
    const text = generateShareText(va, depositInstructions)
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Datos de depósito ${va.source_currency.toUpperCase()}`,
          text,
        })
        return
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        // proceed to clipboard fallback
      }
    }
    
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Todos los datos copiados al portapapeles')
    } catch {
      toast.error('No se pudo copiar al portapapeles')
    }
  }, [va, depositInstructions])

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
    <Card className="relative overflow-hidden border-border/60 bg-card transition-all duration-300 hover:shadow-lg hover:border-border">
      {/* Gradient accent background per currency */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent.from} ${accent.to}`}
      />

      {/* Header */}
      <CardHeader className="relative z-10 flex flex-row items-center justify-between gap-3 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-border/40 bg-background shadow-md">
            <Flag code={getFlagCode(va.source_currency)} className="h-full w-full object-cover" fallback={<span className="text-xl">{currencyFlag}</span>} />
          </div>
          <div>
            <CardTitle className="text-base font-bold tracking-tight">
              Cuenta {va.source_currency.toUpperCase()}
            </CardTitle>
            <CardDescription className="flex items-center gap-1.5 text-xs font-medium">
              {currencyLabel}
              <span className="text-border">·</span>
              <span className={`font-semibold ${accent.text}`}>{depositRailLabel}</span>
            </CardDescription>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1.5 px-1 pr-0">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-semibold text-emerald-500 uppercase tracking-widest">Activa</span>
          </div>
          {va.is_external_sweep && (
            <Badge
              variant="outline"
              className="border-amber-500/20 bg-amber-500/10 text-[10px] font-medium uppercase tracking-wider text-amber-500"
            >
              <Globe className="mr-1 size-3" />
              Externa
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="relative z-10 space-y-4 pt-1">
        
        {/* Mini summary — currency-aware fields */}
        <div className="space-y-2.5 rounded-xl bg-muted/30 px-4 py-3">
            {/* Holder name — resolved dynamically */}
            <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">Titular</span>
                <span className="font-semibold text-foreground truncate max-w-[180px] text-sm">{holderName}</span>
            </div>

            {/* Primary account identifier — currency-specific */}
            {primaryId.value && (
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">{primaryId.label}</span>
                    <span className="font-mono text-sm font-semibold text-foreground tracking-tight">
                      •••• {primaryId.value.slice(-4)}
                    </span>
                </div>
            )}
            
            {/* Deposit message alert inline (COP) */}
            {va.deposit_message && (
              <div className="flex items-center gap-2 mt-1 pt-2 border-t border-border/40">
                <AlertTriangle className="size-3.5 shrink-0 text-amber-500" />
                <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider">Requiere referencia obligatoria</span>
              </div>
            )}

            {/* Payment rails */}
            {va.payment_rails && va.payment_rails.length > 0 && (
                <div className="flex justify-between items-center mt-1.5 border-t border-border/40 pt-2.5">
                    <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">Soporta</span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {va.payment_rails.map((rail) => (
                        <Badge key={rail} variant="outline" className="text-[9px] font-semibold uppercase bg-background shadow-sm border-border/50 text-foreground/80">{rail.replace(/_/g, ' ')}</Badge>
                      ))}
                    </div>
                </div>
            )}
        </div>

        {/* View details button */}
        <Dialog>
           <DialogTrigger render={<Button className="w-full rounded-xl shadow-sm text-sm h-12 font-semibold gap-2" variant="outline" />}>
              <Eye className="size-4" />
              Ver datos de cuenta
           </DialogTrigger>
           <DialogContent className="max-w-md sm:rounded-3xl p-0 overflow-hidden">
              <DialogHeader className="px-6 py-5 bg-background border-b border-border/40">
                 <DialogTitle className="flex items-center gap-3">
                    <div className="flex size-8 overflow-hidden rounded-full border-2 border-border/40 shadow-sm">
                        <Flag code={getFlagCode(va.source_currency)} className="h-full w-full object-cover" />
                    </div>
                    <div>
                      <span className="block">Cuenta {va.source_currency.toUpperCase()}</span>
                      <span className={`block text-xs font-medium ${accent.text}`}>{depositRailLabel}</span>
                    </div>
                 </DialogTitle>
                 <DialogDescription className="text-xs pt-1">
                    Instrucciones para depositar {va.source_currency.toUpperCase()} hacia tu billetera {destCurrencyLabel}.
                 </DialogDescription>
              </DialogHeader>

              {/* Scrollable details — currency-filtered */}
              <div className="max-h-[60vh] overflow-y-auto px-6 py-5 space-y-5">
                 
                 {/* Deposit instructions — only relevant fields */}
                 <div>
                    <div className="mb-3 flex flex-row items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <Landmark className="size-4 text-muted-foreground" />
                        <p className="text-sm font-semibold tracking-tight text-foreground">Instrucciones de depósito</p>
                      </div>
                      <Button variant="outline" size="sm" className="h-8 rounded-lg px-3 text-xs gap-1.5 font-semibold text-primary/80 border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors" onClick={handleShareAll}>
                        <Share2 className="size-3.5" />
                        Compartir
                      </Button>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-border/40 bg-background shadow-sm">
                      {depositInstructions.map((instr, i) => (
                        <InstructionRow
                          key={instr.label}
                          label={instr.label}
                          value={instr.value}
                          isLast={i === depositInstructions.length - 1}
                        />
                      ))}
                    </div>
                 </div>

                 {/* Deposit message — COP / Bre-B critical warning */}
                 {va.deposit_message && (
                  <div className="flex items-start gap-3 rounded-xl border-l-4 border-l-amber-500 border-y border-y-border/40 border-r border-r-border/40 bg-amber-500/10 px-4 py-3 shadow-sm">
                    <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" />
                    <div className="min-w-0 pr-1">
                      <p className="text-sm font-bold text-amber-600 dark:text-amber-500">Referencia Obligatoria</p>
                      <p className="mt-0.5 text-[11px] font-medium leading-tight text-amber-600/80 dark:text-amber-500/80">
                        Copia este código y pégalo como &apos;Referencia&apos; o &apos;Mensaje&apos; en tu transferencia bancaria. Sin él, los fondos podrían perderse temporalmente.
                      </p>
                      <div className="mt-2.5 flex items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-background p-2 pl-3 shadow-sm">
                        <code className="truncate font-mono text-sm font-black text-amber-600 dark:text-amber-500">{va.deposit_message}</code>
                        <CopyButton value={va.deposit_message} label="Referencia" />
                      </div>
                    </div>
                  </div>
                 )}

                 {/* Destination / conversion info */}
                 <div className="rounded-xl border border-border/40 bg-muted/10 p-4 shadow-sm">
                    <div className="mb-2.5 flex items-center gap-1.5 border-b border-border/30 pb-2">
                      <ArrowDownToLine className="size-3.5 text-muted-foreground" />
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Destino de conversión</p>
                    </div>
                    <div className="space-y-2 text-xs text-foreground/80">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Moneda destino</span>
                        <span className="font-semibold">{destCurrencyLabel}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Red / Rail</span>
                        <span className="font-semibold">{railLabel}</span>
                      </div>
                      {va.developer_fee_percent != null && (
                        <div className="flex justify-between items-center text-amber-500/90 font-medium">
                          <span className="flex items-center gap-1"><Info className="size-3" /> Fee de servicio</span>
                          <span>{va.developer_fee_percent}%</span>
                        </div>
                      )}
                      
                      {va.is_external_sweep ? (
                        <>
                          <div className="flex justify-between items-center border-t border-border/30 pt-2 mt-2">
                            <span className="text-muted-foreground">Etiqueta Externa</span>
                            <span className="font-semibold truncate max-w-[150px]">{va.external_destination_label}</span>
                          </div>
                          {va.destination_address && (
                            <div className="flex justify-between items-center bg-muted/30 p-2 rounded-lg mt-1 border border-border/40">
                               <span className="font-mono text-[10px] truncate text-muted-foreground">{va.destination_address}</span>
                               <CopyButton value={va.destination_address} label="dirección" />
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex justify-between items-center text-emerald-500 font-semibold border-t border-border/30 pt-2 mt-2">
                           <span>Direccionado a</span>
                           <span className="flex items-center gap-1"><Landmark className="size-3" /> Wallet Guira</span>
                        </div>
                      )}
                    </div>
                 </div>

                 {/* Deactivate option */}
                 <div className="border-t border-border/30 pt-4 pb-2">
                    <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
                      <AlertDialogTrigger render={
                        <Button
                          variant="ghost"
                          className="w-full text-xs font-medium text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                        />
                      }>
                        <Trash2 className="mr-1.5 size-3.5" />
                        Desactivar permanentemente
                      </AlertDialogTrigger>
                      <AlertDialogContent className="sm:rounded-2xl">
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
                          <AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            variant="destructive"
                            className="rounded-full"
                            onClick={handleDeactivate}
                            disabled={deactivating}
                          >
                            {deactivating ? 'Desactivando…' : 'Desactivar Cuenta'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                 </div>

              </div>
           </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
