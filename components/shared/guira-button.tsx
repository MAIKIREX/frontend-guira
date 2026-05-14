'use client'

import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { ArrowRight, ArrowLeft, type LucideIcon } from 'lucide-react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

/* ─────────────────────────────────────────────────────────────
   GuiraButton — Componente de botón unificado para la interfaz
   del cliente de Guira.

   Consolida los múltiples estilos de botón dispersos en la app
   (AnimatedNextButton, AnimatedBackButton, inline tabs, Button
   de shadcn, SelectionCard) en un solo componente parametrizado
   que respeta la paleta "Oceanic Trust".

   Variantes:
   ─────────
   • primary     → Acción principal (crear orden, continuar)
   • secondary   → Acción secundaria (cancelar, volver)
   • outline     → Borde sutil, fondo transparente
   • ghost       → Sin borde ni fondo, solo texto
   • accent      → Teal accent de la paleta
   • destructive → Acciones de riesgo (eliminar, cancelar orden)
   • tab         → Estilo "pestaña" tipo Depositar / Enviar

   Tamaños:
   ────────
   • sm, default, lg, xl

   Extras:
   ───────
   • iconStart / iconEnd → iconos a los lados
   • arrowNext / arrowBack → flechas animadas
   • active → estado seleccionado (para tabs)
   • fullWidth → ocupa todo el ancho
   ───────────────────────────────────────────────────────────── */

const guiraButtonVariants = cva(
  // Base — todas las variantes comparten esto
  [
    'group/guira-btn relative inline-flex items-center justify-center',
    'font-semibold whitespace-nowrap select-none',
    'transition-all duration-300 ease-out',
    'outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
    'disabled:pointer-events-none disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: [
          'rounded-full bg-primary text-white dark:text-white shadow-[0_8px_20px_rgb(0,0,0,0.08)]',
          'hover:bg-primary/90 hover:shadow-[0_8px_25px_rgb(0,0,0,0.15)]',
          'active:scale-[0.98]',
        ].join(' '),
        secondary: [
          'rounded-full border border-border/50 bg-background text-foreground shadow-sm',
          'hover:bg-muted/20 hover:border-border hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]',
          'active:scale-[0.98]',
        ].join(' '),
        outline: [
          'rounded-full border border-border/60 bg-transparent text-foreground',
          'hover:border-primary/35 hover:bg-muted/10 hover:shadow-sm',
          'active:scale-[0.98]',
        ].join(' '),
        ghost: [
          'rounded-full bg-transparent text-muted-foreground',
          'hover:bg-muted/60 hover:text-foreground',
          'active:scale-[0.98]',
        ].join(' '),
        accent: [
          'rounded-full border border-accent/30 bg-transparent text-accent',
          'hover:bg-accent/5 hover:border-accent/50',
          'active:scale-[0.98]',
        ].join(' '),
        destructive: [
          'rounded-full bg-destructive/10 text-destructive',
          'hover:bg-destructive/20',
          'focus-visible:ring-destructive/20',
          'active:scale-[0.98]',
        ].join(' '),
        tab: [
          'relative rounded-none border-0 bg-transparent px-1',
          'text-muted-foreground font-medium',
          'hover:text-foreground',
          'after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-transparent after:transition-colors after:duration-300',
        ].join(' '),
      },
      size: {
        sm: 'gap-2 px-4 py-2 text-xs tracking-wide',
        default: 'gap-3 px-6 py-3.5 text-sm tracking-wide',
        lg: 'gap-3.5 px-7 py-4 text-base tracking-wide',
        xl: 'gap-4 px-8 py-4.5 text-lg tracking-wide',
      },
      active: {
        true: '',
        false: '',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    compoundVariants: [
      // Tab activo — underline accent + texto bold
      {
        variant: 'tab',
        active: true,
        className: 'text-accent font-bold after:bg-accent',
      },
      // Primary activo — sutil glow
      {
        variant: 'primary',
        active: true,
        className: 'shadow-[0_0_12px_rgba(var(--primary-rgb,7,136,255),0.15)]',
      },
      // Outline activo — borde primario + fondo sutil
      {
        variant: 'outline',
        active: true,
        className: 'border-primary/40 bg-primary/8 text-foreground',
      },
    ],
    defaultVariants: {
      variant: 'primary',
      size: 'default',
      active: false,
      fullWidth: false,
    },
  }
)

export interface GuiraButtonProps
  extends Omit<HTMLMotionProps<"button">, "ref" | "children">,
    VariantProps<typeof guiraButtonVariants> {
  children?: React.ReactNode
  /** Icono de Lucide al inicio del botón */
  iconStart?: LucideIcon
  /** Icono de Lucide al final del botón */
  iconEnd?: LucideIcon
  /** Muestra una flecha → animada al final (estilo "Continuar") */
  arrowNext?: boolean
  /** Muestra una flecha ← animada al inicio (estilo "Volver") */
  arrowBack?: boolean
  /** Referencia al elemento DOM */
  ref?: React.Ref<HTMLButtonElement>
}

/**
 * Botón unificado de la interfaz del cliente de Guira.
 *
 * @example
 * // Botón primario con flecha
 * <GuiraButton arrowNext>Continuar a método</GuiraButton>
 *
 * // Botón de retroceso
 * <GuiraButton variant="secondary" arrowBack>Volver</GuiraButton>
 *
 * // Tab estilo "Depositar / Enviar"
 * <GuiraButton variant="tab" active={isActive} size="default">Depositar</GuiraButton>
 *
 * // Botón accent con icono
 * <GuiraButton variant="accent" iconStart={RefreshCw}>Actualizar</GuiraButton>
 *
 * // Botón outline activo (seleccionado)
 * <GuiraButton variant="outline" active>Opción seleccionada</GuiraButton>
 */
export const GuiraButton = React.forwardRef<HTMLButtonElement, GuiraButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'default',
      active = false,
      fullWidth = false,
      arrowNext = false,
      arrowBack = false,
      iconStart: IconStart,
      iconEnd: IconEnd,
      children,
      disabled,
      onMouseMove,
      ...props
    },
    ref
  ) => {
    // Tamaño del icono según el tamaño del botón
    const iconSize = size === 'sm' ? 'size-3.5' : size === 'xl' ? 'size-5' : 'size-4'

    const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      e.currentTarget.style.setProperty('--spot-x', `${x}px`)
      e.currentTarget.style.setProperty('--spot-y', `${y}px`)
      if (onMouseMove) onMouseMove(e)
    }

    return (
      <motion.button
        ref={ref as React.Ref<HTMLButtonElement>}
        type={props.type || 'button'}
        disabled={disabled}
        className={cn(
          guiraButtonVariants({ variant, size, active, fullWidth }),
          // Si tiene flecha, distribuir con justify-between
          (arrowNext || arrowBack) && 'justify-between',
          // Overflow hidden needed for the shine effect on primary
          variant === 'primary' && 'overflow-hidden',
          className
        )}
        onMouseMove={handleMouseMove}
        whileHover={disabled ? {} : { scale: 1.015, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
        whileTap={disabled ? {} : { scale: 0.975 }}
        style={{
          '--spot-x': '50%',
          '--spot-y': '50%',
        } as React.CSSProperties}
        {...props}
      >
        {/* Spotlight glow overlay on primary buttons */}
        {!disabled && variant === 'primary' && (
          <div
            className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover/guira-btn:opacity-100"
            style={{
              background: 'radial-gradient(120px circle at var(--spot-x) var(--spot-y), rgba(255,255,255,0.15), transparent 60%)',
            }}
          />
        )}

        <div className="relative z-10 flex w-full items-center justify-center gap-[inherit] pointer-events-none" style={{ justifyContent: (arrowNext || arrowBack) ? 'space-between' : 'center' }}>
          {/* ── Flecha back animada */}
          {arrowBack && (
            <span className="flex items-center justify-center transition-transform duration-200 ease-in-out group-hover/guira-btn:-translate-x-1 group-disabled/guira-btn:translate-x-0">
              <ArrowLeft className={cn(iconSize, 'text-current opacity-70 transition-colors duration-200 group-hover/guira-btn:opacity-100')} />
            </span>
          )}

          {/* ── Icono de inicio */}
          {IconStart && !arrowBack && (
            <IconStart className={cn(iconSize, 'shrink-0')} />
          )}

          {/* ── Contenido */}
          <span className="transition-colors duration-200">
            {children}
          </span>

          {/* ── Icono de fin */}
          {IconEnd && !arrowNext && (
            <IconEnd className={cn(iconSize, 'shrink-0')} />
          )}

          {/* ── Flecha next animada */}
          {arrowNext && (
            <span className="flex items-center justify-center transition-transform duration-200 ease-in-out group-hover/guira-btn:translate-x-1 group-disabled/guira-btn:translate-x-0">
              <ArrowRight className={cn(iconSize, 'text-current')} />
            </span>
          )}
        </div>
      </motion.button>
    )
  }
)
GuiraButton.displayName = 'GuiraButton'

/* ─────────────────────────────────────────────────
   GuiraTabGroup — Contenedor para botones variant="tab"
   Agrega la línea inferior y el spacing uniforme.
   ───────────────────────────────────────────────── */
export function GuiraTabGroup({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex border-b border-border/50', className)} role="tablist">
      {children}
    </div>
  )
}

export { guiraButtonVariants }
