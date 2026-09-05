"use client";

import { useEffect, useRef, useState } from "react";
import { FileSpreadsheet, FileText, Image as ImageIcon } from "lucide-react";

import { formatBytes } from "@/core/lib/format";
import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import {
  importProgressLabel,
  importProgressRatio,
  type CatalogImportDTO,
} from "@/modules/onboarding/domain/catalog-import";

const SOURCE_ICON = { sheet: FileSpreadsheet, pdf: FileText, image: ImageIcon } as const;
/** Cuántas filas se muestran; el resto se resume en «y N más». */
const MAX_ROWS = 6;
/** Líneas de «texto» del documento; el haz recorre su alto. */
const DOC_LINES = [0.8, 1, 0.6, 1, 0.8, 0.6, 1, 0.8] as const;

/**
 * «La IA lee tu catálogo» (onboarding «Flow», aprobado 2026-09-05): a la
 * izquierda el documento con un haz violeta que lo recorre; a la derecha las
 * filas de producto que van apareciendo según `items_total` crece entre
 * sondeos. Sustituye a la barra indeterminada con la misma información y los
 * mismos roles: `progressbar` con el avance y `status` con la frase del dominio.
 *
 * El haz es un indicador de progreso ligado al job, no decoración
 * (DESIGN-SYSTEM §6): con páginas informadas es DETERMINADO (baja con el
 * ratio); sin ellas barre en bucle solo mientras el job procesa, y se detiene
 * si el análisis tarda más de lo normal. Con reduced-motion no se mueve y las
 * filas aparecen sin entrada.
 *
 * Con `stalled` ofrece seguir esperando o continuar con los agentes: un import
 * que dura no debe secuestrar el onboarding.
 */
export function CatalogScan({
  job,
  stalled,
  onKeepWaiting,
  onContinueLater,
}: {
  job: CatalogImportDTO;
  stalled: boolean;
  onKeepWaiting: () => void;
  onContinueLater: () => void;
}) {
  const Icon = SOURCE_ICON[job.source_kind] ?? FileText;
  const ratio = importProgressRatio(job);
  const meta = [job.pages_total ? `${job.pages_total} páginas` : null, formatBytes(job.size_bytes)].filter(Boolean).join(" · ");
  const shown = Math.min(job.items_total, MAX_ROWS);
  const rest = job.items_total - shown;

  // El haz determinado necesita saber cuánto mide el documento para recorrerlo.
  const docRef = useRef<HTMLDivElement | null>(null);
  const [travel, setTravel] = useState(220);
  useEffect(() => {
    const el = docRef.current;
    if (!el) return;
    const measure = () => setTravel(Math.max(40, el.clientHeight - 16));
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="grid w-full gap-4 sm:grid-cols-[240px_minmax(0,1fr)]">
      <div
        ref={docRef}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={ratio === null ? undefined : Math.round(ratio * 100)}
        aria-valuetext={importProgressLabel(job)}
        className="sf-glass-on relative min-h-[236px] overflow-hidden rounded-[18px] border p-4 shadow-[0_12px_40px_rgb(0_0_0/.06)]"
        style={{ ["--flow-scan-travel" as string]: `${travel}px` }}
      >
        <span
          aria-hidden="true"
          className={cn("flow-scan-beam", ratio === null && !stalled && "flow-scan-beam--sweep", stalled && "flow-scan-beam--paused")}
          style={ratio === null ? undefined : { transform: `translateY(${14 + ratio * (travel - 14)}px)` }}
        />
        <div className="flex items-center gap-2.5">
          <Icon aria-hidden="true" className="text-accent-violet size-5 shrink-0" strokeWidth={1.6} />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold">{job.file_name}</p>
            <p className="text-muted-foreground text-[11.5px]">{meta}</p>
          </div>
        </div>
        <div aria-hidden="true" className="mt-3.5 flex flex-col gap-2">
          {DOC_LINES.map((width, index) => (
            <span key={index} className="bg-foreground/[.09] block h-2 rounded-full" style={{ width: `${width * 100}%` }} />
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex items-center justify-between gap-3 text-[13px]">
          <p role="status" aria-live="polite" className="text-muted-foreground min-w-0 truncate">
            {importProgressLabel(job)}
          </p>
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-[.04em] uppercase",
              stalled ? "sf-glass text-muted-foreground" : "bg-accent-violet/12 text-accent-violet",
            )}
          >
            {stalled ? "Tardando más" : "Analizando"}
          </span>
        </div>

        {shown > 0 ? (
          <ul aria-label="Productos encontrados" className="flex flex-col gap-2">
            {Array.from({ length: shown }, (_, index) => (
              <li
                key={index}
                className="sf-glass-on animate-msg-in motion-reduce:animate-none grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border px-3.5 py-2.5"
              >
                <span className="flex flex-col gap-1.5" aria-hidden="true">
                  <span className="bg-foreground/[.14] block h-2.5 w-[min(60%,180px)] rounded-full" />
                  <span className="bg-foreground/[.08] block h-2 w-[min(35%,110px)] rounded-full" />
                </span>
                <span className="bg-foreground/[.12] block h-2.5 w-12 rounded-full" aria-hidden="true" />
                <span className="sr-only">Producto {index + 1}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col gap-2" aria-hidden="true">
            {[1, 0.7, 0.4].map((opacity) => (
              <div key={opacity} className="sf-glass h-11 rounded-xl" style={{ opacity }} />
            ))}
          </div>
        )}
        {rest > 0 ? <p className="text-muted-foreground px-1 text-[12.5px]">y {rest} más</p> : null}

        {stalled ? (
          <div className="sf-glass mt-1 flex flex-col gap-3 rounded-[14px] px-4 py-3 text-[13px] leading-relaxed">
            <p>Este archivo está tardando más de lo normal. Puedes seguir esperando o continuar con los agentes: el análisis sigue y lo retomas aquí.</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onKeepWaiting}>
                Seguir esperando
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={onContinueLater}>
                Continuar con los agentes
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
