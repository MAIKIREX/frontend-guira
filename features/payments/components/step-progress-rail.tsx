'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface StepProgressRailProps<T extends string> {
  currentStep: T
  steps: T[]
  getStepLabel: (step: T) => string
}

export function StepProgressRail<T extends string>({ currentStep, steps, getStepLabel }: StepProgressRailProps<T>) {
  const currentIndex = steps.indexOf(currentStep)
  const progress = ((currentIndex + 1) / steps.length) * 100

  return (
    <div className="w-full">
      {/* Mobile view: simplified text progress */}
      <div className="mb-6 md:hidden">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary/80">Progreso del flujo</span>
            <h4 className="text-sm font-semibold text-foreground">
              Paso {currentIndex + 1} de {steps.length}: <span className="text-muted-foreground">{getStepLabel(currentStep)}</span>
            </h4>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono font-bold text-primary">{Math.round((currentIndex / (steps.length - 1)) * 100)}%</span>
          </div>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted/30">
          <motion.div
            animate={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
            className="h-full bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.4)]"
            initial={{ width: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Desktop view: circular rail */}
      <div className="hidden md:block">
        <div className="flex items-start justify-between">
          {steps.map((step, index) => {
            const isCurrent = step === currentStep
            const isReached = currentIndex >= index
            const isComplete = currentIndex > index
            const lineFilled = currentIndex > index ? '100%' : '0%'

            return (
              <div
                key={step}
                className="relative flex flex-1 flex-col items-center px-2"
              >
                {/* Connector line - Absolute positioned behind the step */}
                {index < steps.length - 1 ? (
                  <div className="absolute left-[calc(50%+1.75rem)] top-6 w-[calc(100%-3.5rem)] -translate-y-1/2">
                    <div className="relative h-[2px] w-full rounded-full bg-border/30">
                      <motion.div
                        animate={{ width: lineFilled }}
                        className="absolute inset-y-0 left-0 rounded-full bg-primary shadow-[0_0_8px_oklch(var(--primary)/0.4)]"
                        initial={false}
                        transition={{ duration: 0.4, ease: 'easeInOut' }}
                      />
                    </div>
                  </div>
                ) : null}

                <div className="relative">
                  {/* Pulse effect for current step */}
                  {isCurrent && (
                    <div className="absolute inset-x-[-4px] inset-y-[-4px] rounded-full bg-primary/20 animate-ping" />
                  )}
                  
                  <motion.div
                    animate={{
                      scale: isCurrent ? 1.05 : 1,
                    }}
                    className={cn(
                      "relative z-10 flex size-12 items-center justify-center rounded-full border-[1.5px] text-sm font-bold text-foreground transition-all duration-300 shadow-sm",
                      isCurrent
                        ? "bg-primary/20 border-primary/55 ring-8 ring-primary/10"
                        : isComplete
                          ? "bg-primary/20 border-primary/45"
                          : "bg-white/5 border-slate-400/20"
                    )}
                    initial={false}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    <motion.span
                      animate={{ opacity: isReached ? 1 : 0.7 }}
                      initial={false}
                      transition={{ duration: 0.2 }}
                    >
                      {index + 1}
                    </motion.span>
                  </motion.div>
                </div>

                <motion.div
                  animate={{ opacity: isCurrent ? 1 : isReached ? 0.9 : 0.65 }}
                  className={cn(
                    "mt-4 w-full px-2 text-center text-xs font-semibold tracking-tight transition-colors",
                    isCurrent ? "text-foreground" : "text-muted-foreground"
                  )}
                  initial={false}
                  transition={{ duration: 0.22 }}
                >
                  {getStepLabel(step)}
                </motion.div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
