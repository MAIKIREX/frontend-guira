import type { FeeConfigRow, PaymentOrder, PsavConfigRow, PsavDepositInstructionsPayload, BridgeDepositInstructionsPayload } from '@/types/payment-order'
import type { Supplier } from '@/types/supplier'
import type { SupportedPaymentRoute } from '@/features/payments/lib/payment-routes'


/** Registro de tipo de cambio desde exchange_rates_config (backend V2) */
export interface ExchangeRateRecord {
  id?: string
  pair: string
  rate: number
  spread_percent?: number
  effective_rate?: number
  updated_at?: string
}

type InstructionKind = 'bank' | 'wallet' | 'qr' | 'note'

export interface DepositInstruction {
  id: string
  title: string
  kind: InstructionKind
  detail: string
  accent?: string
  qrUrl?: string
  /** Valor para generar un QR en el cliente (ej. dirección cripto). */
  qrValue?: string
  /** Red blockchain (ej. Solana, Polygon, Tron). */
  network?: string
  /** Moneda de depósito (ej. USDC, USDT). */
  currency?: string
  bankCard?: {
    bankName: string
    accountHolder: string
    accountNumber: string
    routingNumber?: string
    country: string
  }
}

export interface RouteEstimate {
  amountConverted: number
  exchangeRateApplied: number
  feeTotal: number
}

export function estimateRouteValues(args: {
  amountOrigin: number
  route: SupportedPaymentRoute
  originCurrency: string
  destinationCurrency: string
  exchangeRates: ExchangeRateRecord[]
  feesConfig: FeeConfigRow[]
}) {
  const amountOrigin = Number.isFinite(args.amountOrigin) ? args.amountOrigin : 0

  const baseFeeTotal = resolveFeeTotal(args.feesConfig, amountOrigin, args.route)

  // Determinar el par de tipo de cambio correcto segun la ruta
  // bo_to_world -> BOB_USD (compra de dolares)
  // world_to_bo -> USD_BOB (venta de dolares)
  let ratePair = ''
  if (args.route === 'bolivia_to_exterior') {
    ratePair = 'BOB_USD'
  } else if (args.route === 'world_to_bolivia') {
    ratePair = 'USD_BOB'
  }

  // Buscar la tasa en exchange_rates_config cargado del backend
  const rateRecord = ratePair
    ? args.exchangeRates.find((r) => r.pair?.toUpperCase() === ratePair)
    : null

  let selectedBaseRate = rateRecord?.effective_rate ?? rateRecord?.rate ?? 1

  // Con la nueva semántica, la tasa siempre es "BOB por 1 USD"
  // BOB→USD: dividir. USD→BOB: multiplicar.
  const isBobToUsd = ratePair ? ratePair.startsWith('BOB_') : false;
  const netAmount = amountOrigin - baseFeeTotal;
  
  const amountConverted = isBobToUsd
    ? Math.max(netAmount / selectedBaseRate, 0)
    : Math.max(netAmount * selectedBaseRate, 0);

  return toEstimate({
    amountConverted,
    exchangeRateApplied: selectedBaseRate,
    feeTotal: baseFeeTotal,
  })
}

export function buildDepositInstructions(args: {
  route: SupportedPaymentRoute
  psavConfigs: PsavConfigRow[]
  selectedSupplier?: Supplier | null
}): DepositInstruction[] {
  const psavInstructions = getPsavInstructions(args.psavConfigs)

  switch (args.route) {
    case 'bolivia_to_exterior':
      return psavInstructions
    case 'world_to_bolivia': {
      // Buscar cuentas PSAV de tipo bank_us (USD) para recibir depósitos del exterior
      const usBankPsav = args.psavConfigs.filter(
        (c) => c.type === 'bank_us' && c.is_active
      )
      if (usBankPsav.length > 0) {
        return usBankPsav.map((c, i) => {
          const parts = [
            c.bank_name,
            c.account_number ? `Account: ${c.account_number}` : null,
            c.routing_number ? `Routing: ${c.routing_number}` : null,
            c.account_holder ? `Titular: ${c.account_holder}` : null,
          ].filter(Boolean).join(' | ')
          return {
            id: `world-psav-${c.id}`,
            title: c.name || `Cuenta USD ${i + 1}`,
            kind: 'bank' as const,
            detail: parts || 'Datos bancarios no configurados',
            accent: 'sky',
            bankCard: {
              bankName: c.bank_name || 'Banco no configurado',
              accountHolder: c.account_holder || c.name || 'PSAV',
              accountNumber: c.account_number || 'Sin cuenta',
              country: 'US',
            },
          }
        })
      }
      // No hay cuentas PSAV bank_us activas — mostrar aviso en vez de datos ficticios
      console.warn('[deposit-instructions] No hay cuentas PSAV bank_us configuradas para world_to_bolivia.')
      return [
        {
          id: 'world-no-psav',
          title: 'Instrucciones no disponibles',
          kind: 'note' as const,
          detail: 'No se encontraron cuentas receptoras USD configuradas. Contacte al administrador para habilitar las instrucciones de deposito.',
          accent: 'sky',
        },
      ]
    }
    case 'us_to_wallet':
      return [
        ...(psavInstructions.length > 0
          ? psavInstructions
          : [
              {
                id: 'wallet-fallback-ach',
                title: 'Cuenta ACH temporal',
                kind: 'bank' as const,
                detail: 'Mercury Demo | Checking 123456789 | Routing 021000021 | Holder: Guira Wallet Ops',
                accent: 'emerald',
              },
            ]),
      ]
    case 'crypto_to_crypto': {
      // Intentar leer wallets de depósito dinámicas de la configuración PSAV
      const cryptoPsav = args.psavConfigs.filter(
        (c) => c.currency === 'USDC' || c.currency === 'USDT' || c.currency === 'crypto'
      )
      if (cryptoPsav.length > 0) {
        return cryptoPsav.map((c, i) => ({
          id: `crypto-psav-${c.id}`,
          title: c.name || `Wallet Guira ${i + 1}`,
          kind: 'wallet' as const,
          detail: c.account_number || 'Dirección no configurada',
          accent: i === 0 ? 'emerald' : undefined,
        }))
      }
      // Fallback a wallets hardcodeadas (solo si no hay PSAV crypto configurados)
      console.warn('[deposit-instructions] Usando wallets hardcodeadas para crypto_to_crypto — configure PSAV crypto.')
      return [
        {
          id: 'crypto-polygon',
          title: 'Wallet Guira Polygon',
          kind: 'wallet',
          detail: '0x2Bf8bA7f7d32A7A61Bf1aC1d5cA0D4C4E8B5f901',
          accent: 'emerald',
        },
        {
          id: 'crypto-tron',
          title: 'Wallet Guira Tron',
          kind: 'wallet',
          detail: 'TLbT1mV7W6YFJ5w8x5dWQ1U1w6E4JmF8GQ',
        },
      ]
    }
    default:
      return []
  }
}

/**
 * Construye instrucciones de depósito leyendo directamente los campos
 * que el backend persiste en cada orden (`psav_deposit_instructions` o
 * `bridge_source_deposit_instructions`), en vez de depender de la
 * configuración global PSAV.
 *
 * Esta función reemplaza a `buildDepositInstructions` en el historial
 * de transacciones (donde la orden ya existe y tiene instrucciones asignadas).
 */
export function buildDepositInstructionsFromOrder(order: PaymentOrder): DepositInstruction[] {
  // 1. Intentar leer instrucciones PSAV persistidas por orden
  const psav = parseOrderInstructions(order.psav_deposit_instructions)
  if (psav) {
    return convertPsavPayloadToInstructions(psav, order)
  }

  // 2. Intentar leer instrucciones Bridge persistidas por orden
  const bridge = parseOrderInstructions(order.bridge_source_deposit_instructions)
  if (bridge) {
    return convertBridgePayloadToInstructions(bridge, order)
  }

  // 3. Sin instrucciones de depósito en la orden
  return []
}

/** Verifica que el campo sea un objeto no vacío. */
function parseOrderInstructions(
  raw: PsavDepositInstructionsPayload | BridgeDepositInstructionsPayload | Record<string, unknown> | undefined | null,
): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null
  if (Object.keys(raw).length === 0) return null
  return raw as Record<string, unknown>
}

function convertPsavPayloadToInstructions(
  payload: Record<string, unknown>,
  order: PaymentOrder,
): DepositInstruction[] {
  const type = String(payload.type ?? 'bank')
  const label = str(payload, 'label') || str(payload, 'account_name') || 'Cuenta de depósito'
  const currency = str(payload, 'currency') || order.currency || ''

  // Tipo crypto (PSAV crypto address)
  if (type === 'crypto') {
    const address = str(payload, 'address') || str(payload, 'crypto_address') || 'Dirección no disponible'
    const network = str(payload, 'network') || str(payload, 'crypto_network') || ''
    return [
      {
        id: `order-${order.id}-crypto`,
        title: label,
        kind: 'wallet',
        detail: address,
        accent: 'emerald',
      },
      ...(network
        ? [
            {
              id: `order-${order.id}-crypto-note`,
              title: 'Red de depósito',
              kind: 'note' as const,
              detail: `Deposita en la red ${network}. Verifica que la red coincida antes de transferir fondos.`,
              accent: 'amber',
            },
          ]
        : []),
    ]
  }

  // Tipo bank o virtual_account
  const bankName = str(payload, 'bank_name') || 'Banco no especificado'
  const accountHolder = str(payload, 'account_holder')
    || str(payload, 'account_holder_name')
    || str(payload, 'beneficiary_name')
    || str(payload, 'account_name')
    || label
  const accountNumber = str(payload, 'account_number') || 'Sin número de cuenta'
  const routingNumber = str(payload, 'routing_number')
  const qrUrl = str(payload, 'qr_url')

  const detailParts = [bankName, accountHolder, accountNumber, routingNumber ? `Routing: ${routingNumber}` : null, currency]
    .filter(Boolean)
    .join(' | ')

  return [
    {
      id: `order-${order.id}-bank`,
      title: type === 'virtual_account' ? 'Tu Virtual Account' : label,
      kind: 'bank',
      detail: detailParts,
      accent: 'sky',
      qrUrl: qrUrl || undefined,
      bankCard: {
        bankName,
        accountHolder,
        accountNumber,
        country: currency,
      },
    },
  ]
}

function convertBridgePayloadToInstructions(
  payload: Record<string, unknown>,
  order: PaymentOrder,
): DepositInstruction[] {
  const type = str(payload, 'type') || ''
  const label = str(payload, 'label') || 'Instrucciones de depósito'

  // Liquidation address (crypto_to_bridge_wallet)
  if (type === 'liquidation_address') {
    const address = str(payload, 'address') || 'Dirección no disponible'
    const chain = str(payload, 'chain') || ''
    const depositCurrency = str(payload, 'currency') || str(payload, 'source_currency') || order.source_currency || order.currency || ''
    return [
      {
        id: `order-${order.id}-liq`,
        title: label,
        kind: 'wallet' as const,
        detail: address,
        accent: 'emerald',
        qrValue: address !== 'Dirección no disponible' ? address : undefined,
        network: chain || undefined,
        currency: depositCurrency || undefined,
      },
    ]
  }

  // Virtual account (órdenes históricas legacy)
  if (type === 'virtual_account') {
    const bankName = str(payload, 'bank_name') || 'Banco de VA'
    const accountName = str(payload, 'account_name') || 'Cuenta Virtual'
    const accountNumber = str(payload, 'account_number') || ''
    const routingNumber = str(payload, 'routing_number') || ''
    const currency = str(payload, 'source_currency') || str(payload, 'currency') || 'USD'

    const detailParts = [bankName, accountName, accountNumber, routingNumber ? `Routing: ${routingNumber}` : null, currency]
      .filter(Boolean)
      .join(' | ')

    return [
      {
        id: `order-${order.id}-va`,
        title: 'Tu Virtual Account',
        kind: 'bank',
        detail: detailParts,
        accent: 'sky',
        bankCard: {
          bankName,
          accountHolder: accountName,
          accountNumber: accountNumber || routingNumber || 'Sin referencia',
          country: currency,
        },
      },
    ]
  }

  // Bridge source_deposit_instructions genérico (wallet_to_wallet transfer)
  // La respuesta de Bridge puede venir con formato variado
  const bankName = str(payload, 'bank_name') || str(payload, 'bank_beneficiary_name') || ''
  const accountNumber = str(payload, 'bank_account_number') || str(payload, 'account_number') || ''
  const routingNumber = str(payload, 'bank_routing_number') || str(payload, 'routing_number') || ''
  const depositMessage = str(payload, 'deposit_message') || ''
  const paymentRail = str(payload, 'payment_rail') || ''
  const address = str(payload, 'address') || str(payload, 'to_address') || ''

  // Si tiene una address crypto, mostrar como wallet
  const bridgeChain = str(payload, 'chain') || str(payload, 'network') || ''
  const bridgeCurrency = str(payload, 'currency') || str(payload, 'source_currency') || order.source_currency || order.currency || ''
  if (address && !bankName && !accountNumber) {
    return [
      {
        id: `order-${order.id}-bridge-wallet`,
        title: label,
        kind: 'wallet' as const,
        detail: address,
        accent: 'emerald',
        qrValue: address,
        network: bridgeChain || undefined,
        currency: bridgeCurrency || undefined,
      },
      ...(depositMessage
        ? [
            {
              id: `order-${order.id}-bridge-memo`,
              title: 'Memo / Referencia',
              kind: 'note' as const,
              detail: depositMessage,
              accent: 'amber',
            },
          ]
        : []),
    ]
  }

  // Si tiene datos bancarios, mostrar como bank
  if (bankName || accountNumber) {
    const detailParts = [bankName, accountNumber, routingNumber ? `Routing: ${routingNumber}` : null, paymentRail ? `Rail: ${paymentRail.toUpperCase()}` : null]
      .filter(Boolean)
      .join(' | ')

    return [
      {
        id: `order-${order.id}-bridge-bank`,
        title: label,
        kind: 'bank',
        detail: detailParts,
        accent: 'sky',
        bankCard: {
          bankName: bankName || 'Bridge',
          accountHolder: str(payload, 'bank_beneficiary_name') || 'Bridge',
          accountNumber: accountNumber || 'Sin referencia',
          country: str(payload, 'currency') || 'USD',
        },
      },
      ...(depositMessage
        ? [
            {
              id: `order-${order.id}-bridge-memo`,
              title: 'Memo / Referencia',
              kind: 'note' as const,
              detail: depositMessage,
              accent: 'amber',
            },
          ]
        : []),
    ]
  }

  // Payload desconocido — mostrar nota genérica con lo que haya
  const summary = Object.entries(payload)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(' | ')

  if (!summary) return []

  return [
    {
      id: `order-${order.id}-bridge-raw`,
      title: label,
      kind: 'note',
      detail: summary,
      accent: 'sky',
    },
  ]
}

/** Lectura segura de string desde un record. */
function str(obj: Record<string, unknown>, key: string): string {
  const v = obj[key]
  return typeof v === 'string' && v.trim() ? v.trim() : ''
}

function getPsavInstructions(psavConfigs: PsavConfigRow[]): DepositInstruction[] {
  return psavConfigs.slice(0, 3).map((record, index) => {
    // 1. Preferir campos de primer nivel, luego fallback a metadata o strings genericos
    const provider = record.name || readString(record as Record<string, unknown>, ['provider_name']) || `PSAV ${index + 1}`
    const accountReference = record.account_number || readString(record as Record<string, unknown>, ['account_reference', 'reference', 'account']) || 'Sin referencia'
    
    const metadata = readMetadata(record)
    const country = readString(metadata, ['country', 'label'])
    const accountName = readString(metadata, ['account_name', 'holder_name'])
    const bankName = record.bank_name || readString(metadata, ['bank_name'])

    return {
      id: `psav-${record.id}`,
      title: provider,
      kind: 'bank' as const,
      detail: [bankName, accountName, accountReference, country].filter(Boolean).join(' | '),
      accent: 'sky',
      qrUrl: record.qr_url,
      bankCard: {
        bankName: bankName || 'Banco no configurado',
        accountHolder: accountName || provider,
        accountNumber: accountReference || 'Sin cuenta configurada',
        country: country || String(record.currency ?? 'BO'),
      },
    }
  })
}

function readMetadata(record: PsavConfigRow) {
  const metadata = record.metadata
  return metadata && typeof metadata === 'object' ? (metadata as Record<string, unknown>) : {}
}

function readString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

// findNumericSetting eliminado — las tasas de cambio ahora vienen de exchange_rates_config

export function resolveFeeTotal(fees: FeeConfigRow[], amountOrigin: number, route: SupportedPaymentRoute) {
  if (!fees || fees.length === 0) return 15 // Fallback historico

  // Mapeamos las rutas del frontend local a los operation_type de la base de datos V2
  let targetOperation = ''
  if (route === 'bolivia_to_exterior') targetOperation = 'interbank_bo_out'
  else if (route === 'world_to_bolivia') targetOperation = 'interbank_bo_in'
  else if (route === 'crypto_to_crypto') targetOperation = 'interbank_w2w'
  else if (route === 'us_to_wallet') targetOperation = 'ramp_off_bo'
  // Wallet ramp deposit flows (2.1, 2.2, 2.3)
  else if ((route as string) === 'fiat_bo_to_bridge_wallet') targetOperation = 'ramp_on_bo'
  else if ((route as string) === 'crypto_to_bridge_wallet') targetOperation = 'ramp_on_crypto'
  // Wallet ramp withdraw flows (2.4, 2.5, 2.6)
  else if ((route as string) === 'bridge_wallet_to_fiat_bo') targetOperation = 'ramp_off_bo'
  else if ((route as string) === 'bridge_wallet_to_crypto') targetOperation = 'ramp_off_crypto'
  else if ((route as string) === 'bridge_wallet_to_fiat_us') targetOperation = 'ramp_off_fiat_us'
  else if ((route as string) === 'wallet_to_fiat') targetOperation = 'wallet_to_fiat_off'
  
  // Buscar config especifica o caer en el primer fallback si esta desactualizado
  let candidate = fees.find((fee) => fee.operation_type === targetOperation)
  if (!candidate) {
    candidate = fees[0]
  }

  // Obtener los valores (vienen como string desde Postgres Numeric)
  const feePercentVal = typeof candidate.fee_percent === 'string' ? parseFloat(candidate.fee_percent) : (Number(candidate.fee_percent) || 0)
  const feeFixedVal = typeof candidate.fee_fixed === 'string' ? parseFloat(candidate.fee_fixed) : (Number(candidate.fee_fixed) || 0)
  const minFee = typeof candidate.min_fee === 'string' ? parseFloat(candidate.min_fee) : (Number(candidate.min_fee) || 0)
  
  const amountCents = Math.round(amountOrigin * 100)
  const feeFixedCents = Math.round(feeFixedVal * 100)

  let feeCents = 0
  if (candidate.fee_type === 'percent') {
    feeCents = Math.round(amountCents * feePercentVal / 100)
  } else if (candidate.fee_type === 'fixed') {
    feeCents = feeFixedCents
  } else if (candidate.fee_type === 'mixed') {
    feeCents = feeFixedCents + Math.round(amountCents * feePercentVal / 100)
  } else {
    // Legacy fallback for old rows if they exist
    const legacyVal = typeof candidate.value === 'string' ? parseFloat(candidate.value) : (Number(candidate.value) || 0)
    if (candidate.fee_type === 'percentage') {
      feeCents = Math.round(amountCents * legacyVal / 100)
    } else {
      feeCents = Math.round(legacyVal * 100)
    }
  }

  // Aplicar min/max en centavos (idéntico al backend fees.service.ts)
  const minFeeCents = Math.round(minFee * 100)
  const maxFee = typeof candidate.max_fee === 'string' ? parseFloat(candidate.max_fee) : (Number(candidate.max_fee) || 0)
  const maxFeeCents = Math.round(maxFee * 100)
  if (minFeeCents > 0 && feeCents < minFeeCents) feeCents = minFeeCents
  if (maxFeeCents > 0 && feeCents > maxFeeCents) feeCents = maxFeeCents

  return feeCents / 100
}

function toEstimate(values: RouteEstimate) {
  return {
    amountConverted: roundTwo(values.amountConverted),
    exchangeRateApplied: roundTwo(values.exchangeRateApplied),
    feeTotal: roundTwo(values.feeTotal),
  }
}

function roundTwo(value: number) {
  return Math.round(value * 100) / 100
}
