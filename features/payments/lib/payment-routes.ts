import type {
  CreatePaymentOrderInput,
  DeliveryMethod,
  PaymentOrderMetadata,
} from '@/types/payment-order'
import type { PaymentOrderFormValues } from '@/features/payments/schemas/payment-order.schema'

export type SupportedPaymentRoute =
  | 'bolivia_to_exterior'
  | 'us_to_bolivia'
  | 'us_to_wallet'
  | 'crypto_to_crypto'

export const supportedPaymentRoutes: Array<{
  key: SupportedPaymentRoute
  label: string
  description: string
  supportedDeliveryMethods: DeliveryMethod[]
}> = [
  {
    key: 'bolivia_to_exterior',
    label: 'Bolivia al exterior',
    description: 'Expediente BO_TO_WORLD con entrega SWIFT, ACH o crypto.',
    supportedDeliveryMethods: ['swift', 'ach', 'crypto'],
  },
  {
    key: 'us_to_bolivia',
    label: 'Exterior a Bolivia',
    description: 'Expediente WORLD_TO_BO con entrega SWIFT, ACH o crypto.',
    supportedDeliveryMethods: ['swift', 'ach', 'crypto'],
  },
  {
    key: 'us_to_wallet',
    label: 'USA a wallet',
    description: 'Expediente US_TO_WALLET usando el rail PSAV documentado.',
    supportedDeliveryMethods: ['ach'],
  },
  {
    key: 'crypto_to_crypto',
    label: 'Crypto a crypto',
    description: 'Expediente CRYPTO_TO_CRYPTO con DIGITAL_NETWORK.',
    supportedDeliveryMethods: ['crypto'],
  },
]

export const unsupportedPaymentRoutes = [
  'bank_to_crypto',
  'crypto_to_bank',
] as const

export function getDefaultRouteForAction(action?: string | null): SupportedPaymentRoute {
  if (action === 'fund') return 'us_to_wallet'
  return 'bolivia_to_exterior'
}

export function buildPaymentOrderPayload(
  values: PaymentOrderFormValues,
  userId: string
): CreatePaymentOrderInput {
  return {
    user_id: userId,
    order_type: resolveOrderType(values.route),
    processing_rail: resolveProcessingRail(values.route, values.delivery_method),
    amount_origin: values.amount_origin,
    origin_currency: values.origin_currency,
    amount_converted: values.amount_converted,
    destination_currency: values.destination_currency,
    exchange_rate_applied: values.exchange_rate_applied,
    fee_total: values.fee_total,
    supplier_id: values.supplier_id || null,
    beneficiary_id: null,
    metadata: buildMetadata(values),
  }
}

function resolveOrderType(route: SupportedPaymentRoute): CreatePaymentOrderInput['order_type'] {
  switch (route) {
    case 'bolivia_to_exterior':
      return 'BO_TO_WORLD'
    case 'us_to_bolivia':
      return 'WORLD_TO_BO'
    case 'us_to_wallet':
      return 'US_TO_WALLET'
    case 'crypto_to_crypto':
      return 'CRYPTO_TO_CRYPTO'
  }
}

function resolveProcessingRail(
  route: SupportedPaymentRoute,
  deliveryMethod: DeliveryMethod
): CreatePaymentOrderInput['processing_rail'] {
  if (route === 'us_to_wallet') return 'PSAV'
  if (route === 'crypto_to_crypto') return 'DIGITAL_NETWORK'
  if (deliveryMethod === 'swift') return 'SWIFT'
  if (deliveryMethod === 'ach') return 'ACH'
  return 'DIGITAL_NETWORK'
}

function buildMetadata(values: PaymentOrderFormValues): PaymentOrderMetadata {
  const metadata: PaymentOrderMetadata = {
    delivery_method: values.delivery_method,
    payment_reason: values.payment_reason,
    intended_amount: values.intended_amount,
    destination_address: values.destination_address,
    stablecoin: values.stablecoin,
  }

  if (values.route === 'bolivia_to_exterior' || values.route === 'us_to_bolivia') {
    metadata.funding_method = values.funding_method
  }

  if (values.delivery_method === 'swift') {
    metadata.swift_details = {
      bankName: values.swift_bank_name ?? '',
      swiftCode: values.swift_code ?? '',
      iban: values.swift_iban ?? '',
      bankAddress: values.swift_bank_address ?? '',
      country: values.swift_country ?? '',
    }
  }

  if (values.delivery_method === 'ach') {
    metadata.ach_details = {
      routingNumber: values.ach_routing_number ?? '',
      accountNumber: values.ach_account_number ?? '',
      bankName: values.ach_bank_name ?? '',
    }
  }

  if (values.delivery_method === 'crypto') {
    metadata.crypto_destination = {
      address: values.crypto_address ?? '',
      network: values.crypto_network ?? '',
    }
  }

  return metadata
}
