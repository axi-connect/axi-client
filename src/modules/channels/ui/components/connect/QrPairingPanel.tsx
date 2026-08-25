"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Info, LoaderCircle, QrCode, Smartphone } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import type { ChannelDTO } from "@/modules/channels/domain/channel";
import { useChannelStore } from "@/modules/channels/infrastructure/stores/channels.store";
import {
  createChannel,
  getWwebPairingState,
  requestWwebPairingCode,
  startWwebSession,
} from "@/modules/channels/infrastructure/services/channels-service.adapter";

/**
 * Camino QR de WhatsApp Web, dentro del mismo wizard.
 *
 * Da consumidor por fin a `getWwebPairingState` y `requestWwebPairingCode`, que
 * llevaban muertos en el adapter desde que se escribieron.
 *
 * El código de ocho dígitos **no es un adorno**: es la alternativa para quien no
 * puede escanear un QR (una sola pantalla, visión reducida, el celular es el
 * mismo dispositivo). Y el polling del snapshot es el respaldo del WebSocket:
 * si el socket no conecta, el QR llega igual, dos segundos más tarde.
 */
const POLL_MS = 2_000;

export function QrPairingPanel({ onConnected }: { onConnected: (channel: ChannelDTO) => void }) {
  const upsertChannel = useChannelStore((s) => s.upsertChannel);
  const pairingByChannel = useChannelStore((s) => s.pairingByChannel);
  const setPairingState = useChannelStore((s) => s.setPairingState);
  const liveChannels = useChannelStore((s) => s.channels);

  const [channel, setChannel] = useState<ChannelDTO | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [requestingCode, setRequestingCode] = useState(false);
  const notifiedRef = useRef(false);

  const pairing = channel !== null ? pairingByChannel[channel.id] : undefined;
  const live = liveChannels.find((item) => item.id === channel?.id);
  const status = live?.status ?? pairing?.status ?? channel?.status;

  const begin = useCallback(async () => {
    if (starting) return;
    setStarting(true);
    setError(null);
    try {
      const created = await createChannel({
        // El wizard ya no pide nombre: se crea con uno provisional y se renombra
        // en el paso 4, con el mismo formulario que usa el detalle
        name: "WhatsApp",
        kind: "whatsapp_web",
      });
      upsertChannel(created);
      setChannel(created);
      // 202: el QR llega por WS `channel.qr_code`, y el polling de abajo lo
      // recoge igual si el socket no conectó
      await startWwebSession(created.id);
    } catch (err) {
      setError(errorMessage(err, "No se pudo iniciar la vinculación"));
    } finally {
      setStarting(false);
    }
  }, [starting, upsertChannel]);

  // Respaldo del WebSocket. Se detiene en cuanto el canal conecta: seguir
  // preguntando por un QR que ya no existe devuelve 404 en bucle.
  useEffect(() => {
    if (channel === null || status === "connected") return;
    let cancelled = false;

    const tick = async () => {
      try {
        const snapshot = await getWwebPairingState(channel.id);
        if (cancelled) return;
        setPairingState(channel.id, {
          status: snapshot.status,
          qr: snapshot.qr,
          qr_image: snapshot.qr_image,
          pairing_code: snapshot.pairing_code,
          phone_number: snapshot.phone_number,
        });
      } catch {
        // 404 mientras el worker arranca es lo normal: no es un error del usuario
      }
    };

    void tick();
    const interval = setInterval(() => void tick(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [channel, status, setPairingState]);

  useEffect(() => {
    if (status === "connected" && channel !== null && !notifiedRef.current) {
      notifiedRef.current = true;
      onConnected(live ?? channel);
    }
  }, [status, channel, live, onConnected]);

  if (channel === null) {
    return (
      <div className="max-w-xl space-y-5 rounded-lg border border-border p-4 md:p-6">
        <div className="flex gap-3 rounded-md border border-info/40 bg-info/[0.08] p-4">
          <Info aria-hidden="true" className="mt-0.5 size-4.5 shrink-0 text-info" />
          <p className="text-muted-foreground">
            Vas a vincular tu WhatsApp actual, como en WhatsApp Web. El canal funciona mientras el
            celular siga encendido y con internet.
          </p>
        </div>
        <Button size="lg" disabled={starting} onClick={() => void begin()}>
          {starting ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <QrCode aria-hidden="true" className="size-4" />
          )}
          Generar código
        </Button>
        <div role="alert" aria-live="assertive">
          {error !== null && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-5 rounded-lg border border-border p-4 md:p-6">
      <div role="status" aria-live="polite" className="space-y-4">
        {pairing?.qr_image != null ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-border p-4">
            <p className="font-medium">Escanea con WhatsApp</p>
            <Image
              src={pairing.qr_image}
              alt="Código QR de vinculación"
              width={220}
              height={220}
              unoptimized
            />
            <p className="text-xs text-muted-foreground">
              En tu celular: WhatsApp → Ajustes → Dispositivos vinculados → Vincular dispositivo.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            Generando el código… tarda unos segundos.
          </div>
        )}

        {pairing?.pairing_code != null && (
          <p className="text-center">
            O ingresa este código en el celular:{" "}
            <span className="font-mono text-lg font-semibold tabular-nums">
              {pairing.pairing_code}
            </span>
          </p>
        )}
      </div>

      <div className="space-y-2 border-t border-border pt-4">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Smartphone aria-hidden="true" className="size-4" />
          ¿No puedes escanear el código?
        </p>
        <p className="text-xs text-muted-foreground">
          Te damos un código de ocho dígitos para escribir en el celular. Escribe el número con
          código de país, sin espacios ni el signo más.
        </p>
        <div className="flex flex-wrap gap-2">
          <Input
            value={phone}
            inputMode="numeric"
            placeholder="573001234567"
            aria-label="Número de teléfono con código de país"
            className="max-w-56"
            onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))}
          />
          <Button
            variant="outline"
            disabled={phone.length < 8 || requestingCode}
            onClick={() => {
              setRequestingCode(true);
              void requestWwebPairingCode(channel.id, phone)
                .catch((err: unknown) =>
                  setError(errorMessage(err, "No se pudo pedir el código de vinculación")),
                )
                .finally(() => setRequestingCode(false));
            }}
          >
            {requestingCode && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
            Pedir código
          </Button>
        </div>
      </div>

      <div role="alert" aria-live="assertive">
        {error !== null && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
