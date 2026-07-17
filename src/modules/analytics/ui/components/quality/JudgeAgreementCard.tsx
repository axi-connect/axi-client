"use client";

import { TriangleAlert } from "lucide-react";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { Section } from "@/modules/analytics/infrastructure/stores/analytics.store";
import type { JudgeAgreementDTO } from "@/modules/analytics/domain/analytics";

/**
 * Card discreta "Confianza del evaluador IA": acuerdo juez-humano de la
 * versión vigente del prompt. `agreement_pct < 80` advierte; con menos de 5
 * revisiones invita a calibrar. Un error aquí simplemente no la muestra
 * (es informativa, no bloquea el tab).
 */
export function JudgeAgreementCard({ section }: { section: Section<JudgeAgreementDTO> }) {
  if (section.status === "error") return null;
  if (section.data === null) {
    return <Skeleton className="h-14 rounded-2xl" />;
  }

  // La versión vigente es la más alta del historial.
  const current = [...section.data.versions].sort(
    (a, b) => b.prompt_version - a.prompt_version,
  )[0];

  const invite = !current || current.reviewed < 5;
  const lowAgreement =
    !invite && current.agreement_pct !== null && current.agreement_pct < 80;

  return (
    <div className="rounded-2xl border border-border bg-background px-5 py-4 text-sm text-muted-foreground">
      <h3 className="mb-1 text-xs font-medium uppercase tracking-wide">
        Confianza del evaluador IA
      </h3>
      {invite ? (
        <p>
          Calibra al menos 5 evaluaciones para medir qué tanto coincide el
          evaluador con tu criterio.
        </p>
      ) : (
        <p className={lowAgreement ? "flex items-start gap-1.5 text-warning" : undefined}>
          {lowAgreement && <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />}
          <span>
            v{current.prompt_version} del evaluador: coincide con tu criterio en el{" "}
            <span className="font-semibold tabular-nums">
              {current.agreement_pct?.toLocaleString("es-CO")} %
            </span>{" "}
            de los casos revisados ({current.reviewed.toLocaleString("es-CO")} revisiones
            {current.avg_delta !== null && (
              <>
                {" "}
                · desviación promedio{" "}
                <span className="tabular-nums">
                  {current.avg_delta.toLocaleString("es-CO", { maximumFractionDigits: 1 })}
                </span>{" "}
                pts
              </>
            )}
            )
          </span>
        </p>
      )}
    </div>
  );
}
