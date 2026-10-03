"use client";

import { useState } from "react";
import { AlertTriangle, Check, CircleX, Copy } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import {
  HSM_REJECT_REASONS,
  hsmStatusLabel,
  type HsmFormStep,
  type HsmSubmitFailure,
} from "@/modules/marketing/domain/meta-template-view";

/**
 * Qué pasó al enviar, dicho DENTRO del formulario y hasta que el operador
 * actúe (tablero 8 del lienzo). Antes era un aviso flotante que se iba solo y,
 * con un corte de red, se leía como un rechazo: el operador reenviaba y Meta
 * contestaba «ya existe» (incidente 2026-09-28).
 */
export function HsmSubmitNotice({
  failure,
  name,
  language,
  suggestedName,
  onViewExisting,
  onUseName,
  onSync,
  onRefresh,
  onGoToStep,
}: {
  failure: HsmSubmitFailure;
  name: string;
  language: string;
  /** El nombre libre que se propone (`_v2`), para que la salida sea un clic. */
  suggestedName: string;
  onViewExisting: () => void;
  onUseName: () => void;
  onSync: () => void;
  onRefresh: () => void;
  /** «Ir a corregirlo»: abre el paso del formulario donde está el problema. */
  onGoToStep: (step: HsmFormStep) => void;
}) {
  switch (failure.kind) {
    case "name_locked":
      return (
        <Alert variant="warning">
          <AlertTriangle aria-hidden />
          <AlertTitle className="line-clamp-none">
            Meta tiene reservado «{name}» ({language}){" "}
            {failure.until ? `hasta el ${lockedUntilLabel(failure.until)}` : "unos 30 días"}
          </AlertTitle>
          <AlertDescription>
            <p>
              Hace poco se borró una plantilla con ese nombre e idioma, y Meta reserva el nombre 30 días
              {failure.estimated && failure.until ? " (la fecha es aproximada: se borró fuera de axi)" : ""}. Usa otro
              nombre para continuar.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="contrast" className="rounded-full" onClick={onUseName}>
                Usar {suggestedName}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      );
    case "rejected": {
      const reason = HSM_REJECT_REASONS[failure.reason];
      return (
        <Alert variant="destructive">
          <CircleX aria-hidden />
          <AlertTitle className="line-clamp-none">{reason.title}</AlertTitle>
          <AlertDescription className="text-foreground">
            <p>
              {reason.hint}
              {failure.detail ? ` Meta dijo: «${failure.detail}».` : ""}
            </p>
            {(reason.step !== null || failure.reason === "exists" || failure.reason === "name_locked") && (
              <div className="mt-2 flex flex-wrap gap-2">
                {failure.reason === "exists" || failure.reason === "name_locked" ? (
                  <Button size="sm" variant="contrast" className="rounded-full" onClick={onUseName}>
                    Usar {suggestedName}
                  </Button>
                ) : reason.step !== null ? (
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => reason.step !== null && onGoToStep(reason.step)}>
                    Ir a corregirlo
                  </Button>
                ) : null}
              </div>
            )}
            {failure.reference ? <SupportReference reference={failure.reference} /> : null}
          </AlertDescription>
        </Alert>
      );
    }
    case "exists_here":
      return (
        <Alert variant="warning">
          <AlertTriangle aria-hidden />
          <AlertTitle className="line-clamp-none">
            Ya tienes «{name}» ({language}) en este canal
          </AlertTitle>
          <AlertDescription>
            <p>
              {failure.status === null ? "" : `Está ${hsmStatusLabel(failure.status).toLowerCase()}. `}
              Meta no admite dos con el mismo nombre e idioma: edítala o usa otro nombre.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="rounded-full" onClick={onViewExisting}>
                Ver la plantilla
              </Button>
              <Button size="sm" variant="contrast" className="rounded-full" onClick={onUseName}>
                Usar {suggestedName}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      );
    case "exists_meta":
      return (
        <Alert variant="warning">
          <AlertTriangle aria-hidden />
          <AlertTitle className="line-clamp-none">Meta ya tiene una plantilla con ese nombre e idioma</AlertTitle>
          <AlertDescription>
            <p>
              Pudo crearse en el Business Manager o en un intento cuya respuesta se perdió. Sincroniza para traerla aquí, o
              usa otro nombre.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="rounded-full" onClick={onSync}>
                Sincronizar con Meta
              </Button>
              <Button size="sm" variant="contrast" className="rounded-full" onClick={onUseName}>
                Usar {suggestedName}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      );
    case "meta_rejected":
      return (
        <Alert variant="destructive">
          <CircleX aria-hidden />
          <AlertTitle className="line-clamp-none">No pudimos hablar con Meta</AlertTitle>
          <AlertDescription className="text-foreground">
            <p>
              {failure.detail ? `Meta respondió: «${failure.detail}». ` : ""}Suele ser pasajero: inténtalo en un momento.
            </p>
            {failure.reference ? <SupportReference reference={failure.reference} /> : null}
          </AlertDescription>
        </Alert>
      );
    case "invalid":
      return (
        <Alert variant="destructive">
          <CircleX aria-hidden />
          <AlertTitle className="line-clamp-none">Meta no la aceptaría así</AlertTitle>
          <AlertDescription className="text-foreground">
            <p>{failure.message}</p>
          </AlertDescription>
        </Alert>
      );
    case "unknown":
      return (
        <Alert variant="warning">
          <AlertTriangle aria-hidden />
          <AlertTitle className="line-clamp-none">No sabemos si Meta la recibió</AlertTitle>
          <AlertDescription>
            <p>
              La respuesta no llegó. Antes de reenviarla, actualiza la lista: si aparece «En revisión», ya llegó y no hace
              falta enviarla otra vez.
            </p>
            <div className="mt-2">
              <Button size="sm" variant="contrast" className="rounded-full" onClick={onRefresh}>
                Actualizar la lista
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      );
  }
}

/** «28 oct» en la zona del navegador: la reserva de Meta es de días, no de horas. */
function lockedUntilLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

/** El `fbtrace_id` de Graph: lo primero que pide el soporte de Meta al abrir un caso. */
function SupportReference({ reference }: { reference: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <p className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
      Referencia para el soporte de Meta
      <code className="bg-muted rounded-md px-1.5 py-0.5 font-mono text-[11px] break-all">{reference}</code>
      <Button
        size="icon"
        variant="ghost"
        className="size-7 rounded-full"
        aria-label={copied ? "Referencia copiada" : "Copiar la referencia"}
        onClick={() => {
          void navigator.clipboard?.writeText(reference).then(() => setCopied(true));
        }}
      >
        {copied ? <Check aria-hidden className="size-3.5" /> : <Copy aria-hidden className="size-3.5" />}
      </Button>
    </p>
  );
}
