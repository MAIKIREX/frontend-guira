'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface StepProgressRailProps<TStep extends string> {
  currentStep: TStep
  steps: readonly TStep[]
  getStepLabel: (step: TStep) => string
}

export function StepProgressRail<TStep extends string>({
  currentStep,
  steps,
  getStepLabel,
}: StepProgressRailProps<TStep>) {
  const currentIndex = steps.indexOf(currentStep)

  return (
    <div className="overflow-x-auto py-2">
      <div className="flex min-w-max items-start justify-center gap-3 md:gap-4">
        {steps.map((step, index) => {
          const isCurrent = step === currentStep
          const isReached = currentIndex >= index
          const isComplete = currentIndex > index
          const lineFilled = currentIndex > index ? '100%' : '0%'

          return (
            <div
              key={step}
              className={cn(
                'relative flex min-w-[104px] flex-col items-center text-center sm:min-w-[116px] md:min-w-[128px]',
                index < steps.length - 1 && 'md:pr-4 lg:pr-6'
              )}
            >
              <motion.div
                animate={{
                  backgroundColor: isCurrent
                    ? 'rgba(34,211,238,0.18)'
                    : isComplete
                      ? 'rgba(16,185,129,0.18)'
                      : 'rgba(255,255,255,0.04)',
                  borderColor: isCurrent
                    ? 'rgba(34,211,238,0.55)'
                    : isComplete
                      ? 'rgba(16,185,129,0.45)'
                      : 'rgba(148,163,184,0.22)',
                  scale: isCurrent ? 1.06 : 1,
                  boxShadow: isCurrent ? '0 0 0 6px rgba(34,211,238,0.08)' : '0 0 0 0 rgba(0,0,0,0)',
                }}
                className="relative z-10 flex size-12 items-center justify-center rounded-full border text-sm font-semibold text-foreground"
                initial={false}
                transition={{ duration: 0.28, ease: 'easeOut' }}
              >
                <motion.span
                  animate={{ opacity: isReached ? 1 : 0.7, y: isCurrent ? -0.5 : 0 }}
                  initial={false}
                  transition={{ duration: 0.2 }}
                >
                  {index + 1}
                </motion.span>
              </motion.div>

              <motion.div
                animate={{ opacity: isCurrent ? 1 : isReached ? 0.92 : 0.7, y: isCurrent ? 0 : 1 }}
                className="mt-3 w-full px-1 text-center text-xs font-medium leading-4 text-foreground sm:text-sm"
                initial={false}
                transition={{ duration: 0.22 }}
              >
                {getStepLabel(step)}
              </motion.div>

              {index < steps.length - 1 ? (
                <div className="absolute left-[calc(50%+2rem)] top-6 hidden w-[calc(100%-4rem)] -translate-y-1/2 md:block">
                  <div className="relative h-px w-full rounded-full bg-border/70">
                    <motion.div
                      animate={{ width: lineFilled }}
                      className="absolute inset-y-0 left-0 rounded-full bg-cyan-400"
                      initial={false}
                      transition={{ duration: 0.35, ease: 'easeInOut' }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
