'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Copy,
  CheckCheck,
  Landmark,
  Trash2,
  Globe,
  ArrowDownToLine,
  Info,
  AlertTriangle,
  Share2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
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
  eur: { from: 'from-blue-500/10', to: 'to-sky-500/5', text: 'text-blue-600' },
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
      className="size-7 shrink-0 rounded-lg bg-muted/40 text-muted-foreground/70 hover:bg-muted/80 hover:text-foreground transition-all duration-200"
      onClick={handleCopy}
      title={label ? `Copiar ${label}` : 'Copiar'}
    >
      {copied ? (
        <CheckCheck className="size-3.5 text-emerald-500" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </Button>
  )
}

// ── InstructionRow ───────────────────────────────────────────────

function InstructionRow({ label, value, isLast }: { label: string; value: string | null | undefined; isLast?: boolean }) {
  if (!value) return null
  return (
    <div className={`group flex items-start justify-between gap-4 px-5 py-3.5 transition-colors duration-300 hover:bg-muted/20 ${!isLast ? 'border-b border-border/20' : ''}`}>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 transition-colors group-hover:text-muted-foreground/80">{label}</p>
        <p className="mt-1 font-mono text-[13px] font-semibold tracking-tight text-foreground/90 break-words whitespace-normal leading-relaxed">{value}</p>
      </div>
      <div className="pt-1 shrink-0">
        <CopyButton value={value} label={label} />
      </div>
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
  const [detailsOpen, setDetailsOpen] = useState(false)

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

  // ── 3D Tilt hover ──
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isHovered) setIsHovered(true)
    const rect = e.currentTarget.getBoundingClientRect()
    setMousePos({
      x: (e.clientX - rect.left - rect.width / 2) / (rect.width / 2),
      y: (e.clientY - rect.top - rect.height / 2) / (rect.height / 2),
    })
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setMousePos({ x: 0, y: 0 })
  }

  const rotateX = isHovered ? mousePos.y * -6 : 0
  const rotateY = isHovered ? mousePos.x * 6 : 0

  return (
    <div className="flex flex-col items-start w-full">
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
      {/* ── Premium Credit-Card (clickable) ── */}
      <div
        className="group [perspective:1400px] w-full max-w-[420px] cursor-pointer"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={() => setDetailsOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setDetailsOpen(true) }}
      >
        <motion.div
          animate={{ rotateY, rotateX, scale: isHovered ? 1.02 : 1 }}
          className="relative w-full"
          style={{ transformStyle: 'preserve-3d' }}
          transition={{ duration: 0.1, ease: 'linear' }}
        >
          <div
            className={cn(
              'relative overflow-hidden rounded-2xl border aspect-[1.586/1]',
              'bg-gradient-to-br from-[oklch(0.20_0.04_252)] via-[oklch(0.15_0.03_255)] to-[oklch(0.11_0.04_260)]',
              'border-[oklch(0.70_0.17_240/20%)]',
              'shadow-[0_8px_32px_-12px_rgba(0,0,0,0.5)] dark:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.7)]',
              'transition-shadow duration-300 group-hover:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.6)]',
            )}
          >
            {/* Mesh light overlays */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_20%_-10%,rgba(255,255,255,0.06),transparent)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_90%_110%,rgba(255,255,255,0.03),transparent)]" />

            <div className="relative flex h-full flex-col justify-between p-5 sm:p-6">
              {/* ── Top: Flag + Name + Status ── */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/15 shadow-lg">
                    <Flag code={getFlagCode(va.source_currency)} className="h-full w-full object-cover" fallback={<span className="text-lg">{currencyFlag}</span>} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white/95 tracking-tight leading-tight">
                      Cuenta {va.source_currency.toUpperCase()}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-white/45 font-medium">{currencyLabel}</span>
                      <span className="text-white/15">·</span>
                      <span className="font-semibold text-[oklch(0.74_0.12_200)]">{depositRailLabel}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex size-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                    </span>
                    <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-[0.2em]">Activa</span>
                  </div>
                  {va.is_external_sweep && (
                    <Badge
                      variant="outline"
                      className="border-amber-400/20 bg-amber-400/10 text-[9px] font-medium uppercase tracking-wider text-amber-400"
                    >
                      <Globe className="mr-1 size-2.5" />
                      Externa
                    </Badge>
                  )}
                </div>
              </div>

              {/* ── Center: Account number (credit-card style) ── */}
              <div className="space-y-1.5">
                {primaryId.value && (
                  <>
                    <div className="text-[8px] uppercase tracking-[0.25em] text-white/55 font-semibold">{primaryId.label}</div>
                    <div className="font-mono text-[22px] sm:text-2xl tracking-[0.14em] text-white leading-none">
                      {'•••• •••• •••• '}{primaryId.value.slice(-4)}
                    </div>
                  </>
                )}
                {va.deposit_message && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <AlertTriangle className="size-3 shrink-0 text-amber-400" />
                    <span className="text-[9px] font-semibold text-amber-400 uppercase tracking-wider">Requiere referencia obligatoria</span>
                  </div>
                )}
              </div>

              {/* ── Bottom: Metadata + Rails + Logo ── */}
              <div className="flex items-end justify-between gap-3">
                <div className="flex flex-wrap gap-x-6 gap-y-1.5 min-w-0">
                  <div className="min-w-0">
                    <div className="text-[7px] uppercase tracking-[0.25em] text-white/55 font-semibold">Titular</div>
                    <div className="text-[11px] font-medium text-white/80 truncate max-w-[160px]">{holderName}</div>
                  </div>
                  {va.payment_rails && va.payment_rails.length > 0 && (
                    <div className="min-w-0">
                      <div className="text-[7px] uppercase tracking-[0.25em] text-white/55 font-semibold">Soporta</div>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {va.payment_rails.map((rail) => (
                          <span key={rail} className="rounded-sm bg-white/8 border border-white/10 px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-white/60">
                            {rail.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <img src="/asdsadsa.svg" alt="Guira" className="h-6 w-auto brightness-[3] opacity-50 shrink-0" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Hint text */}
      <p className="w-full max-w-[420px] text-center text-[10px] text-muted-foreground/50 mt-2 font-medium">
        Haz clic en la tarjeta para ver los datos de la cuenta
      </p>
        <DialogContent className="max-w-lg sm:rounded-[2rem] p-0 overflow-hidden border-border/30 shadow-2xl">
          <div className="relative">
            {/* Subtle brand glow behind header */}
            <div className="absolute inset-x-0 top-0 h-32 bg-primary/[0.02]" />
            
            <DialogHeader className="relative px-8 pt-8 pb-6 border-b border-border/20">
              <DialogTitle className="flex items-start sm:items-center gap-4">
                <div className="flex size-11 shrink-0 overflow-hidden rounded-full border-2 border-border/40 shadow-sm ring-4 ring-background">
                  <Flag code={getFlagCode(va.source_currency)} className="h-full w-full object-cover" />
                </div>
                <div className="text-left">
                  <span className="block text-2xl font-bold tracking-tight">Cuenta {va.source_currency.toUpperCase()}</span>
                  <span className={`block text-[10px] font-bold uppercase tracking-[0.15em] mt-1 ${accent.text}`}>{depositRailLabel}</span>
                </div>
              </DialogTitle>
              <DialogDescription className="text-[13px] pt-3 text-muted-foreground/70 leading-relaxed max-w-[95%] break-words whitespace-normal text-left">
                Instrucciones oficiales para depositar fondos. 
                Los ingresos serán convertidos y enviados a tu billetera {destCurrencyLabel}.
              </DialogDescription>
            </DialogHeader>

            {/* Scrollable details */}
            <div className="max-h-[60vh] overflow-y-auto px-8 py-7">
              <motion.div 
                className="space-y-7"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.1 } }
                }}
              >
                {/* Deposit instructions */}
                <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
                  <div className="mb-4 flex flex-row items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex size-6 items-center justify-center rounded-full bg-muted/40">
                        <Landmark className="size-3 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-bold tracking-tight text-foreground">Instrucciones bancarias</p>
                    </div>
                    <Button variant="outline" size="sm" className="h-8 rounded-lg px-3 text-xs gap-1.5 font-bold text-primary/80 border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors" onClick={handleShareAll}>
                      <Share2 className="size-3.5" />
                      Compartir
                    </Button>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-border/30 bg-card shadow-sm">
                    {depositInstructions.map((instr, i) => (
                      <InstructionRow
                        key={instr.label}
                        label={instr.label}
                        value={instr.value}
                        isLast={i === depositInstructions.length - 1}
                      />
                    ))}
                  </div>
                </motion.div>

                {/* Deposit message — COP / Bre-B critical warning */}
                {va.deposit_message && (
                  <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="flex items-start gap-3.5 rounded-2xl border-l-4 border-l-amber-500 border-y border-y-border/20 border-r border-r-border/20 bg-amber-500/[0.04] px-5 py-4 shadow-sm">
                    <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" />
                    <div className="min-w-0 pr-1">
                      <p className="text-sm font-bold text-amber-600 dark:text-amber-500 tracking-tight">Referencia Obligatoria</p>
                      <p className="mt-1 text-xs font-medium leading-relaxed text-amber-600/80 dark:text-amber-500/80">
                        Copia este código y pégalo como &apos;Referencia&apos; o &apos;Mensaje&apos; en tu transferencia bancaria. Sin él, los fondos podrían retrasarse.
                      </p>
                      <div className="mt-3.5 flex items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-background/50 p-2.5 pl-3.5 shadow-sm backdrop-blur-sm">
                        <code className="truncate font-mono text-sm font-black text-amber-600 dark:text-amber-500 tracking-tight">{va.deposit_message}</code>
                        <CopyButton value={va.deposit_message} label="Referencia" />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Destination / conversion info */}
                <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="rounded-2xl border border-border/30 bg-muted/20 p-5 shadow-sm">
                  <div className="mb-3.5 flex items-center gap-2 border-b border-border/20 pb-3">
                    <div className="flex size-5 items-center justify-center rounded-full bg-muted/60">
                      <ArrowDownToLine className="size-2.5 text-muted-foreground" />
                    </div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80">Destino de conversión</p>
                  </div>
                  <div className="space-y-2.5 text-[13px] text-foreground/80">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium">Moneda destino</span>
                      <span className="font-bold">{destCurrencyLabel}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium">Red / Rail</span>
                      <span className="font-bold">{railLabel}</span>
                    </div>
                    {va.developer_fee_percent != null && (
                      <div className="flex justify-between items-center text-amber-500/90 font-medium">
                        <span className="flex items-center gap-1.5"><Info className="size-3.5" /> Fee de servicio</span>
                        <span className="font-bold">{va.developer_fee_percent}%</span>
                      </div>
                    )}

                    {va.is_external_sweep ? (
                      <>
                        <div className="flex flex-wrap gap-2 justify-between items-center border-t border-border/20 pt-3 mt-3">
                          <span className="text-muted-foreground font-medium">Etiqueta Externa</span>
                          <span className="font-bold truncate max-w-[200px]">{va.external_destination_label}</span>
                        </div>
                        {va.destination_address && (
                          <div className="flex flex-wrap gap-2 justify-between items-center bg-background/50 p-2.5 rounded-xl mt-1.5 border border-border/30 shadow-sm">
                            <span className="font-mono text-[11px] font-medium break-all whitespace-normal text-muted-foreground flex-1">{va.destination_address}</span>
                            <div className="shrink-0">
                              <CopyButton value={va.destination_address} label="dirección" />
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-wrap gap-2 justify-between items-center text-emerald-500 font-bold border-t border-border/20 pt-3 mt-3">
                        <span>Direccionado a</span>
                        <span className="flex shrink-0 items-center gap-1.5"><Landmark className="size-3.5" /> Wallet Guira</span>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Deactivate option */}
                <motion.div variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }} className="border-t border-border/20 pt-2">
                  <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <AlertDialogTrigger render={
                      <Button
                        variant="ghost"
                        className="w-full h-12 rounded-xl text-[13px] font-bold text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                      />
                    }>
                      <Trash2 className="mr-2 size-4" />
                      Desactivar permanentemente
                    </AlertDialogTrigger>
                    <AlertDialogContent className="sm:rounded-3xl">
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
                </motion.div>
              </motion.div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
