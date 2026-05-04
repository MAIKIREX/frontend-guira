'use client'

import { cn } from '@/lib/utils'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'

/* ──────────────────────────────────────────────────────────
   EstimationSummary — Componente unificado de estimación
   Usado en todos los flujos de pago para mostrar:
     • Fee estimado
     • Tipo de cambio (opcional)
     • Recibirás aprox.
   ────────────────────────────────────────────────────────── */

const LABEL_CLASS = 'text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground'
const ROW_LABEL = 'text-muted-foreground text-sm md:text-base font-medium'
const ROW_VALUE = 'font-semibold tabular-nums text-base md:text-lg'

export interface EstimationSummaryProps {
  /** Monto bruto ingresado por el usuario */
  amountOrigin: number
  /** Moneda de origen (e.g. "BOB", "USDC") */
  originCurrency: string
  /** Fee total estimado */
  feeTotal: number
  /** Tipo de cambio aplicado — si no se proporciona, la fila no se muestra */
  exchangeRate?: number
  /** Etiqueta para tipo de cambio (e.g. "BOB/USDC", "1 USD = 6.96 Bs") */
  exchangeRateLabel?: string
  /** Precisión decimal del tipo de cambio (default: 4) */
  exchangeRatePrecision?: number
  /** Monto neto que recibirá el destinatario */
  receivesApprox: number
  /** Moneda de destino (e.g. "USDC", "BOB", "USD") */
  receivesCurrency: string
  /** Mostrar la fila "Monto bruto" (default: false) */
  showAmountOrigin?: boolean
  /** Banner de validación debajo del fee (e.g. "Monto mínimo no alcanzado") */
  validationError?: string
  /** Subtexto adicional bajo "Recibirás aprox." (e.g. "Después de comisión y conversión a USD") */
  receivesSubtext?: string
  /** Usar animación Collapsible en vez de condicional (default: false) */
  useCollapsible?: boolean
  /** Condición para mostrar el contenido (default: amountOrigin > 0) */
  visible?: boolean
  /** Clases CSS adicionales para el contenedor */
  className?: string
}

/**
 * Componente reutilizable que muestra la estimación de una operación de pago.
 *
 * Diseño: Lista vertical tipo recibo con filas `flex justify-between`.
 * Cada fila tiene un label a la izquierda y un valor a la derecha.
 */
export function EstimationSummary({
  amountOrigin,
  originCurrency,
  feeTotal,
  exchangeRate,
  exchangeRateLabel,
  exchangeRatePrecision = 4,
  receivesApprox,
  receivesCurrency,
  showAmountOrigin = false,
  validationError,
  receivesSubtext,
  useCollapsible = false,
  visible,
  className,
}: EstimationSummaryProps) {
  const isVisible = visible ?? amountOrigin > 0

  const content = (
    <div
      className={cn(
        'overflow-hidden pb-2 pt-1',
        className
      )}
    >
      <div className="flex flex-col gap-y-4 px-5 pb-3">
        {/* Monto bruto (opcional) */}
        {showAmountOrigin && (
          <div className="flex items-center justify-between">
            <span className={ROW_LABEL}>Monto bruto</span>
            <span className={ROW_VALUE}>
              {amountOrigin.toFixed(2)}{' '}
              <span className="text-muted-foreground text-sm md:text-base font-medium">{originCurrency}</span>
            </span>
          </div>
        )}

        {/* Fee estimado */}
        <div className="flex items-center justify-between">
          <span className={ROW_LABEL}>Comisión</span>
          <span className={cn(ROW_VALUE, 'text-destructive/80')}>
            − {feeTotal.toFixed(2)}{' '}
            <span className="text-sm md:text-base font-medium">{originCurrency}</span>
          </span>
        </div>

        {/* Tipo de cambio (condicional) */}
        {exchangeRate !== undefined && exchangeRate !== 0 && exchangeRate !== 1 && (
          <div className="flex items-center justify-between">
            <span className={ROW_LABEL}>Tipo de cambio</span>
            <span className={ROW_VALUE}>
              × {exchangeRate.toFixed(exchangeRatePrecision)}{' '}
              {exchangeRateLabel && (
                <span className="text-sm md:text-base text-muted-foreground font-medium">{exchangeRateLabel}</span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Validación (e.g., monto mínimo no alcanzado) */}
      {validationError && (
        <div className="mx-4 mb-3 px-4 py-3 bg-destructive/10 rounded-xl">
          <div className="flex items-start gap-2">
            <span className="text-destructive/90 text-base mt-0.5">⚠️</span>
            <p className="text-sm text-destructive/80 leading-relaxed font-medium">{validationError}</p>
          </div>
        </div>
      )}

      {/* Recibirás aprox. — fila principal destacada */}
      <div
        className={cn(
          'flex items-center justify-between px-5 py-4 mt-2 mx-2 rounded-xl',
          validationError ? 'bg-muted/40 opacity-60 grayscale' : 'bg-emerald-500/10'
        )}
      >
        <div>
          <span className="font-bold text-base md:text-lg">Recibirás</span>
          {receivesSubtext && (
            <p className="mt-1 text-xs md:text-sm text-muted-foreground/80 tracking-wider">
              {receivesSubtext}
            </p>
          )}
        </div>
        <span
          className={cn(
            'font-bold tabular-nums text-2xl md:text-3xl tracking-tight',
            validationError ? 'text-muted-foreground' : 'text-emerald-600 dark:text-emerald-500'
          )}
        >
          {receivesApprox.toFixed(2)}{' '}
          <span className="text-base md:text-lg font-semibold">{receivesCurrency}</span>
        </span>
      </div>
    </div>
  )

  if (useCollapsible) {
    return (
      <Collapsible open={isVisible}>
        <CollapsibleContent>
          <div className="mt-3">{content}</div>
        </CollapsibleContent>
      </Collapsible>
    )
  }

  return isVisible ? content : null
}
