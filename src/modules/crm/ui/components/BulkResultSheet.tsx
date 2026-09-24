"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Info, LoaderCircle, Trash2, TriangleAlert } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import { StatusBadge } from "@/shared/components/features/status-badge";
import { Button } from "@/shared/components/ui/button";
import {
  BULK_SKIP_HINTS,
  BULK_SKIP_LABELS,
  type BulkDTO,
} from "@/modules/crm/domain/bulk-follow-up";
import { cancelBulk, getBulk } from "@/modules/crm/infrastructure/services/bulk-service.adapter";

/** Cada cuánto se relee el lote mientras se materializa. Mismo criterio que
 *  `ImportsManager`: sondeo corto y explícito, sin evento nuevo por WebSocket. */
const POLL_MS = 2000;

const STATUS_MAP = {
  pending: { label: "En cola", tone: "info" as const },
  running: { label: "Programando…", tone: "info" as const },
  completed: { label: "Programado", tone: "success" as const },
  cancelled: { label: "Cancelado", tone: "neutral" as const },
  failed: { label: "Falló", tone: "destructive" as const },
};

/**
 * Qué pasó con el lote (F4a).
 *
 * Se abre en cuanto se confirma y se queda sondeando hasta que el motor
 * termina de materializar: un lote de 268 no es instantáneo, y dejar al
 * operador con un toast y nada más es lo que convierte una acción masiva en un
 * acto de fe.
 */
export function BulkResultSheet({
  bulk: initial,
  onOpenChange,
}: {
  /** `null` = cerrado. */
  bulk: BulkDTO | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { showAlert } = useAlert();
  const [bulk, setBulk] = useState<BulkDTO | null>(initial);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => setBulk(initial), [initial]);

  const bulkId = initial?.id ?? null;
  const live = bulk !== null && (bulk.status === "pending" || bulk.status === "running");

  useEffect(() => {
    if (bulkId === null || !live) return;
    const timer = setInterval(() => {
      getBulk(bulkId)
        .then(setBulk)
        .catch(() => undefined);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [bulkId, live]);

  const onCancel = useCallback(async () => {
    if (bulk === null) return;
    setCancelling(true);
    try {
      const { cancelled_tasks: cancelled } = await cancelBulk(bulk.id);
      showAlert({
        tone: "success",
        title:
          cancelled === 0
            ? "El lote quedó cancelado; no quedaba ninguna tarea por salir"
            : `${cancelled} ${cancelled === 1 ? "tarea anulada" : "tareas anuladas"}`,
      });
      setBulk(await getBulk(bulk.id));
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err, "No se pudo cancelar el lote") });
    } finally {
      setCancelling(false);
    }
  }, [bulk, showAlert]);

  const canCancel = bulk !== null && bulk.status !== "cancelled" && bulk.status !== "failed";

  return (
    <DetailSheet
      open={bulk !== null}
      onOpenChange={onOpenChange}
      title="Seguimiento en lote"
      subtitle={bulk === null ? undefined : bulk.objective}
      size={460}
    >
      {bulk !== null && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={bulk.status} map={STATUS_MAP} appearance="dot" />
            {live && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <LoaderCircle aria-hidden className="size-3 animate-spin" />
                {bulk.created_count + bulk.skipped_count} de {bulk.total_count}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Tile value={bulk.created_count} label="programadas" tone="ok" />
            <Tile value={bulk.skipped_count} label="no entraron" />
          </div>

          <p className="text-xs text-muted-foreground">
            Empiezan el{" "}
            <strong className="font-medium text-foreground">
              {new Date(bulk.starts_at).toLocaleString("es-CO", {
                weekday: "long",
                day: "numeric",
                month: "short",
                hour: "numeric",
                minute: "2-digit",
              })}
            </strong>{" "}
            y se reparten a {bulk.per_hour} por hora; la última sale el{" "}
            <strong className="font-medium text-foreground">
              {new Date(bulk.finishes_at).toLocaleString("es-CO", {
                weekday: "long",
                day: "numeric",
                month: "short",
                hour: "numeric",
                minute: "2-digit",
              })}
            </strong>
            .
          </p>

          {bulk.skipped.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-border">
              <h4 className="border-b border-border bg-secondary/70 px-3 py-2 text-xs font-semibold">
                Los que no entraron
              </h4>
              <ul className="divide-y divide-border">
                {bulk.skipped.map((group) => (
                  <li key={group.reason} className="px-3 py-2 text-xs">
                    <div className="flex items-baseline gap-2">
                      <strong className="tabular-nums">{group.count}</strong>
                      <span>{BULK_SKIP_LABELS[group.reason]}</span>
                    </div>
                    {BULK_SKIP_HINTS[group.reason] !== null && (
                      <p className="mt-0.5 text-muted-foreground">{BULK_SKIP_HINTS[group.reason]}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {bulk.detail !== null && (
            <p className="flex items-start gap-2 text-xs text-destructive">
              <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              {bulk.detail}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/crm/tasks">
                <CalendarDays aria-hidden className="size-4" />
                Ver en Programados
              </Link>
            </Button>
            {canCancel && (
              <Button
                variant="outline"
                size="sm"
                disabled={cancelling}
                onClick={() => void onCancel()}
                className="border-destructive/45 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 aria-hidden className="size-4" />
                Cancelar el lote
              </Button>
            )}
          </div>

          <p className="flex items-start gap-2 rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground">
            <Info aria-hidden className="mt-0.5 size-3.5 shrink-0 text-info" />
            <span>
              Esto es una foto de ahora. Cada tarea vuelve a comprobar la baja, el horario y el cupo
              justo antes de ejecutarse. <strong>Cancelar</strong> anula las que queden: lo que ya
              salió no se recoge.
            </span>
          </p>
        </div>
      )}
    </DetailSheet>
  );
}

function Tile({ value, label, tone }: { value: number; label: string; tone?: "ok" }) {
  return (
    <div
      className={
        tone === "ok"
          ? "grid gap-0.5 rounded-xl border border-success/35 px-3 py-2.5"
          : "grid gap-0.5 rounded-xl border border-border px-3 py-2.5"
      }
    >
      <strong className={tone === "ok" ? "text-2xl font-semibold text-success" : "text-2xl font-semibold"}>
        {value}
      </strong>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
