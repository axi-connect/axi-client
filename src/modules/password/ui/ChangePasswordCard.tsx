"use client"

import { useState } from "react"
import { KeyRound, LoaderCircle } from "lucide-react"
import type { UseFormReturn } from "react-hook-form"

import { API_ERROR_CODES, isHttpError } from "@/core/api/problem"
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages"
import { useAlert } from "@/core/providers/alert-provider"
import { DynamicForm } from "@/shared/components/features/dynamic-form"
import { Button } from "@/shared/components/ui/button"
import { changePassword } from "../infrastructure/services/password-service.adapter"
import {
  changePasswordFields,
  changePasswordSchema,
  defaultChangePasswordValues,
  type ChangePasswordValues,
} from "./forms/config/password.config"

export const TOO_MANY_ATTEMPTS = "Demasiados intentos. Espera unos minutos e inténtalo de nuevo."

/**
 * «Cambiar contraseña» con la sesión abierta. Una contraseña actual
 * equivocada llega como 422 `auth/current_password_invalid` y se pinta en su
 * campo: la sesión sigue intacta (el BFF no borra cookies ante un 422).
 */
export function ChangePasswordCard() {
  const { showAlert } = useAlert()
  // Cambia tras cada éxito para vaciar el formulario (DynamicForm resetea al
  // recibir defaultValues nuevos).
  const [defaults, setDefaults] = useState<ChangePasswordValues>(defaultChangePasswordValues)

  async function onSubmit(values: ChangePasswordValues, form: UseFormReturn<ChangePasswordValues>) {
    try {
      await changePassword(values.current_password, values.new_password)
      setDefaults({ ...defaultChangePasswordValues })
      showAlert({ tone: "success", title: "Tu contraseña cambió", description: "Úsala la próxima vez que entres." })
    } catch (error) {
      if (isHttpError(error) && error.is(API_ERROR_CODES.currentPasswordInvalid)) {
        form.setError("current_password", { type: "server", message: "La contraseña actual no coincide" })
        form.setFocus("current_password")
        return
      }
      if (isHttpError(error) && (error.is(API_ERROR_CODES.tooManyAttempts) || error.status === 429)) {
        // La sesión sigue abierta: el BFF no toca las cookies ante un 429.
        showAlert({ tone: "warning", title: TOO_MANY_ATTEMPTS })
        return
      }
      if (isHttpError(error) && error.is(API_ERROR_CODES.supportActionForbidden)) {
        // Bajo soporte (QA H3-4): el título dice por qué, no «No pudimos…».
        showAlert({ tone: "warning", title: "No disponible en soporte", description: errorMessage(error) })
        return
      }
      if (applyServerValidation(error, form)) return
      showAlert({ tone: "error", title: "No pudimos cambiar tu contraseña", description: errorMessage(error) })
    }
  }

  return (
    <section
      aria-labelledby="change-password-title"
      className="border-border bg-card max-w-xl rounded-2xl border p-4 sm:p-6"
    >
      <div className="mb-5 flex items-start gap-3">
        <KeyRound aria-hidden="true" className="text-muted-foreground mt-1 size-5 shrink-0" />
        <div className="space-y-1">
          <h2 id="change-password-title" className="text-lg font-semibold">
            Cambiar contraseña
          </h2>
          <p className="text-muted-foreground text-sm">Elige una contraseña que solo tú conozcas.</p>
        </div>
      </div>
      <DynamicForm<ChangePasswordValues>
        schema={changePasswordSchema}
        defaultValues={defaults}
        fields={changePasswordFields}
        columns={1}
        mode="onTouched"
        onSubmit={onSubmit}
        actions={{
          render: ({ submitting }) => (
            <Button type="submit" disabled={submitting}>
              {submitting ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : null}
              {submitting ? "Guardando…" : "Guardar contraseña nueva"}
            </Button>
          ),
        }}
      />
    </section>
  )
}
