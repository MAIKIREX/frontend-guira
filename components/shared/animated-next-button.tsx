import React from 'react'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AnimatedNextButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

export const AnimatedNextButton = React.forwardRef<HTMLButtonElement, AnimatedNextButtonProps>(
  ({ className, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={props.type || "button"}
        disabled={disabled}
        className={cn(
          "group flex cursor-pointer items-center justify-between gap-4 rounded-full bg-primary px-6 py-3.5 text-primary-foreground shadow-[0_8px_20px_rgb(0,0,0,0.08)] transition-all duration-300 ease-out hover:bg-primary/90 hover:shadow-[0_8px_25px_rgb(0,0,0,0.15)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary disabled:hover:shadow-[0_8px_20px_rgb(0,0,0,0.08)]",
          className
        )}
        {...props}
      >
        <span className="text-sm font-semibold tracking-wide transition-colors duration-200">
          {children}
        </span>

        <span className="flex items-center justify-center transition-transform duration-200 ease-in-out group-hover:translate-x-1 group-disabled:translate-x-0">
          <ArrowRight className="size-4 text-primary-foreground" />
        </span>
      </button>
    )
  }
)
AnimatedNextButton.displayName = "AnimatedNextButton"
