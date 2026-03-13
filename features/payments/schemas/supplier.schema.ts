import { z } from 'zod'

export const supplierSchema = z
  .object({
    name: z.string().trim().min(2, 'Ingresa un nombre valido.'),
    country: z.string().trim().min(2, 'Ingresa el pais del proveedor.'),
    payment_method: z.enum(['bank', 'crypto']),
    address: z.string().trim().min(5, 'Ingresa una direccion valida.'),
    phone: z.string().trim().min(5, 'Ingresa un telefono valido.'),
    email: z.email('Ingresa un email valido.'),
    tax_id: z.string().trim().min(3, 'Ingresa un identificador fiscal.'),
    bank_name: z.string().trim().optional(),
    swift_code: z.string().trim().optional(),
    account_number: z.string().trim().optional(),
    bank_country: z.string().trim().optional(),
    crypto_address: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.payment_method === 'bank') {
      if (!value.bank_name) {
        ctx.addIssue({ code: 'custom', message: 'El banco es obligatorio.', path: ['bank_name'] })
      }
      if (!value.swift_code) {
        ctx.addIssue({ code: 'custom', message: 'El codigo SWIFT es obligatorio.', path: ['swift_code'] })
      }
      if (!value.account_number) {
        ctx.addIssue({
          code: 'custom',
          message: 'La cuenta bancaria es obligatoria.',
          path: ['account_number'],
        })
      }
      if (!value.bank_country) {
        ctx.addIssue({
          code: 'custom',
          message: 'El pais del banco es obligatorio.',
          path: ['bank_country'],
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
  })

export type SupplierFormValues = z.infer<typeof supplierSchema>
