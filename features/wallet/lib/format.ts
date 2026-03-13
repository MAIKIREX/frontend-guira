const ISO_CURRENCIES = new Set(['USD'])

export function formatMoney(value: number, currency: string) {
  if (ISO_CURRENCIES.has(currency)) {
    return new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value)
  }

  return `${new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} ${currency}`
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
