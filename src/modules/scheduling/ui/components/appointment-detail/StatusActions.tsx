"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  allowedTransitions,
  type AppointmentAction,
  type AppointmentDTO,
} from "@/modules/scheduling/domain/appointment";
import {
  cancelAppointment,
  updateAppointment,
} from "@/modules/scheduling/infrastructure/services/appointments-service.adapter";

const CANCEL_REASON_MAX = 300;

/**
 * Acciones de transición del detalle de cita (política de la UI:
 * `allowedTransitions`). Cancelar se confirma INLINE dentro del sheet —
 * un Modal encima del DetailSheet quedaría debajo (overlay z-50 vs sheet
 * z-60, ver DESIGN-SYSTEM §4.4) — y va por `POST /:id/cancel`, nunca por
 * PATCH de status. Reagendar navega al @form con `?reschedule=<id>`.
 */
export function StatusActions({
  appointment,
  onUpdated,
}: {
  appointment: AppointmentDTO;
  onUpdated: (fresh: AppointmentDTO) => void;
}) {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [busy, setBusy] = useState<AppointmentAction | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");

  const hasStarted = Date.now() >= new Date(appointment.starts_at).getTime();
  const actions = allowedTransitions(appointment.status, hasStarted);
  if (actions.length === 0) return null;

  const patchStatus = async (
    action: AppointmentAction,
    status: "confirmed" | "completed" | "no_show",
    successTitle: string,
  ) => {
    if (busy !== null) return;
    setBusy(action);
    try {
      const fresh = await updateAppointment(appointment.id, { status });
      onUpdated(fresh);
      showAlert({ tone: "success", title: successTitle, open: true });
    } catch (err) {
      showAlert({
        tone: "error",
        title: errorMessage(err, "No se pudo actualizar la cita"),
        open: true,
      });
    } finally {
      setBusy(null);
    }
  };

  const submitCancel = async () => {
    if (busy !== null) return;
    setBusy("cancel");
    try {
      const trimmed = reason.trim();
      const fresh = await cancelAppointment(
        appointment.id,
        trimmed === "" ? {} : { reason: trimmed.slice(0, CANCEL_REASON_MAX) },
      );
      onUpdated(fresh);
      setCancelOpen(false);
      showAlert({ tone: "success", title: "Cita cancelada", open: true });
    } catch (err) {
      showAlert({
        tone: "error",
        title: errorMessage(err, "No se pudo cancelar la cita"),
        open: true,
      });
    } finally {
      setBusy(null);
    }
  };

  if (cancelOpen) {
    return (
      <div className="w-full space-y-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3">
        <p className="text-sm font-medium text-destructive">Cancelar esta cita</p>
        <p className="text-xs text-muted-foreground">
          El contacto no recibirá los recordatorios pendientes.
        </p>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={CANCEL_REASON_MAX}
          rows={2}
          placeholder="Motivo (opcional)"
          aria-label="Motivo de la cancelación"
        />
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={busy !== null}
            onClick={() => setCancelOpen(false)}
          >
            Volver
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={busy !== null}
            onClick={() => void submitCancel()}
          >
            {busy === "cancel" && (
              <LoaderCircle aria-hidden className="size-3.5 animate-spin" />
            )}
            Cancelar cita
          </Button>
        </div>
      </div>
    );
  }

  const spinner = (action: AppointmentAction) =>
    busy === action ? <LoaderCircle aria-hidden className="size-3.5 animate-spin" /> : null;

  return (
    <div className="flex w-full flex-wrap gap-2">
      {actions.includes("confirm") && (
        <Button
          size="sm"
          disabled={busy !== null}
          onClick={() => void patchStatus("confirm", "confirmed", "Cita confirmada")}
        >
          {spinner("confirm")}
          Confirmar
        </Button>
      )}
      {actions.includes("complete") && (
        <Button
          variant="outline"
          size="sm"
          disabled={busy !== null}
          onClick={() => void patchStatus("complete", "completed", "Cita completada")}
        >
          {spinner("complete")}
          Completar
        </Button>
      )}
      {actions.includes("no_show") && (
        <Button
          variant="outline"
          size="sm"
          disabled={busy !== null}
          onClick={() => void patchStatus("no_show", "no_show", "Marcada como no asistió")}
        >
          {spinner("no_show")}
          No asistió
        </Button>
      )}
      {actions.includes("reschedule") && (
        <Button
          variant="outline"
          size="sm"
          disabled={busy !== null}
          onClick={() =>
            router.push(`/scheduling/calendar/create?reschedule=${appointment.id}`)
          }
        >
          Reagendar
        </Button>
      )}
      {actions.includes("cancel") && (
        <Button
          variant="outline"
          size="sm"
          disabled={busy !== null}
          className="ml-auto border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setCancelOpen(true)}
        >
          Cancelar cita
        </Button>
      )}
    </div>
  );
}
