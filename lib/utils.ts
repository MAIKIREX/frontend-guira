import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const interactiveCardClassName =
  "transition-[background-color,border-color,box-shadow,transform] duration-200 hover:border-primary/35 hover:bg-muted/10 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"

export const interactiveClickableCardClassName = cn(
  interactiveCardClassName,
  "cursor-pointer"
)

export const interactiveRowClassName = cn(
  interactiveClickableCardClassName,
  "hover:bg-muted/20"
)
