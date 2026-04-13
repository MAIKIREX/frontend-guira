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

export function getErrorMessage(error: unknown, fallbackMessage = 'Ha ocurrido un error inesperado.'): string {
  if (error === null || error === undefined) {
    return fallbackMessage;
  }

  if (typeof error === 'object') {
    const axiosError = error as any;
    if (axiosError.response?.data?.message) {
      const msg = axiosError.response.data.message;
      return Array.isArray(msg) ? msg[0] : msg;
    }
    
    if (axiosError.response?.data?.error) {
      return axiosError.response.data.error;
    }

    if ('message' in error && typeof (error as Error).message === 'string') {
      return (error as Error).message;
    }
  }

  if (typeof error === 'string') {
    return error;
  }

  return fallbackMessage;
}
