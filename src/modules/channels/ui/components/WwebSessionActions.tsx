"use client";

import Image from "next/image";
import { useState } from "react";
import { Power, PowerOff, RefreshCw, Unlink } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import type { ChannelDTO, WwebPairingState } from "@/modules/channels/domain/channel";
import {
  logoutWweb,
  startWwebSession,
  stopWwebSession,
} from "@/modules/channels/infrastructure/services/channels-service.adapter";

/**
 * Sesión de WhatsApp Web: QR en vivo y las cuatro acciones de vinculación.
 *
 * Extraído del `ChannelDetailSheet` para que la página `/settings/channels/[id]`
 * no fuera una segunda copia de la misma lógica. Con dos copias, cualquier
 * cambio en el ciclo de sesión (que es asíncrono y llega por WS) se aplicaría en
 * una superficie y no en la otra, y el bug solo se vería en la que nadie miró.
 *
 * Todas las llamadas son 202: la confirmación llega por el namespace
 * `/channels`, no por la respuesta HTTP.
 */
export function WwebSessionActions({
  channel,
  pairing,
}: {
  channel: ChannelDTO;
  pairing?: WwebPairingState;
}) {
  const { showAlert } = useAlert();
  const [busy, setBusy] = useState(false);

  const canPair =
    channel.status === "disconnected" ||
    channel.status === "pending_setup" ||
    channel.status === "error";

  const runAction = async (action: () => Promise<unknown>, pendingMessage: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      showAlert({ tone: "success", title: pendingMessage, open: true, autoCloseMs: 3500 });
    } catch (err) {
      showAlert({
        tone: "error",
        title: errorMessage(err, "No se pudo completar la acción"),
        open: true,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {pairing?.qr_image && channel.status !== "connected" && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-border p-4">
          <p className="text-sm font-medium">Escanea con WhatsApp</p>
          <Image
            src={pairing.qr_image}
            alt="Código QR de vinculación"
            width={200}
            height={200}
            unoptimized
          />
          {pairing.pairing_code && (
            <p className="text-sm text-muted-foreground">
              O ingresa el código:{" "}
              <span className="font-mono font-semibold">{pairing.pairing_code}</span>
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canPair && (
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              void runAction(
                () => startWwebSession(channel.id),
                "Iniciando sesión… el QR llegará en unos segundos",
              )
            }
          >
            <Power aria-hidden="true" className="size-4" /> Conectar
          </Button>
        )}
        {channel.status === "connecting" && (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              void runAction(() => startWwebSession(channel.id), "Reintentando conexión…")
            }
          >
            <RefreshCw aria-hidden="true" className="size-4" /> Reintentar
          </Button>
        )}
        {channel.status === "connected" && (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              void runAction(
                () => stopWwebSession(channel.id),
                "Deteniendo sesión (se conserva la vinculación)…",
              )
            }
          >
            <PowerOff aria-hidden="true" className="size-4" /> Detener
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => void runAction(() => logoutWweb(channel.id), "Desvinculando dispositivo…")}
        >
          <Unlink aria-hidden="true" className="size-4" /> Desvincular
        </Button>
      </div>
    </div>
  );
}
