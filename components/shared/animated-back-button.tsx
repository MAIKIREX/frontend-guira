import React from 'react'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AnimatedBackButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

export const AnimatedBackButton = React.forwardRef<HTMLButtonElement, AnimatedBackButtonProps>(
  ({ className, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={props.type || "button"}
        disabled={disabled}
        className={cn(
          "group flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border bg-background px-5 py-3 text-foreground shadow-sm transition-all duration-200 ease-in-out hover:bg-muted/60 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-background disabled:hover:shadow-sm",
          className
        )}
        {...props}
      >
        <span className="flex items-center justify-center transition-transform duration-200 ease-in-out group-hover:-translate-x-1 group-disabled:-translate-x-0">
          <ArrowLeft className="size-4 text-muted-foreground transition-colors duration-200 group-hover:text-foreground" />
        </span>
        
        <span className="text-sm font-semibold tracking-wide transition-colors duration-200">
          {children}
        </span>
      </button>
    )
  }
)
AnimatedBackButton.displayName = "AnimatedBackButton"
