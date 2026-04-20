export type PaymentRail = 'ach' | 'wire' | 'sepa' | 'spei' | 'pix' | 'bre_b' | 'crypto';

export interface Supplier {
  id: string;
  user_id: string;
  name: string;
  country: string;
  currency: string;
  payment_rail: PaymentRail;
  bank_details: Record<string, unknown>; // JSONB
  contact_email?: string;
  notes?: string;
  bridge_external_account_id?: string | null; // relación a bridge_external_accounts
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BeneficiaryAddress {
  street_line_1: string;
  street_line_2?: string;
  city: string;
  state?: string;
  postal_code?: string;
  country: string; // ISO alpha-3
}

export interface CreateSupplierPayload {
  name: string;
  country: string;
  currency: string;
  payment_rail: PaymentRail;
  contact_email?: string;
  notes?: string;
  bank_name?: string;

  // ACH / Wire
  account_number?: string;
  routing_number?: string;
  checking_or_savings?: 'checking' | 'savings';
  address?: BeneficiaryAddress;

  // SEPA
  iban?: string;
  swift_bic?: string;
  iban_country?: string;
  account_owner_type?: 'individual' | 'business';
  first_name?: string;
  last_name?: string;
  business_name?: string;

  // SPEI
  clabe?: string;

  // PIX
  pix_key?: string;
  br_code?: string;
  document_number?: string;

  // Bre-B
  bre_b_key?: string;

  // Crypto
  wallet_address?: string;
  wallet_network?: string;
  wallet_currency?: string;
}
