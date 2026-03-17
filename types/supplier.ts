export type SupplierPaymentMethod = 'crypto' | 'ach' | 'swift'

export interface SupplierAchDetails {
  bank_name: string
  routing_number: string
  account_number: string
  bank_country?: string
}

export interface SupplierSwiftDetails {
  bank_name: string
  swift_code: string
  account_number: string
  bank_country: string
  iban?: string
  bank_address?: string
}

export interface SupplierBankDetails {
  ach?: SupplierAchDetails
  swift?: SupplierSwiftDetails
  bank_name?: string
  swift_code?: string
  account_number?: string
  bank_country?: string
  routing_number?: string
}

export interface Supplier {
  id?: string
  user_id: string
  name: string
  country: string
  payment_method: string | SupplierPaymentMethod[]
  bank_details?: SupplierBankDetails
  crypto_details?: {
    address: string
    network?: string
  }
  address: string
  phone: string
  email: string
  tax_id: string
}
