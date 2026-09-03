"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, MailWarning } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Button } from "@/shared/components/ui/button";
import { ConnectChannelFlow, type ChannelDTO } from "@/modules/channels/public";
import { resendVerificationEmail } from "@/modules/onboarding/infrastructure/services/onboarding-service.adapter";
import { StepAside, StepFrame } from "@/modules/onboarding/ui/onboarding/StepFrame";

/**
 * Paso 5 · WhatsApp. Opcional (decisión D6), pero es lo que pone a trabajar al
 * agente. Embebe el MISMO wizard de `/settings/channels/connect`
 * (`ConnectChannelFlow`, por el barrel de `channels`). Conectar un canal de
 * Meta exige correo verificado (gate `auth/email_not_verified` del backend):
 * si no lo está, se muestra el requisito con reenvío, en vez de dejar que el
 * popup falle.
 */
export function WhatsAppStep({
  saving,
  onBack,
  onSkip,
  onDone,
}: {
  saving: boolean;
  onBack: () => void;
  onSkip: () => void;
  onDone: (result: { channel_id: string | null }) => void;
}) {
  const { user, refresh } = useAuth();
  const me = user;
  const emailUnverified = me?.email_verified === false;
  const [connected, setConnected] = useState<ChannelDTO | null>(null);
  const [manualCreated, setManualCreated] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [resendError, setResendError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function resend() {
    if (!me?.email) return;
    setResendState("sending");
    setResendError(null);
    try {
      await resendVerificationEmail(me.email);
      setResendState("sent");
    } catch (error) {
      setResendState("error");
      setResendError(errorMessage(error, "No pudimos reenviar el correo. Inténtalo en un momento."));
    }
  }

  async function checkVerified() {
    setChecking(true);
    try {
      await refresh();
    } finally {
      setChecking(false);
    }
  }

  const done = connected !== null || manualCreated;

  return (
    <StepFrame
      stepNumber={5}
      total={5}
      label="WhatsApp"
      title="Conecta tu WhatsApp"
      lead="Es opcional ahora, pero es lo que pone a trabajar a tu agente. También puedes hacerlo después desde Canales."
      footer={
        <>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft aria-hidden="true" />
              Atrás
            </Button>
            {!done ? (
              <Button variant="ghost" disabled={saving} onClick={onSkip}>
                Conectar después
              </Button>
            ) : null}
          </div>
          {done ? (
            <Button size="lg" className="h-11" disabled={saving} onClick={() => onDone({ channel_id: connected?.id ?? null })}>
              Continuar
              <ArrowRight aria-hidden="true" />
            </Button>
          ) : null}
        </>
      }
      aside={
        <StepAside
          glyph="connections"
          title="Qué vas a conectar"
          text="Tu número de WhatsApp Business por la API oficial de Meta, en un solo paso desde aquí."
          tips={["También puedes empezar con tu número actual, sin verificación de Meta", "Instagram y Messenger se conectan después en Canales", "Si algo falla, te acompañamos por WhatsApp"]}
        />
      }
    >
      {emailUnverified ? (
        <div className="border-border bg-background/70 rounded-2xl border p-5">
          <div className="flex items-start gap-3">
            <MailWarning aria-hidden="true" className="text-warning mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="text-sm font-semibold">Verifica tu correo para conectar WhatsApp</p>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                  Te enviamos un enlace a <strong>{me?.email ?? "tu correo"}</strong>. Conectar un canal de Meta exige un correo verificado.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => void resend()} disabled={resendState === "sending" || resendState === "sent"}>
                  {resendState === "sent" ? "Correo reenviado" : resendState === "sending" ? "Enviando…" : "Reenviar el correo"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void checkVerified()} disabled={checking}>
                  {checking ? "Comprobando…" : "Ya verifiqué mi correo"}
                </Button>
              </div>
              {resendState === "sent" ? (
                <p role="status" className="text-muted-foreground text-xs">
                  Revisa también la carpeta de spam. El enlace vale 48 horas.
                </p>
              ) : null}
              {resendError ? (
                <p role="alert" className="text-destructive text-xs">
                  {resendError}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="border-border bg-background/70 rounded-2xl border p-5 sm:p-6">
          <ConnectChannelFlow embedded onConnected={setConnected} onManualCreated={() => setManualCreated(true)} />
        </div>
      )}
    </StepFrame>
  );
}
