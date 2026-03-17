import { z } from 'zod'

const supplierMethodSchema = z.enum(['crypto', 'ach', 'swift'])
const cryptoNetworkSchema = z.enum([
  'Ethereum',
  'Polygon',
  'Arbitrum',
  'Optimism',
  'Base',
  'Solana',
  'Tron',
  'BSC',
])

export const supplierSchema = z
  .object({
    name: z.string().trim().min(2, 'Ingresa un nombre valido.'),
    country: z.string().trim().min(2, 'Ingresa el pais del proveedor.'),
    payment_method: supplierMethodSchema,
    address: z.string().trim().min(5, 'Ingresa una direccion valida.'),
    phone: z.string().trim().min(5, 'Ingresa un telefono valido.'),
    email: z.email('Ingresa un email valido.'),
    tax_id: z.string().trim().min(3, 'Ingresa un identificador fiscal.'),
    ach_bank_name: z.string().trim().optional(),
    ach_routing_number: z.string().trim().optional(),
    ach_account_number: z.string().trim().optional(),
    ach_bank_country: z.string().trim().optional(),
    swift_bank_name: z.string().trim().optional(),
    swift_code: z.string().trim().optional(),
    swift_account_number: z.string().trim().optional(),
    swift_bank_country: z.string().trim().optional(),
    swift_iban: z.string().trim().optional(),
    swift_bank_address: z.string().trim().optional(),
    crypto_address: z.string().trim().optional(),
    crypto_network: cryptoNetworkSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.payment_method === 'ach') {
      if (!value.ach_bank_name) {
        ctx.addIssue({ code: 'custom', message: 'El banco ACH es obligatorio.', path: ['ach_bank_name'] })
      }
      if (!value.ach_routing_number) {
        ctx.addIssue({
          code: 'custom',
          message: 'El routing number es obligatorio.',
          path: ['ach_routing_number'],
        })
      }
      if (!value.ach_account_number) {
        ctx.addIssue({
          code: 'custom',
          message: 'La cuenta ACH es obligatoria.',
          path: ['ach_account_number'],
        })
      }
    }

    if (value.payment_method === 'swift') {
      if (!value.swift_bank_name) {
        ctx.addIssue({ code: 'custom', message: 'El banco SWIFT es obligatorio.', path: ['swift_bank_name'] })
      }
      if (!value.swift_code) {
        ctx.addIssue({ code: 'custom', message: 'El codigo SWIFT es obligatorio.', path: ['swift_code'] })
      }
      if (!value.swift_account_number) {
        ctx.addIssue({
          code: 'custom',
          message: 'La cuenta bancaria es obligatoria.',
          path: ['swift_account_number'],
        })
      }
      if (!value.swift_bank_country) {
        ctx.addIssue({
          code: 'custom',
          message: 'El pais del banco es obligatorio.',
          path: ['swift_bank_country'],
        })
      }
    }

    if (value.payment_method === 'crypto' && !value.crypto_address) {
      ctx.addIssue({
        code: 'custom',
        message: 'La direccion cripto es obligatoria.',
        path: ['crypto_address'],
      })
    }

    if (value.payment_method === 'crypto' && !value.crypto_network) {
      ctx.addIssue({
        code: 'custom',
        message: 'La red crypto es obligatoria.',
        path: ['crypto_network'],
      })
    }
  })

export type SupplierFormValues = z.infer<typeof supplierSchema>
