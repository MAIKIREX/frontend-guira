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
          ? "flex h-11 w-full min-w-0 rounded-xl border border-dashed border-input bg-muted/10 px-3 py-2 text-sm transition-colors outline-none file:mr-3 file:inline-flex file:h-7 file:cursor-pointer file:rounded-full file:border-0 file:bg-foreground/8 file:px-3 file:text-[11px] file:font-semibold file:uppercase file:tracking-[0.18em] file:text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/20"
          : "h-11 w-full min-w-0 rounded-none border-0 border-b border-input bg-transparent px-0 py-0 text-base tracking-[0.01em] transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-transparent disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-0 md:text-sm dark:bg-transparent dark:disabled:bg-transparent dark:aria-invalid:border-destructive/50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
