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

export function buildPaymentOrderPayload(
  values: PaymentOrderFormValues,
  userId: string
): any {
  // Eliminamos el objeto "metadata" y propagamos al nivel raíz
  // Mapeamos según el nuevo esquema del Backend
  return {
    user_id: userId,
    flow_type: resolveFlowType(values.route),
    amount: values.amount_origin,
    business_purpose: values.payment_reason || 'Servicios',
    external_account_id: values.supplier_id || null, // temporalmente mapeando supplier_id aquí si aplica
    destination_currency: values.destination_currency,
    notes: `Route: ${values.route} | Delivery: ${values.delivery_method}`
  }
}

function resolveFlowType(route: SupportedPaymentRoute): string {
  switch (route) {
    case 'bolivia_to_exterior':
      return 'bolivia_to_world'
    case 'us_to_bolivia':
      return 'world_to_bolivia'
    case 'us_to_wallet':
      return 'fiat_us_to_bridge_wallet'
    case 'crypto_to_crypto':
      return 'wallet_to_wallet'
  }
}

