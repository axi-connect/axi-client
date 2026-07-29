"use client";

import { Check, Minus } from "lucide-react";
import { cn } from "@/core/lib/utils";
import {
  isSignalActive,
  SCORE_SIGNALS,
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
 * Score 0-100 con anillo + breakdown de señales (pesos default del backend,
 * D12: determinista y explicable). Señal activa = ✓ con su peso; inactiva
 * queda atenuada — el operador ve exactamente de dónde sale el número.
 */
export function ScorePanel({ profile }: { profile: ContactProfileDTO }) {
  const tone = scoreTone(profile.score);
  const offset = RING_CIRCUMFERENCE * (1 - Math.min(100, profile.score) / 100);

  return (
    <section className="rounded-2xl border border-border bg-background p-4 md:p-6">
      <h3 className="text-base font-semibold">Score</h3>
      <div className="mt-3 flex items-center gap-5">
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

        <ul className="min-w-0 flex-1 space-y-1.5">
          {SCORE_SIGNALS.map((signal) => {
            const active = isSignalActive(profile, signal.key);
            return (
              <li
                key={signal.key}
                className={cn(
                  "flex items-center justify-between gap-2 text-sm",
                  active ? "text-foreground" : "text-muted-foreground/60",
                )}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  {active ? (
                    <Check className="size-3.5 shrink-0 text-success" aria-hidden />
                  ) : (
                    <Minus className="size-3.5 shrink-0" aria-hidden />
                  )}
                  <span className="truncate">{signal.label}</span>
                </span>
                <span className="shrink-0 text-xs tabular-nums">+{signal.weight}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
