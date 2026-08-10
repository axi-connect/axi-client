"use client";

import { useRef, useState } from "react";
import { Check, LoaderCircle, XCircle } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import type { ChannelDTO } from "@/modules/channels/domain/channel";
import type { EmbeddedSignupError } from "@/modules/channels/infrastructure/hooks/use-embedded-signup";

const DIGITS = 6;

/**
 * El PIN de registro del número.
 *
 * Se llega aquí cuando el alta devuelve **201 con
 * `onboarding.status === "awaiting_registration"`**: el número ya estaba dado de
 * alta en Meta y hace falta el PIN que se definió entonces. El canal **ya
 * existe** y recibe mensajes; lo que falta es poder responder.
 *
 * El PIN lo teclea el usuario. No existe —ni debe existir— un PIN de plataforma
 * compartido entre tenants: sería un segundo factor reutilizado.
 */
export function MetaPinForm({
  channel,
  error,
  submitting,
  onSubmit,
}: {
  channel: ChannelDTO;
  error: EmbeddedSignupError | null;
  submitting: boolean;
  onSubmit: (pin: string) => Promise<void>;
}) {
  const [digits, setDigits] = useState<string[]>(Array.from({ length: DIGITS }, () => ""));
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const pin = digits.join("");
  const complete = pin.length === DIGITS;

  const setDigit = (index: number, raw: string) => {
    const value = raw.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    if (value !== "" && index < DIGITS - 1) inputsRef.current[index + 1]?.focus();
  };

  const onKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    // Retroceso sobre una casilla vacía salta a la anterior: sin esto hay que
    // borrar dos veces y se siente roto
    if (event.key === "Backspace" && digits[index] === "" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const onPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, DIGITS);
    if (pasted === "") return;
    event.preventDefault();
    setDigits(Array.from({ length: DIGITS }, (_, i) => pasted[i] ?? ""));
    inputsRef.current[Math.min(pasted.length, DIGITS - 1)]?.focus();
  };

  return (
    <div className="max-w-xl space-y-5 rounded-lg border border-border p-4 md:p-6">
      <div className="flex gap-3 rounded-md border border-success/40 bg-success/[0.09] p-4">
        <Check aria-hidden="true" className="mt-0.5 size-4.5 shrink-0 text-success" />
        <p>
          Ya autorizaste en Meta y verificamos que el número{" "}
          <span className="font-semibold">{channel.display_phone_number ?? channel.name}</span> es
          tuyo. Falta este último paso.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">PIN de seis dígitos</legend>
        <div className={cn("flex gap-2", error !== null && "[&_input]:border-destructive")}>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => {
                inputsRef.current[index] = element;
              }}
              value={digit}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              aria-label={`Dígito ${index + 1} de ${DIGITS}`}
              onChange={(event) => setDigit(index, event.target.value)}
              onKeyDown={(event) => onKeyDown(index, event)}
              onPaste={onPaste}
              className="size-12 rounded-md border border-input bg-background text-center font-mono text-xl tabular-nums focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Lo eligió quien dio de alta el número en Meta. Nosotros no lo tenemos ni lo guardamos.
        </p>
      </fieldset>

      <div role="alert" aria-live="assertive">
        {error !== null && (
          <div className="flex gap-3 rounded-md border border-destructive/40 bg-destructive/[0.08] p-4">
            <XCircle aria-hidden="true" className="mt-0.5 size-4.5 shrink-0 text-destructive" />
            <div className="space-y-1.5">
              <p className="font-semibold">No pudimos verificar el PIN</p>
              <p className="text-muted-foreground">{error.message}</p>
              <p className="text-xs text-muted-foreground">
                Código de referencia: <span className="font-mono">{error.code}</span>
              </p>
            </div>
          </div>
        )}
      </div>

      <Button disabled={!complete || submitting} onClick={() => void onSubmit(pin)}>
        {submitting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
        Confirmar y activar
      </Button>
      <p className="text-xs text-muted-foreground">
        Si lo dejas para después, el canal ya recibe mensajes: solo no podrás iniciar
        conversaciones nuevas hasta completar este paso.
      </p>
    </div>
  );
}
