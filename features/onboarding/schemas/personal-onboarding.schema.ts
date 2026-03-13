import { z } from "zod"

export const personalOnboardingSchema = z.object({
  first_names: z.string().min(2, "Requerido"),
  last_names: z.string().min(2, "Requerido"),
  dob: z.string().min(8, "Fecha de nacimiento requerida"),
  nationality: z.string().min(2, "Requerido"),
  occupation: z.string().min(2, "Requerido"),
  purpose: z.string().min(2, "Requerido"),
  source_of_funds: z.string().min(2, "Requerido"),
  estimated_monthly_volume: z.string().min(1, "Requerido"),
  street: z.string().min(4, "Requerido"),
  city: z.string().min(2, "Requerido"),
  state_province: z.string().min(2, "Requerido"),
  postal_code: z.string().optional(),
  country: z.string().min(2, "Requerido"),
  id_number: z.string().min(4, "Requerido"),
  id_expiry: z.string().min(8, "Requerido"),
  id_document_type: z.string().min(1, "Selecciona tipo de documento"),
  id_front: z.any().optional(), // For file storage keys
  id_back: z.any().optional(),
  selfie: z.any().optional(),
  proof_of_address: z.any().optional(),
})

export type PersonalOnboardingValues = z.infer<typeof personalOnboardingSchema>
