"use client";

import { useState } from "react";
import { LoaderCircle, Pencil } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import type { AppointmentDTO } from "@/modules/scheduling/domain/appointment";
import { updateAppointment } from "@/modules/scheduling/infrastructure/services/appointments-service.adapter";

const NOTES_MAX = 1000;

/**
 * Notas de la cita, editables en el mismo panel (lienzo F2, D2). Guardar es un
 * PATCH de `notes`; vaciarlas manda `null`. Sin `scheduling:manage` son solo
 * lectura.
 */
export function AppointmentNotes({
  appointment,
  canManage,
  onUpdated,
}: {
  appointment: AppointmentDTO;
  canManage: boolean;
  onUpdated: (fresh: AppointmentDTO) => void;
}) {
  const { showAlert } = useAlert();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(appointment.notes ?? "");
  const [saving, setSaving] = useState(false);

  const start = () => {
    setDraft(appointment.notes ?? "");
    setEditing(true);
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const trimmed = draft.trim();
      const fresh = await updateAppointment(appointment.id, { notes: trimmed === "" ? null : trimmed });
      onUpdated(fresh);
      setEditing(false);
      showAlert({ tone: "success", title: "Nota guardada" });
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err, "No se pudo guardar la nota") });
    } finally {
      setSaving(false);
    }
  };

  const hasNotes = appointment.notes !== null && appointment.notes.trim() !== "";
  if (!hasNotes && !canManage) return null;

  return (
    <section aria-label="Notas" className="flex flex-col gap-2">
      <div className="flex min-h-7 items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground/85">Notas</h3>
        {canManage && !editing && (
          <button
            type="button"
            onClick={start}
            className="inline-flex min-h-7 items-center gap-1.5 rounded-full px-1 text-sm font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Pencil aria-hidden className="size-3.5" />
            {hasNotes ? "Editar" : "Agregar"}
          </button>
        )}
      </div>
      {editing ? (
        <>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={NOTES_MAX}
            rows={4}
            autoFocus
            aria-label="Notas de la cita"
            placeholder="Lo que el equipo debe saber de la cita"
            className="rounded-xl"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" className="rounded-full" disabled={saving} onClick={() => setEditing(false)}>
              Descartar
            </Button>
            <Button variant="contrast" className="rounded-full" disabled={saving} onClick={() => void save()}>
              {saving && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
              Guardar nota
            </Button>
          </div>
        </>
      ) : hasNotes ? (
        <p className="rounded-xl border border-border px-3.5 py-3 text-sm leading-relaxed whitespace-pre-line text-foreground/85">
          {appointment.notes}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">Sin notas.</p>
      )}
    </section>
  );
}
