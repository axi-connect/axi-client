"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, LoaderCircle, MailX } from "lucide-react";

import { API_ERROR_CODES, isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Button } from "@/shared/components/ui/button";
import { verifyEmail } from "@/modules/onboarding/infrastructure/services/onboarding-service.adapter";

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
  const nextLabel = user ? "Continuar con la configuración" : "Iniciar sesión";

  return (
    <section
      aria-live="polite"
      className="mx-auto flex w-full max-w-md flex-col items-center gap-6 px-6 py-24 text-center"
    >
      {phase === "verifying" && (
        <>
          <LoaderCircle className="size-10 animate-spin text-primary" aria-hidden />
          <h1 className="text-2xl font-semibold">Confirmando tu correo…</h1>
          <p className="text-sm text-muted-foreground">Un momento, no cierres esta pestaña.</p>
        </>
      )}

      {phase === "verified" && (
        <>
          <CheckCircle2 className="size-12 text-primary" aria-hidden />
          <h1 className="text-2xl font-semibold">Correo confirmado</h1>
          <p className="text-sm text-muted-foreground">
            Ya puedes conectar WhatsApp e invitar a tu equipo. Sigue con la configuración de tu empresa.
          </p>
          <Button asChild size="lg">
            <Link href={nextHref}>{nextLabel}</Link>
          </Button>
        </>
      )}

      {(phase === "expired" || phase === "error" || phase === "missing") && (
        <>
          <MailX className="size-12 text-muted-foreground" aria-hidden />
          <h1 className="text-2xl font-semibold">
            {phase === "missing" ? "El enlace está incompleto" : "No pudimos confirmar tu correo"}
          </h1>
          <p className="text-sm text-muted-foreground" role={phase === "error" ? "alert" : undefined}>
            {phase === "missing" && "Abre el enlace completo desde el correo que te enviamos."}
            {phase === "expired" &&
              "Este enlace ya no sirve: venció o ya se usó. Pide uno nuevo desde el paso «WhatsApp» de tu configuración."}
            {phase === "error" && error}
          </p>
          <Button asChild variant="outline" size="lg">
            <Link href={nextHref}>{user ? "Pedir un enlace nuevo desde mi panel" : "Iniciar sesión"}</Link>
          </Button>
        </>
      )}
    </section>
  );
}
