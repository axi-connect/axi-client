import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Kicker } from "@/shared/components/features/bento";
import { Island } from "@/shared/components/features/island";
import { Button } from "@/shared/components/ui/button";

import type { ahoraMismo } from "../../domain/copy";
import { AxiCoin } from "./AxiCoin";

type Ahora = NonNullable<ReturnType<typeof ahoraMismo>>;

/**
 * «Ahora mismo» (R2): la isla de cristal con lo que pide tu atención en la
 * lista de rutas. Axi, una frase grande («7 cuentas esperan tu aprobación»),
 * una línea de contexto y el botón al lote o a la salida en vivo. Sale de la
 * misma lista; quien la monta decide si hay algo que contar.
 */
export function AhoraMismo({ ahora }: { ahora: Ahora }) {
  const waiting = ahora.action?.kind === "batch";
  return (
    <Island as="section" aria-label="Ahora mismo" className="flex min-w-0 flex-wrap items-center gap-x-[26px] gap-y-3.5 px-[22px] py-[18px]">
      <AxiCoin size={40} live={ahora.action?.kind === "live"} />
      {/* Base de 14 rem: en el celular el botón baja de línea en vez de aplastar la frase. */}
      <span className="flex min-w-0 flex-[1_1_14rem] flex-col gap-0.5">
        <Kicker>Ahora mismo</Kicker>
        <span className="font-heading text-[22px] leading-tight font-bold tracking-[-0.02em] text-pretty">{ahora.headline}</span>
        {ahora.context !== "" && <span className="text-muted-foreground text-[13px] text-pretty">{ahora.context}</span>}
      </span>
      {ahora.action !== null && (
        <Button asChild variant={waiting ? "default" : "outline"} className="rounded-full">
          <Link href={`/marketing/autopilot/runs/${ahora.action.run_id}`}>
            {waiting ? "Revisar el lote" : "Ver en vivo"}
            <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        </Button>
      )}
    </Island>
  );
}
