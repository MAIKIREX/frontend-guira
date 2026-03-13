import { jsPDF } from 'jspdf'
import type { PaymentOrder } from '@/types/payment-order'
import type { Supplier } from '@/types/supplier'

const PAGE_WIDTH = 170
const START_X = 20
const START_Y = 20
const LINE_HEIGHT = 7

export function generatePaymentPdf(order: PaymentOrder, supplier?: Supplier | null) {
  const doc = new jsPDF()
  const metadata = order.metadata ?? {}

  doc.setFontSize(18)
  doc.text('Comprobante operativo', START_X, START_Y)

  doc.setFontSize(11)
  const rows = [
    ['Expediente', order.id],
    ['Estado', order.status],
    ['Tipo', order.order_type],
    ['Rail', order.processing_rail],
    ['Monto origen', `${order.amount_origin} ${order.origin_currency}`],
    ['Monto destino', `${order.amount_converted} ${order.destination_currency}`],
    ['Tipo de cambio', toDisplayValue(order.exchange_rate_applied)],
    ['Fee total', toDisplayValue(order.fee_total)],
    ['Motivo', readString(metadata, 'payment_reason')],
    ['Metodo entrega', readString(metadata, 'delivery_method')],
    ['Direccion destino', readString(metadata, 'destination_address')],
    ['Stablecoin', readString(metadata, 'stablecoin')],
    ['Proveedor', supplier?.name ?? 'No asignado'],
    ['Referencia', readString(metadata, 'reference')],
    ['Motivo rechazo', readString(metadata, 'rejection_reason')],
    ['Creado', formatDateTime(order.created_at)],
    ['Actualizado', formatDateTime(order.updated_at)],
    ['Completado', readString(metadata, 'completed_at') ? formatDateTime(readString(metadata, 'completed_at')) : 'N/D'],
  ]

  let y = 34
  rows.forEach(([label, value]) => {
    const wrapped = doc.splitTextToSize(`${label}: ${value || 'N/D'}`, PAGE_WIDTH)

    if (y + wrapped.length * LINE_HEIGHT > 280) {
      doc.addPage()
      y = START_Y
    }

    doc.text(wrapped, START_X, y)
    y += wrapped.length * LINE_HEIGHT + 1
  })

  doc.save(`payment-order-${order.id.slice(0, 8)}.pdf`)
}

function readString(metadata: PaymentOrder['metadata'], key: string) {
  if (!metadata || typeof metadata !== 'object') return ''
  const value = metadata[key as keyof typeof metadata]
  return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}

function toDisplayValue(value: unknown) {
  if (value === null || value === undefined || value === '') return 'N/D'
  return String(value)
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('es-BO')
}
