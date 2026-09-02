"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { Input } from "@/shared/components/ui/input";
import { PASSWORD_STRENGTH_LABELS, passwordStrength } from "@/modules/onboarding/domain/signup-draft";

/**
 * Contraseña con ojo y medidor de fortaleza. El medidor lee la función pura del
 * dominio: la misma regla que valida el schema es la que se pinta, así que no
 * pueden contradecirse. Cuatro segmentos porque son cuatro criterios; el color
 * es de estado (éxito), no de marca.
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
    <div className="space-y-2">
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Mínimo 10 caracteres"
          autoComplete="new-password"
          aria-describedby={meterId}
          aria-invalid={error ? true : undefined}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex items-center px-3"
        >
          {visible ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
        </button>
      </div>
      <div id={meterId} className="space-y-1">
        <div aria-hidden="true" className="grid grid-cols-4 gap-1">
          {[1, 2, 3, 4].map((level) => (
            <span
              key={level}
              className={cn("bg-input h-1 rounded-full transition-colors", strength >= level && "bg-success")}
            />
          ))}
        </div>
        <p className={cn("text-xs", error ? "text-destructive" : "text-muted-foreground")} role={error ? "alert" : undefined}>
          {error ?? (value ? PASSWORD_STRENGTH_LABELS[strength] : "Mezcla mayúsculas, números y algún símbolo.")}
        </p>
      </div>
    </div>
  );
}
