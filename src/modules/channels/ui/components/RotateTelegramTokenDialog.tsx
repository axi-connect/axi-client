"use client";

import { useId, useState } from "react";
import { Check, KeyRound, LoaderCircle } from "lucide-react";

import { isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Modal } from "@/shared/components/ui/modal";
import type { ChannelDTO } from "@/modules/channels/domain/channel";
import { updateChannelCredentials } from "@/modules/channels/infrastructure/services/channels-service.adapter";
import { useChannelStore } from "@/modules/channels/infrastructure/stores/channels.store";

const BOT_TOKEN = /^\d{5,15}:[A-Za-z0-9_-]{30,}$/;

/**
 * Rotar el token de un bot de Telegram (mockup `telegram-channel.html`, vista
 * «Rotar token»). Es también la forma de reconectar: el servidor re-registra el
 * webhook con un secreto nuevo. Si el token es de OTRO bot, el servidor lo
 * rechaza sin tocar nada y aquí se dice con esas palabras.
 */
export function RotateTelegramTokenDialog({
  channel,
  open,
  onOpenChange,
}: {
  channel: ChannelDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const fieldId = useId();
  const { showAlert } = useAlert();
  const upsertChannel = useChannelStore((state) => state.upsertChannel);
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = token.trim();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!BOT_TOKEN.test(trimmed) || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await updateChannelCredentials(channel.id, trimmed);
      upsertChannel(updated);
      setToken("");
      onOpenChange(false);
      showAlert({ tone: "success", title: "Token actualizado: el bot sigue recibiendo", autoCloseMs: 4000 });
    } catch (err) {
      setError(
        isHttpError(err) && err.code === "channels/invalid_credentials"
          ? "Telegram no reconoce ese token. Cópialo otra vez desde @BotFather."
          : errorMessage(err, "No pudimos actualizar el token."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setToken("");
          setError(null);
        }
        onOpenChange(next);
      }}
      config={{
        title: "Rotar el token del bot",
        description:
          "Pega el token nuevo que te dio @BotFather. Debe ser del mismo bot: si es de otro, te avisamos y no cambiamos nada.",
      }}
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor={fieldId}>Token nuevo</Label>
          <div className="relative">
            <KeyRound
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id={fieldId}
              value={token}
              onChange={(event) => {
                setToken(event.target.value);
                setError(null);
              }}
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="Pega aquí el token"
              aria-invalid={error !== null}
              disabled={submitting}
              className={cn("pl-9 font-mono text-[13px]", error !== null && "border-destructive")}
            />
          </div>
          {error !== null && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!BOT_TOKEN.test(trimmed) || submitting}>
            {submitting ? (
              <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
            ) : (
              <Check className="size-4" aria-hidden />
            )}
            Guardar token
          </Button>
        </div>
      </form>
    </Modal>
  );
}
