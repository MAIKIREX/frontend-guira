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
    description: 'Expediente WORLD_TO_BO para depositos desde el exterior con destino Bolivia.',
    supportedDeliveryMethods: ['ach'],
  },
  {
    key: 'us_to_wallet',
    label: 'USA a wallet',
    description: 'Expediente US_TO_WALLET para fondeo PSAV con entrega final a wallet.',
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

export function resolveFlowType(route: SupportedPaymentRoute, deliveryMethod?: string): string {
  switch (route) {
    case 'bolivia_to_exterior':
      return deliveryMethod === 'crypto' ? 'bolivia_to_wallet' : 'bolivia_to_world'
    case 'us_to_bolivia':
      return 'world_to_bolivia'
    case 'us_to_wallet':
      return 'world_to_wallet' // AHORA ES UN FLUJO INTERBANCARIO 1.5
    case 'crypto_to_crypto':
      return 'wallet_to_wallet'
  }
}

export function buildPaymentOrderPayload(
  values: PaymentOrderFormValues,
  userId: string,
  supplier?: any
): any {
  const flowType = resolveFlowType(values.route, values.delivery_method)

  const payload: any = {
    flow_type: flowType,
    amount: values.amount_origin,
    business_purpose: values.payment_reason || 'Operación interbancaria',
    destination_currency: values.destination_currency,
    notes: `Route: ${values.route} | Delivery: ${values.delivery_method}`,
    supplier_id: supplier?.id || undefined
  }

  // INCORPORACIÓN DE DATA ESPECÍFICA SEGÚN FLUJO:
  switch (flowType) {
    case 'bolivia_to_world':
      // 1.1 Fiat — external_account_id requerido por el DTO backend
      payload.external_account_id =
        supplier?.bridge_external_account_id ||
        supplier?.id ||
        undefined
      break
    case 'bolivia_to_wallet':
      // 1.3 Crypto (Fondeo fiat local entonces no necesita source network)
      payload.destination_address = values.crypto_address || supplier?.bank_details?.wallet_address
      payload.destination_network = values.crypto_network || supplier?.bank_details?.wallet_network
      payload.destination_currency = values.destination_currency
      break
    case 'wallet_to_wallet':
      // 1.2 Crypto to Crypto
      payload.source_network = values.source_crypto_network
      payload.source_address = values.source_crypto_address
      payload.source_currency = values.origin_currency 
      
      payload.destination_address = values.crypto_address || supplier?.bank_details?.wallet_address
      payload.destination_network = values.crypto_network || supplier?.bank_details?.wallet_network
      payload.destination_currency = values.destination_currency
      break
    case 'world_to_bolivia':
      // 1.4 Fiat Depósito a Bolivia
      payload.destination_bank_name = values.ach_bank_name || values.swift_bank_name
      payload.destination_account_number = values.ach_account_number || values.swift_iban
      payload.destination_account_holder = values.destination_account_holder || 'Titular no especificado'
      break
    case 'world_to_wallet':
      // 1.5 Depósito USA a VA
      // virtual_account_id se inyectará en Backend
      break
  }

  return payload
}

