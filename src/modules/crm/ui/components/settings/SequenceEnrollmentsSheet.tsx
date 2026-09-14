"use client";

import { useCallback, useEffect, useState } from "react";
import { Info } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { relativeTime } from "@/core/lib/relative-time";
import { cn } from "@/core/lib/utils";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import { EmptyState } from "@/shared/components/features/empty-state";
import { StatusBadge } from "@/shared/components/features/status-badge";
import { TableSkeleton } from "@/shared/components/features/loading";
import {
  ENROLLMENT_STATUS_MAP,
  STOP_REASON_LABELS,
  type EnrollmentDTO,
  type SequenceDTO,
} from "@/modules/crm/domain/sequences";
import { listEnrollments } from "@/modules/crm/infrastructure/services/sequences-service.adapter";

const PAGE_SIZE = 50;

/**
 * Quién va por dónde, y por qué se paró (F4b).
 *
 * La columna que de verdad importa no es el progreso: es el MOTIVO. «Parada
 * porque respondió» es un éxito y «completada sin respuesta» es la señal de
 * que el objetivo del primer paso no interesaba a nadie — y esas dos se leen
 * igual en un contador que solo diga «terminada».
 */
export function SequenceEnrollmentsSheet({
  sequence,
  onOpenChange,
}: {
  /** `null` = cerrado. */
  sequence: SequenceDTO | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [enrollments, setEnrollments] = useState<EnrollmentDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sequenceId = sequence?.id ?? null;

  const load = useCallback(async () => {
    if (sequenceId === null) return;
    try {
      const res = await listEnrollments(sequenceId, { page: 1, page_size: PAGE_SIZE });
      setEnrollments(res.data);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "No se pudieron cargar los inscritos"));
    }
  }, [sequenceId]);

  useEffect(() => {
    setEnrollments(null);
    setError(null);
    void load();
  }, [load]);

  const total = sequence?.steps.length ?? 0;
  const counts = summarize(enrollments ?? []);

  return (
    <DetailSheet
      open={sequence !== null}
      onOpenChange={onOpenChange}
      title="Inscritos"
      subtitle={sequence?.name ?? undefined}
      size={460}
    >
      <div className="space-y-4">
        {enrollments !== null && enrollments.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <Chip>{counts.active} activas</Chip>
            <Chip>{counts.replied} pararon porque respondieron</Chip>
            <Chip>{counts.converted} pararon porque compraron</Chip>
            <Chip>{counts.completed} completadas sin respuesta</Chip>
          </div>
        )}

        {error !== null ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : enrollments === null ? (
          <TableSkeleton rows={4} showHeader={false} />
        ) : enrollments.length === 0 ? (
          <EmptyState
            glyph="ai"
            variant="solid"
            title="Nadie inscrito todavía"
            description="Inscribe contactos desde un segmento, un import o la lista de contactos."
          />
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {enrollments.map((enrollment) => (
              <li key={enrollment.id} className="grid gap-1 px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Progress current={enrollment.current_position} total={total} />
                  <span className="text-xs text-muted-foreground">
                    Paso {enrollment.current_position} de {total}
                  </span>
                  <span className="ml-auto">
                    <StatusBadge
                      status={enrollment.status}
                      map={ENROLLMENT_STATUS_MAP}
                      appearance="dot"
                    />
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Inscrito {relativeTime(enrollment.enrolled_at)}
                  {enrollment.stop_reason !== null && (
                    <> · {STOP_REASON_LABELS[enrollment.stop_reason]}</>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}

        <p className="flex gap-2.5 rounded-xl border border-border px-3 py-2.5 text-xs text-muted-foreground">
          <Info aria-hidden className="mt-0.5 size-3.5 shrink-0 text-info" />
          <span>
            <strong className="font-medium text-foreground">Parada</strong> no es un fallo: es la
            secuencia haciendo lo que prometió. Lo que hay que vigilar es «completada sin respuesta»
            — tres intentos y silencio suele querer decir que el objetivo del primer paso no era
            interesante.
          </span>
        </p>
      </div>
    </DetailSheet>
  );
}

function summarize(enrollments: readonly EnrollmentDTO[]) {
  return {
    active: enrollments.filter((item) => item.status === "active").length,
    replied: enrollments.filter((item) => item.stop_reason === "replied").length,
    converted: enrollments.filter((item) => item.stop_reason === "converted").length,
    completed: enrollments.filter((item) => item.status === "completed").length,
  };
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-6 items-center rounded-full border border-border px-2.5 text-xs tabular-nums text-muted-foreground">
      {children}
    </span>
  );
}

function Progress({ current, total }: { current: number; total: number }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`Paso ${current} de ${total}`}>
      {Array.from({ length: total }, (_, index) => (
        <i
          key={index}
          aria-hidden
          className={cn(
            "block size-1.5 rounded-full",
            index < current ? "bg-accent-violet" : "bg-border",
          )}
        />
      ))}
    </span>
  );
}
