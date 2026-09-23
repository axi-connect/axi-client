"use client";

import { useCallback, useEffect, useState } from "react";
import { Layers } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Button } from "@/shared/components/ui/button";
import { Modal } from "@/shared/components/ui/modal";
import {
  offsetLabel,
  STOP_REASON_LABELS,
  type SequenceDTO,
} from "@/modules/crm/domain/sequences";
import type { BulkAudience } from "@/modules/crm/infrastructure/services/bulk-service.adapter";
import {
  enrollInSequence,
  listSequences,
} from "@/modules/crm/infrastructure/services/sequences-service.adapter";
import { BULK_SKIP_LABELS, type BulkSkipReason } from "@/modules/crm/domain/bulk-follow-up";

/**
 * Inscribir una audiencia en una secuencia (F4b).
 *
 * Va al lado de «Poner al agente a trabajar» y no dentro: son dos decisiones
 * distintas. Un lote es UN seguimiento a mucha gente; una secuencia son VARIOS
 * a lo largo de días, que se paran solos cuando el cliente contesta. Meterlas
 * en el mismo botón obligaría a explicar la diferencia en un desplegable.
 */
export function EnrollInSequenceButton({
  audience,
  variant = "outline",
}: {
  audience: BulkAudience;
  variant?: "default" | "outline";
}) {
  const { hasPermission } = useAuth();
  const { showAlert } = useAlert();
  const [open, setOpen] = useState(false);
  const [sequences, setSequences] = useState<SequenceDTO[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    listSequences()
      // Un borrador no admite inscripciones: no se ofrece.
      .then((res) => setSequences(res.data.filter((sequence) => sequence.is_active)))
      .catch(() => setSequences([]));
  }, [open]);

  const enroll = useCallback(
    async (sequence: SequenceDTO) => {
      setBusy(true);
      try {
        const result = await enrollInSequence(sequence.id, audience);
        const out = result.skipped.reduce((sum, group) => sum + group.count, 0);
        showAlert({
          tone: "success",
          title:
            result.enrolled === 0
              ? "Nadie entró en la secuencia"
              : `${result.enrolled} ${result.enrolled === 1 ? "inscrito" : "inscritos"} en «${sequence.name}»`,
          description:
            out === 0
              ? undefined
              : result.skipped
                  .map(
                    (group) =>
                      `${String(group.count)} ${BULK_SKIP_LABELS[group.reason as BulkSkipReason] ?? group.reason}`,
                  )
                  .join(" · "),
        });
        setOpen(false);
      } catch (err) {
        showAlert({ tone: "error", title: errorMessage(err, "No se pudo inscribir") });
      } finally {
        setBusy(false);
      }
    },
    [audience, showAlert],
  );

  if (!hasPermission("crm:automate")) return null;

  return (
    <>
      <Button variant={variant} size="sm" onClick={() => setOpen(true)}>
        <Layers aria-hidden className="size-4" />
        Inscribir en una secuencia
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        config={{
          title: "Inscribir en una secuencia",
          description:
            "Varios seguimientos repartidos en días, que se detienen solos cuando el cliente responde.",
          actions: [{ label: "Cancelar", variant: "outline" }],
        }}
      >
        <div className="grid gap-2">
          {sequences === null ? (
            <p className="text-sm text-muted-foreground">Cargando secuencias…</p>
          ) : sequences.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tienes ninguna secuencia activa. Créala en Configuración → Secuencias; un borrador
              no admite inscripciones.
            </p>
          ) : (
            sequences.map((sequence) => (
              <button
                key={sequence.id}
                type="button"
                disabled={busy}
                onClick={() => void enroll(sequence)}
                className="grid gap-1 rounded-xl border border-border p-3 text-left hover:bg-secondary/60 disabled:opacity-60"
              >
                <span className="text-sm font-semibold">{sequence.name}</span>
                <span className="text-xs text-muted-foreground">
                  {sequence.steps.map((step) => offsetLabel(step.offset_hours)).join(" → ")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {sequence.stop_on_reply ? STOP_REASON_LABELS.replied : "No para al responder"}
                  {sequence.stop_on_conversion ? ` · ${STOP_REASON_LABELS.converted}` : ""}
                </span>
              </button>
            ))
          )}
        </div>
      </Modal>
    </>
  );
}
