"use client";

import { useState } from "react";
import { Check, Clock, LoaderCircle, MoreHorizontal, UserX, XCircle } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
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
 * Acciones del detalle de la cita (lienzo F1). Una sola acción principal en
 * tinta —Confirmar si falta confirmar, si no Completar—, «Reagendar» al lado y
 * el resto en «…» (No asistió, Cancelar la cita). La política de qué se ofrece
 * es `allowedTransitions`.
 *
 * Cancelar se confirma INLINE dentro del panel —un Modal encima del
 * DetailSheet quedaría debajo (overlay z-50 vs panel z-60, DESIGN-SYSTEM
 * §4.4)— y va por `POST /:id/cancel`, nunca por PATCH de status. Reagendar
 * abre los horarios libres del día dentro del mismo panel (`onReschedule`).
 */
export function StatusActions({
  appointment,
  onUpdated,
  onReschedule,
  contactName = null,
}: {
  appointment: AppointmentDTO;
  /** Para decir a quién se le cancela («¿Cancelar la cita de Camila?»). */
  contactName?: string | null;
  onUpdated: (fresh: AppointmentDTO) => void;
  onReschedule: () => void;
}) {
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
      showAlert({ tone: "success", title: successTitle });
    } catch (err) {
      showAlert({
        tone: "error",
        title: errorMessage(err, "No se pudo actualizar la cita"),
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
      showAlert({ tone: "success", title: "Cita cancelada" });
    } catch (err) {
      showAlert({
        tone: "error",
        title: errorMessage(err, "No se pudo cancelar la cita"),
      });
    } finally {
      setBusy(null);
    }
  };

  if (cancelOpen) {
    const firstName = contactName?.trim().split(/\s+/)[0];
    return (
      <div className="flex w-full flex-col gap-3">
        <div className="flex flex-col gap-2.5 rounded-2xl border border-destructive/35 bg-destructive/6 p-3.5">
          <p className="text-sm font-semibold">
            {firstName ? `¿Cancelar la cita de ${firstName}?` : "¿Cancelar esta cita?"}
          </p>
          <p className="text-sm text-foreground/80">
            Axi deja de enviarle los recordatorios. Si quieres, di por qué: queda en la cita.
          </p>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={CANCEL_REASON_MAX}
            rows={2}
            placeholder="Motivo (opcional)"
            aria-label="Motivo de la cancelación"
            className="rounded-xl bg-card"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            className="rounded-full"
            disabled={busy !== null}
            onClick={() => setCancelOpen(false)}
          >
            Volver
          </Button>
          <Button
            variant="destructive"
            className="rounded-full"
            disabled={busy !== null}
            onClick={() => void submitCancel()}
          >
            {busy === "cancel" && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
            Cancelar la cita
          </Button>
        </div>
      </div>
    );
  }

  const spinner = (action: AppointmentAction, Icon: typeof Check) =>
    busy === action ? (
      <LoaderCircle aria-hidden className="size-4 animate-spin" />
    ) : (
      <Icon aria-hidden className="size-4" />
    );

  const primary: "confirm" | "complete" | null = actions.includes("confirm")
    ? "confirm"
    : actions.includes("complete")
      ? "complete"
      : null;
  const menuComplete = primary !== "complete" && actions.includes("complete");
  const menuNoShow = actions.includes("no_show");
  const menuCancel = actions.includes("cancel");

  return (
    <div className="flex w-full items-center gap-2">
      {primary === "confirm" && (
        <Button
          variant="contrast"
          className="rounded-full"
          disabled={busy !== null}
          onClick={() => void patchStatus("confirm", "confirmed", "Cita confirmada")}
        >
          {spinner("confirm", Check)}
          Confirmar
        </Button>
      )}
      {primary === "complete" && (
        <Button
          variant="contrast"
          className="rounded-full"
          disabled={busy !== null}
          onClick={() => void patchStatus("complete", "completed", "Cita completada")}
        >
          {spinner("complete", Check)}
          Completar
        </Button>
      )}
      {actions.includes("reschedule") && (
        <Button variant="outline" className="rounded-full" disabled={busy !== null} onClick={onReschedule}>
          <Clock aria-hidden className="size-4" />
          Reagendar
        </Button>
      )}
      {(menuComplete || menuNoShow || menuCancel) && (
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="size-9 rounded-full"
                disabled={busy !== null}
                aria-label="Más acciones de la cita"
              >
                <MoreHorizontal aria-hidden className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top">
              {menuComplete && (
                <DropdownMenuItem
                  onClick={() => void patchStatus("complete", "completed", "Cita completada")}
                >
                  <span className="flex items-center gap-2">
                    <Check aria-hidden className="size-4" /> Completar
                  </span>
                </DropdownMenuItem>
              )}
              {menuNoShow && (
                <DropdownMenuItem
                  onClick={() => void patchStatus("no_show", "no_show", "Marcada como no asistió")}
                >
                  <span className="flex items-center gap-2">
                    <UserX aria-hidden className="size-4" /> No asistió
                  </span>
                </DropdownMenuItem>
              )}
              {menuCancel && (
                <DropdownMenuItem className="text-destructive" onClick={() => setCancelOpen(true)}>
                  <span className="flex items-center gap-2">
                    <XCircle aria-hidden className="size-4" /> Cancelar la cita
                  </span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
