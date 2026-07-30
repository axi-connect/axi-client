"use client";

import { BadgeCheck } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { CountUpNumber } from "@/modules/landing/ui/components/CountUpNumber";
import type { SaleCardData } from "@/modules/landing/ui/content/landing.content";

/**
 * Tarjeta "Venta pagada" — el remate de cada mockup de chat (hero y §4).
 * Glass (superficie flotante sancionada) + cifra en Geist Mono con count-up
 * al entrar en viewport. Los datos vienen del mockup al que acompaña.
 */
export function SalePaidCard({ card, className }: { card: SaleCardData; className?: string }) {
  return (
    <div className={cn("glass w-max rounded-2xl px-5 py-4", className)}>
      <div className="flex items-center gap-2">
        <BadgeCheck aria-hidden className="text-success size-4" />
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {card.title}
        </span>
      </div>
      <p className="mt-1 font-mono text-3xl font-semibold tracking-tight tabular-nums">
        <CountUpNumber value={card.amountValue} prefix="$" />
      </p>
      <p className="text-muted-foreground mt-1 text-xs">{card.caption}</p>
    </div>
  );
}
