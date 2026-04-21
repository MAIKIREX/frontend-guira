import { z } from 'zod'
import {
  INDIVIDUAL_ID_TYPE_VALUES,
  BRIDGE_COUNTRY_CODES,
  INDIVIDUAL_SOF_VALUES,
  INDIVIDUAL_PURPOSE_VALUES,
  MONTHLY_PAYMENT_VALUES,
  EMPLOYMENT_STATUS_VALUES,
  OCCUPATION_VALUES,
  COUNTRIES_WITH_SUBDIVISIONS,
} from '@/lib/bridge-constants'

const personalOnboardingBase = z.object({
  // ── Identidad ───────────────────────────────────────────
  first_name: z.string().min(2, 'Requerido'),
  middle_name: z.string().optional(),
  last_name: z.string().min(2, 'Requerido'),
  date_of_birth: z.string()
    .min(10, 'Fecha de nacimiento requerida')
    .refine((val) => {
      const dob = new Date(val)
      const today = new Date()
      let age = today.getFullYear() - dob.getFullYear()
      const m = today.getMonth() - dob.getMonth()
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
      return age >= 18
    }, 'Debes ser mayor de 18 años para registrarte'),
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

  // ── Contacto ────────────────────────────────────────────
  email: z.string().email('Email inválido'),
  phone: z.string()
    .regex(/^\+[1-9]\d{6,14}$/, 'El teléfono debe incluir código de país (ej: +59171234567)')
    .min(8, 'Teléfono requerido (incluye código de país)'),

  // ── Dirección ─────────────────────────────────────
  address1: z.string().min(4, 'Requerido').regex(/^[a-zA-Z0-9\s.,#'/()-]*$/, 'Solo letras sin acentos ni símbolos especiales (ej. evite º o ñ)'),
  address2: z.string().regex(/^[a-zA-Z0-9\s.,#'/()-]*$/, 'Solo letras sin acentos ni símbolos especiales (ej. evite º o ñ)').optional(),
  city: z.string().min(2, 'Requerido'),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.enum(BRIDGE_COUNTRY_CODES, {
    error: 'Selecciona un país válido',
  }),

  // ── Información Financiera ─────────────────────────────────────────────
  // P2-A: most_recent_occupation — optional, only required for restricted countries/high-risk
  most_recent_occupation: z.enum(OCCUPATION_VALUES, {
    error: 'Selecciona una ocupación válida',
  }).optional(),
  account_purpose: z.enum(INDIVIDUAL_PURPOSE_VALUES, {
    error: 'Selecciona un propósito válido',
  }),
  // P1-A: account_purpose_other — required when account_purpose = 'other'
  account_purpose_other: z.string().optional(),
  source_of_funds: z.enum(INDIVIDUAL_SOF_VALUES, {
    error: 'Selecciona un origen de fondos válido',
  }),
  // F3: campo renombrado de estimated_monthly_volume → expected_monthly_payments_usd
  // para alinearse con enum Bridge OpenAPI spec
  expected_monthly_payments_usd: z.enum(MONTHLY_PAYMENT_VALUES, {
    error: 'Selecciona un rango de volumen mensual',
  }),
  tax_id: z.string().optional(),

  // ── Compliance ────────────────────────────────────────────
  is_pep: z.boolean({ error: 'Debes indicar si eres una Persona Expuesta Políticamente' }),

  // ── P1: Estado laboral (high-risk / EDD) ────────────────
  // Campo opcional Bridge: employment_status
  employment_status: z.enum(EMPLOYMENT_STATUS_VALUES).optional(),

  // ── Documentos (paths devueltos por el backend) ───
  doc_national_id: z.any().optional(),
  doc_proof_of_address: z.any().optional(),
})

// P1-A: conditional validation — account_purpose_other required when account_purpose = 'other'
export const personalOnboardingSchema = personalOnboardingBase.superRefine((data, ctx) => {
  if (data.account_purpose === 'other' && !data.account_purpose_other?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Debes especificar el propósito de la cuenta',
      path: ['account_purpose_other'],
    })
  }

  // State/subdivision requerido cuando el país tiene subdivisiones definidas
  if (data.country && COUNTRIES_WITH_SUBDIVISIONS.has(data.country) && !data.state?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Debes seleccionar un estado / provincia',
      path: ['state'],
    })
  }
})

export type PersonalOnboardingValues = z.infer<typeof personalOnboardingSchema>
