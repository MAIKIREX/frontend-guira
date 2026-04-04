import { z } from 'zod'
import {
  INDIVIDUAL_ID_TYPE_VALUES,
  BRIDGE_COUNTRY_CODES,
  INDIVIDUAL_SOF_VALUES,
  INDIVIDUAL_PURPOSE_VALUES,
  MONTHLY_PAYMENT_VALUES,
} from '@/lib/bridge-constants'

export const personalOnboardingSchema = z.object({
  // ── Identidad ─────────────────────────────────────
  first_name: z.string().min(2, 'Requerido'),
  last_name: z.string().min(2, 'Requerido'),
  date_of_birth: z.string().min(8, 'Fecha de nacimiento requerida'),
  nationality: z.enum(BRIDGE_COUNTRY_CODES, {
    error: 'Selecciona un país válido',
  }),
  country_of_residence: z.enum(BRIDGE_COUNTRY_CODES, {
    error: 'Selecciona un país de residencia',
  }),
  id_type: z.enum(INDIVIDUAL_ID_TYPE_VALUES, {
    error: 'Selecciona un tipo de documento válido',
  }),
  id_number: z.string().min(4, 'Requerido'),
  id_expiry_date: z.string().min(8, 'Fecha de vencimiento requerida'),

  // ── Contacto ──────────────────────────────────────
  email: z.string().email('Email inválido'),
  phone: z.string().min(7, 'Teléfono requerido (incluye código de país)'),

  // ── Dirección ─────────────────────────────────────
  address1: z.string().min(4, 'Requerido'),
  address2: z.string().optional(),
  city: z.string().min(2, 'Requerido'),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.enum(BRIDGE_COUNTRY_CODES, {
    error: 'Selecciona un país válido',
  }),

  // ── Información Financiera ─────────────────────────
  occupation: z.string().min(2, 'Requerido'),
  account_purpose: z.enum(INDIVIDUAL_PURPOSE_VALUES, {
    error: 'Selecciona un propósito válido',
  }),
  source_of_funds: z.enum(INDIVIDUAL_SOF_VALUES, {
    error: 'Selecciona un origen de fondos válido',
  }),
  estimated_monthly_volume: z.enum(MONTHLY_PAYMENT_VALUES, {
    error: 'Selecciona un rango de volumen mensual',
  }),
  tax_id: z.string().optional(),

  // ── Compliance ────────────────────────────────────
  is_pep: z.boolean({ error: 'Debes indicar si eres una Persona Expuesta Políticamente' }),

  // ── Documentos (paths devueltos por el backend) ───
  doc_national_id: z.any().optional(),
  doc_proof_of_address: z.any().optional(),
})

export type PersonalOnboardingValues = z.infer<typeof personalOnboardingSchema>
