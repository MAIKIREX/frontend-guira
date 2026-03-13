import { z } from "zod"

export const recoverySchema = z.object({
  email: z.string().email("Debe ser un correo electrónico válido"),
})

export type RecoveryFormValues = z.infer<typeof recoverySchema>
