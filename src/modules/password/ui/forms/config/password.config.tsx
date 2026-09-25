"use client"

import { z } from "zod"
import type { FieldConfig } from "@/shared/components/features/dynamic-form"
import { createInputField } from "@/shared/components/features/dynamic-form"
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "../../../domain/password"

/**
 * Formularios de contraseña (copy-v2 §4.1–4.3). Los nombres de campo son los
 * del wire (`new_password`, `current_password`) para que `applyServerValidation`
 * pinte en su sitio los errores de política que devuelva el servidor.
 */

const newPassword = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`)
  .max(PASSWORD_MAX_LENGTH, `Máximo ${PASSWORD_MAX_LENGTH} caracteres`)

// ---------------------------------------------------------------------------
// Crear / restablecer (con el enlace del correo)
// ---------------------------------------------------------------------------

export const setPasswordSchema = z
  .object({
    new_password: newPassword,
    confirm_password: z.string().min(1, "Repite la contraseña"),
  })
  .refine((v) => v.new_password === v.confirm_password, {
    path: ["confirm_password"],
    message: "Las dos contraseñas no coinciden",
  })

export type SetPasswordValues = z.infer<typeof setPasswordSchema>

export const defaultSetPasswordValues: SetPasswordValues = { new_password: "", confirm_password: "" }

export function buildSetPasswordFields(help: string): ReadonlyArray<FieldConfig<SetPasswordValues>> {
  return [
    createInputField<SetPasswordValues>("new_password", {
      label: "Contraseña nueva",
      inputKind: "password",
      autoComplete: "new-password",
      description: help,
      inputProps: { autoFocus: true, maxLength: PASSWORD_MAX_LENGTH },
    }),
    createInputField<SetPasswordValues>("confirm_password", {
      label: "Repítela",
      inputKind: "password",
      autoComplete: "new-password",
      inputProps: { maxLength: PASSWORD_MAX_LENGTH },
    }),
  ]
}

// ---------------------------------------------------------------------------
// ¿Olvidaste tu contraseña?
// ---------------------------------------------------------------------------

export const forgotPasswordSchema = z.object({
  email: z.email("Escribe un correo válido").trim(),
})

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export const defaultForgotPasswordValues: ForgotPasswordValues = { email: "" }

export const forgotPasswordFields: ReadonlyArray<FieldConfig<ForgotPasswordValues>> = [
  createInputField<ForgotPasswordValues>("email", {
    label: "Correo",
    inputKind: "email",
    autoComplete: "email",
    placeholder: "tu@correo.com",
    inputProps: { autoFocus: true, inputMode: "email" },
  }),
]

// ---------------------------------------------------------------------------
// Cambiar contraseña (perfil, con sesión)
// ---------------------------------------------------------------------------

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Escribe tu contraseña actual"),
    new_password: newPassword,
    confirm_password: z.string().min(1, "Repite la contraseña"),
  })
  .refine((v) => v.new_password === v.confirm_password, {
    path: ["confirm_password"],
    message: "Las dos contraseñas no coinciden",
  })
  .refine((v) => v.new_password !== v.current_password, {
    path: ["new_password"],
    message: "Elige una contraseña distinta de la actual",
  })

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>

export const defaultChangePasswordValues: ChangePasswordValues = {
  current_password: "",
  new_password: "",
  confirm_password: "",
}

export const changePasswordFields: ReadonlyArray<FieldConfig<ChangePasswordValues>> = [
  createInputField<ChangePasswordValues>("current_password", {
    label: "Contraseña actual",
    inputKind: "password",
    autoComplete: "current-password",
  }),
  createInputField<ChangePasswordValues>("new_password", {
    label: "Contraseña nueva",
    inputKind: "password",
    autoComplete: "new-password",
    description: `Mínimo ${PASSWORD_MIN_LENGTH} caracteres.`,
    inputProps: { maxLength: PASSWORD_MAX_LENGTH },
  }),
  createInputField<ChangePasswordValues>("confirm_password", {
    label: "Repítela",
    inputKind: "password",
    autoComplete: "new-password",
    inputProps: { maxLength: PASSWORD_MAX_LENGTH },
  }),
]
