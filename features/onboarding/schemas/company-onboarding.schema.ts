import { z } from 'zod'
import {
  BRIDGE_COUNTRY_CODES,
  BUSINESS_TYPE_VALUES,
  BUSINESS_SOF_VALUES,
  BUSINESS_PURPOSE_VALUES,
  MONTHLY_PAYMENT_VALUES,
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
  id_type: z.enum(['passport', 'national_id', 'drivers_license'] as const).optional(),
  id_number: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  is_pep: z.boolean({ error: 'Requerido' }),
  // Doc
  doc_id: z.any().optional(),
})

export type UBOValues = z.infer<typeof uboSchema>

// ── Schema Empresa ─────────────────────────────────────────────────
export const companyOnboardingSchema = z.object({
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
  business_industry: z.string().min(2, 'Requerido'),

  // Contacto empresa
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),

  // Dirección empresa
  address1: z.string().min(4, 'Requerido'),
  address2: z.string().optional(),
  city: z.string().min(2, 'Requerido'),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.enum(BRIDGE_COUNTRY_CODES, {
    error: 'Selecciona un país válido',
  }),

  // Finanzas
  account_purpose: z.enum(BUSINESS_PURPOSE_VALUES, {
    error: 'Selecciona un propósito válido',
  }),
  source_of_funds: z.enum(BUSINESS_SOF_VALUES, {
    error: 'Selecciona un origen de fondos válido',
  }),
  estimated_monthly_volume: z.enum(MONTHLY_PAYMENT_VALUES, {
    error: 'Selecciona un rango de volumen mensual',
  }),
  conducts_money_services: z.boolean(),
  uses_bridge_for_money_services: z.boolean(),

  // Representante Legal (se mapeará a director en el backend)
  legal_rep_first_name: z.string().min(2, 'Requerido'),
  legal_rep_last_name: z.string().min(2, 'Requerido'),
  legal_rep_position: z.string().min(2, 'Requerido'),
  legal_rep_id_number: z.string().min(2, 'Requerido'),
  legal_rep_email: z.string().email('Email inválido').optional().or(z.literal('')),
  legal_rep_is_pep: z.boolean(),

  // Documentos (paths)
  doc_company_cert: z.any().optional(),
  doc_legal_rep_id: z.any().optional(),
  doc_proof_of_address: z.any().optional(),

  // UBOs
  ubos: z.array(uboSchema).optional(),
})

export type CompanyOnboardingValues = z.infer<typeof companyOnboardingSchema>
