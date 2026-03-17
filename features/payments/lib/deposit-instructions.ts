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
}

export interface RouteEstimate {
  amountConverted: number
  exchangeRateApplied: number
  feeTotal: number
}

export function estimateRouteValues(args: {
  amountOrigin: number
  route: SupportedPaymentRoute
  appSettings: AppSettingRow[]
  feesConfig: FeeConfigRow[]
}) {
  const amountOrigin = Number.isFinite(args.amountOrigin) ? args.amountOrigin : 0
  const baseRate = findNumericSetting(args.appSettings, 'bolivia_exchange_rate') ?? 6.96
  const baseFee = findFirstFee(args.feesConfig)

  if (args.route === 'bolivia_to_exterior') {
    const feeTotal = baseFee
    const amountConverted = Math.max((amountOrigin - feeTotal) / baseRate, 0)
    return toEstimate({
      amountConverted,
      exchangeRateApplied: baseRate,
      feeTotal,
    })
  }

  if (args.route === 'us_to_bolivia') {
    const feeTotal = baseFee
    const amountConverted = Math.max((amountOrigin - feeTotal) * baseRate, 0)
    return toEstimate({
      amountConverted,
      exchangeRateApplied: baseRate,
      feeTotal,
    })
  }

  if (args.route === 'us_to_wallet') {
    const feeTotal = Math.max(baseFee * 0.4, 5)
    const amountConverted = Math.max(amountOrigin - feeTotal, 0)
    return toEstimate({
      amountConverted,
      exchangeRateApplied: 1,
      feeTotal,
    })
  }

  const feeTotal = Math.max(baseFee * 0.35, 3)
  const amountConverted = Math.max(amountOrigin - feeTotal, 0)
  return toEstimate({
    amountConverted,
    exchangeRateApplied: 1,
    feeTotal,
  })
}

export function buildDepositInstructions(args: {
  route: SupportedPaymentRoute
  psavConfigs: PsavConfigRow[]
  selectedSupplier?: Supplier | null
}) {
  const psavInstructions = getPsavInstructions(args.psavConfigs)

  switch (args.route) {
    case 'bolivia_to_exterior':
      return [
        ...psavInstructions,
        {
          id: 'bo-note',
          title: 'Referencia de expediente',
          kind: 'note' as const,
          detail: 'Usa el numero de expediente como referencia del deposito para acelerar la conciliacion.',
          accent: 'amber',
        },
      ]
    case 'us_to_bolivia':
      return [
        {
          id: 'world-hardcoded-bank',
          title: 'Cuenta receptora Guira',
          kind: 'bank' as const,
          detail: 'Bank of Example | Checking 00123456789 | ABA 021000021 | Holder: Guira Operations LLC',
          accent: 'sky',
        },
        {
          id: 'world-hardcoded-note',
          title: 'Comprobante de deposito',
          kind: 'note' as const,
          detail: 'Puedes adjuntar el comprobante ahora o completarlo despues desde Transacciones cuando el deposito ya este enviado.',
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
        {
          id: 'wallet-proof-note',
          title: 'Comprobante de fondeo',
          kind: 'note' as const,
          detail: 'Cuando completes el deposito en PSAV, sube el comprobante aqui o luego desde Transacciones para mover la orden a waiting_deposit.',
          accent: 'amber',
        },
      ]
    case 'crypto_to_crypto':
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
        {
          id: 'crypto-note',
          title: args.selectedSupplier?.name ? `Destino vinculado a ${args.selectedSupplier.name}` : 'Importante',
          kind: 'note',
          detail: 'Verifica que la red del deposito coincida con la red del destino antes de transferir. El hash podra cargarse despues desde Transacciones.',
        },
      ]
  }
}

function getPsavInstructions(psavConfigs: PsavConfigRow[]) {
  return psavConfigs.slice(0, 3).map((record, index) => {
    const provider = readString(record, ['provider_name', 'name']) || `PSAV ${index + 1}`
    const accountReference = readString(record, ['account_reference', 'reference', 'account']) || 'Sin referencia documentada'
    const metadata = readMetadata(record)
    const country = readString(metadata, ['country', 'label'])
    const accountName = readString(metadata, ['account_name', 'holder_name'])
    const bankName = readString(metadata, ['bank_name'])

    return {
      id: `psav-${record.id}`,
      title: provider,
      kind: 'bank' as const,
      detail: [bankName, accountName, accountReference, country].filter(Boolean).join(' | '),
      accent: 'sky',
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
  const match = settings.find((setting) => setting.key === key || setting.name === key)
  return typeof match?.value === 'number' ? match.value : null
}

function findFirstFee(fees: FeeConfigRow[]) {
  const candidate = fees.find((fee) => typeof fee.value === 'number')
  return candidate?.value ?? 15
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
