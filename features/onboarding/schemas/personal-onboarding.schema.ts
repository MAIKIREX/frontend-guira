import { z } from 'zod'
import {
  INDIVIDUAL_ID_TYPE_VALUES,
  BRIDGE_COUNTRY_CODES,
  INDIVIDUAL_SOF_VALUES,
  INDIVIDUAL_PURPOSE_VALUES,
  MONTHLY_PAYMENT_VALUES,
} from '@/lib/bridge-constants'

export const personalOnboardingSchema = z.object({
  first_names: z.string().min(2, 'Requerido'),
  last_names: z.string().min(2, 'Requerido'),
  dob: z.string().min(8, 'Fecha de nacimiento requerida'),
  nationality: z.enum(BRIDGE_COUNTRY_CODES as [string, ...string[]], {
    errorMap: () => ({ message: 'Selecciona un país válido (ISO alpha-3)' }),
  }),
  occupation: z.string().min(2, 'Requerido'),
  purpose: z.enum(INDIVIDUAL_PURPOSE_VALUES as [string, ...string[]], {
    errorMap: () => ({ message: 'Selecciona un propósito válido' }),
  }),
  source_of_funds: z.enum(INDIVIDUAL_SOF_VALUES as [string, ...string[]], {
    errorMap: () => ({ message: 'Selecciona un origen de fondos válido' }),
  }),
  estimated_monthly_volume: z.enum(MONTHLY_PAYMENT_VALUES as [string, ...string[]], {
    errorMap: () => ({ message: 'Selecciona un rango de volumen mensual' }),
  }),
  street: z.string().min(4, 'Requerido'),
  city: z.string().min(2, 'Requerido'),
  state_province: z.string().min(2, 'Requerido'),
  postal_code: z.string().optional(),
  country: z.enum(BRIDGE_COUNTRY_CODES as [string, ...string[]], {
    errorMap: () => ({ message: 'Selecciona un país válido (ISO alpha-3)' }),
  }),
  id_number: z.string().min(4, 'Requerido'),
  id_expiry: z.string().min(8, 'Requerido'),
  id_document_type: z.enum(INDIVIDUAL_ID_TYPE_VALUES as [string, ...string[]], {
    errorMap: () => ({ message: 'Selecciona un tipo de documento válido' }),
  }),
  id_front: z.any().optional(),
  id_back: z.any().optional(),
  selfie: z.any().optional(),
  proof_of_address: z.any().optional(),
})

export type PersonalOnboardingValues = z.infer<typeof personalOnboardingSchema>
