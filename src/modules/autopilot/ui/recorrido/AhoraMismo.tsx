import Link from "next/link";
import { ArrowRight, Plane } from "lucide-react";

import { Kicker } from "@/shared/components/features/bento";
import { Island } from "@/shared/components/features/island";
import { Button } from "@/shared/components/ui/button";

import type { ahoraMismo } from "../../domain/copy";

type Ahora = NonNullable<ReturnType<typeof ahoraMismo>>;

/**
 * «Ahora mismo» (R2): la isla de cristal con lo que pide tu atención en la
 * lista de pilotos. El avión en su moneda, una frase grande («7 cuentas esperan tu aprobación»),
 * una línea de contexto y el botón al lote o a la salida en vivo. Sale de la
 * misma lista; quien la monta decide si hay algo que contar.
 */
export function AhoraMismo({ ahora }: { ahora: Ahora }) {
  const waiting = ahora.action?.kind === "batch";
  return (
    <Island as="section" aria-label="Ahora mismo" className="flex min-w-0 flex-wrap items-center gap-x-[26px] gap-y-3.5 px-[22px] py-[18px]">
      {/* El avión en su moneda (la distribución que eligió el dueño). */}
      <span aria-hidden className="bg-background text-foreground ring-border grid size-10 shrink-0 place-items-center rounded-full shadow-[0_6px_16px_-6px_rgba(0,0,0,0.3)] ring-1">
        <Plane className="size-[22px] rotate-45" />
      </span>
      {/* Base de 14 rem: en el celular el botón baja de línea en vez de aplastar la frase. */}
      <span className="flex min-w-0 flex-[1_1_14rem] flex-col gap-0.5">
        <Kicker>Ahora mismo</Kicker>
        <span className="font-heading text-[22px] leading-tight font-bold tracking-[-0.02em] text-pretty">{ahora.headline}</span>
        {ahora.context !== "" && <span className="text-muted-foreground text-[13px] text-pretty">{ahora.context}</span>}
      </span>
      {ahora.action !== null && (
        <Button asChild variant="glass" className="h-[38px] px-[18px]">
          <Link href={`/marketing/autopilot/runs/${ahora.action.run_id}`}>
            {waiting ? "Revisar el lote" : "Ver en vivo"}
            <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        </Button>
      )}
    </Island>
  );
}
