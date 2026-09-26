"use client";

import { cn } from "@/core/lib/utils";
import { milestoneEntry, milestoneEvidenceLabel, SCORE_MILESTONES, type ContactProfileDTO } from "@/modules/crm/domain/contact";
import { scoreProgress } from "@/modules/crm/domain/contact-summary";
import { BentoFigure, BentoTile } from "@/shared/components/features/bento";

/**
 * «Qué tan cerca está» (lienzo CRM premium F2): el score del embudo como cifra
 * y como CINCO TRAMOS, uno por hito (DESIGN-SYSTEM §9.6: el progreso va en
 * tramos, nunca en un anillo). Cada tramo lleva su hito y la evidencia que lo
 * disparó en el `title`; el lector de pantalla recibe la lista completa.
 */
export function ScorePanel({ profile, className }: { profile: ContactProfileDTO; className?: string }) {
  const progress = scoreProgress(profile);

  return (
    <BentoTile label="Qué tan cerca está" className={className}>
      <BentoFigure value={String(progress.score)} unit="de 100" />
      <ol className="grid grid-cols-5 gap-1" aria-label="Hitos del embudo">
        {SCORE_MILESTONES.map((milestone, index) => {
          const reached = progress.steps[index]?.reached ?? false;
          const evidence = milestoneEvidenceLabel(milestoneEntry(profile, milestone.key));
          const hint = reached ? `${milestone.label}: ${evidence ?? "alcanzado"}` : `${milestone.label}: pendiente · ${milestone.detail}`;
          return (
            <li key={milestone.key} title={hint} className={cn("h-2 rounded-full", reached ? "bg-foreground" : "bg-muted")}>
              <span className="sr-only">{hint}</span>
            </li>
          );
        })}
      </ol>
      <p className="mt-auto text-xs text-pretty text-muted-foreground">{progress.sentence}</p>
    </BentoTile>
  );
}
