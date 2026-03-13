import { z } from "zod"

export const updatePasswordSchema = z.object({
  password: z
    .string()
    .min(12, "La contraseña debe tener al menos 12 caracteres")
    .regex(/[0-9]/, "Debe contener al menos un número")
    .regex(/[^A-Za-z0-9]/, "Debe contener al menos un carácter especial"),
})

export type UpdatePasswordFormValues = z.infer<typeof updatePasswordSchema>
