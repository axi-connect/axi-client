"use client"

import Link from "next/link"
import { useState } from "react"
import { LoaderCircle } from "lucide-react"
import type { UseFormReturn } from "react-hook-form"

import { applyServerValidation, errorMessage } from "@/core/lib/error-messages"
import { useAlert } from "@/core/providers/alert-provider"
import { DynamicForm } from "@/shared/components/features/dynamic-form"
import { Button } from "@/shared/components/ui/button"
import { TOKEN_LIFETIME_LABEL } from "../domain/password"
import { requestPasswordReset } from "../infrastructure/services/password-service.adapter"
import { PasswordShell } from "./components/PasswordShell"
import {
  defaultForgotPasswordValues,
  forgotPasswordFields,
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from "./forms/config/password.config"

const BACK_TO_LOGIN = (
  <Link href="/auth/login" className="text-brand font-medium">
    Volver a iniciar sesión
  </Link>
)

/**
 * «¿Olvidaste tu contraseña?» (copy-v2 §4.2). La pantalla de después dice lo
 * mismo exista o no la cuenta («Si {{email}} tiene una cuenta…»): ni el copy ni
 * el tiempo de respuesta revelan qué correos están registrados (OWASP).
 */
export function ForgotPasswordView() {
  const { showAlert } = useAlert()
  const [sentTo, setSentTo] = useState<string | null>(null)

  async function onSubmit(values: ForgotPasswordValues, form: UseFormReturn<ForgotPasswordValues>) {
    try {
      await requestPasswordReset(values.email)
      setSentTo(values.email)
    } catch (error) {
      if (applyServerValidation(error, form)) return
      showAlert({ tone: "error", title: "No pudimos enviar el enlace", description: errorMessage(error) })
    }
  }

  if (sentTo) {
    return (
      <PasswordShell
        title="Revisa tu correo"
        description={
          <>
            Si <span className="text-foreground font-medium break-all">{sentTo}</span> tiene una cuenta en Axi
            Connect, en unos minutos te llega un enlace para crear una contraseña nueva. Sirve una vez y vence en{" "}
            {TOKEN_LIFETIME_LABEL.reset}.
          </>
        }
        footer={
          <>
            <p>¿No llega? Revisa la carpeta de spam o pídelo otra vez en unos minutos.</p>
            <p>{BACK_TO_LOGIN}</p>
          </>
        }
      />
    )
  }

  return (
    <PasswordShell
      title="¿Olvidaste tu contraseña?"
      description="Escribe el correo con el que entras y te enviamos un enlace para crear una nueva."
      footer={BACK_TO_LOGIN}
    >
      <DynamicForm<ForgotPasswordValues>
        schema={forgotPasswordSchema}
        defaultValues={defaultForgotPasswordValues}
        fields={forgotPasswordFields}
        columns={1}
        mode="onTouched"
        onSubmit={onSubmit}
        actions={{
          render: ({ submitting }) => (
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : null}
              {submitting ? "Enviando…" : "Enviarme el enlace"}
            </Button>
          ),
        }}
      />
    </PasswordShell>
  )
}
