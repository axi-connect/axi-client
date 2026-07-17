"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, RotateCw } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  evaluateConversation,
  reviewEvaluation,
} from "@/modules/analytics/infrastructure/services/analytics-service.adapter";
import type { EvaluationDTO } from "@/modules/analytics/domain/analytics";

/**
 * Acciones de calibración del Sheet (solo `analytics:manage`): slider 0–100
 * con notas (PATCH review) y "Volver a evaluar" (202 asíncrono — el WS
 * `analytics.evaluation_completed` cierra el loop y actualiza el Sheet).
 */
export function EvaluationActions({
  evaluation,
  onCalibrated,
}: {
  evaluation: EvaluationDTO;
  /** Tras guardar: refrescar judge-agreement + lista de evaluaciones. */
  onCalibrated: () => void;
}) {
  const { showAlert } = useAlert();
  const [humanScore, setHumanScore] = useState(
    Math.round(evaluation.human_score ?? evaluation.overall_score ?? 50),
  );
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [reevaluating, setReevaluating] = useState(false);

  // Cambiar de evaluación reinicia el formulario (el Sheet se reutiliza).
  useEffect(() => {
    setHumanScore(Math.round(evaluation.human_score ?? evaluation.overall_score ?? 50));
    setNotes("");
    setReevaluating(false);
  }, [evaluation.id, evaluation.human_score, evaluation.overall_score]);

  const save = async () => {
    setSaving(true);
    try {
      await reviewEvaluation(evaluation.id, {
        human_score: humanScore,
        ...(notes.trim() ? { human_notes: notes.trim() } : {}),
      });
      showAlert({
        tone: "success",
        title: "Calibración guardada",
        description: "Esto mejora al evaluador.",
        open: true,
        autoCloseMs: 3000,
      });
      onCalibrated();
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err), open: true });
    } finally {
      setSaving(false);
    }
  };

  const reevaluate = async () => {
    setReevaluating(true);
    try {
      await evaluateConversation(evaluation.conversation_id);
      // 202: sigue "Evaluando…" hasta que llegue el WS con el resultado.
    } catch (err) {
      setReevaluating(false);
      showAlert({ tone: "error", title: errorMessage(err), open: true });
    }
  };

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">Tu calibración</h3>
      <label className="block text-sm text-muted-foreground" htmlFor="human-score">
        ¿Estás de acuerdo con el puntaje?
      </label>
      <div className="flex items-center gap-3">
        <input
          id="human-score"
          type="range"
          min={0}
          max={100}
          step={1}
          value={humanScore}
          onChange={(event) => setHumanScore(Number(event.target.value))}
          className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
          aria-valuetext={`${humanScore} de 100`}
        />
        <span className="w-10 rounded-md border border-border px-1.5 py-0.5 text-center text-sm font-semibold tabular-nums">
          {humanScore}
        </span>
      </div>
      <Textarea
        placeholder="Notas (opcional)"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        rows={2}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => void save()} disabled={saving || reevaluating}>
          {saving && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
          Guardar calibración
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void reevaluate()}
          disabled={saving || reevaluating}
        >
          {reevaluating ? (
            <>
              <LoaderCircle aria-hidden className="size-4 animate-spin" />
              Evaluando… te avisamos al terminar
            </>
          ) : (
            <>
              <RotateCw aria-hidden className="size-4" />
              Volver a evaluar
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
