import { z } from "zod"

// const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{12,})/
export const registerSchema = z.object({
  fullName: z.string().min(2, "El nombre debe tener al menos 2 caracteres").trim(),
  email: z.string().email("Debe ser un correo electrónico válido"),
  password: z
    .string()
    .min(12, "La contraseña debe tener al menos 12 caracteres")
    .regex(/[a-z]/, "Debe contener al menos una minúscula")
    .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
    .regex(/[0-9]/, "Debe contener al menos un número")
    .regex(/[^A-Za-z0-9]/, "Debe contener al menos un carácter especial"),
  acceptTerms: z.literal(true, 'Debes aceptar los términos y condiciones'),
})

export type RegisterFormValues = z.infer<typeof registerSchema>
