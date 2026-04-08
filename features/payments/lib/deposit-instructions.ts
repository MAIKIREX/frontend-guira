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
  } else if (args.route === 'world_to_bolivia') {
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
  if (!fees || fees.length === 0) return 15 // Fallback historico

  // Mapeamos las rutas del frontend local a los operation_type de la base de datos V2
  let targetOperation = ''
  if (route === 'bolivia_to_exterior') targetOperation = 'interbank_bo_out'
  else if (route === 'world_to_bolivia') targetOperation = 'interbank_bo_in'
  else if (route === 'crypto_to_crypto') targetOperation = 'interbank_w2w'
  else if (route === 'us_to_wallet') targetOperation = 'ramp_off_bo'
  
  // Buscar config especifica o caer en el primer fallback si esta desactualizado
  let candidate = fees.find((fee) => fee.operation_type === targetOperation)
  if (!candidate) {
    candidate = fees[0]
  }

  // Obtener los valores (vienen como string desde Postgres Numeric)
  const feePercentVal = typeof candidate.fee_percent === 'string' ? parseFloat(candidate.fee_percent) : (Number(candidate.fee_percent) || 0)
  const feeFixedVal = typeof candidate.fee_fixed === 'string' ? parseFloat(candidate.fee_fixed) : (Number(candidate.fee_fixed) || 0)
  const minFee = typeof candidate.min_fee === 'string' ? parseFloat(candidate.min_fee) : (Number(candidate.min_fee) || 0)
  
  let calculatedFee = 0

  if (candidate.fee_type === 'percent') {
    calculatedFee = (amountOrigin * feePercentVal) / 100
  } else if (candidate.fee_type === 'fixed') {
    calculatedFee = feeFixedVal
  } else if (candidate.fee_type === 'mixed') {
    calculatedFee = ((amountOrigin * feePercentVal) / 100) + feeFixedVal
  } else {
    // Legacy fallback for old rows if they exist
    calculatedFee = typeof candidate.value === 'string' ? parseFloat(candidate.value) : (Number(candidate.value) || 0)
    if (candidate.fee_type === 'percentage') {
       calculatedFee = (amountOrigin * calculatedFee) / 100
    }
  }

  // Retornar aplicando el cobro minimo si aplica
  if (minFee > 0 && calculatedFee < minFee) {
    return minFee
  }

  return calculatedFee
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
