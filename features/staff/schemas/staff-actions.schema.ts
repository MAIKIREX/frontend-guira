import { z } from 'zod'

export const staffReasonSchema = z.object({
  reason: z.string().trim().min(5, 'Ingresa un motivo descriptivo de al menos 5 caracteres.'),
  notify_user: z.boolean().default(true),
})

export const staffOnboardingActionSchema = z.object({
  status: z.enum(['approved', 'rejected', 'in_review']),
  reason: z.string().trim().min(5, 'Ingresa un motivo descriptivo de al menos 5 caracteres.'),
})

export const staffSupportActionSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
  reason: z.string().trim().min(5, 'Ingresa un motivo descriptivo de al menos 5 caracteres.'),
})

export const staffOrderProcessingSchema = z.object({
  exchange_rate_applied: z.coerce.number().positive('Ingresa un tipo de cambio valido.'),
  amount_converted: z.coerce.number().nonnegative('Ingresa un monto convertido valido.'),
  fee_total: z.coerce.number().nonnegative('Ingresa una fee valida.'),
  reason: z.string().trim().min(5, 'Ingresa un motivo descriptivo de al menos 5 caracteres.'),
})

export const staffOrderSentSchema = z.object({
  reference: z.string().trim().min(3, 'Ingresa una referencia o hash.'),
  provider_reference: z.string().optional(),
  reason: z.string().trim().min(5, 'Ingresa un motivo descriptivo de al menos 5 caracteres.'),
})

export const staffOrderCompletionSchema = z.object({
  reason: z.string().trim().min(5, 'Ingresa un motivo descriptivo de al menos 5 caracteres.'),
})

export type StaffOnboardingActionValues = z.infer<typeof staffOnboardingActionSchema>
export type StaffSupportActionValues = z.infer<typeof staffSupportActionSchema>
export type StaffOrderProcessingValues = z.infer<typeof staffOrderProcessingSchema>
export type StaffOrderSentValues = z.infer<typeof staffOrderSentSchema>
export type StaffOrderCompletionValues = z.infer<typeof staffOrderCompletionSchema>
export type StaffReasonValues = z.infer<typeof staffReasonSchema>
