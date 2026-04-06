import { z } from 'zod'
import {
  BRIDGE_COUNTRY_CODES,
  BUSINESS_TYPE_VALUES,
  BUSINESS_SOF_VALUES,
  BUSINESS_PURPOSE_VALUES,
  MONTHLY_PAYMENT_VALUES,
  ANNUAL_REVENUE_VALUES,
  HIGH_RISK_ACTIVITY_VALUES,
  BUSINESS_INDUSTRY_VALUES,
} from '@/lib/bridge-constants'

// ── Schema UBO ────────────────────────────────────────────────────
export const uboSchema = z.object({
  first_name: z.string().min(2, 'Requerido'),
  last_name: z.string().min(2, 'Requerido'),
  ownership_percent: z
    .number({ error: 'Debe ser un número' })
    .min(0)
    .max(100, 'No puede superar 100%'),
  date_of_birth: z.string().optional(),
  nationality: z.enum(BRIDGE_COUNTRY_CODES, {
    error: 'Selecciona un país válido',
  }).optional(),
  country_of_residence: z.enum(BRIDGE_COUNTRY_CODES, {
    error: 'Selecciona un país válido',
  }).optional(),
  // P0-B: Residential Address mandatory for UBO via Bridge API
  address1: z.string().min(4, 'Dirección residencial requerida'),
  address2: z.string().optional(),
  city: z.string().min(2, 'Ciudad requerida'),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.enum(BRIDGE_COUNTRY_CODES, {
    error: 'Selecciona un país residencial',
  }),
  id_type: z.enum(['passport', 'national_id', 'drivers_license'] as const).optional(),
  id_number: z.string().optional(),
  email: z.string().email('El email del UBO es obligatorio para completar el proceso Bridge'),
  is_pep: z.boolean({ error: 'Requerido' }),
  // F9: has_control — indica si el UBO también tiene control operacional (no solo ownership)
  has_control: z.boolean().optional(),
  // Doc
  doc_id: z.any().optional(),
})

export type UBOValues = z.infer<typeof uboSchema>

// ── Schema Empresa ─────────────────────────────────────────────────
const companyOnboardingBase = z.object({
  // Datos Empresa
  legal_name: z.string().min(2, 'Requerido'),
  trade_name: z.string().optional(),
  registration_number: z.string().optional(),
  tax_id: z.string().min(2, 'Requerido'),
  entity_type: z.enum(BUSINESS_TYPE_VALUES, {
    error: 'Selecciona un tipo de entidad válido',
  }),
  incorporation_date: z.string().optional(),
  country_of_incorporation: z.enum(BRIDGE_COUNTRY_CODES, {
    error: 'Selecciona un país válido',
  }),
  business_description: z.string().min(4, 'Requerido'),
  // P1-B: business_industry como array de códigos NAICS
  business_industry: z.array(z.string()).min(1, 'Selecciona al menos una industria'),
  // P2-D: primary_website mejora la aprobación KYB
  primary_website: z.string().url('URL inválida').optional().or(z.literal('')),

  // Contacto empresa
  email: z.string().email('Email inválido'),
  phone: z.string()
    .regex(/^\+[1-9]\d{6,14}$/, 'Teléfono debe incluir código de país (ej: +59171234567)')
    .optional().or(z.literal('')),

  // ── Dirección registrada (registered_address → Bridge) ────────────
  address1: z.string().min(4, 'Requerido'),
  address2: z.string().optional(),
  city: z.string().min(2, 'Requerido'),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.enum(BRIDGE_COUNTRY_CODES, {
    error: 'Selecciona un país válido',
  }),

  // ── P2: Dirección operacional / física (physical_address → Bridge) ─
  // Se envía a Bridge solo si physical_city + physical_country están presentes.
  physical_address1: z.string().optional(),
  physical_address2: z.string().optional(),
  physical_city: z.string().optional(),
  physical_state: z.string().optional(),
  physical_postal_code: z.string().optional(),
  physical_country: z.enum(BRIDGE_COUNTRY_CODES, {
    error: 'Selecciona un país válido',
  }).optional(),

  // Finanzas
  account_purpose: z.enum(BUSINESS_PURPOSE_VALUES, {
    error: 'Selecciona un propósito válido',
  }),
  // P1-A: account_purpose_other — required when account_purpose = 'other'
  account_purpose_other: z.string().optional(),
  source_of_funds: z.enum(BUSINESS_SOF_VALUES, {
    error: 'Selecciona un origen de fondos válido',
  }),
  // F3: renombrado estimated_monthly_volume → expected_monthly_payments_usd
  expected_monthly_payments_usd: z.enum(MONTHLY_PAYMENT_VALUES, {
    error: 'Selecciona un rango de volumen mensual',
  }),
  conducts_money_services: z.boolean(),
  uses_bridge_for_money_services: z.boolean(),

  // ── P1: High-risk / EDD ───────────────────────────────────────
  // P0-C: updated to match Bridge exact enum values ('0_99999', etc.)
  estimated_annual_revenue_usd: z.enum(ANNUAL_REVENUE_VALUES).optional(),
  // P0-D: updated to match Bridge exact high_risk_activities enum
  high_risk_activities: z.array(z.enum(HIGH_RISK_ACTIVITY_VALUES)).optional(),

  // Representante Legal (se mapeará a director en el backend)
  legal_rep_first_name: z.string().min(2, 'Requerido'),
  legal_rep_last_name: z.string().min(2, 'Requerido'),
  legal_rep_position: z.string().min(2, 'Requerido'),
  legal_rep_id_type: z.enum(['passport', 'national_id', 'drivers_license'] as const, {
    error: 'Selecciona un tipo de documento',
  }),
  legal_rep_id_number: z.string().min(2, 'Requerido'),
  legal_rep_email: z.string().email('Email inválido'),
  legal_rep_is_pep: z.boolean(),
  // P0-B: Residential Address mandatory for Director via Bridge API
  legal_rep_address1: z.string().min(4, 'Dirección residencial requerida'),
  legal_rep_address2: z.string().optional(),
  legal_rep_city: z.string().min(2, 'Ciudad requerida'),
  legal_rep_state: z.string().optional(),
  legal_rep_postal_code: z.string().optional(),
  legal_rep_country: z.enum(BRIDGE_COUNTRY_CODES, {
    error: 'Selecciona un país residencial',
  }),

  // Documentos (paths)
  doc_company_cert: z.any().optional(),
  doc_legal_rep_id: z.any().optional(),
  doc_proof_of_address: z.any().optional(),

  // UBOs
  ubos: z.array(uboSchema).optional(),
})

// P1-A: conditional validation — account_purpose_other required when account_purpose = 'other'
const companyWithSuperRefine = companyOnboardingBase.superRefine((data, ctx) => {
  if (data.account_purpose === 'other' && !data.account_purpose_other?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Debes especificar el propósito de la cuenta',
      path: ['account_purpose_other'],
    })
  }
})

// Re-export with same name for backward compatibility
export const companyOnboardingSchema = companyWithSuperRefine

export type CompanyOnboardingValues = z.infer<typeof companyOnboardingSchema>
