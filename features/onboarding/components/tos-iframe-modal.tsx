'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, CheckCircle2, ShieldCheck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

// ── Tipos ──────────────────────────────────────────────────────────────
interface TosIframeModalProps {
  /** URL de aceptación de ToS de Bridge (de /onboarding/kyc/tos-link) */
  tosUrl: string
  /** Controla si el modal está abierto */
  open: boolean
  /** Llamado cuando el usuario cierra el modal sin aceptar */
  onClose: () => void
  /** Llamado cuando Bridge confirma la aceptación — recibe el signedAgreementId */
  onAccepted: (signedAgreementId: string) => void
}

// ── Origen permitido para el postMessage de Bridge ──────────────────────
const BRIDGE_ORIGIN = 'https://dashboard.bridge.xyz'

// ── Componente ──────────────────────────────────────────────────────────
export function TosIframeModal({
  tosUrl,
  open,
  onClose,
  onAccepted,
}: TosIframeModalProps) {
  const [iframeLoading, setIframeLoading] = useState(true)
  const [accepted, setAccepted] = useState(false)
  const acceptedRef = useRef(false) // evitar doble-disparo

  // ── Escuchar postMessage de Bridge ──────────────────────────────────
  useEffect(() => {
    if (!open) return

    function handleMessage(event: MessageEvent) {
      // Validar origen — sólo aceptar mensajes de Bridge
      if (event.origin !== BRIDGE_ORIGIN) return

      const data = event.data as Record<string, unknown> | null
      if (!data || typeof data !== 'object') return

      // Bridge puede enviar camelCase o snake_case
      const rawId =
        (data['signedAgreementId'] as string | undefined) ??
        (data['signed_agreement_id'] as string | undefined)

      if (rawId && !acceptedRef.current) {
        acceptedRef.current = true
        setAccepted(true)
        // Pequeña pausa para mostrar el estado de éxito antes de cerrar
        setTimeout(() => {
          onAccepted(rawId)
        }, 900)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [open, onAccepted])

  // ── Resetear estado al abrir/cerrar ────────────────────────────────
  useEffect(() => {
    if (open) {
      setIframeLoading(true)
      setAccepted(false)
      acceptedRef.current = false
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent
        className="p-0 overflow-hidden w-full max-w-md"
        showCloseButton={true}
      >
        <DialogHeader className="px-6 pt-5 pb-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <DialogTitle>Términos de Servicio de Bridge</DialogTitle>
          </div>
          <DialogDescription>
            Revisa y acepta los términos para continuar con la verificación.
          </DialogDescription>
        </DialogHeader>

        {/* ── Contenidor del iframe ─────────────────────────────────── */}
        <div className="relative w-full" style={{ height: 480 }}>

          {/* Estado: cargando */}
          {iframeLoading && !accepted && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background z-10">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Cargando página de Bridge...</p>
            </div>
          )}

          {/* Estado: aceptación completada */}
          {accepted && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background z-10">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              <p className="text-base font-medium text-emerald-600">¡Términos aceptados!</p>
              <p className="text-sm text-muted-foreground">Cerrando automáticamente…</p>
            </div>
          )}

          {/* iFrame de Bridge */}
          {!accepted && (
            <iframe
              src={tosUrl}
              title="Bridge — Aceptación de Términos de Servicio"
              className="w-full h-full border-0"
              onLoad={() => setIframeLoading(false)}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
