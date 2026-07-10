import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  // Solo se pide cuando el backend responde 409 auth/ambiguous_company
  // (el mismo email existe en varias empresas).
  company_nit: z.string().min(3, "NIT inválido").optional(),
})

export type LoginFormValues = z.infer<typeof loginSchema>
