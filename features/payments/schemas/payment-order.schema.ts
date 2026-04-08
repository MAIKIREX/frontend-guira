import { z } from 'zod'

export const paymentOrderSchema = z
  .object({
    route: z.enum([
      'bolivia_to_exterior',
      'us_to_bolivia',
      'us_to_wallet',
      'crypto_to_crypto',
    ]),
    receive_variant: z.enum(['bank_account', 'bank_qr', 'wallet']).optional(),
    ui_method_group: z.enum(['bank', 'crypto']).optional(),
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
    source_crypto_network: z.string().trim().optional(),
    source_crypto_address: z.string().trim().optional(),
    destination_account_holder: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.route === 'us_to_bolivia' && !value.receive_variant) {
      ctx.addIssue({
        code: 'custom',
        message: 'Selecciona como quieres recibir en Bolivia.',
        path: ['receive_variant'],
      })
    }

    if (value.route === 'bolivia_to_exterior' && !value.supplier_id) {
      ctx.addIssue({
        code: 'custom',
        message: 'Selecciona un proveedor o beneficiario antes de continuar.',
        path: ['supplier_id'],
      })
    }

    if (value.route === 'bolivia_to_exterior' && !value.ui_method_group) {
      ctx.addIssue({
        code: 'custom',
        message: 'Selecciona si el envio sale por banco o por crypto.',
        path: ['ui_method_group'],
      })
    }

    if ((value.route === 'bolivia_to_exterior' || value.route === 'crypto_to_crypto' || value.route === 'us_to_bolivia') && value.payment_reason.length < 5) {
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

    if (value.delivery_method === 'swift' && value.route === 'us_to_bolivia') {
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

    if (value.delivery_method === 'ach' && value.route === 'us_to_bolivia') {
      const requiredFields: Array<[keyof typeof value, string]> = [
        ['ach_account_number', 'La cuenta bancaria es obligatoria.'],
        ['ach_bank_name', 'El banco es obligatorio.'],
      ]

      requiredFields.forEach(([field, message]) => {
        if (!value[field]) {
          ctx.addIssue({ code: 'custom', message, path: [field] })
        }
      })
    }

    if (value.route === 'us_to_bolivia' && !value.destination_account_holder) {
      ctx.addIssue({
        code: 'custom',
        message: 'El nombre del titular de la cuenta destino es obligatorio.',
        path: ['destination_account_holder'],
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

    if (value.route === 'crypto_to_crypto') {
      if (!value.source_crypto_network) {
        ctx.addIssue({
          code: 'custom',
          message: 'La red de origen es obligatoria.',
          path: ['source_crypto_network'],
        })
      }
      if (!value.source_crypto_address) {
        ctx.addIssue({
          code: 'custom',
          message: 'La dirección cripto de origen es obligatoria.',
          path: ['source_crypto_address'],
        })
      }
    }
  })

export type PaymentOrderFormValues = z.infer<typeof paymentOrderSchema>
