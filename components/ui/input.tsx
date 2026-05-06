import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  const isFile = type === "file"

  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        isFile
          ? "flex h-11 w-full min-w-0 rounded-md border border-dashed border-input bg-muted/10 px-3 py-2 text-sm transition-colors duration-[150ms] ease-out outline-none file:mr-3 file:inline-flex file:h-7 file:cursor-pointer file:rounded-sm file:border-0 file:bg-foreground/8 file:px-3 file:text-[11px] file:font-medium file:uppercase file:tracking-[0.18em] file:text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/12 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/20"
          : "flex h-11 w-full min-w-0 rounded-md border border-[0.5px] border-input/60 bg-background/50 px-3 py-2 text-sm transition-all duration-[150ms] ease-out outline-none placeholder:text-muted-foreground/70 hover:border-input focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/12 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-background/20 dark:disabled:bg-muted/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
