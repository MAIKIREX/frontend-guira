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
export type OrderFileField = 'supporting_document_url' | 'support_document_url' | 'evidence_url'
export type ReceiveVariant = 'bank_account' | 'bank_qr' | 'wallet'
export type UiMethodGroup = 'bank' | 'crypto'

export interface PaymentOrderMetadata {
  route?: 'bolivia_to_exterior' | 'us_to_bolivia' | 'us_to_wallet' | 'crypto_to_crypto'
  delivery_method: DeliveryMethod
  payment_reason: string
  intended_amount: number
  destination_address: string
  stablecoin: string
  receive_variant?: ReceiveVariant
  ui_method_group?: UiMethodGroup
  instructions_source?: 'psav' | 'guira_hardcoded' | 'supplier'
  supplier_validation_note?: string
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
  // ── Legacy fields (existing payment_orders) — opcionales para compatibilidad V2 ──
  order_type?: OrderType
  processing_rail?: ProcessingRail
  amount_origin?: number
  origin_currency?: string
  amount_converted?: number
  destination_currency?: string
  exchange_rate_applied?: number
  fee_total?: number
  status: OrderStatus
  beneficiary_id?: string | null
  supplier_id?: string | null
  metadata?: PaymentOrderMetadata | Record<string, unknown>
  evidence_url?: string
  support_document_url?: string
  staff_comprobante_url?: string
  created_at: string
  updated_at: string
  // ── New backend fields (payment_orders v2) ──
  flow_type?: string
  flow_category?: 'interbank' | 'wallet_ramp'
  requires_psav?: boolean
  wallet_id?: string
  amount?: number
  currency?: string
  fee_amount?: number
  net_amount?: number
  // Source
  source_type?: string
  source_currency?: string
  source_address?: string
  source_network?: string
  // Destination
  destination_type?: string
  destination_bank_name?: string
  destination_account_number?: string
  destination_account_holder?: string
  destination_qr_url?: string
  destination_address?: string
  destination_network?: string
  external_account_id?: string
  // PSAV / Admin
  psav_deposit_instructions?: Record<string, unknown>
  deposit_proof_url?: string
  approved_by?: string
  approved_at?: string
  amount_destination?: number
  // Bridge
  bridge_transfer_id?: string
  bridge_source_deposit_instructions?: Record<string, unknown>
  // Tracking
  tx_hash?: string
  provider_reference?: string
  receipt_url?: string
  // Metadatos
  business_purpose?: string
  supporting_document_url?: string
  notes?: string
  failure_reason?: string
  completed_at?: string
}

export interface FeeConfigRow {
  id: string
  type?: string
  fee_type?: string
  value?: string | number
  currency?: string
  operation_type?: string
  fee_percent?: string | number
  fee_fixed?: string | number
  min_fee?: string | number
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
  name?: string
  type?: string
  bank_name?: string
  account_number?: string
  routing_number?: string
  account_holder?: string
  currency?: string
  is_active?: boolean
  qr_url?: string
  crypto_address?: string
  crypto_network?: string
  metadata?: Record<string, unknown>
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
  payment_method: string
  bank_details?: {
    ach?: {
      bank_name: string
      routing_number: string
      account_number: string
      bank_country?: string
    }
    swift?: {
      bank_name: string
      swift_code: string
      account_number: string
      bank_country: string
      iban?: string
      bank_address?: string
    }
  }
  crypto_details?: {
    address: string
    network?: string
  }
  address: string
  phone: string
  email: string
  tax_id: string
}
