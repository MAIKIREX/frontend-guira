'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Copy, FlipHorizontal2, Landmark } from 'lucide-react'
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

export function DepositInstructionCard({ instruction }: { instruction: DepositInstruction }) {
  const [isFlipped, setIsFlipped] = useState(false)

  if (instruction.kind === 'note') {
    const accentClass =
      instruction.accent === 'amber'
        ? 'border-amber-400/35 bg-amber-400/10'
        : instruction.accent === 'emerald'
          ? 'border-emerald-400/35 bg-emerald-400/10'
          : 'border-cyan-400/35 bg-cyan-400/10'

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

  const frontRows = buildInstructionRows(instruction)
  const primaryValue = getInstructionPrimaryValue(instruction)
  const visiblePrimaryValue = getInstructionPrimaryDisplayValue(instruction, primaryValue)

  async function handleCopyPrimaryValue() {
    try {
      await navigator.clipboard.writeText(primaryValue)
      toast.success('Valor copiado.')
    } catch (error) {
      console.error('Failed to copy instruction value', error)
      toast.error('No se pudo copiar el valor.')
    }
  }

  const displayValue = visiblePrimaryValue.length > 18 
    ? `${visiblePrimaryValue.slice(0, 14)}...` 
    : visiblePrimaryValue

  const cardBaseBg = "bg-[linear-gradient(150deg,#0b1020_0%,#151c35_45%,#26104c_100%)]"

  return (
    <div className="relative group [perspective:1400px] h-[260px] sm:h-[280px]">
      <div className="relative h-full">
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          className="relative h-full w-full"
          style={{ transformStyle: 'preserve-3d' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Front Face */}
          <div
            className={cn(
              getInstructionFrontClass(instruction),
              "absolute inset-0 h-full w-full",
              cardBaseBg
            )}
            style={{ 
              backfaceVisibility: 'hidden',
              opacity: isFlipped ? 0 : 1,
              pointerEvents: isFlipped ? 'none' : 'auto'
            }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(250,204,21,0.12),transparent_35%)]" />
            <div className="relative flex h-full flex-col p-6 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-cyan-100/75 truncate">{getInstructionEyebrow(instruction)}</div>
                  <div className="mt-1.5 text-base sm:text-lg font-semibold tracking-[0.02em]">{instruction.title}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="hidden sm:block rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-50/70">
                    {getInstructionBadge(instruction)}
                  </div>
                  <Button
                    aria-label="Voltear tarjeta"
                    className="rounded-full border border-white/10 bg-white/5 text-white backdrop-blur-sm hover:bg-white/15 hover:text-white"
                    onClick={() => setIsFlipped(true)}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <FlipHorizontal2 className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-6 sm:mt-8">
                <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-100/60">{getInstructionPrimaryLabel(instruction)}</div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="min-w-0 font-mono text-xl sm:text-2xl tracking-[0.08em] text-white">
                    {displayValue}
                  </div>
                  <Button
                    aria-label="Copiar valor"
                    className="shrink-0 rounded-full border border-white/10 bg-white/5 text-white backdrop-blur-sm hover:bg-white/15 hover:text-white"
                    onClick={handleCopyPrimaryValue}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>

              {frontRows.length > 0 || instruction.qrUrl ? (
                <div className="mt-auto flex items-end justify-between gap-4 pt-4">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 min-w-0">
                    {frontRows.map((row) => (
                      <div key={row.label} className="min-w-0">
                        <div className="text-[9px] uppercase tracking-[0.18em] text-cyan-100/55">{row.label}</div>
                        <div className="mt-0.5 text-[13px] font-medium text-cyan-50 truncate">{row.value}</div>
                      </div>
                    ))}
                  </div>

                  {instruction.qrUrl ? (
                    <Dialog>
                      <DialogTrigger
                        className="flex size-[64px] sm:size-[72px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white p-1.5 shadow-[0_8px_16px_-8px_rgba(255,255,255,0.4)] transition-transform hover:scale-[1.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                        type="button"
                      >
                        <Image
                          src={instruction.qrUrl}
                          alt={`QR ${instruction.title}`}
                          width={144}
                          height={144}
                          className="h-full w-full object-contain"
                          unoptimized
                        />
                      </DialogTrigger>
                      <DialogContent className="max-w-xl bg-background/98 p-6 sm:max-w-xl">
                        <DialogHeader>
                          <DialogTitle>QR ampliado</DialogTitle>
                          <DialogDescription>
                            Escanea este codigo para completar el deposito del expediente.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="mx-auto w-full max-w-[360px] overflow-hidden rounded-[28px] border border-border/70 bg-white p-4 shadow-sm dark:bg-slate-950">
                          <Image
                            src={instruction.qrUrl}
                            alt={`QR ampliado ${instruction.title}`}
                            width={720}
                            height={720}
                            className="h-auto w-full object-contain"
                            unoptimized
                          />
                        </div>
                      </DialogContent>
                    </Dialog>
                  ) : null}
                </div>
              ) : (
                <div className="mt-auto pt-4 text-[11px] leading-relaxed text-cyan-100/65">
                  {getInstructionFooter(instruction)}
                </div>
              )}
            </div>
          </div>

          {/* Back Face */}
          <div
            className={cn(
              "absolute inset-0 h-full w-full overflow-hidden rounded-[28px] border border-violet-400/20 p-6 sm:p-7 text-white shadow-[0_24px_50px_-20px_rgba(0,0,0,0.5)]",
              cardBaseBg,
              !isFlipped && "opacity-0 pointer-events-none"
            )}
            style={{ 
              backfaceVisibility: 'hidden', 
              transform: 'rotateY(180deg)',
              opacity: isFlipped ? 1 : 0
            }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_40%)]" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-[0.3em] text-violet-100/60">Guira Finance</div>
                <div className="flex items-center gap-2">
                  <Button
                    aria-label="Volver al frente"
                    className="rounded-full border border-white/10 bg-white/5 text-white backdrop-blur-sm hover:bg-white/15 hover:text-white"
                    onClick={() => setIsFlipped(false)}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <FlipHorizontal2 className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-1 items-center justify-center py-6">
                <div className="relative h-12 w-[90px] opacity-80">
                  <Image
                    src="/asdsadsa.svg"
                    alt="Guira"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-center text-[11px] leading-relaxed text-violet-100/60">
                  Operación validada y asegurada por el protocolo de cumplimiento de Guira.
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function getInstructionFrontClass(instruction: DepositInstruction) {
  const baseClass =
    'absolute inset-0 overflow-hidden rounded-[28px] border p-5 text-white shadow-[0_24px_60px_-28px_rgba(8,25,49,0.75)]'

  if (instruction.kind === 'wallet') {
    return `${baseClass} border-emerald-400/30 bg-[linear-gradient(145deg,#081a18_0%,#0f3f39_48%,#0b2c27_100%)]`
  }

  return `${baseClass} border-cyan-400/30 bg-[linear-gradient(145deg,#0b1020_0%,#0c2740_45%,#12345b_100%)]`
}

function getInstructionEyebrow(instruction: DepositInstruction) {
  switch (instruction.kind) {
    case 'bank':
      return 'Cuenta de deposito'
    case 'wallet':
      return 'Wallet de recepcion'
    case 'note':
      return 'Nota operativa'
    case 'qr':
      return 'QR de deposito'
  }
}

function getInstructionBadge(instruction: DepositInstruction) {
  switch (instruction.kind) {
    case 'bank':
      return 'Guira PSAV'
    case 'wallet':
      return 'Digital'
    case 'note':
      return 'Importante'
    case 'qr':
      return 'QR'
  }
}

function getInstructionPrimaryLabel(instruction: DepositInstruction) {
  switch (instruction.kind) {
    case 'bank':
      return 'Numero de cuenta'
    case 'wallet':
      return 'Direccion'
    case 'note':
      return 'Detalle'
    case 'qr':
      return 'Referencia'
  }
}

function getInstructionPrimaryValue(instruction: DepositInstruction) {
  if (instruction.kind === 'bank' && instruction.bankCard) {
    return instruction.bankCard.accountNumber
  }

  return instruction.detail
}

function getInstructionPrimaryDisplayValue(instruction: DepositInstruction, value: string) {
  if (instruction.kind === 'bank' && value.length > 12) {
    return `${value.slice(0, 7)}.....`
  }

  return value
}

function getInstructionFooter(instruction: DepositInstruction) {
  switch (instruction.kind) {
    case 'bank':
      return 'Usa esta cuenta para realizar el deposito del expediente y conserva el comprobante para adjuntarlo al final.'
    case 'wallet':
      return 'Verifica que la red del deposito coincida con esta direccion antes de transferir fondos.'
    case 'note':
      return 'Revisa esta indicacion antes de ejecutar el deposito para evitar retrasos en la conciliacion.'
    case 'qr':
      return 'Escanea el QR o replica la referencia exacta antes de continuar.'
  }
}

function buildInstructionRows(instruction: DepositInstruction) {
  if (instruction.kind === 'bank' && instruction.bankCard) {
    return [
      { label: 'Titular', value: instruction.bankCard.accountHolder },
      { label: 'Pais / Moneda', value: instruction.bankCard.country },
    ]
  }

  if (instruction.kind === 'wallet') {
    return [{ label: 'Tipo', value: 'Wallet Guira' }]
  }

  if (instruction.kind === 'qr') {
    return [{ label: 'Accion', value: 'Escanea el QR para depositar' }]
  }

  return []
}
