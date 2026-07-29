"use client";

import { Check } from "lucide-react";
import { cn } from "@/core/lib/utils";
import {
  milestoneEntry,
  milestoneEvidenceLabel,
  SCORE_MILESTONES,
  type ContactProfileDTO,
} from "@/modules/crm/domain/contact";

const RING_RADIUS = 30;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** Tono del score: alto=success, medio=warning, bajo=neutro (nunca coral). */
function scoreTone(score: number): { text: string; stroke: string } {
  if (score >= 70) return { text: "text-success", stroke: "stroke-success" };
  if (score >= 40) return { text: "text-warning", stroke: "stroke-warning" };
  return { text: "text-muted-foreground", stroke: "stroke-muted-foreground" };
}

/**
 * Score 0-100 con anillo + STEPPER de hitos del embudo (S3 backend: modelo
 * monotónico — cada hito implica los anteriores; pedido/cita convergen al
 * mismo compromiso). Hito alcanzado = ✓ con peso y evidencia (qué evento lo
 * disparó); pendiente queda atenuado con la línea del stepper cortada — el
 * operador ve exactamente en qué punto del embudo está el contacto.
 */
export function ScorePanel({ profile }: { profile: ContactProfileDTO }) {
  const tone = scoreTone(profile.score);
  const offset = RING_CIRCUMFERENCE * (1 - Math.min(100, profile.score) / 100);

  return (
    <section className="rounded-2xl border border-border bg-background p-4 md:p-6">
      <h3 className="text-base font-semibold">Score del embudo</h3>
      <div className="mt-3 flex items-start gap-5">
        <div className="relative shrink-0" role="img" aria-label={`Score ${profile.score} de 100`}>
          <svg width="84" height="84" viewBox="0 0 84 84" className="-rotate-90">
            <circle
              cx="42" cy="42" r={RING_RADIUS}
              className="fill-none stroke-muted"
              strokeWidth="7"
            />
            <circle
              cx="42" cy="42" r={RING_RADIUS}
              className={cn("fill-none transition-[stroke-dashoffset] duration-500", tone.stroke)}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={offset}
            />
          </svg>
          <span
            className={cn(
              "absolute inset-0 flex items-center justify-center text-xl font-semibold tabular-nums",
              tone.text,
            )}
          >
            {profile.score}
          </span>
        </div>

        <ol className="min-w-0 flex-1">
          {SCORE_MILESTONES.map((milestone, index) => {
            const entry = milestoneEntry(profile, milestone.key);
            const reached = entry !== undefined;
            const evidence = milestoneEvidenceLabel(entry);
            const isLast = index === SCORE_MILESTONES.length - 1;
            return (
              <li key={milestone.key} className="relative flex gap-2.5 pb-3 last:pb-0">
                {!isLast && (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute top-5 left-[9px] h-[calc(100%-1.25rem)] w-px",
                      reached ? "bg-success/50" : "bg-border",
                    )}
                  />
                )}
                <span
                  className={cn(
                    "z-10 flex size-[18px] shrink-0 items-center justify-center rounded-full border mt-0.5",
                    reached
                      ? "border-success bg-success/15 text-success"
                      : "border-border bg-background text-muted-foreground/50",
                  )}
                >
                  {reached ? (
                    <Check className="size-3" aria-hidden />
                  ) : (
                    <span className="size-1.5 rounded-full bg-current" aria-hidden />
                  )}
                </span>
                <div className={cn("min-w-0 flex-1", !reached && "opacity-55")}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className={cn("truncate", reached && "font-medium")}>
                      {milestone.label}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      +{milestone.weight}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {reached && evidence ? evidence : milestone.detail}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
