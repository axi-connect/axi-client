"use client";

import { cn } from "@/core/lib/utils";
import type { ContactDataVariant } from "./types";

/** Cabecera de grupo (Registro · Pedido · Cita · En esta conversación) + su contenido. */
export function ContactDataGroup({
  label,
  variant,
  children,
}: {
  label: string;
  variant: ContactDataVariant;
  children: React.ReactNode;
}) {
  return (
    <section className={variant === "card" ? "mt-[18px]" : "mt-3.5"}>
      <h4
        className={cn(
          "border-b border-border/50 font-semibold tracking-[.08em] text-muted-foreground uppercase",
          variant === "card" ? "pb-1.5 text-[11.5px]" : "mb-0.5 pb-1 text-[11px]",
        )}
      >
        {label}
      </h4>
      {children}
    </section>
  );
}
