"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { Input } from "@/shared/components/ui/input";
import { PASSWORD_STRENGTH_LABELS, passwordStrength } from "@/modules/onboarding/domain/signup-draft";
import { SIGNUP_INPUT_CLASS } from "@/modules/onboarding/ui/signup/signup-field.styles";

/**
 * Contraseña con ojo y medidor de fortaleza. El medidor lee la función pura del
 * dominio: la misma regla que valida el schema es la que se pinta, así que no
 * pueden contradecirse. Cuatro segmentos porque son cuatro criterios.
 *
 * Sobre el campo de `/comenzar` los segmentos se llenan con el color del texto
 * (blanco sobre coral): el material del campo no admite el verde semántico y el
 * logro ya lo dice la etiqueta («Muy buena»).
 */
export function PasswordField({
  id,
  value,
  onChange,
  error,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  error?: string;
}) {
  const [visible, setVisible] = useState(false);
  const meterId = useId();
  const strength = passwordStrength(value);

  return (
    <div className="space-y-2 text-left">
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Contraseña"
          autoComplete="new-password"
          aria-describedby={meterId}
          aria-invalid={error ? true : undefined}
          className={cn(SIGNUP_INPUT_CLASS, "pr-12")}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex items-center px-4"
        >
          {visible ? <EyeOff aria-hidden="true" className="size-[18px]" /> : <Eye aria-hidden="true" className="size-[18px]" />}
        </button>
      </div>
      <div id={meterId} className="space-y-1.5">
        <div aria-hidden="true" className="grid grid-cols-4 gap-[5px]">
          {[1, 2, 3, 4].map((level) => (
            <span
              key={level}
              className={cn(
                "bg-secondary h-1 overflow-hidden rounded-full",
                "after:bg-foreground after:block after:h-full after:w-full after:origin-left after:transition-transform after:duration-400 after:ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:after:transition-none",
                strength >= level ? "after:scale-x-100" : "after:scale-x-0",
              )}
            />
          ))}
        </div>
        <p className={cn("flex justify-between gap-3 text-xs", error ? "text-destructive font-medium" : "text-muted-foreground")} role={error ? "alert" : undefined}>
          <span>{error ?? "Mínimo 10 caracteres, una mayúscula y un número"}</span>
          {!error && value ? <b className="text-foreground font-semibold">{PASSWORD_STRENGTH_LABELS[strength]}</b> : null}
        </p>
      </div>
    </div>
  );
}
