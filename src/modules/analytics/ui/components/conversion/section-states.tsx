"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import type { Section } from "@/modules/analytics/infrastructure/stores/analytics.store";

/** Error de UNA sección: mensaje + reintento — nunca tumba el tab entero. */
export function SectionError({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <p className="text-sm text-muted-foreground">
        {message ?? "No pudimos cargar esta sección."}
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RotateCcw aria-hidden className="size-4" />
        Reintentar
      </Button>
    </div>
  );
}

/**
 * Refetch por período: los datos viejos se atenúan hasta llegar los nuevos —
 * NUNCA skeleton en refetch (el layout no salta, plan §4.5).
 */
export function sectionRefetching(section: Section<unknown>): string | undefined {
  return section.status === "loading" && section.data !== null
    ? "opacity-60 transition-opacity motion-safe:animate-pulse"
    : undefined;
}
