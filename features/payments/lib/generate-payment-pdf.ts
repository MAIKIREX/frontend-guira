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

  // Resolve V1/V2 field values
  const orderType = order.flow_type ?? order.order_type ?? 'N/D'
  const rail = order.flow_category ?? order.processing_rail ?? 'N/D'
  const amountOrigin = order.amount_origin ?? order.amount ?? 0
  const originCurrency = order.origin_currency ?? order.currency ?? ''
  const amountDest = order.amount_converted ?? order.amount_destination ?? 0
  const destCurrency = order.destination_currency ?? order.currency ?? ''
  const fee = order.fee_total ?? order.fee_amount ?? 0

  doc.setFontSize(11)
  const rows = [
    ['Expediente', order.id],
    ['Estado', order.status],
    ['Tipo', orderType],
    ['Rail', rail],
    ['Monto origen', `${amountOrigin} ${originCurrency}`],
    ['Monto destino', `${amountDest} ${destCurrency}`],
    ['Tipo de cambio', toDisplayValue(order.exchange_rate_applied)],
    ['Fee total', toDisplayValue(fee)],
    ['Proposito', order.business_purpose ?? readString(metadata, 'payment_reason')],
    ['Metodo entrega', readString(metadata, 'delivery_method')],
    ['Direccion destino', order.destination_address ?? readString(metadata, 'destination_address')],
    ['Stablecoin', readString(metadata, 'stablecoin')],
    ['Proveedor', supplier?.name ?? 'No asignado'],
    ['Referencia', order.provider_reference ?? readString(metadata, 'reference')],
    ['Motivo rechazo', order.failure_reason ?? readString(metadata, 'rejection_reason')],
    ['Creado', formatDateTime(order.created_at)],
    ['Actualizado', formatDateTime(order.updated_at)],
    ['Completado', order.completed_at ? formatDateTime(order.completed_at) : readString(metadata, 'completed_at') ? formatDateTime(readString(metadata, 'completed_at')) : 'N/D'],
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
