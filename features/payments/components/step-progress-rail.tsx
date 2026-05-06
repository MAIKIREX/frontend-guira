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

  return (
    <div className="w-full">
      {/* Mobile view: simplified text progress */}
      <div className="mb-6 md:hidden">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Progreso del flujo</span>
            <h4 className="text-base font-semibold text-foreground">
              Paso {currentIndex + 1} de {steps.length}: <span className="text-muted-foreground">{getStepLabel(currentStep)}</span>
            </h4>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono font-bold text-primary">{Math.round((currentIndex / (steps.length - 1)) * 100)}%</span>
          </div>
        </div>
        <div className="mt-3 h-2 w-full rounded-full bg-muted/40">
          <motion.div
            animate={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent shadow-[0_0_8px] shadow-accent/40"
            initial={{ width: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Desktop view: glassmorphic rail */}
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
                {/* Connector line - glowing gradient track */}
                {index < steps.length - 1 ? (
                  <div className="absolute left-[calc(50%+1.5rem)] top-6 w-[calc(100%-3rem)] -translate-y-1/2">
                    <div className="relative h-[3px] w-full rounded-full bg-muted/40">
                      <motion.div
                        animate={{ width: lineFilled }}
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-accent shadow-[0_0_8px] shadow-accent/40"
                        initial={false}
                        transition={{ duration: 0.6, ease: 'easeInOut' }}
                      />
                    </div>
                  </div>
                ) : null}

                <div className="relative flex items-center justify-center">
                  {/* Step circle - Glassmorphism */}
                  <motion.div
                    animate={{
                      scale: isCurrent ? 1.1 : isComplete ? 1 : 0.95,
                    }}
                    className={cn(
                      "relative z-10 flex size-12 items-center justify-center rounded-full text-base font-bold transition-all duration-500",
                      isCurrent
                        ? "bg-primary/15 border border-primary/60 text-primary dark:text-white backdrop-blur-md shadow-lg shadow-primary/30"
                        : isComplete
                          ? "bg-primary text-primary-foreground border-transparent shadow-[0_0_12px] shadow-primary/40"
                          : "bg-muted/40 border border-border/60 text-muted-foreground backdrop-blur-sm"
                    )}
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    {isComplete ? (
                      <motion.svg
                        className="size-6 text-primary-foreground drop-shadow-sm"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <motion.path
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </motion.svg>
                    ) : (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        {index + 1}
                      </motion.span>
                    )}
                  </motion.div>
                </div>

                <motion.div
                  animate={{ 
                    opacity: isCurrent ? 1 : isReached ? 0.9 : 0.5,
                    y: isCurrent ? 0 : 2
                  }}
                  className={cn(
                    "mt-4 w-full px-2 text-center text-sm font-semibold tracking-tight transition-colors duration-300",
                    isCurrent ? "text-primary dark:text-foreground" : "text-muted-foreground"
                  )}
                  initial={false}
                  transition={{ duration: 0.3 }}
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
