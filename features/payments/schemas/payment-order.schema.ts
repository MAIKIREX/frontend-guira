import { z } from 'zod'

export const paymentOrderSchema = z
  .object({
    route: z.enum([
      'bolivia_to_exterior',
      'us_to_bolivia',
      'us_to_wallet',
      'crypto_to_crypto',
    ]),
    supplier_id: z.string().optional(),
    amount_origin: z.coerce.number().positive('El monto debe ser mayor a cero.'),
    amount_converted: z.coerce.number().nonnegative('Ingresa un monto destino valido.'),
    fee_total: z.coerce.number().nonnegative('Ingresa una fee valida.'),
    exchange_rate_applied: z.coerce.number().positive('Ingresa un tipo de cambio valido.'),
    origin_currency: z.string().trim().min(1, 'Selecciona la moneda origen.'),
    destination_currency: z.string().trim().min(1, 'Selecciona la moneda destino.'),
    delivery_method: z.enum(['swift', 'ach', 'crypto']),
    payment_reason: z.string().trim(),
    intended_amount: z.coerce.number().nonnegative('Ingresa un monto valido.'),
    destination_address: z.string().trim().min(3, 'Ingresa el destino.'),
    stablecoin: z.string().trim().min(2, 'Ingresa la stablecoin.'),
    funding_method: z.enum(['bs', 'crypto', 'ach', 'wallet']).optional(),
    swift_bank_name: z.string().trim().optional(),
    swift_code: z.string().trim().optional(),
    swift_iban: z.string().trim().optional(),
    swift_bank_address: z.string().trim().optional(),
    swift_country: z.string().trim().optional(),
    ach_routing_number: z.string().trim().optional(),
    ach_account_number: z.string().trim().optional(),
    ach_bank_name: z.string().trim().optional(),
    crypto_address: z.string().trim().optional(),
    crypto_network: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    if ((value.route === 'bolivia_to_exterior' || value.route === 'crypto_to_crypto') && value.payment_reason.length < 5) {
      ctx.addIssue({
        code: 'custom',
        message: 'Describe el motivo del pago.',
        path: ['payment_reason'],
      })
    }

    if (value.route === 'bolivia_to_exterior') {
      if (!value.funding_method) {
        ctx.addIssue({
          code: 'custom',
          message: 'Selecciona el funding method documentado.',
          path: ['funding_method'],
        })
      }
    }

    if (value.delivery_method === 'swift' && value.route === 'bolivia_to_exterior') {
      const requiredFields: Array<[keyof typeof value, string]> = [
        ['swift_bank_name', 'El banco es obligatorio.'],
        ['swift_code', 'El codigo SWIFT es obligatorio.'],
        ['swift_iban', 'El IBAN es obligatorio.'],
        ['swift_bank_address', 'La direccion del banco es obligatoria.'],
        ['swift_country', 'El pais del banco es obligatorio.'],
      ]

      requiredFields.forEach(([field, message]) => {
        if (!value[field]) {
          ctx.addIssue({ code: 'custom', message, path: [field] })
        }
      })
    }

    if (value.delivery_method === 'ach' && value.route === 'bolivia_to_exterior') {
      const requiredFields: Array<[keyof typeof value, string]> = [
        ['ach_routing_number', 'El routing number es obligatorio.'],
        ['ach_account_number', 'La cuenta ACH es obligatoria.'],
        ['ach_bank_name', 'El banco ACH es obligatorio.'],
      ]

      requiredFields.forEach(([field, message]) => {
        if (!value[field]) {
          ctx.addIssue({ code: 'custom', message, path: [field] })
        }
      })
    }

    if (value.delivery_method === 'crypto' || value.route === 'us_to_wallet') {
      if (!value.crypto_address) {
        ctx.addIssue({
          code: 'custom',
          message: 'La direccion cripto es obligatoria.',
          path: ['crypto_address'],
        })
      }
      if (!value.crypto_network) {
        ctx.addIssue({
          code: 'custom',
          message: 'La red es obligatoria.',
          path: ['crypto_network'],
        })
      }
    }
  })

export type PaymentOrderFormValues = z.infer<typeof paymentOrderSchema>
