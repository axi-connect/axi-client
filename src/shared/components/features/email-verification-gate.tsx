"use client";

import { useState } from "react";
import { MailWarning } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { useAuth } from "@/shared/auth/auth.hooks";
import { resendVerificationEmail } from "@/shared/auth/email-verification";
import { Button } from "@/shared/components/ui/button";

/**
 * Exige correo verificado antes de pintar `children`.
 *
 * El backend bloquea con `auth/email_not_verified` el alta de canales de Meta.
 * El paso «WhatsApp» del onboarding ya lo comprobaba antes de abrir el popup;
 * `/settings/channels/connect` no, así que el MISMO usuario, entrando por
 * Ajustes, quemaba el `code` de un solo uso y recibía «No pudimos conectar el
 * canal» sin saber por qué. Una sola pieza para las dos entradas.
 *
 * `email_verified` ausente (contrato viejo) no bloquea: la ausencia de dato no
 * es una prohibición.
 */
export function EmailVerificationGate({
  title = "Verifica tu correo para continuar",
  reason,
  children,
}: {
  title?: string;
  /** Por qué hace falta aquí. Cierra la frase «Te enviamos un enlace a …». */
  reason: string;
  children: React.ReactNode;
}) {
  const { user, refresh } = useAuth();
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [resendError, setResendError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  if (user?.email_verified !== false) return <>{children}</>;

  async function resend() {
    if (!user?.email) return;
    setResendState("sending");
    setResendError(null);
    try {
      await resendVerificationEmail(user.email);
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

  return (
    <div className="border-border bg-background/70 rounded-2xl border p-5">
      <div className="flex items-start gap-3">
        <MailWarning aria-hidden="true" className="text-warning mt-0.5 size-5 shrink-0" />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              Te enviamos un enlace a <strong>{user?.email ?? "tu correo"}</strong>. {reason}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => void resend()}
              disabled={resendState === "sending" || resendState === "sent"}
            >
              {resendState === "sent"
                ? "Correo reenviado"
                : resendState === "sending"
                  ? "Enviando…"
                  : "Reenviar el correo"}
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
  );
}
