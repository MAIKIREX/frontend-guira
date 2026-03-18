'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Landmark } from 'lucide-react'
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

  const frontLabel =
    instruction.kind === 'bank'
      ? 'Cara operativa con datos bancarios y QR.'
      : instruction.kind === 'wallet'
        ? 'Cara operativa con wallet de recepcion.'
        : 'Cara operativa de la instruccion.'
  const frontRows = buildInstructionRows(instruction)

  return (
    <div className="space-y-3">
      <div className="relative h-[280px] [perspective:1400px]">
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          className="relative h-full w-full"
          style={{ transformStyle: 'preserve-3d' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            className={getInstructionFrontClass(instruction)}
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(250,204,21,0.18),transparent_28%)]" />
            <div className="relative flex h-full flex-col">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/75">{getInstructionEyebrow(instruction)}</div>
                  <div className="mt-2 text-lg font-semibold tracking-[0.02em]">{instruction.title}</div>
                </div>
                <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-50/80">
                  {getInstructionBadge(instruction)}
                </div>
              </div>

              <div className="mt-8">
                <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/65">{getInstructionPrimaryLabel(instruction)}</div>
                <div className="mt-2 break-all font-mono text-2xl tracking-[0.14em] text-white">
                  {getInstructionPrimaryValue(instruction)}
                </div>
              </div>

              {frontRows.length > 0 || instruction.qrUrl ? (
                <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {frontRows.map((row) => (
                      <div key={row.label}>
                        <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-100/65">{row.label}</div>
                        <div className="mt-2 text-sm font-medium text-cyan-50">{row.value}</div>
                      </div>
                    ))}
                  </div>

                  {instruction.qrUrl ? (
                    <Dialog>
                      <DialogTrigger
                        render={
                          <button
                            className="mx-auto flex size-[88px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white p-2 shadow-[0_10px_24px_-16px_rgba(255,255,255,0.7)] transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:mx-0"
                            type="button"
                          />
                        }
                      >
                        <Image
                          src={instruction.qrUrl}
                          alt={`QR ${instruction.title}`}
                          width={176}
                          height={176}
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
                        <div className="mx-auto w-full max-w-[360px] overflow-hidden rounded-[28px] border border-border/70 bg-slate-950 p-4 shadow-sm">
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
              ) : null}

              <div className="mt-auto pt-5 text-xs text-cyan-100/72">
                {getInstructionFooter(instruction)}
              </div>
            </div>
          </div>

          <div
            className="absolute inset-0 overflow-hidden rounded-[28px] border border-violet-400/30 bg-[linear-gradient(150deg,#0b1020_0%,#151c35_45%,#26104c_100%)] p-6 text-white shadow-[0_24px_60px_-28px_rgba(8,25,49,0.75)]"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_40%),linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.06)_48%,transparent_100%)]" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="text-[11px] uppercase tracking-[0.3em] text-violet-100/70">Guira</div>
                <div className="h-9 w-14 rounded-md bg-white/10" />
              </div>

              <div className="flex flex-1 items-center justify-center py-6">
                <div className="rounded-[28px] border border-white/10 bg-white/6 px-8 py-6 backdrop-blur-[1px]">
                  <Image
                    src="/logo.png"
                    alt="Guira"
                    width={172}
                    height={56}
                    className="h-auto w-[140px] object-contain"
                    unoptimized
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="h-10 rounded-full bg-black/30" />
                <div className="text-center text-xs text-violet-100/72">
                  Medio de fondeo validado por Guira para este expediente.
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/85 px-4 py-3">
        <div>
          <div className="text-sm font-medium text-foreground">{instruction.title}</div>
          <div className="text-xs text-muted-foreground">
            {isFlipped ? 'Cara institucional con marca Guira.' : frontLabel}
          </div>
        </div>
        <Button onClick={() => setIsFlipped((current) => !current)} size="sm" type="button" variant="outline">
          {isFlipped ? 'Volver al frente' : 'Voltear tarjeta'}
        </Button>
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
