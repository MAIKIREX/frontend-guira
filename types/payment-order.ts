export type OrderType = 'BO_TO_WORLD' | 'WORLD_TO_BO' | 'US_TO_WALLET' | 'CRYPTO_TO_CRYPTO'
export type ProcessingRail = 'ACH' | 'SWIFT' | 'PSAV' | 'DIGITAL_NETWORK'
export type OrderStatus =
  | 'created'
  | 'waiting_deposit'
  | 'deposit_received'
  | 'processing'
  | 'sent'
  | 'completed'
  | 'failed'

export type DeliveryMethod = 'swift' | 'ach' | 'crypto'
export type FundingMethod = 'bs' | 'crypto' | 'ach' | 'wallet'
export type OrderFileField = 'support_document_url' | 'evidence_url'

export interface PaymentOrderMetadata {
  delivery_method: DeliveryMethod
  payment_reason: string
  intended_amount: number
  destination_address: string
  stablecoin: string
  quote_prepared_at?: string
  quote_prepared_by?: string
  client_quote_accepted_at?: string
  funding_method?: FundingMethod
  swift_details?: {
    bankName: string
    swiftCode: string
    iban: string
    bankAddress: string
    country: string
  }
  ach_details?: {
    routingNumber: string
    accountNumber: string
    bankName: string
  }
  crypto_destination?: {
    address: string
    network: string
  }
  reference?: string
  completed_at?: string
  rejection_reason?: string
}

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
  metadata?: PaymentOrderMetadata | Record<string, unknown>
  evidence_url?: string
  support_document_url?: string
  staff_comprobante_url?: string
  created_at: string
  updated_at: string
}

export interface FeeConfigRow {
  id: string
  type: string
  fee_type: string
  value: number
  currency: string
}

export interface AppSettingRow {
  id?: string
  key?: string
  name?: string
  value?: string | number | boolean | null
  [key: string]: unknown
}

export interface PsavConfigRow {
  id: string
  is_active?: boolean
  [key: string]: unknown
}

export interface PaymentSnapshot {
  suppliers: import('@/types/supplier').Supplier[]
  paymentOrders: PaymentOrder[]
  activityLogs: import('@/types/activity-log').ActivityLog[]
  feesConfig: FeeConfigRow[]
  appSettings: AppSettingRow[]
  psavConfigs: PsavConfigRow[]
  gaps: string[]
}

export interface CreatePaymentOrderInput {
  user_id: string
  order_type: OrderType
  processing_rail: ProcessingRail
  amount_origin: number
  origin_currency: string
  amount_converted: number
  destination_currency: string
  exchange_rate_applied: number
  fee_total: number
  beneficiary_id?: string | null
  supplier_id?: string | null
  metadata: PaymentOrderMetadata
}

export interface OrderFileUploadResult {
  publicUrl: string
  order: PaymentOrder
}

export interface SupplierUpsertInput {
  user_id: string
  name: string
  country: string
  payment_method: 'bank' | 'crypto'
  bank_details?: {
    bank_name: string
    swift_code: string
    account_number: string
    bank_country: string
  }
  crypto_details?: {
    address: string
  }
  address: string
  phone: string
  email: string
  tax_id: string
}

