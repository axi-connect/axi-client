"use client";

import { useMemo, useState } from "react";
import {
  Loader2,
  RefreshCw,
  TriangleAlert,
  WifiOff,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { PreviewStatus } from "@/modules/documents/infrastructure/hooks/use-template-preview";

/**
 * Las fuentes de marca del HOST, inyectadas al documento de la previa: el
 * servidor manda el HTML sin `@font-face` (`font_source: host`) para no
 * incrustar 150-250 KB por tecla. El iframe es de origen opaco, así que estas
 * URLs se piden cross-origin; `next.config.ts` sirve `/fonts` con CORS.
 * Las rutas son absolutas al host porque el `srcDoc` hereda la base del padre.
 */
export const HOST_FONT_FACES = `
@font-face{font-family:'Poppins';font-weight:400;font-style:normal;font-display:block;src:url(/fonts/poppins/Poppins-Regular.woff2) format('woff2')}
@font-face{font-family:'Poppins';font-weight:500;font-style:normal;font-display:block;src:url(/fonts/poppins/Poppins-Medium.woff2) format('woff2')}
@font-face{font-family:'Poppins';font-weight:600;font-style:normal;font-display:block;src:url(/fonts/poppins/Poppins-SemiBold.woff2) format('woff2')}
@font-face{font-family:'Poppins';font-weight:700;font-style:normal;font-display:block;src:url(/fonts/poppins/Poppins-Bold.woff2) format('woff2')}
@font-face{font-family:'Nexa';font-weight:700;font-style:normal;font-display:block;src:url(/fonts/nexa/Nexa-Heavy.woff2) format('woff2')}
`.trim();

/** Antepone las caras del host al HTML del servidor, en su `<style data-fonts>`. */
export function withHostFonts(html: string): string {
  return html.replace(
    "<style data-fonts></style>",
    `<style data-fonts>${HOST_FONT_FACES}</style>`,
  );
}

const ZOOMS = [0.5, 0.65, 0.8, 1] as const;
/** El ancho del A4 a 96 dpi, que es a lo que Chromium imprime. */
const A4_WIDTH_PX = 794;

/**
 * La hoja: un `<iframe sandbox="">` con el HTML de la MISMA cadena que el PDF.
 * `sandbox` sin permisos = origen opaco, sin scripts, sin formularios; el HTML
 * ya viene escapado y con su CSP, así que son dos candados independientes. La
 * hoja nunca desaparece: mientras actualiza, si falla la red o si una variable
 * la frena, se ve la última versión buena con una barra encima, nunca un velo.
 */
export function TemplatePreviewFrame({
  html,
  status,
  error,
  onRetry,
  title = "Vista previa del documento",
}: {
  html: string | null;
  status: PreviewStatus;
  error: string | null;
  onRetry: () => void;
  title?: string;
}) {
  const [zoomIndex, setZoomIndex] = useState(1);
  const zoom = ZOOMS[zoomIndex] ?? 0.65;
  const srcDoc = useMemo(
    () => (html === null ? null : withHostFonts(html)),
    [html],
  );

  return (
    <div className="flex flex-col gap-3 lg:sticky lg:top-6">
      <div
        className="flex items-center gap-2 px-1 text-xs text-muted-foreground"
        aria-live="polite"
      >
        <StatusDot status={status} />
        <span>{statusLabel(status)}</span>
        <span aria-hidden="true">·</span>
        <span className="truncate">
          Con los datos de una reserva de ejemplo
        </span>
        <div className="ml-auto flex gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Alejar la hoja"
            disabled={zoomIndex === 0}
            onClick={() => setZoomIndex((index) => Math.max(0, index - 1))}
          >
            <ZoomOut aria-hidden="true" className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Acercar la hoja"
            disabled={zoomIndex === ZOOMS.length - 1}
            onClick={() =>
              setZoomIndex((index) => Math.min(ZOOMS.length - 1, index + 1))
            }
          >
            <ZoomIn aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </div>

      <div className="relative flex justify-center overflow-hidden rounded-2xl border border-border bg-foreground/5 p-4 md:p-6">
        {srcDoc === null ? (
          <div
            role="status"
            aria-label="Preparando la vista previa"
            className="flex flex-col gap-3 bg-white p-10 shadow-xl"
            style={{
              width: A4_WIDTH_PX * zoom,
              minHeight: A4_WIDTH_PX * 1.414 * zoom,
            }}
          >
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        ) : (
          <div
            style={{
              width: A4_WIDTH_PX * zoom,
              height: A4_WIDTH_PX * 1.414 * zoom,
            }}
          >
            <iframe
              title={title}
              sandbox=""
              referrerPolicy="no-referrer"
              srcDoc={srcDoc}
              className="origin-top-left border-0 bg-white shadow-xl"
              style={{
                width: A4_WIDTH_PX,
                height: A4_WIDTH_PX * 1.414,
                transform: `scale(${String(zoom)})`,
              }}
            />
          </div>
        )}

        {status === "blocked" && (
          <Overlay
            icon={
              <TriangleAlert
                aria-hidden="true"
                className="size-[18px] text-warning"
              />
            }
          >
            La hoja espera: hay una variable que este documento no tiene.
            Corrígela y se actualiza sola.
          </Overlay>
        )}
        {status === "error" && (
          <Overlay
            icon={
              <WifiOff
                aria-hidden="true"
                className="size-[18px] text-destructive"
              />
            }
          >
            <span>
              {error ?? "No se pudo actualizar la vista previa."} Lo que ves es
              la última versión buena.
            </span>
            <div className="mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRetry}
              >
                <RefreshCw aria-hidden="true" className="size-3.5" />
                Reintentar
              </Button>
            </div>
          </Overlay>
        )}
      </div>
    </div>
  );
}

/**
 * Una BARRA sobre la hoja, no un velo: el dueño necesita ver el documento
 * mientras arregla la variable o espera la red, que es justo lo que un velo
 * le quitaría (hallazgo del auditor sobre el mockup).
 */
function Overlay({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-4 top-4 flex justify-center md:inset-x-6 md:top-6">
      <div
        role="status"
        className="pointer-events-auto flex max-w-[420px] items-start gap-2.5 rounded-2xl border border-border bg-background/95 px-4 py-3 text-sm leading-snug shadow-lg backdrop-blur"
      >
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div>{children}</div>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: PreviewStatus }) {
  if (status === "loading")
    return (
      <Loader2 aria-hidden="true" className="size-3.5 animate-spin text-info" />
    );
  const tone =
    status === "ready"
      ? "bg-success"
      : status === "blocked"
        ? "bg-warning"
        : status === "error"
          ? "bg-destructive"
          : "bg-muted-foreground";
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-[7px] rounded-full ${tone}`}
    />
  );
}

function statusLabel(status: PreviewStatus): string {
  switch (status) {
    case "idle":
      return "Preparando";
    case "loading":
      return "Actualizando…";
    case "ready":
      return "Al día";
    case "blocked":
      return "En espera";
    case "error":
      return "Sin conexión";
  }
}
