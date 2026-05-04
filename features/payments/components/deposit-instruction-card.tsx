'use client'

import { useState } from 'react'
import Image from 'next/image'
import { QRCodeSVG } from 'qrcode.react'
import { motion } from 'framer-motion'
import { Copy, FlipHorizontal2, Landmark, Wallet, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { DepositInstruction } from '@/features/payments/lib/deposit-instructions'

/* ─────────────────────────────────────────────────────
   Paleta de la tarjeta alineada al design system
   "Oceanic Trust" — gradiente del logo #0788FF → #01C5FF
   Navy ink: #050036 / oklch(0.12 0.02 250)
───────────────────────────────────────────────────── */

export function DepositInstructionCard({ instruction }: { instruction: DepositInstruction }) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  /* ── Note card — renderizado compacto sin flip ── */
  if (instruction.kind === 'note') {
    const accentClass =
      instruction.accent === 'amber'
        ? 'border-amber-400/30 bg-amber-950/20'
        : instruction.accent === 'emerald'
          ? 'border-emerald-400/30 bg-emerald-950/20'
          : 'border-[oklch(0.70_0.17_240/30%)] bg-[oklch(0.70_0.17_240/8%)]'

    return (
      <div className={`rounded-2xl border p-4 ${accentClass}`}>
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
          <Landmark className="size-4" />
          {instruction.title}
        </div>
        <div className="text-sm text-muted-foreground">{instruction.detail}</div>
      </div>
    )
  }

  /* ── Data derivation ── */
  const isWallet = instruction.kind === 'wallet'
  const isBank = instruction.kind === 'bank'
  const hasQr = !!(instruction.qrUrl || instruction.qrValue)
  const primaryValue = getInstructionPrimaryValue(instruction)
  const metaRows = buildInstructionRows(instruction)

  // Truncar dirección para mostrar: primeros 6 + ... + últimos 4
  const displayValue = primaryValue.length > 16
    ? `${primaryValue.slice(0, 6)}····${primaryValue.slice(-4)}`
    : primaryValue

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(primaryValue)
      toast.success('Copiado al portapapeles.')
    } catch {
      toast.error('No se pudo copiar.')
    }
  }

  /* ── Card gradient styles ── */
  const cardGradient = isWallet
    ? 'bg-gradient-to-br from-[oklch(0.18_0.04_220)] via-[oklch(0.14_0.03_240)] to-[oklch(0.11_0.04_260)]'
    : 'bg-gradient-to-br from-[oklch(0.20_0.04_252)] via-[oklch(0.15_0.03_255)] to-[oklch(0.11_0.03_260)]'

  const borderAccent = isWallet
    ? 'border-[oklch(0.74_0.12_200/25%)]'
    : 'border-[oklch(0.70_0.17_240/25%)]'

  const chipAccent = isWallet
    ? 'from-[oklch(0.74_0.12_200)] to-[oklch(0.60_0.15_210)]'
    : 'from-[oklch(0.70_0.17_240)] to-[oklch(0.52_0.22_252)]'

  /* ── 3D Hover Tilt Logic ── */
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isHovered) setIsHovered(true)
    const rect = e.currentTarget.getBoundingClientRect()
    // Calculate mouse position relative to the center of the card (-1 to 1)
    const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2)
    const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2)
    setMousePosition({ x, y })
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setMousePosition({ x: 0, y: 0 })
  }

  // Calculate tilt. We invert Y because moving mouse down should tilt top back.
  // We limit the max rotation to a subtle 8 degrees.
  const rotateX = isHovered ? mousePosition.y * -8 : 0
  const rotateY = isHovered ? mousePosition.x * 8 : 0

  return (
    <div
      className="relative group [perspective:1400px] h-[220px] w-full max-w-[420px]"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        animate={{
          rotateY: isFlipped ? 180 + rotateY : rotateY,
          rotateX: rotateX,
          scale: isHovered ? 1.02 : 1,
        }}
        className="relative h-full w-full"
        style={{ transformStyle: 'preserve-3d' }}
        transition={{
          duration: isHovered && !isFlipped ? 0.1 : 0.85, // Slower flip (0.85s), fast hover response if not flipping
          ease: isHovered && !isFlipped ? 'linear' : [0.22, 1, 0.36, 1],
        }}
      >
        {/* ═══════ FRONT FACE ═══════ */}
        <div
          className={cn(
            'absolute inset-0 h-full w-full overflow-hidden rounded-2xl border shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6)] dark:shadow-[0_8px_32px_-12px_rgba(255,255,255,0.15)]',
            cardGradient,
            borderAccent,
          )}
          style={{
            backfaceVisibility: 'hidden',
            opacity: isFlipped ? 0 : 1,
            pointerEvents: isFlipped ? 'none' : 'auto',
          }}
        >
          {/* Decorative mesh overlay */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_20%_-10%,rgba(255,255,255,0.06),transparent)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_90%_110%,rgba(255,255,255,0.03),transparent)]" />

          <div className="relative flex h-full flex-col justify-between p-5">
            {/* ── Top row: chip + badge + flip ── */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* EMV chip */}
                <div className={cn('flex size-9 items-center justify-center rounded-md bg-gradient-to-br shadow-inner', chipAccent)}>
                  {isWallet ? <Wallet className="size-4 text-white/90" /> : <Building2 className="size-4 text-white/90" />}
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-[0.22em] text-white/50">
                    {isWallet ? 'Wallet de depósito' : 'Cuenta de depósito'}
                  </div>
                  <div className="text-sm font-semibold text-white/90 leading-tight">{instruction.title}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[9px] uppercase tracking-[0.18em] text-white/50">
                  {isWallet ? 'Digital' : 'PSAV'}
                </div>
                <Button
                  aria-label="Voltear tarjeta"
                  className="size-7 rounded-full border border-white/10 bg-white/5 text-white/60 hover:bg-white/15 hover:text-white"
                  onClick={() => setIsFlipped(true)}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <FlipHorizontal2 className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* ── Center: primary value (address / account) ── */}
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-[9px] uppercase tracking-[0.2em] text-white/40 mb-1">
                  {isWallet ? 'Dirección' : 'Número de cuenta'}
                </div>
                <div className="font-mono text-lg tracking-[0.04em] text-white leading-none">
                  {displayValue}
                </div>
              </div>
              <Button
                aria-label="Copiar"
                className="size-8 shrink-0 rounded-lg border border-white/10 bg-white/5 text-white/60 hover:bg-white/15 hover:text-white"
                onClick={handleCopy}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Copy className="size-3.5" />
              </Button>
            </div>

            {/* ── Bottom row: metadata fields + QR ── */}
            <div className="flex items-end justify-between gap-3">
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 min-w-0">
                {metaRows.map((row) => (
                  <div key={row.label} className="min-w-0">
                    <div className="text-[8px] uppercase tracking-[0.2em] text-white/35">{row.label}</div>
                    <div className="text-[12px] font-medium text-white/80 truncate">{row.value}</div>
                  </div>
                ))}
              </div>

              {/* QR thumbnail */}
              {instruction.qrUrl ? (
                <Dialog>
                  <DialogTrigger
                    className="flex size-[52px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/15 bg-white p-1 transition-transform hover:scale-105"
                    type="button"
                  >
                    <Image
                      src={instruction.qrUrl}
                      alt={`QR ${instruction.title}`}
                      width={100}
                      height={100}
                      className="h-full w-full object-contain"
                      unoptimized
                    />
                  </DialogTrigger>
                  <DialogContent className="max-w-md bg-background/98 p-6">
                    <DialogHeader>
                      <DialogTitle>QR ampliado</DialogTitle>
                      <DialogDescription>
                        Escanea este código para completar el depósito del expediente.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="mx-auto w-full max-w-[320px] overflow-hidden rounded-2xl border border-border/70 bg-card p-4">
                      <Image
                        src={instruction.qrUrl}
                        alt={`QR ampliado ${instruction.title}`}
                        width={640}
                        height={640}
                        className="h-auto w-full object-contain"
                        unoptimized
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              ) : instruction.qrValue ? (
                <Dialog>
                  <DialogTrigger
                    className="flex size-[52px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/15 bg-white p-1 transition-transform hover:scale-105"
                    type="button"
                  >
                    <QRCodeSVG
                      value={instruction.qrValue}
                      size={96}
                      bgColor="#ffffff"
                      fgColor="#0a0f1a"
                      level="M"
                      className="h-full w-full"
                    />
                  </DialogTrigger>
                  <DialogContent className="max-w-md bg-background/98 p-6">
                    <DialogHeader>
                      <DialogTitle>QR de depósito</DialogTitle>
                      <DialogDescription>
                        Escanea este código con tu wallet para enviar fondos a la dirección indicada.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="mx-auto flex w-full max-w-[320px] flex-col items-center gap-3 overflow-hidden rounded-2xl border border-border/70 bg-card p-5">
                      <QRCodeSVG
                        value={instruction.qrValue}
                        size={240}
                        bgColor="#ffffff"
                        fgColor="#0a0f1a"
                        level="M"
                      />
                      <div className="w-full break-all rounded-lg bg-muted/50 px-3 py-2 text-center font-mono text-[11px] text-muted-foreground">
                        {instruction.qrValue}
                      </div>
                      {instruction.network && (
                        <div className="text-xs text-muted-foreground">
                          Red: <span className="font-medium text-foreground">{instruction.network}</span>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              ) : null}
            </div>
          </div>
        </div>

        {/* ═══════ BACK FACE ═══════ */}
        <div
          className={cn(
            'absolute inset-0 h-full w-full overflow-hidden rounded-2xl border shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6)] dark:shadow-[0_8px_32px_-12px_rgba(255,255,255,0.15)]',
            cardGradient,
            borderAccent,
            !isFlipped && 'opacity-0 pointer-events-none',
          )}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            opacity: isFlipped ? 1 : 0,
          }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_80%_-10%,rgba(255,255,255,0.05),transparent)]" />

          <div className="relative flex h-full flex-col justify-between p-5">
            {/* Top */}
            <div className="flex items-center justify-between">
              <div className="text-[9px] uppercase tracking-[0.28em] text-white/40">Guira Finance</div>
              <Button
                aria-label="Volver al frente"
                className="size-7 rounded-full border border-white/10 bg-white/5 text-white/60 hover:bg-white/15 hover:text-white"
                onClick={() => setIsFlipped(false)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <FlipHorizontal2 className="size-3.5" />
              </Button>
            </div>

            {/* Center — logo */}
            <div className="flex items-center justify-center">
              <div className="relative h-10 w-[80px] opacity-70">
                <Image
                  src="/asdsadsa.svg"
                  alt="Guira"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            </div>

            {/* Bottom — compliance note */}
            <div className="text-center text-[10px] leading-relaxed text-white/40">
              Operación validada y asegurada por el protocolo de cumplimiento de Guira.
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   Helper functions
───────────────────────────────────────────────────── */

function getInstructionPrimaryValue(instruction: DepositInstruction) {
  if (instruction.kind === 'bank' && instruction.bankCard) {
    return instruction.bankCard.accountNumber
  }
  return instruction.detail
}

function buildInstructionRows(instruction: DepositInstruction) {
  if (instruction.kind === 'bank' && instruction.bankCard) {
    return [
      { label: 'Banco', value: instruction.bankCard.bankName },
      { label: 'Titular', value: instruction.bankCard.accountHolder },
      { label: 'País / Moneda', value: instruction.bankCard.country },
    ]
  }

  if (instruction.kind === 'wallet') {
    const rows: { label: string; value: string }[] = []
    if (instruction.network) {
      rows.push({ label: 'Red', value: instruction.network })
    }
    if (instruction.currency) {
      rows.push({ label: 'Moneda', value: instruction.currency })
    }
    if (rows.length === 0) {
      rows.push({ label: 'Tipo', value: 'Wallet Guira' })
    }
    return rows
  }

  if (instruction.kind === 'qr') {
    return [{ label: 'Acción', value: 'Escanea el QR para depositar' }]
  }

  return []
}
