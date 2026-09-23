import { X } from "lucide-react";

import { cn } from "@/core/lib/utils";
import type { DocumentStatusTone } from "@/modules/documents/domain/document";

/** La línea de acento de cada tipo de papel; lo que no está en la tabla lleva el coral. */
const ACCENTS: Record<string, string> = {
  contract: "#e65759",
  quote: "#f0a431",
  proposal: "#0891b2",
  receipt: "#16a34a",
  statement: "#2563eb",
  cuenta_cobro: "#7c3aed",
};

/**
 * El papelito (F8 Cobros): una hoja blanca en miniatura con la línea de su
 * tipo. Blanca también en oscuro —como la hoja de F7— porque es papel, no un
 * icono. Mientras el worker pinta, las líneas se rellenan; si falló, lleva la
 * esquina marcada; reemplazado, se inclina y atenúa.
 */
export function PaperMark({
  typeCode,
  tone = "ok",
  className,
}: {
  typeCode: string;
  tone?: DocumentStatusTone | "empty";
  className?: string;
}) {
  const accent = ACCENTS[typeCode] ?? "#e65759";
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative block h-[38px] w-[30px] shrink-0 overflow-hidden rounded-[3px] border border-zinc-200 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.08),0_4px_10px_rgb(0_0_0/0.08)]",
        tone === "off" && "-rotate-3 opacity-55",
        tone === "empty" && "opacity-70",
        className,
      )}
    >
      <span
        className="absolute inset-x-[5px] top-[6px] h-[2px] rounded-[1px]"
        style={{ background: tone === "bad" ? "#dc2626" : accent }}
      />
      <span
        className={cn(
          "absolute top-[12px] left-[5px] right-[9px] h-[18px]",
          tone === "busy" &&
            "motion-safe:animate-[paper-fill_2.4s_ease-in-out_infinite]",
        )}
        style={{
          backgroundImage:
            "repeating-linear-gradient(#e4e4e7 0 1.5px, transparent 1.5px 4.5px)",
          opacity: tone === "empty" ? 0.5 : 1,
        }}
      />
      {tone === "bad" ? (
        <span className="absolute -right-px -bottom-px grid size-[14px] place-items-center rounded-tl-[7px] bg-destructive text-white">
          <X className="size-[9px]" strokeWidth={3} />
        </span>
      ) : null}
    </span>
  );
}
