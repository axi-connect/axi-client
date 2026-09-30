import type { ReactNode } from "react";

import { cn } from "@/core/lib/utils";

/** Una burbuja del hilo: `in` es el cliente, `out` lo que sale del negocio. */
export function Bubble({
  side,
  children,
  meta,
  className,
}: {
  side: "in" | "out";
  children: ReactNode;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col", side === "out" ? "items-end" : "items-start", className)} data-anim="msg">
      <div className={cn("film-bub", side === "out" ? "film-bub-out" : "film-bub-in")}>{children}</div>
      {meta ? <div className="film-meta">{meta}</div> : null}
    </div>
  );
}

/**
 * El teléfono del chat. Tinta con el reflejo del borde; el tamaño lo pone el
 * contenedor (`className`), nunca una altura fija que desborde en pantallas bajas.
 */
export function Phone({ title, status, children, className }: { title: ReactNode; status: string; children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative rounded-[52px] p-2.5 shadow-[0_40px_120px_rgb(0_0_0/.7),inset_0_0_0_1px_rgb(255_255_255/.08)]",
        "bg-[linear-gradient(160deg,color-mix(in_srgb,var(--foreground)_16%,var(--background)),var(--background)_40%,color-mix(in_srgb,var(--foreground)_10%,var(--background)))]",
        className,
      )}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-[43px] bg-background">
        <div className="flex h-8 shrink-0 items-center justify-center">
          <div className="h-6 w-24 rounded-full bg-black" />
        </div>
        <div className="flex shrink-0 items-center gap-2.5 border-b border-[var(--film-line)] px-4 pt-1 pb-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--axi-brand),var(--axi-violet))] text-[13px] font-bold text-background">
            A
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{title}</div>
            <div className="text-[11px] text-[var(--axi-success)]">{status}</div>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col justify-end gap-2 overflow-hidden px-3 pt-3 pb-4">{children}</div>
      </div>
    </div>
  );
}
