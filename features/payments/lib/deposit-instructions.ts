import type { AppSettingRow, FeeConfigRow, PsavConfigRow } from '@/types/payment-order'
import type { Supplier } from '@/types/supplier'
import type { SupportedPaymentRoute } from '@/features/payments/lib/payment-routes'

type InstructionKind = 'bank' | 'wallet' | 'qr' | 'note'

export interface DepositInstruction {
  id: string
  title: string
  kind: InstructionKind
  detail: string
  accent?: string
  qrUrl?: string
  bankCard?: {
    bankName: string
    accountHolder: string
    accountNumber: string
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
  appSettings: AppSettingRow[]
  feesConfig: FeeConfigRow[]
}) {
  const amountOrigin = Number.isFinite(args.amountOrigin) ? args.amountOrigin : 0

  // 1. Obtener tasas de configuracion (con fallback a la tasa antigua bolivia_exchange_rate o 6.96)
  const legacyRate = findNumericSetting(args.appSettings, 'bolivia_exchange_rate') ?? 6.96
  const parallelBuyRate = findNumericSetting(args.appSettings, 'parallel_buy_rate') ?? legacyRate
  const parallelSellRate = findNumericSetting(args.appSettings, 'parallel_sell_rate') ?? legacyRate

  const baseFeeTotal = resolveFeeTotal(args.feesConfig, amountOrigin, args.route)

  // 2. Determinar que tasa base aplicar segun la direccion de la operacion
  // bo_to_world -> compra de dolares -> parallel_buy_rate
  // world_to_bo -> venta de dolares -> parallel_sell_rate
  let selectedBaseRate = legacyRate
  if (args.route === 'bolivia_to_exterior') {
    selectedBaseRate = parallelBuyRate
  } else if (args.route === 'us_to_bolivia') {
    selectedBaseRate = parallelSellRate
  }

  const effectiveRate = resolveExchangeRate({
    baseRate: selectedBaseRate,
    originCurrency: args.originCurrency,
    destinationCurrency: args.destinationCurrency,
  })

  // Aplicar formula: amount_converted = (amount_origin - fee_total) * rate
  const amountConverted = Math.max((amountOrigin - baseFeeTotal) * effectiveRate, 0)

  return toEstimate({
    amountConverted,
    exchangeRateApplied: effectiveRate,
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
    case 'us_to_bolivia':
      return [
        {
          id: 'world-hardcoded-bank',
          title: 'Cuenta receptora Guira',
          kind: 'bank' as const,
          detail: 'Bank of Example | Checking 00123456789 | ABA 021000021 | Holder: Guira Operations LLC',
          accent: 'sky',
        },
      ]
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
  }
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

function findNumericSetting(settings: AppSettingRow[], key: string) {
  const normalizedKey = key.trim().toLowerCase()
  const match = settings.find((setting) => {
    const sKey = (setting.key || setting.name || '').trim().toLowerCase()
    return sKey === normalizedKey
  })

  if (typeof match?.value === 'number') {
    return Number.isFinite(match.value) ? match.value : null
  }

  if (typeof match?.value === 'string') {
    const parsed = Number(match.value.trim().replace(',', '.'))
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function resolveFeeTotal(fees: FeeConfigRow[], amountOrigin: number, route: SupportedPaymentRoute) {
  // 1. Intentar encontrar la comision segun la ruta, o cae en supplier_payment, o la primera
  const routeType = route === 'bolivia_to_exterior' ? 'supplier_payment' : 'wallet_funding'
  const candidate = fees.find((fee) => fee.type === routeType) || 
                   fees.find((fee) => fee.type === 'supplier_payment') || 
                   fees[0]
  
  if (!candidate) return 15 // Fallback historico (monto fijo $15)

  // Convertir el valor a numero (Supabase devuelve numeric como string a veces)
  const rawValue = candidate.value
  const feeValue = typeof rawValue === 'string' 
    ? parseFloat(rawValue.replace(',', '.')) 
    : (typeof rawValue === 'number' ? rawValue : 0)

  if (candidate.fee_type === 'percentage') {
    return (amountOrigin * feeValue) / 100
  }

  return feeValue
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

function resolveExchangeRate(args: {
  baseRate: number
  originCurrency: string
  destinationCurrency: string
}) {
  const origin = args.originCurrency.trim().toUpperCase()
  const destination = args.destinationCurrency.trim().toUpperCase()

  if (!origin || !destination || origin === destination) {
    return 1
  }

  if (origin === 'USD' && destination === 'BS') {
    return args.baseRate
  }

  if (origin === 'BS' && destination === 'USD') {
    return args.baseRate === 0 ? 0 : 1 / args.baseRate
  }

  return 1
}
