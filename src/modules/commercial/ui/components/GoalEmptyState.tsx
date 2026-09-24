"use client";

import Link from "next/link";
import { Flag } from "lucide-react";

import type { GoalSeedDTO } from "@/modules/commercial/domain/commercial";
import { seedLine } from "@/modules/commercial/domain/copy";
import { EmptyState } from "@/shared/components/features/empty-state";
import { Button } from "@/shared/components/ui/button";
import { SourceMark } from "./SourceMark";

/**
 * Sin meta todavía. El vacío no regaña: propone. La semilla dice de dónde
 * sale la propuesta (la historia del tenant o lo típico de su nicho), porque
 * hasta la primera cifra del módulo lleva su procedencia.
 */
export function GoalEmptyState({ month, seed, currency, canManage }: { month: string; seed: GoalSeedDTO | null; currency: string; canManage: boolean }) {
  const seedSource = seed === null || seed.source === "benchmark" || seed.last_month_revenue_cents === null ? "benchmark" : "history";
  const seedText = seedLine(seed, currency);
  return (
    <EmptyState
      glyph="money"
      variant="solid"
      title={`Ponle una meta a ${month}`}
      description="Dinos cuánto quieres vender y te trazamos el camino: cuántas ventas, cuántas conversaciones, cuántas llamadas."
      className="py-14"
      action={
        <div className="flex flex-col items-center gap-3">
          {canManage ? (
            <Button asChild>
              <Link href="/comercial/meta">
                <Flag aria-hidden className="size-4" />
                Definir la meta
              </Link>
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">Pídele a un administrador que la defina.</p>
          )}
          {seedText !== null ? (
            <p className="flex flex-wrap items-center justify-center gap-x-1.5 text-[13px] text-muted-foreground">
              <SourceMark source={seedSource} nicheLabel={seed?.niche_label} className="sr-only" />
              {seedText}
            </p>
          ) : null}
        </div>
      }
    />
  );
}
