"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LoaderCircle, MailCheck, MailX } from "lucide-react";

import { API_ERROR_CODES, isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { cn } from "@/core/lib/utils";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Button } from "@/shared/components/ui/button";
import { verifyEmail } from "@/modules/onboarding/infrastructure/services/onboarding-service.adapter";
import { FlowScreen } from "@/modules/onboarding/ui/flow/FlowScreen";

type Phase = "missing" | "verifying" | "verified" | "expired" | "error";

/**
 * Destino del enlace del correo de verificación
 * (`PUBLIC_APP_URL/verificar-correo?token=…`, lo compone el backend en
 * `email_verification.service.ts`). Pública: quien pulsa el enlace puede no
 * tener sesión o venir de otro dispositivo, así que la llamada va sin
 * autenticar y la sesión, si la hay, se refresca para que `MeDto.email_verified`
 * cambie sin volver a entrar (el paso WhatsApp del onboarding lo lee).
 *
 * El token viaja UNA vez: el efecto se dispara una sola vez por montaje y el
 * backend responde `410` a un token repetido, vencido o desconocido, sin
 * distinguirlos (no se le regala información a quien adivina).
 *
 * Habla el lenguaje «Flow» del onboarding al que devuelve: pregunta grande y
 * un disco-parada como icono de estado (encendido en el color de «completado»
 * cuando el correo queda confirmado). Vive bajo el layout público, sobre el
 * suelo (`flow-ground`).
 */
export function VerifyEmailView() {
  const params = useSearchParams();
  const token = params.get("token")?.trim() ?? "";
  const { user, refresh } = useAuth();
  const [phase, setPhase] = useState<Phase>(token.length === 0 ? "missing" : "verifying");
  const [error, setError] = useState<string | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    if (token.length === 0 || firedRef.current) return;
    firedRef.current = true;
    let cancelled = false;
    void (async () => {
      try {
        await verifyEmail(token);
        if (cancelled) return;
        setPhase("verified");
        // Con sesión abierta, `email_verified` cambia sin volver a entrar. Si el
        // refresh falla, la verificación ya ocurrió: no se le cuenta al usuario.
        if (user !== null) await refresh().catch(() => undefined);
      } catch (cause) {
        if (cancelled) return;
        if (isHttpError(cause) && cause.is(API_ERROR_CODES.verificationExpired)) {
          setPhase("expired");
        } else {
          setPhase("error");
          setError(errorMessage(cause, "No pudimos confirmar tu correo. Inténtalo de nuevo en un momento."));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, refresh, user]);

  const nextHref = user ? "/onboarding" : "/auth/login?next=/onboarding";
  const verified = phase === "verified";
  const title =
    phase === "verifying"
      ? "Confirmando tu correo…"
      : verified
        ? "Correo confirmado"
        : phase === "missing"
          ? "El enlace está incompleto"
          : "No pudimos confirmar tu correo";
  const lead =
    phase === "verifying" ? (
      "Un momento, no cierres esta pestaña."
    ) : verified ? (
      "Ya puedes conectar WhatsApp e invitar a tu equipo. Sigue con la configuración de tu empresa."
    ) : phase === "missing" ? (
      "Abre el enlace completo desde el correo que te enviamos."
    ) : phase === "expired" ? (
      "Este enlace ya no sirve: venció o ya se usó. Pide uno nuevo desde el paso «WhatsApp» de tu configuración."
    ) : (
      <span role="alert">{error}</span>
    );

  return (
    <section aria-live="polite" className="flow-ground mx-auto flex w-full flex-col items-center px-6 py-16 text-center sm:py-24">
      <span
        aria-hidden="true"
        className={cn(
          "mb-4 grid size-24 place-items-center rounded-full border-2 transition-[background-color,border-color,color,box-shadow] duration-500",
          verified ? "flow-stop--lit border-transparent" : "sf-glass-on border-[color:var(--sf-fg)] shadow-[0_0_0_10px_var(--sf-glass)]",
        )}
      >
        {phase === "verifying" ? (
          <LoaderCircle className="size-10 animate-spin motion-reduce:animate-none" strokeWidth={1.6} />
        ) : verified ? (
          <MailCheck className="size-10" strokeWidth={1.6} />
        ) : (
          <MailX className="size-10" strokeWidth={1.6} />
        )}
      </span>
      <FlowScreen focusHeading title={title} lead={lead}>
        {phase !== "verifying" ? (
          <Button
            asChild
            size="lg"
            variant={verified ? "default" : "outline"}
            className="h-14 w-full max-w-[440px] rounded-[14px] text-[15.5px] font-semibold shadow-[0_18px_50px_rgb(0_0_0/.12)]"
          >
            <Link href={nextHref}>{verified ? (user ? "Continuar con la configuración" : "Iniciar sesión") : user ? "Pedir un enlace nuevo desde mi panel" : "Iniciar sesión"}</Link>
          </Button>
        ) : null}
      </FlowScreen>
    </section>
  );
}
