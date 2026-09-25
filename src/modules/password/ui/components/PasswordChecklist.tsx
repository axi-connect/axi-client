"use client"

import { Check } from "lucide-react"
import { useFormContext, useWatch } from "react-hook-form"
import { cn } from "@/core/lib/utils"
import { passwordStrength, PASSWORD_MIN_LENGTH } from "../../domain/password"
import type { SetPasswordValues } from "../forms/config/password.config"

/**
 * Lo que pide la contraseña, marcado mientras se escribe: el largo (lo único
 * obligatorio), la sugerencia de la frase y que las dos coincidan. La barra de
 * tres tramos resume la fuerza; el color va en la barra y en el icono, nunca
 * en el texto (AA, DESIGN-SYSTEM §10).
 */
export function PasswordChecklist() {
  const { control } = useFormContext<SetPasswordValues>()
  const password = useWatch({ control, name: "new_password" }) ?? ""
  const confirm = useWatch({ control, name: "confirm_password" }) ?? ""
  const strength = passwordStrength(password)
  const rules = [
    {
      id: "length",
      ok: password.length >= PASSWORD_MIN_LENGTH,
      label: `${PASSWORD_MIN_LENGTH} caracteres o más`,
      detail: password.length > 0 && password.length < PASSWORD_MIN_LENGTH ? `van ${password.length}` : null,
    },
    { id: "phrase", ok: strength.phrase, label: "Una frase que recuerdes vale más que símbolos", detail: null },
    { id: "match", ok: confirm.length > 0 && confirm === password, label: "Las dos coinciden", detail: null },
  ]

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5" aria-hidden="true">
        {[1, 2, 3].map((step) => (
          <span
            key={step}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors motion-reduce:transition-none",
              strength.level >= step ? (strength.level === 3 ? "bg-success" : "bg-foreground") : "bg-border",
            )}
          />
        ))}
      </div>
      {/* Solo esto se anuncia, y solo cambia cuando una regla cambia de estado:
          el conteo «van N» se ve pero no se lee a cada tecla (A6). */}
      <p className="sr-only" aria-live="polite">
        {`Contraseña ${strength.label}. Cumple ${rules.filter((rule) => rule.ok).length} de ${rules.length}.`}
      </p>
      <ul className="space-y-1.5">
        {rules.map((rule) => (
          <li key={rule.id} className="flex items-start gap-2 text-sm">
            <span
              aria-hidden="true"
              className={cn(
                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full",
                rule.ok ? "bg-success text-white" : "border border-border",
              )}
            >
              {rule.ok ? <Check className="size-3" strokeWidth={3} /> : null}
            </span>
            <span className={rule.ok ? "text-foreground" : "text-muted-foreground"}>
              {rule.label}
              {rule.detail ? (
                <span aria-hidden="true" className="tabular-nums">
                  {" "}
                  · {rule.detail}
                </span>
              ) : null}
              <span className="sr-only">{rule.ok ? ": cumplido" : ": pendiente"}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
