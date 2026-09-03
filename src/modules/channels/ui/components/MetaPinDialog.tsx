"use client";

import { useState } from "react";

import { isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Modal } from "@/shared/components/ui/modal";
import type { ChannelDTO } from "@/modules/channels/domain/channel";
import type { EmbeddedSignupError } from "@/modules/channels/infrastructure/hooks/use-embedded-signup";
import { registerMetaPhoneNumber } from "@/modules/channels/infrastructure/services/meta-signup.adapter";
import { useChannelStore } from "@/modules/channels/infrastructure/stores/channels.store";
import { MetaPinForm } from "./connect/MetaPinForm";

/**
 * Confirmar el PIN de un canal que quedó en `awaiting_registration`.
 *
 * Es la entrada al PIN desde el detalle, y existe porque no había ninguna: el
 * aviso de salud mandaba a «Renovar la conexión», que volvía a devolver el
 * mismo sub-estado. El formulario reutiliza el del alta (`MetaPinForm`) para
 * que el PIN se pida de UNA sola forma, venga de donde venga.
 *
 * `POST /channels/:id/meta/register` es el mismo endpoint que usa el alta.
 */
export function MetaPinDialog({
  channel,
  open,
  onOpenChange,
}: {
  channel: ChannelDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { showAlert } = useAlert();
  const upsertChannel = useChannelStore((s) => s.upsertChannel);
  const [error, setError] = useState<EmbeddedSignupError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (pin: string) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const updated = await registerMetaPhoneNumber(channel.id, pin);
      // Al store: el detalle pinta desde ahí, y sin esto el aviso «falta el
      // PIN» seguiría visible sobre un canal ya registrado
      upsertChannel(updated);
      setError(null);
      onOpenChange(false);
      showAlert({
        tone: "success",
        title: "Número activado: ya puedes iniciar conversaciones",
        open: true,
        autoCloseMs: 4000,
      });
    } catch (err) {
      setError({
        code: isHttpError(err) ? err.code : "channels/meta_pin_invalid",
        message: errorMessage(err, "No se pudo verificar el PIN"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      config={{
        title: "Confirmar el PIN del número",
        description: "Es el PIN de seis dígitos que se definió al dar de alta el número en Meta.",
        className: "sm:max-w-2xl",
      }}
    >
      <MetaPinForm channel={channel} error={error} submitting={submitting} onSubmit={submit} />
    </Modal>
  );
}
