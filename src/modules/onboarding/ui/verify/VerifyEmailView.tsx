"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LoaderCircle, MailCheck, MailX } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Button } from "@/shared/components/ui/button";
import { useEmailVerification } from "@/modules/onboarding/infrastructure/hooks/use-email-verification";
import { FlowScreen } from "@/modules/onboarding/ui/flow/FlowScreen";

/**
 * Destino del enlace del correo de verificación
 * (`PUBLIC_APP_URL/verificar-correo?token=…`, lo compone el backend en
 * `email_verification.service.ts`). Pública: quien pulsa el enlace puede no
 * tener sesión o venir de otro dispositivo, así que la llamada va sin
 * autenticar.
 *
 * Dos responsabilidades, dos efectos con dependencias honestas:
 * - **Consumir el token** lo hace `useEmailVerification`, una mutación de un
 *   solo uso que dispara una vez por token y honra siempre su resultado (el
 *   backend responde `410` a un token repetido, vencido o desconocido, sin
 *   distinguirlos: no se le regala información a quien adivina).
 * - **Refrescar la sesión** para que `MeDto.email_verified` cambie sin volver
 *   a entrar (el paso WhatsApp del onboarding lo lee) es reactivo a
 *   `useAuth().status`: ocurre una vez, cuando el correo ya está confirmado Y
 *   hay sesión, en el orden en que lleguen ambas cosas. Si el refresh falla,
 *   la verificación ya ocurrió: no se le cuenta al usuario.
 *
 * Habla el lenguaje «Flow» del onboarding al que devuelve: pregunta grande y
 * un disco-parada como icono de estado (encendido en el color de «completado»
 * cuando el correo queda confirmado). Vive bajo el layout público, sobre el
 * suelo (`flow-ground`).
 */
export function VerifyEmailView() {
  const params = useSearchParams();
  const token = params.get("token")?.trim() ?? "";
  const { status, refresh } = useAuth();
  const verification = useEmailVerification(token);
  const refreshedRef = useRef(false);

  useEffect(() => {
    if (verification.status !== "verified" || status !== "authenticated" || refreshedRef.current) return;
    refreshedRef.current = true;
    void refresh().catch(() => undefined);
  }, [verification.status, status, refresh]);

  const phase = verification.status;
  const verified = phase === "verified";
  // Mientras la sesión hidrata se apunta a `/onboarding`: si al final no la
  // hay, `AuthProvider.redirectToLogin` ya manda al login con `next`.
  const signedOut = status === "unauthenticated" || status === "suspended";
  const nextHref = signedOut ? "/auth/login?next=/onboarding" : "/onboarding";
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
      <span role="alert">{verification.message}</span>
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
            <Link href={nextHref}>
              {signedOut ? "Iniciar sesión" : verified ? "Continuar con la configuración" : "Pedir un enlace nuevo desde mi panel"}
            </Link>
          </Button>
        ) : null}
      </FlowScreen>
    </section>
  );
}
