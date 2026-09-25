"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { LoaderCircle } from "lucide-react"
import type { UseFormReturn } from "react-hook-form"

import { salesWhatsAppUrl } from "@/core/config/env"
import { API_ERROR_CODES, isHttpError } from "@/core/api/problem"
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages"
import { useAlert } from "@/core/providers/alert-provider"
import { DynamicForm } from "@/shared/components/features/dynamic-form"
import { Button } from "@/shared/components/ui/button"
import {
  PASSWORD_MIN_LENGTH,
  TOKEN_LIFETIME_LABEL,
  formatExpiresAt,
  invalidLinkReason,
  type InvalidLinkReason,
  type PasswordPurpose,
  type PasswordTokenInfo,
} from "../domain/password"
import { useHashToken } from "../infrastructure/hooks/use-hash-token"
import { inspectPasswordToken, setPasswordWithToken } from "../infrastructure/services/password-service.adapter"
import { PasswordShell } from "./components/PasswordShell"
import {
  buildSetPasswordFields,
  defaultSetPasswordValues,
  setPasswordSchema,
  type SetPasswordValues,
} from "./forms/config/password.config"

type FlowState =
  | { step: "checking" }
  | { step: "form"; info: PasswordTokenInfo | null }
  | { step: "invalid"; reason: InvalidLinkReason }
  | { step: "done" }

/**
 * Crear contraseña (invitación, `/auth/crear-contrasena`) y restablecerla
 * (`/auth/restablecer`): el mismo recorrido con distinto copy (copy-v2 §4.1 y
 * §4.3).
 *
 * 1. El token se lee del `#` y se borra de la URL al montar (`useHashToken`).
 * 2. `inspect` dice si el enlace sigue vivo y cuándo vence.
 * 3. `set` lo consume. Todo por POST al BFF; el token solo vive en memoria.
 *
 * Si `inspect` falla por red, el formulario se muestra igual: el `set` es el
 * que decide, y un fallo pasajero no debe dejar a nadie sin su contraseña.
 */
export function SetPasswordFlow({ purpose }: { purpose: PasswordPurpose }) {
  const hash = useHashToken()
  const { showAlert } = useAlert()
  const [state, setState] = useState<FlowState>({ step: "checking" })
  const tokenRef = useRef<string | null>(null)

  useEffect(() => {
    if (hash.status === "reading") return
    if (hash.status === "missing") {
      setState({ step: "invalid", reason: "expired" })
      return
    }
    tokenRef.current = hash.token
    let alive = true
    inspectPasswordToken(hash.token)
      .then((info) => alive && setState({ step: "form", info }))
      .catch((error: unknown) => {
        if (!alive) return
        if (isHttpError(error) && error.is(API_ERROR_CODES.passwordTokenInvalid)) {
          setState({ step: "invalid", reason: invalidLinkReason(error.problem?.details) })
        } else {
          setState({ step: "form", info: null })
        }
      })
    return () => {
      alive = false
    }
  }, [hash])

  async function onSubmit(values: SetPasswordValues, form: UseFormReturn<SetPasswordValues>) {
    const token = tokenRef.current
    if (!token) return
    try {
      await setPasswordWithToken(token, values.new_password)
      tokenRef.current = null
      setState({ step: "done" })
    } catch (error) {
      if (isHttpError(error) && error.is(API_ERROR_CODES.passwordTokenInvalid)) {
        tokenRef.current = null
        setState({ step: "invalid", reason: invalidLinkReason(error.problem?.details) })
        return
      }
      if (applyServerValidation(error, form)) return
      showAlert({ tone: "error", title: "No pudimos guardar tu contraseña", description: errorMessage(error) })
    }
  }

  if (state.step === "checking") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
        <LoaderCircle aria-hidden="true" className="text-muted-foreground size-6 animate-spin motion-reduce:animate-none" />
        <span className="sr-only">Revisando tu enlace…</span>
      </div>
    )
  }

  if (state.step === "invalid") return <InvalidLink purpose={purpose} reason={state.reason} />

  if (state.step === "done") {
    const copy =
      purpose === "invite"
        ? {
            title: "Listo, tu contraseña quedó creada",
            text: "Ya puedes entrar a tu panel. Guárdala en el gestor de contraseñas de tu celular para no perderla.",
          }
        : { title: "Tu contraseña cambió", text: "Ya puedes entrar con la contraseña nueva." }
    return (
      <PasswordShell title={copy.title} description={copy.text}>
        <Button asChild className="w-full">
          <Link href="/auth/login">Entrar a mi panel</Link>
        </Button>
      </PasswordShell>
    )
  }

  const info = state.info
  const expiresAt = info ? formatExpiresAt(info.expires_at) : ""
  const copy =
    purpose === "invite"
      ? {
          title: "Crea tu contraseña",
          text: info?.business_name
            ? `Es la llave de tu panel de ${info.business_name}. Solo tú la vas a conocer.`
            : "Es la llave de tu panel. Solo tú la vas a conocer.",
          help: `Mínimo ${PASSWORD_MIN_LENGTH} caracteres. Mejor una frase que recuerdes que una palabra con símbolos.`,
          submit: "Guardar y entrar a mi panel",
        }
      : {
          title: "Crea una contraseña nueva",
          // El producto no guarda el historial de contraseñas: variante de copy-v2 §4.3.
          text: "Elige una contraseña que solo tú conozcas.",
          help: `Mínimo ${PASSWORD_MIN_LENGTH} caracteres.`,
          submit: "Guardar contraseña nueva",
        }

  return (
    <PasswordShell
      title={copy.title}
      description={copy.text}
      footer={
        expiresAt ? (
          <p>
            Este enlace sirve una vez y vence el <span className="tabular-nums">{expiresAt}</span>.
          </p>
        ) : null
      }
    >
      <div className="space-y-5">
        {info?.email_masked ? (
          <p className="text-muted-foreground text-sm">
            Cuenta: <span className="text-foreground font-medium">{info.email_masked}</span>
          </p>
        ) : null}
        <DynamicForm<SetPasswordValues>
          schema={setPasswordSchema}
          defaultValues={defaultSetPasswordValues}
          fields={buildSetPasswordFields(copy.help)}
          columns={1}
          mode="onTouched"
          onSubmit={onSubmit}
          actions={{
            render: ({ submitting }) => (
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : null}
                {submitting ? "Guardando…" : copy.submit}
              </Button>
            ),
          }}
        />
      </div>
    </PasswordShell>
  )
}

/** Enlace vencido o ya usado (copy-v2 §4.1; en restablecer, «Pedir un enlace nuevo» manda). */
function InvalidLink({ purpose, reason }: { purpose: PasswordPurpose; reason: InvalidLinkReason }) {
  if (reason === "used") {
    return (
      <PasswordShell
        title="Este enlace ya se usó"
        description="Tu contraseña ya está creada. Entra con tu correo y la contraseña que elegiste."
        focusOnMount
        footer={
          purpose === "invite" ? (
            <Link href="/auth/olvide-contrasena" className="text-brand font-medium">
              ¿La olvidaste?
            </Link>
          ) : (
            <Link href="/auth/login" className="text-brand font-medium">
              Ir a iniciar sesión
            </Link>
          )
        }
      >
        {purpose === "invite" ? (
          <Button asChild className="w-full">
            <Link href="/auth/login">Ir a iniciar sesión</Link>
          </Button>
        ) : (
          <Button asChild className="w-full">
            <Link href="/auth/olvide-contrasena">Pedir un enlace nuevo</Link>
          </Button>
        )}
      </PasswordShell>
    )
  }

  return (
    <PasswordShell
      title="Este enlace ya venció"
      description={`Por seguridad, el enlace para crear tu contraseña dura ${TOKEN_LIFETIME_LABEL[purpose]}. Pide uno nuevo: llega en unos minutos a tu correo.`}
      focusOnMount
      footer={
        <a href={salesWhatsAppUrl()} target="_blank" rel="noopener noreferrer" className="text-brand font-medium">
          ¿Prefieres ayuda? Escríbele a tu asesor por WhatsApp.
        </a>
      }
    >
      <Button asChild className="w-full">
        <Link href="/auth/olvide-contrasena">Pedir un enlace nuevo</Link>
      </Button>
    </PasswordShell>
  )
}
