import Link from "next/link";
import { Plane } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { Kicker } from "@/shared/components/features/bento";
import { Island } from "@/shared/components/features/island";
import { Button } from "@/shared/components/ui/button";

import type { ahoraMismo } from "../../domain/copy";

type Ahora = NonNullable<ReturnType<typeof ahoraMismo>>;

/**
 * «Ahora mismo» (U2): lo que pide tu atención en la lista de pilotos —en
 * vuelo, lotes que esperan y la próxima salida— con el botón al lote o a la
 * ejecución en vivo. Sale de la misma lista; quien lo monta decide si hay algo
 * que contar (`ahoraMismo` da null si no).
 */
export function AhoraMismo({ ahora }: { ahora: Ahora }) {
  const waiting = ahora.action?.kind === "batch";
  return (
    <Island
      as="section"
      aria-label="Ahora mismo"
      glow={waiting ? "none" : "brand"}
      className={cn("flex min-w-0 flex-col gap-3 p-5", waiting && "ring-warning/60 ring-[1.5px]")}
    >
      <Kicker>Ahora mismo</Kicker>
      <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-3">
        <span aria-hidden className="bg-foreground text-background hidden size-10 shrink-0 place-items-center rounded-xl sm:grid">
          <Plane className="size-5 rotate-45" />
        </span>
        <ul className="flex min-w-0 flex-1 flex-wrap gap-x-6 gap-y-2 text-sm">
          {ahora.facts.map((fact) => (
            <li key={fact.key} className="flex min-w-0 items-baseline gap-2">
              <span className="font-heading text-xl leading-none font-bold tabular-nums">{fact.value}</span>
              <span className="text-pretty">{fact.text}</span>
            </li>
          ))}
        </ul>
        {ahora.action !== null && (
          <Button asChild size="sm" variant={waiting ? "default" : "contrast"} className="rounded-full">
            <Link href={`/marketing/autopilot/runs/${ahora.action.run_id}`}>{waiting ? "Revisar el lote" : "Ver en vivo"}</Link>
          </Button>
        )}
      </div>
    </Island>
  );
}
