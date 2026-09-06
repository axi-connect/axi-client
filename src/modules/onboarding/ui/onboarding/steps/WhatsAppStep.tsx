"use client";

import { useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { EmailVerificationGate } from "@/shared/components/features/email-verification-gate";
import { ConnectChannelFlow, type ChannelDTO } from "@/modules/channels/public";
import { FlowActions, FlowBackButton } from "@/modules/onboarding/ui/flow/FlowActions";
import { FlowScreen } from "@/modules/onboarding/ui/flow/FlowScreen";

/**
 * Paso 5 · WhatsApp. Opcional (decisión D6), pero es lo que pone a trabajar al
 * agente. Embebe el MISMO wizard de `/settings/channels/connect`
 * (`ConnectChannelFlow`, por el barrel de `channels`) **intacto**, acotado a
 * WhatsApp y en una hoja sólida: el wizard es un formulario y los formularios
 * no van sobre cristal. Conectar un canal de Meta exige correo verificado (gate
 * `auth/email_not_verified` del backend): el gate compartido lo pide antes de
 * dejar que el popup falle.
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
    <FlowScreen
      focusHeading
      title="Conecta tu WhatsApp"
      lead="Es opcional ahora, pero es lo que pone a trabajar a tu agente. También puedes hacerlo después desde Canales."
    >
      <div className="bg-background border-border w-full max-w-[640px] rounded-2xl border p-5 text-left shadow-[0_12px_40px_rgb(0_0_0/.06)] sm:p-6">
        <EmailVerificationGate
          title="Verifica tu correo para conectar WhatsApp"
          reason="Conectar un canal de Meta exige un correo verificado."
        >
          <ConnectChannelFlow
            embedded
            only={["whatsapp_cloud"]}
            onConnected={setConnected}
            onManualCreated={() => setManualCreated(true)}
          />
        </EmailVerificationGate>
      </div>
      <FlowActions
        type="button"
        label={done ? "Continuar" : undefined}
        disabled={saving}
        onClick={() => onDone({ channel_id: connected?.id ?? null })}
        secondary={
          !done ? (
            <Button type="button" variant="ghost" disabled={saving} onClick={onSkip}>
              Conectar después
            </Button>
          ) : undefined
        }
        microcopy="Instagram y Messenger se conectan después desde Canales, con la misma cuenta de Meta."
        back={<FlowBackButton onClick={onBack} />}
        className="mt-2"
      />
    </FlowScreen>
  );
}
