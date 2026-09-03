"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { EmailVerificationGate } from "@/shared/components/features/email-verification-gate";
import { ConnectChannelFlow, type ChannelDTO } from "@/modules/channels/public";
import { StepAside, StepFrame } from "@/modules/onboarding/ui/onboarding/StepFrame";

/**
 * Paso 5 · WhatsApp. Opcional (decisión D6), pero es lo que pone a trabajar al
 * agente. Embebe el MISMO wizard de `/settings/channels/connect`
 * (`ConnectChannelFlow`, por el barrel de `channels`), acotado a WhatsApp: el
 * paso se titula «Conecta tu WhatsApp» y el aside dice que Instagram y
 * Messenger van después, así que ofrecerlos aquí era contradecirse. Conectar un
 * canal de Meta exige correo verificado (gate `auth/email_not_verified` del
 * backend): el gate compartido lo pide antes de dejar que el popup falle.
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
  const [connected, setConnected] = useState<ChannelDTO | null>(null);
  const [manualCreated, setManualCreated] = useState(false);

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
            <Button
              size="lg"
              className="h-11"
              disabled={saving}
              onClick={() => onDone({ channel_id: connected?.id ?? null })}
            >
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
          tips={[
            "El número no puede estar en uso en la app de WhatsApp",
            "Instagram y Messenger se conectan después en Canales",
            "Si algo falla, te acompañamos por WhatsApp",
          ]}
        />
      }
    >
      <EmailVerificationGate
        title="Verifica tu correo para conectar WhatsApp"
        reason="Conectar un canal de Meta exige un correo verificado."
      >
        <div className="border-border bg-background/70 rounded-2xl border p-5 sm:p-6">
          <ConnectChannelFlow
            embedded
            only={["whatsapp_cloud"]}
            onConnected={setConnected}
            onManualCreated={() => setManualCreated(true)}
          />
        </div>
      </EmailVerificationGate>
    </StepFrame>
  );
}
