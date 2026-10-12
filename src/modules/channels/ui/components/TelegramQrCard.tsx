"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, RotateCw } from "lucide-react";
import { FaTelegramPlane } from "react-icons/fa";

import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  getTelegramQr,
  type TelegramQrDTO,
} from "@/modules/channels/infrastructure/services/telegram.adapter";

/**
 * «Escanéalo con tu celular»: el QR que abre el chat con el bot, más el enlace
 * para abrirlo o copiarlo (mockup `telegram-channel.html`, vistas «Listo» y
 * «Probar el agente»).
 *
 * El servidor entrega la MATRIZ del QR, no una imagen: aquí se pinta con
 * `currentColor` sobre el fondo del tema, así que se lee igual en claro y en
 * oscuro, y no se inyecta marcado ajeno en la página.
 */
export function TelegramQrCard({
  channelId,
  username,
  title = "Escanéalo con tu celular",
  subtitle = "Abre el chat con tu bot en Telegram",
  className,
}: {
  channelId: string;
  username: string;
  title?: string;
  subtitle?: string;
  className?: string;
}) {
  const [qr, setQr] = useState<TelegramQrDTO | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const link = `https://t.me/${username}`;

  useEffect(() => {
    let alive = true;
    setFailed(false);
    getTelegramQr(channelId)
      .then((value) => {
        if (alive) setQr(value);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [channelId, attempt]);

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-border bg-background p-4 text-center",
        className,
      )}
    >
      <div className="grid size-[180px] place-items-center">
        {qr !== null ? (
          <QrMatrix size={qr.size} modules={qr.modules} />
        ) : failed ? (
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <p>No pudimos generar el código.</p>
            <Button type="button" variant="outline" size="sm" onClick={() => setAttempt((n) => n + 1)}>
              <RotateCw className="size-3.5" aria-hidden />
              Reintentar
            </Button>
          </div>
        ) : (
          <Skeleton className="size-[180px] rounded-lg" />
        )}
      </div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <Button asChild className="w-full">
        <a href={link} target="_blank" rel="noopener noreferrer">
          <FaTelegramPlane className="size-4" aria-hidden />
          Abrir en Telegram
        </a>
      </Button>
      <CopyLink link={link} />
    </div>
  );
}

function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  const display = link.replace(/^https:\/\//, "");

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Sin portapapeles (contexto no seguro): el enlace queda visible para copiarlo a mano
    }
  }

  return (
    <div className="flex w-full items-center justify-between gap-2 rounded-md border border-border py-1 pr-1 pl-3 font-mono text-[12.5px]">
      <span className="truncate select-all">{display}</span>
      <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" onClick={copy} aria-label="Copiar enlace">
        {copied ? <Check className="size-4 text-success" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      </Button>
    </div>
  );
}

/**
 * La matriz a SVG: una ruta por tramos horizontales contiguos (cientos de
 * `<rect>` sueltos pesan más y se ven con costuras al escalar). La placa del
 * centro lleva el glifo de Telegram; la corrección de errores M del servidor
 * la tolera.
 */
function QrMatrix({ size, modules }: { size: number; modules: string }) {
  const path = useMemo(() => {
    let d = "";
    for (let row = 0; row < size; row++) {
      let col = 0;
      while (col < size) {
        if (modules[row * size + col] !== "1") {
          col++;
          continue;
        }
        const start = col;
        while (col < size && modules[row * size + col] === "1") col++;
        d += `M${String(start)} ${String(row)}h${String(col - start)}v1h-${String(col - start)}z`;
      }
    }
    return d;
  }, [size, modules]);

  const plate = size * 0.22;
  const offset = (size - plate) / 2;

  return (
    <div className="relative size-full text-foreground">
      <svg
        viewBox={`-2 -2 ${String(size + 4)} ${String(size + 4)}`}
        className="size-full"
        role="img"
        aria-label="Código QR que abre el bot en Telegram"
        shapeRendering="crispEdges"
      >
        <path d={path} fill="currentColor" />
        <rect x={offset} y={offset} width={plate} height={plate} rx={plate * 0.22} className="fill-background" />
      </svg>
      <span className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden>
        <FaTelegramPlane className="text-logo-telegram size-[26px]" />
      </span>
    </div>
  );
}
