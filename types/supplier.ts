export interface Supplier {
  id?: string
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
