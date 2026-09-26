"use client";

import { useState } from "react";
import {
  Archive,
  Copy,
  Ellipsis,
  History,
  Mail,
  MessageCircle,
  RotateCcw,
  Send,
  TriangleAlert,
} from "lucide-react";

import { formatShortDate, formatShortDateTime } from "@/core/lib/format";
import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  canSend,
  deliveryLines,
  type DeliveryChannel,
  type DeliveryLine,
} from "@/modules/documents/domain/delivery";
import {
  canRetry,
  DOCUMENT_STATUS_LABELS,
  documentStatusTone,
  isDocumentInFlight,
  type DocumentDTO,
} from "@/modules/documents/domain/document";
import { PaperMark } from "./PaperMark";

/** Lo que el operador lee cuando un render falló, sin código de error a secas. */
const FAILURE_REASONS: Record<string, string> = {
  render_timeout: "El generador no respondió a tiempo.",
  browser_crash: "El generador se cerró a mitad.",
  storage_unavailable: "No se pudo guardar el PDF.",
  html_too_large: "El documento es demasiado grande para generarse.",
  render_failed: "El PDF no salió.",
  persist_failed: "El PDF se generó pero no se pudo registrar.",
};

/**
 * La fila es el asiento (F8 Cobros): el papelito, el nombre del papel y, debajo,
 * su número en mono, cuándo salió y cuántas páginas. Una fila, una acción —«Ver»
 * abre el PDF con URL firmada fresca—; lo demás vive en «…». Los estados se
 * leen sin fondo de color: barra fina al generar, motivo y «Reintentar» al
 * fallar (mismo número), «desactualizado» en ámbar con lo que pasó.
 *
 * F9: la ENTREGA es una tercera línea por canal —un hecho, como texto con
 * tono: por dónde salió y cuándo, o por qué no—. «Enviar» va primero en «…»
 * (solo con PDF listo y `documents:manage`); un envío que falló ofrece la
 * salida en la misma línea. Sin permiso las líneas existen igual, sin botones.
 */
export function DocumentRow({
  document,
  outdated,
  regenerable,
  canManage,
  onView,
  onRegenerate,
  onRetry,
  onSend,
}: {
  document: DocumentDTO;
  outdated: boolean;
  regenerable: boolean;
  canManage: boolean;
  onView: (id: string) => Promise<void>;
  onRegenerate: (id: string) => Promise<void>;
  onRetry: (id: string) => Promise<void>;
  /** Abre el diálogo «Enviar»; con canal cuando viene de la línea de entrega. */
  onSend?: (document: DocumentDTO, channel?: DeliveryChannel) => void;
}) {
  const [busy, setBusy] = useState<"view" | "regenerate" | "retry" | null>(
    null,
  );
  const tone = documentStatusTone(document.status);
  const inFlight = isDocumentInFlight(document.status);
  const gone = document.status === "superseded";
  const sendable = canManage && onSend !== undefined && canSend(document);
  const lines = deliveryLines(document);

  async function run(
    action: "view" | "regenerate" | "retry",
    fn: () => Promise<void>,
  ) {
    setBusy(action);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  }

  return (
    <li
      className={cn(
        "relative grid grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-1 px-4 py-3",
        "[&+&]:before:absolute [&+&]:before:top-0 [&+&]:before:right-0 [&+&]:before:left-[60px] [&+&]:before:h-px [&+&]:before:bg-border/50",
      )}
      data-status={document.status}
    >
      <PaperMark typeCode={document.type_code} tone={tone} />
      <div className={cn("min-w-0", gone && "opacity-60")}>
        <p className="flex items-center gap-2 text-[14.5px] font-medium tracking-[-0.005em]">
          {document.type_label}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground tabular-nums">
          <span className="font-mono text-[12px] tracking-[0.01em] text-foreground/80">
            {document.number}
          </span>
          <span aria-hidden="true" className="opacity-45">
            ·
          </span>
          <span>{formatShortDate(document.created_at)}</span>
          {document.page_count !== null && document.status === "rendered" ? (
            <>
              <span aria-hidden="true" className="opacity-45">
                ·
              </span>
              <span>
                {document.page_count}{" "}
                {document.page_count === 1 ? "pág." : "págs."}
              </span>
            </>
          ) : null}
          {document.status !== "rendered" ? (
            <>
              <span aria-hidden="true" className="opacity-45">
                ·
              </span>
              <span
                className={cn(
                  "font-medium",
                  tone === "busy" && "text-info",
                  tone === "bad" && "text-destructive",
                )}
              >
                {DOCUMENT_STATUS_LABELS[document.status]}
              </span>
            </>
          ) : outdated ? (
            <>
              <span aria-hidden="true" className="opacity-45">
                ·
              </span>
              <span className="font-medium text-warning">Desactualizado</span>
            </>
          ) : null}
        </p>
      </div>

      <div className="flex items-center gap-0.5">
        {document.status === "rendered" || gone ? (
          <Button
            variant="outline"
            size="sm"
            className="h-[30px] rounded-full px-3 text-[13px]"
            disabled={busy !== null}
            onClick={() => void run("view", () => onView(document.id))}
          >
            Ver
          </Button>
        ) : null}
        {canManage &&
        !inFlight &&
        !gone &&
        (regenerable || document.status === "rendered") ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-[30px] rounded-full text-muted-foreground"
                aria-label={`Más acciones · ${document.number}`}
              >
                <Ellipsis className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60 rounded-2xl p-1.5">
              {sendable ? (
                <DropdownMenuItem
                  className="flex items-start gap-3 rounded-xl px-3 py-2.5"
                  onClick={() => onSend(document)}
                >
                  <Send className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span>
                    <span className="block text-sm font-medium">Enviar</span>
                    <span className="block text-xs text-muted-foreground">
                      Por WhatsApp o correo, al cliente
                    </span>
                  </span>
                </DropdownMenuItem>
              ) : null}
              {regenerable ? (
                <DropdownMenuItem
                  className="flex items-start gap-3 rounded-xl px-3 py-2.5"
                  onClick={() =>
                    void run("regenerate", () => onRegenerate(document.id))
                  }
                >
                  <RotateCcw className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span>
                    <span className="block text-sm font-medium">Regenerar</span>
                    <span className="block text-xs text-muted-foreground">
                      {/* Dueño 2026-09-24 + QA R4-04: regenerar = emitirlo de nuevo hoy */}
                      {document.tracks_subject_changes === false
                        ? "Mismos datos, número nuevo"
                        : "Datos y plantilla de hoy, número nuevo"}
                    </span>
                  </span>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                className="flex items-start gap-3 rounded-xl px-3 py-2.5"
                onClick={() =>
                  void navigator.clipboard?.writeText(document.number)
                }
              >
                <Copy className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span>
                  <span className="block text-sm font-medium">
                    Copiar número
                  </span>
                  <span className="block font-mono text-xs text-muted-foreground">
                    {document.number}
                  </span>
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      {document.status === "failed" ? (
        <div className="col-start-2 col-end-4 mt-0.5 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <TriangleAlert
            aria-hidden="true"
            className="mt-0.5 size-3.5 shrink-0 text-destructive"
          />
          <span className="min-w-0 flex-1">
            {FAILURE_REASONS[document.error_code ?? ""] ??
              FAILURE_REASONS.render_failed}{" "}
            {canRetry(document) ? (
              <>
                Reintentar vuelve a producir{" "}
                <b className="font-medium text-foreground">el mismo número</b>.
              </>
            ) : (
              <>
                Tras {document.attempts} intentos, la salida es{" "}
                <b className="font-medium text-foreground">regenerar</b>.
              </>
            )}
          </span>
          {canManage && canRetry(document) ? (
            <Button
              variant="outline"
              size="sm"
              className="h-[26px] shrink-0 rounded-full px-2.5 text-xs"
              disabled={busy !== null}
              onClick={() => void run("retry", () => onRetry(document.id))}
            >
              <RotateCcw className="size-3" /> Reintentar
            </Button>
          ) : null}
        </div>
      ) : null}

      {document.status === "rendered" && outdated ? (
        <p className="col-start-2 col-end-4 mt-0.5 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <History
            aria-hidden="true"
            className="mt-0.5 size-3.5 shrink-0 text-warning"
          />
          <span>
            El pedido cambió después de este papel.{" "}
            {regenerable ? (
              <>
                Regenerar lo emite de nuevo con{" "}
                <b className="font-medium text-foreground">
                  los datos y la plantilla de hoy
                </b>
                .
              </>
            ) : null}
          </span>
        </p>
      ) : null}

      {lines.map((line) => (
        <DeliveryLineRow
          key={line.channel}
          line={line}
          onRetry={
            sendable && line.retry !== null
              ? () =>
                  onSend(
                    document,
                    line.retry === "email" ? "email" : line.channel,
                  )
              : undefined
          }
        />
      ))}

      {gone ? (
        <p className="col-start-2 col-end-4 mt-0.5 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <Archive aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          <span>
            {lines.length > 0
              ? "Reemplazado. Sigue archivado: lo enviado, enviado está."
              : "Reemplazado. Sigue archivado: pudo haberse enviado."}
          </span>
        </p>
      ) : null}

      {inFlight ? (
        <div
          role="progressbar"
          aria-label="Generando el PDF"
          className="col-span-3 mt-0.5 -mb-1 h-0.5 overflow-hidden rounded-sm bg-secondary"
        >
          <span className="block h-full w-2/5 rounded-sm bg-info motion-safe:animate-[paper-slide_1.6s_ease-in-out_infinite]" />
        </div>
      ) : null}
    </li>
  );
}

/**
 * La tercera línea: glifo del canal en cápsula, el hecho y su detalle, la
 * hora, y —si hay salida— el botón. El tono va en el texto, nunca en el
 * fondo; mientras sale, un punto late.
 */
function DeliveryLineRow({
  line,
  onRetry,
}: {
  line: DeliveryLine;
  onRetry?: () => void;
}) {
  const Icon = line.channel === "whatsapp" ? MessageCircle : Mail;
  return (
    <p
      // §10: el ámbar como texto no llega a 4,5:1; el tono va en el glifo y el
      // hecho se lee en `foreground`. El rojo (4,8:1) sí puede quedarse en el texto.
      className={cn(
        "col-start-2 col-end-4 mt-0.5 flex items-center gap-2 text-xs leading-relaxed text-muted-foreground tabular-nums",
        line.tone === "busy" && "text-info",
        line.tone === "bad" && "text-destructive",
        line.tone === "warn" && "text-foreground",
      )}
      data-delivery={`${line.channel}:${line.tone}`}
    >
      <span
        aria-hidden="true"
        className={cn(
          "grid size-[18px] shrink-0 place-items-center rounded-md bg-secondary",
          line.tone === "busy" && "bg-info/12",
          line.tone === "bad" && "bg-destructive/10",
          line.tone === "warn" && "bg-warning/12",
        )}
      >
        <Icon className="size-3" />
      </span>
      {line.tone === "busy" ? (
        <span
          aria-hidden="true"
          className="size-[7px] shrink-0 rounded-full bg-info motion-safe:animate-pulse"
        />
      ) : null}
      <span className="min-w-0 flex-1">
        <span className={cn(line.tone !== "ok" && "font-medium")}>
          {line.text}
        </span>
        {line.detail !== null ? (
          <>
            <span aria-hidden="true" className="opacity-45">
              {" · "}
            </span>
            {line.detail}
          </>
        ) : null}
        {line.at !== null ? (
          <>
            <span aria-hidden="true" className="opacity-45">
              {" · "}
            </span>
            <time dateTime={line.at} className="whitespace-nowrap">
              {formatShortDateTime(line.at)}
            </time>
          </>
        ) : null}
      </span>
      {onRetry !== undefined ? (
        <Button
          variant="outline"
          size="sm"
          className="h-[26px] shrink-0 rounded-full px-2.5 text-xs text-foreground"
          onClick={onRetry}
        >
          {line.retry === "email" ? (
            <>
              <Mail className="size-3" /> Enviar por correo
            </>
          ) : (
            <>
              <RotateCcw className="size-3" /> Reintentar
            </>
          )}
        </Button>
      ) : null}
    </p>
  );
}
