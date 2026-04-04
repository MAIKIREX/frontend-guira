import { z } from 'zod'
import {
  BRIDGE_COUNTRY_CODES,
  BUSINESS_TYPE_VALUES,
  BUSINESS_SOF_VALUES,
  BUSINESS_PURPOSE_VALUES,
  MONTHLY_PAYMENT_VALUES,
} from '@/lib/bridge-constants'

const percentageString = z
  .string()
  .trim()
  .min(1, 'Participacion requerida')
  .refine((value) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100
  }, 'La participacion debe estar entre 0 y 100')

export const uboSchema = z.object({
  first_names: z.string().min(2, 'Requerido'),
  last_names: z.string().min(2, 'Requerido'),
  percentage: percentageString,
  nationality: z.enum(BRIDGE_COUNTRY_CODES as [string, ...string[]], {
    errorMap: () => ({ message: 'Selecciona un país válido (ISO alpha-3)' }),
  }),
  passport: z.any().optional(),
  id_front: z.any().optional(),
})

export type UBOValues = z.infer<typeof uboSchema>

export const companyOnboardingSchema = z.object({
  company_legal_name: z.string().min(2, 'Requerido'),
  registration_number: z.string().min(2, 'Requerido'),
  country_of_incorporation: z.enum(BRIDGE_COUNTRY_CODES as [string, ...string[]], {
    errorMap: () => ({ message: 'Selecciona un país válido (ISO alpha-3)' }),
  }),
  entity_type: z.enum(BUSINESS_TYPE_VALUES as [string, ...string[]], {
    errorMap: () => ({ message: 'Selecciona un tipo de entidad válido' }),
  }),
  incorporation_date: z.string().min(8, 'Requerido'),
  business_description: z.string().min(4, 'Requerido'),
  business_street: z.string().min(4, 'Requerido'),
  business_city: z.string().min(2, 'Requerido'),
  business_country: z.enum(BRIDGE_COUNTRY_CODES as [string, ...string[]], {
    errorMap: () => ({ message: 'Selecciona un país válido (ISO alpha-3)' }),
  }),
  legal_rep_first_names: z.string().min(2, 'Requerido'),
  legal_rep_last_names: z.string().min(2, 'Requerido'),
  legal_rep_position: z.string().min(2, 'Requerido'),
  legal_rep_id_number: z.string().min(2, 'Requerido'),
  purpose: z.enum(BUSINESS_PURPOSE_VALUES as [string, ...string[]], {
    errorMap: () => ({ message: 'Selecciona un propósito válido' }),
  }),
  source_of_funds: z.enum(BUSINESS_SOF_VALUES as [string, ...string[]], {
    errorMap: () => ({ message: 'Selecciona un origen de fondos válido' }),
  }),
  estimated_monthly_volume: z.enum(MONTHLY_PAYMENT_VALUES as [string, ...string[]], {
    errorMap: () => ({ message: 'Selecciona un rango de volumen mensual' }),
  }),
  tax_id: z.string().min(2, 'Requerido'),
  company_cert: z.any().optional(),
  legal_rep_id: z.any().optional(),
  proof_of_address: z.any().optional(),
  ubos: z.array(uboSchema).optional(),
})

export type CompanyOnboardingValues = z.infer<typeof companyOnboardingSchema>
