import { z } from 'zod'

export const supportSchema = z.object({
  subject: z.string().min(4, "El asunto debe ser claro y específico"),
  message: z.string().min(10, "Describe detalladamente tu inconveniente"),
  contact_email: z.string().email("Correo de contacto inválido"),
  contact_phone: z.string().min(6, "Número de contacto inválido").optional().or(z.literal('')),
})

export type SupportValues = z.infer<typeof supportSchema>
