import type {
  CreatePaymentOrderInput,
  DeliveryMethod,
  PaymentOrderMetadata,
} from '@/types/payment-order'
import type { PaymentOrderFormValues } from '@/features/payments/schemas/payment-order.schema'

export type SupportedPaymentRoute =
  | 'bolivia_to_exterior'
  | 'world_to_bolivia'
  | 'us_to_wallet'
  | 'crypto_to_crypto'
  | 'wallet_ramp_deposit'
  | 'wallet_ramp_withdraw'
  | 'wallet_to_fiat'

export const supportedPaymentRoutes: Array<{
  key: SupportedPaymentRoute
  label: string
  description: string
  supportedDeliveryMethods: DeliveryMethod[]
  disabled?: boolean
  hidden?: boolean
  category?: 'interbank' | 'ramp'
}> = [
    {
      key: 'bolivia_to_exterior',
      label: 'Bolivia al exterior',
      description: 'Envía dinero desde Bolivia hacia cualquier cuenta en el extranjero.',
      supportedDeliveryMethods: ['swift', 'ach', 'crypto'],
      category: 'interbank',
    },
    {
      key: 'world_to_bolivia',
      label: 'Exterior a Bolivia',
      description: 'Recibe fondos del exterior directamente en tu cuenta bancaria local.',
      supportedDeliveryMethods: ['ach'],
      category: 'interbank',
    },
    {
      key: 'us_to_wallet',
      label: 'USA a wallet',
      description: 'Recibe transferencias desde EE.UU. directamente en tu billetera crypto.',
      supportedDeliveryMethods: ['ach'],
      disabled: true,
      hidden: true,
      category: 'interbank',
    },
    {
      key: 'crypto_to_crypto',
      label: 'Crypto a crypto',
      description: 'Transfiere activos digitales entre billeteras de forma rápida y segura.',
      supportedDeliveryMethods: ['crypto'],
      category: 'interbank',
    },
    {
      key: 'wallet_ramp_deposit',
      label: 'Deposita a tu Billetera Digital',
      description: 'Añade saldo a tu billetera digital usando moneda local, dólares o cripto.',
      supportedDeliveryMethods: [], // no aplica delivery method técnico
      category: 'ramp',
    },
    {
      key: 'wallet_ramp_withdraw',
      label: 'Retirar fondos de mi Billetera Digital',
      description: 'Transfiere el saldo de tu billetera a tu cuenta bancaria o cuenta externa.',
      supportedDeliveryMethods: [], // no aplica delivery method técnico
      category: 'ramp',
    },
    {
      key: 'wallet_to_fiat',
      label: 'Wallet → Cuenta Bancaria',
      description: 'Convierte y envía tus criptomonedas directo a una cuenta bancaria.',
      supportedDeliveryMethods: [],
      hidden: true,
      category: 'interbank',
    },
  ]

export const unsupportedPaymentRoutes = [
  'bank_to_crypto',
  'crypto_to_bank',
] as const

export function getDefaultRouteForAction(action?: string | null): SupportedPaymentRoute {
  if (action === 'fund') return 'world_to_bolivia'
  if (action === 'withdraw') return 'wallet_ramp_withdraw'
  return 'bolivia_to_exterior'
}

export function resolveFlowType(route: SupportedPaymentRoute, deliveryMethod?: string, walletRampMethod?: string, walletRampWithdrawMethod?: string): string {
  switch (route) {
    case 'bolivia_to_exterior':
      return deliveryMethod === 'crypto' ? 'bolivia_to_wallet' : 'bolivia_to_world'
    case 'world_to_bolivia':
      return 'world_to_bolivia'
    case 'us_to_wallet':
      return 'world_to_wallet' // AHORA ES UN FLUJO INTERBANCARIO 1.5
    case 'crypto_to_crypto':
      return 'wallet_to_wallet'
    case 'wallet_ramp_deposit':
      if (walletRampMethod === 'fiat_bo') return 'fiat_bo_to_bridge_wallet'
      return 'crypto_to_bridge_wallet'
    case 'wallet_ramp_withdraw':
      if (walletRampWithdrawMethod === 'crypto') return 'bridge_wallet_to_crypto'
      if (walletRampWithdrawMethod === 'fiat_us') return 'bridge_wallet_to_fiat_us'
      return 'bridge_wallet_to_fiat_bo'
    case 'wallet_to_fiat':
      return 'wallet_to_fiat'
  }
}

export function buildPaymentOrderPayload(
  values: PaymentOrderFormValues,
  userId: string,
  supplier?: Record<string, unknown>
): Record<string, unknown> {
  const flowType = resolveFlowType(values.route, values.delivery_method, values.wallet_ramp_method, values.wallet_ramp_withdraw_method)
  const isWalletRamp = [
    'fiat_bo_to_bridge_wallet', 'crypto_to_bridge_wallet',
    'bridge_wallet_to_fiat_bo', 'bridge_wallet_to_crypto', 'bridge_wallet_to_fiat_us',
    'wallet_to_fiat',
  ].includes(flowType)

  const payload: Record<string, unknown> = {
    flow_type: flowType,
    amount: values.amount_origin,
    business_purpose: values.payment_reason || 'Operación interbancaria',
    destination_currency: values.destination_currency,
    notes: `Route: ${values.route} | Delivery: ${values.delivery_method}`,
    // supplier_id solo es aceptado por el DTO interbank, no el wallet_ramp
    ...(isWalletRamp ? {} : { supplier_id: supplier?.id || undefined }),
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
      payload.destination_network = (values.crypto_network || supplier?.bank_details?.wallet_network)?.toLowerCase()
      payload.destination_currency = values.destination_currency?.toLowerCase()
      break
    case 'wallet_to_wallet':
      // 1.2 Crypto to Crypto — destino resuelto en backend desde supplier_id
      payload.source_network = values.source_crypto_network?.toLowerCase()
      payload.source_address = values.source_crypto_address?.trim()
      payload.source_currency = values.origin_currency?.toLowerCase()
      // destination_address, destination_network, destination_currency los resuelve
      // el backend directamente desde el supplier seleccionado.
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
    case 'fiat_bo_to_bridge_wallet':
      payload.wallet_id = values.wallet_ramp_wallet_id
      payload.destination_currency = (values.wallet_ramp_destination_currency ?? values.destination_currency)?.toLowerCase()
      break
    case 'crypto_to_bridge_wallet':
      payload.wallet_id = values.wallet_ramp_wallet_id
      payload.source_network = values.wallet_ramp_source_network
      payload.source_currency = values.origin_currency?.toLowerCase()
      payload.destination_currency = (values.wallet_ramp_destination_currency ?? values.destination_currency)?.toLowerCase()
      payload.amount = 0 // flexible_amount: Bridge acepta cualquier monto; se actualiza por webhook
      break
    case 'bridge_wallet_to_fiat_bo':
      payload.wallet_id = values.wallet_ramp_wallet_id
      payload.source_currency = values.origin_currency?.toLowerCase()
      // Los datos bancarios (bank_name, account_number, account_holder)
      // ahora se leen del perfil del usuario en el backend (client_bank_accounts).
      // No se envían desde el formulario.
      break
    case 'bridge_wallet_to_crypto':
      payload.wallet_id = values.wallet_ramp_wallet_id
      payload.source_currency = values.origin_currency?.toLowerCase()
      payload.destination_address = values.crypto_address
      payload.destination_network = values.crypto_network?.toLowerCase()
      payload.destination_currency = values.destination_currency?.toLowerCase()
      break
    case 'bridge_wallet_to_fiat_us':
      payload.wallet_id = values.wallet_ramp_wallet_id
      payload.source_currency = values.origin_currency?.toLowerCase()
      // El backend resuelve la external_account a través del supplier (mismo patrón que wallet_to_fiat).
      payload.supplier_id = supplier?.id || undefined
      break
    case 'wallet_to_fiat':
      payload.source_network = values.wallet_to_fiat_source_network?.toLowerCase()
      payload.source_address = values.wallet_to_fiat_source_address
      payload.source_currency = values.wallet_to_fiat_source_currency?.toLowerCase()
      payload.supplier_id = supplier?.id
      payload.business_purpose = values.payment_reason
      break
  }

  return payload
}

