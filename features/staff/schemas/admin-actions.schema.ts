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
  fee_type: z.enum(['percent', 'fixed', 'mixed']),
  fee_percent: z.coerce.number().min(0, 'Debe ser >= 0').optional(),
  fee_fixed: z.coerce.number().min(0, 'Debe ser >= 0').optional(),
  min_fee: z.coerce.number().min(0, 'Debe ser >= 0').optional(),
  max_fee: z.coerce.number().min(0, 'Debe ser >= 0').optional(),
  is_active: z.boolean(),
  reason: z.string().trim().min(5, 'Ingresa un motivo descriptivo.'),
})

export const adminRateConfigSchema = z.object({
  rate: z.coerce.number().min(0.0001, 'La tasa debe ser mayor a 0'),
  spread_percent: z.coerce.number().min(0, 'El spread debe ser >= 0').optional(),
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

export const adminChangeRoleSchema = z.object({
  role: z.enum(['client', 'staff', 'admin', 'super_admin']),
  reason: z.string().trim().min(5, 'Ingresa un motivo descriptivo.').max(500),
})

export const adminFeeOverrideSchema = z.object({
  operation_type: z.enum([
    'interbank_bo_out', 'interbank_w2w', 'interbank_bo_wallet', 'interbank_bo_in',
    'ramp_on_fiat_us', 'ramp_on_bo', 'ramp_on_crypto',
    'ramp_off_bo', 'ramp_off_crypto', 'ramp_off_fiat_us',
    'wallet_to_fiat_off',
  ]),
  payment_rail: z.enum(['psav', 'bridge']),
  currency: z.enum(['USD', 'BOB', 'USDC', 'USDT']),
  fee_type: z.enum(['percent', 'fixed', 'mixed']),
  fee_percent: z.coerce.number().min(0, 'Debe ser >= 0').optional(),
  fee_fixed: z.coerce.number().min(0, 'Debe ser >= 0').optional(),
  min_fee: z.coerce.number().min(0, 'Debe ser >= 0').optional(),
  max_fee: z.coerce.number().min(0, 'Debe ser >= 0').optional(),
  valid_from: z.string().optional().or(z.literal('')),
  valid_until: z.string().optional().or(z.literal('')),
  notes: z.string().max(500).optional(),
})

export const adminVaFeeOverrideSchema = z.object({
  fee_percent: z.coerce.number().min(0, 'Debe ser >= 0').max(100, 'Máximo 100%'),
  reason: z.string().trim().min(5, 'Ingresa un motivo descriptivo.').max(500),
})

export const adminLimitOverrideSchema = z.object({
  flow_type: z.enum([
    'bolivia_to_world',
    'bolivia_to_wallet',
    'wallet_to_wallet',
    'world_to_bolivia',
    'fiat_bo_to_bridge_wallet',
    'crypto_to_bridge_wallet',
    'bridge_wallet_to_fiat_bo',
    'bridge_wallet_to_crypto',
    'bridge_wallet_to_fiat_us',
  ]),
  min_usd: z.coerce.number().min(0, 'Debe ser >= 0').optional().nullable(),
  max_usd: z.coerce.number().min(0, 'Debe ser >= 0').optional().nullable(),
  valid_from: z.string().optional().or(z.literal('')),
  valid_until: z.string().optional().or(z.literal('')),
  notes: z.string().max(500).optional(),
})

export type AdminCreateUserValues = z.infer<typeof adminCreateUserSchema>
export type AdminReasonValues = z.infer<typeof adminReasonSchema>
export type AdminFeeConfigValues = z.infer<typeof adminFeeConfigSchema>
export type AdminAppSettingValues = z.infer<typeof adminAppSettingSchema>
export type AdminJsonRecordValues = z.infer<typeof adminJsonRecordSchema>
export type AdminPsavRecordValues = z.infer<typeof adminPsavRecordSchema>
export type AdminChangeRoleValues = z.infer<typeof adminChangeRoleSchema>
export type AdminFeeOverrideValues = z.infer<typeof adminFeeOverrideSchema>
export type AdminRateConfigValues = z.infer<typeof adminRateConfigSchema>
export type AdminVaFeeOverrideValues = z.infer<typeof adminVaFeeOverrideSchema>
export type AdminLimitOverrideValues = z.infer<typeof adminLimitOverrideSchema>
