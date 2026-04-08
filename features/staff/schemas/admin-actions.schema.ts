import { z } from 'zod'

export const adminCreateUserSchema = z.object({
  email: z.email('Ingresa un email valido.'),
  password: z.string().min(8, 'Ingresa una password valida.'),
  full_name: z.string().trim().min(3, 'Ingresa el nombre completo.'),
  role: z.enum(['client', 'staff', 'admin']),
  reason: z.string().trim().min(5, 'Ingresa un motivo descriptivo.'),
})

export const adminReasonSchema = z.object({
  reason: z.string().trim().min(5, 'Ingresa un motivo descriptivo.'),
})

export const adminFeeConfigSchema = z.object({
  value: z.coerce.number().nonnegative('Ingresa un valor valido.'),
  currency: z.string().trim().min(1, 'Ingresa la moneda.'),
  reason: z.string().trim().min(5, 'Ingresa un motivo descriptivo.'),
})

export const adminAppSettingSchema = z.object({
  value: z.string().trim().min(1, 'Ingresa un valor valido.'),
  reason: z.string().trim().min(5, 'Ingresa un motivo descriptivo.'),
})

export const adminJsonRecordSchema = z.object({
  payload: z.string().trim().min(2, 'Ingresa un JSON valido.'),
  reason: z.string().trim().min(5, 'Ingresa un motivo descriptivo.'),
})

export const adminPsavRecordSchema = z.object({
  name: z.string().trim().min(2, 'Ingresa un nombre.'),
  type: z.enum(['bank_bo', 'bank_us', 'crypto']),
  bank_name: z.string().trim().optional(),
  account_number: z.string().trim().optional(),
  routing_number: z.string().trim().optional(),
  account_holder: z.string().trim().optional(),
  crypto_address: z.string().trim().optional(),
  crypto_network: z.string().trim().optional(),
  currency: z.string().trim().min(1, 'Ingresa la moneda.'),
  is_active: z.boolean(),
  reason: z.string().trim().min(5, 'Ingresa un motivo descriptivo.'),
})

export type AdminCreateUserValues = z.infer<typeof adminCreateUserSchema>
export type AdminReasonValues = z.infer<typeof adminReasonSchema>
export type AdminFeeConfigValues = z.infer<typeof adminFeeConfigSchema>
export type AdminAppSettingValues = z.infer<typeof adminAppSettingSchema>
export type AdminJsonRecordValues = z.infer<typeof adminJsonRecordSchema>
export type AdminPsavRecordValues = z.infer<typeof adminPsavRecordSchema>
