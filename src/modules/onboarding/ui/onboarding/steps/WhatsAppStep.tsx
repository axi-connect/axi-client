"use client";

import { useState } from "react";
import { FaTelegramPlane } from "react-icons/fa";

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
  // «¿Solo quieres probar?»: el mismo wizard, acotado a Telegram. Cierra el paso
  // igual que WhatsApp (el paso guarda el `channel_id` que se conectó).
  const [viaTelegram, setViaTelegram] = useState(false);

  const done = connected !== null || manualCreated;

  return (
    <FlowScreen
      focusHeading
      title={viaTelegram ? "Prueba tu agente en Telegram" : "Conecta tu WhatsApp"}
      lead={
        viaTelegram
          ? "Crea un bot en un minuto y háblale desde tu celular. WhatsApp lo conectas cuando quieras desde Canales."
          : "Es opcional ahora, pero es lo que pone a trabajar a tu agente. También puedes hacerlo después desde Canales."
      }
    >
      <div className="bg-background border-border w-full max-w-[640px] rounded-2xl border p-5 text-left shadow-[0_12px_40px_rgb(0_0_0/.06)] sm:p-6">
        <EmailVerificationGate
          title="Verifica tu correo para conectar WhatsApp"
          reason="Conectar un canal de Meta exige un correo verificado."
        >
          <ConnectChannelFlow
            embedded
            key={viaTelegram ? "telegram" : "whatsapp"}
            only={viaTelegram ? ["telegram"] : ["whatsapp_cloud"]}
            onConnected={setConnected}
            onManualCreated={() => setManualCreated(true)}
          />
        </EmailVerificationGate>
      </div>
      {!done && (
        <div className="border-border grid w-full max-w-[640px] grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-dashed px-3.5 py-3 text-left">
          <span className="channel-logo-plate brand-telegram grid size-10 place-items-center rounded-md">
            <FaTelegramPlane className="text-logo-telegram size-5" aria-hidden />
          </span>
          {viaTelegram ? (
            <span className="min-w-0">
              <span className="block font-medium">¿Prefieres conectar WhatsApp?</span>
              <span className="text-muted-foreground block text-[12.5px]">
                Vuelve al alta con Meta: es el canal donde te escriben tus clientes.
              </span>
            </span>
          ) : (
            <span className="min-w-0">
              <span className="block font-medium">¿Solo quieres probar a tu agente hoy?</span>
              <span className="text-muted-foreground block text-[12.5px]">
                Conecta un bot de Telegram en 1 minuto, sin Meta ni número de empresa. WhatsApp lo
                conectas cuando quieras.
              </span>
            </span>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => setViaTelegram((current) => !current)}>
            {viaTelegram ? "Usar WhatsApp" : "Usar Telegram"}
          </Button>
        </div>
      )}
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
