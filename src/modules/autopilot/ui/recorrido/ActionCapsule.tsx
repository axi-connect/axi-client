"use client";

import { useState } from "react";
import Link from "next/link";
import { Pause, Pencil, Play, Zap } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";

import type { RunStatus } from "../../domain/autopilot";
import { pauseRoutine, resumeRoutine, runRoutineNow } from "../../infrastructure/autopilot-service.adapter";

export interface ActionCapsuleProps {
  routine: { id: string; status: "active" | "paused" | "archived" };
  /** El estado de la última salida: en ruta o esperando, «Salir ahora» no se puede. */
  lastRun: RunStatus | null;
  /** Con «Editar» (en vivo y la ficha); la tarjeta de la lista no lo lleva. */
  withEdit?: boolean;
  /** Tras pausar, reanudar o salir: quien la monta relee la ruta (el estado de la ruta no se queda viejo). */
  onChanged: () => void;
  className?: string;
}

/**
 * La cápsula de acciones de una ruta (Rutas de captación): Pausar ↔ Reanudar ·
 * Salir ahora · Editar, como botones `ghost` en una píldora con borde y
 * `shadow-float`, separados por un filo. «Salir ahora» dice por qué no se puede
 * (el servidor respondería 409 con un lote esperando).
 */
export function ActionCapsule({ routine, lastRun, withEdit = true, onChanged, className }: ActionCapsuleProps) {
  const { showAlert } = useAlert();
  const [busy, setBusy] = useState(false);
  const paused = routine.status === "paused";
  const live = lastRun === "running" || lastRun === "queued";
  const waiting = lastRun === "awaiting_approval";
  const blockedWhy = waiting
    ? "Aprueba primero el lote que espera"
    : live
      ? "Ya va en ruta"
      : paused
        ? "Reanuda la ruta primero"
        : undefined;

  async function act(action: "pause" | "resume" | "run") {
    setBusy(true);
    try {
      if (action === "pause") await pauseRoutine(routine.id);
      else if (action === "resume") await resumeRoutine(routine.id);
      else await runRoutineNow(routine.id);
      showAlert({
        tone: "success",
        title: action === "pause" ? "Ruta pausada" : action === "resume" ? "Ruta reanudada" : "Sale en un momento",
      });
      onChanged();
    } catch (caught) {
      showAlert({ tone: "error", title: "No se pudo", description: errorMessage(caught) });
    } finally {
      setBusy(false);
    }
  }

  const item = "h-8 rounded-full px-3 text-[13px]";
  return (
    <div
      role="group"
      aria-label="Acciones de la ruta"
      className={cn(
        "border-border bg-background inline-flex h-10 max-w-full shrink-0 items-center rounded-full border px-1 shadow-[var(--shadow-float)]",
        className,
      )}
    >
      {paused ? (
        <Button variant="ghost" size="sm" className={item} disabled={busy} onClick={() => void act("resume")}>
          <Play aria-hidden className="size-3.5" />
          Reanudar
        </Button>
      ) : (
        <Button variant="ghost" size="sm" className={item} disabled={busy} onClick={() => void act("pause")}>
          <Pause aria-hidden className="size-3.5" />
          Pausar
        </Button>
      )}
      <span aria-hidden className="bg-border h-[18px] w-px shrink-0" />
      <Button
        variant="ghost"
        size="sm"
        className={item}
        disabled={busy || blockedWhy !== undefined}
        title={blockedWhy}
        onClick={() => void act("run")}
      >
        <Zap aria-hidden className="size-3.5" />
        Salir ahora
      </Button>
      {withEdit && (
        <>
          <span aria-hidden className="bg-border h-[18px] w-px shrink-0" />
          <Button asChild variant="ghost" size="sm" className={item}>
            <Link href={`/marketing/autopilot/${routine.id}/edit`}>
              <Pencil aria-hidden className="size-3.5" />
              Editar
            </Link>
          </Button>
        </>
      )}
    </div>
  );
}
