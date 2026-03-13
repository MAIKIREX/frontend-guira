export type OrderType = 'BO_TO_WORLD' | 'WORLD_TO_BO' | 'US_TO_WALLET' | 'CRYPTO_TO_CRYPTO'
export type ProcessingRail = 'ACH' | 'SWIFT' | 'PSAV' | 'DIGITAL_NETWORK'
export type OrderStatus = 'created' | 'waiting_deposit' | 'deposit_received' | 'processing' | 'sent' | 'completed' | 'failed'

export interface PaymentOrder {
  id: string
  user_id: string
  order_type: OrderType
  processing_rail: ProcessingRail
  amount_origin: number
  origin_currency: string
  amount_converted: number
  destination_currency: string
  exchange_rate_applied: number
  fee_total: number
  status: OrderStatus
  beneficiary_id?: string | null
  supplier_id?: string | null
  metadata?: Record<string, unknown>
  evidence_url?: string
  support_document_url?: string
  staff_comprobante_url?: string
  created_at: string
  updated_at: string
}
