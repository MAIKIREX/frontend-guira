import { z } from "zod"

export const uboSchema = z.object({
  first_names: z.string().min(2, "Requerido"),
  last_names: z.string().min(2, "Requerido"),
  percentage: z.string().min(1, "Participación requerida"),
  nationality: z.string().min(2, "Requerido"),
  passport: z.any().optional(),
  id_front: z.any().optional(),
})

export type UBOValues = z.infer<typeof uboSchema>

export const companyOnboardingSchema = z.object({
  company_legal_name: z.string().min(2, "Requerido"),
  registration_number: z.string().min(2, "Requerido"),
  country_of_incorporation: z.string().min(2, "Requerido"),
  entity_type: z.string().min(2, "Requerido"),
  incorporation_date: z.string().min(8, "Requerido"),
  business_description: z.string().min(4, "Requerido"),
  business_street: z.string().min(4, "Requerido"),
  business_city: z.string().min(2, "Requerido"),
  business_country: z.string().min(2, "Requerido"),
  legal_rep_first_names: z.string().min(2, "Requerido"),
  legal_rep_last_names: z.string().min(2, "Requerido"),
  legal_rep_position: z.string().min(2, "Requerido"),
  legal_rep_id_number: z.string().min(2, "Requerido"),
  purpose: z.string().min(2, "Requerido"),
  source_of_funds: z.string().min(2, "Requerido"),
  estimated_monthly_volume: z.string().min(1, "Requerido"),
  tax_id: z.string().min(2, "Requerido"),
  company_cert: z.any().optional(),
  legal_rep_id: z.any().optional(),
  proof_of_address: z.any().optional(),
  ubos: z.array(uboSchema).optional(),
})

export type CompanyOnboardingValues = z.infer<typeof companyOnboardingSchema>
