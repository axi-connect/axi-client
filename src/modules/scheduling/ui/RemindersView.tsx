"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BellRing, RotateCcw, Sparkles } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Modal } from "@/shared/components/ui/modal";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { Switch } from "@/shared/components/ui/switch";
import { ContactPicker } from "@/modules/crm/public";
import {
  businessDayKey,
  fmtDayMonth,
  fmtTime,
} from "@/modules/scheduling/domain/business-time";
import { describeRrule } from "@/modules/scheduling/domain/recurrence";
import {
  isAutomaticReminder,
  REMINDER_STATE_BADGE_CLASSES,
  REMINDER_STATE_LABELS,
  reminderState,
  type ReminderDTO,
} from "@/modules/scheduling/domain/reminder";
import { useCompanySchedule } from "@/modules/scheduling/infrastructure/hooks/use-company-schedule";
import { GlassGlyph } from "@/shared/components/ui/glyphs";
import {
  deleteReminder,
  updateReminder,
} from "@/modules/scheduling/infrastructure/services/reminders-service.adapter";
import {
  useRemindersStore,
  visibleReminderIds,
  type ReminderStateFilter,
} from "@/modules/scheduling/infrastructure/stores/reminders.store";
import { ReminderForm, REMINDER_FORM_ID, type ReminderFormMode } from "./forms/ReminderForm";

const STATE_FILTER_OPTIONS: Array<{ value: ReminderStateFilter; label: string }> = [
  { value: "active", label: "Activos" },
  { value: "sent", label: "Enviados" },
  { value: "all", label: "Todos" },
];

function scheduleLabel(reminder: ReminderDTO): string {
  if (reminder.schedule_rrule === null) return "Una vez";
  return describeRrule(reminder.schedule_rrule) ?? reminder.schedule_rrule;
}

/** Vista Recordatorios: filtros + tabla + diálogos de crear/editar/borrar. */
export function RemindersView() {
  const { hasPermission } = useAuth();
  const { showAlert } = useAlert();
  const { timezone } = useCompanySchedule();
  const canManage = hasPermission("scheduling:manage");

  const remindersById = useRemindersStore((s) => s.remindersById);
  const ids = useRemindersStore((s) => s.ids);
  const loading = useRemindersStore((s) => s.loading);
  const error = useRemindersStore((s) => s.error);
  const stateFilter = useRemindersStore((s) => s.stateFilter);
  const contactFilter = useRemindersStore((s) => s.contactFilter);
  const contactNames = useRemindersStore((s) => s.contactNames);
  const channelsById = useRemindersStore((s) => s.channelsById);
  const fetch = useRemindersStore((s) => s.fetch);
  const setStateFilter = useRemindersStore((s) => s.setStateFilter);
  const setContactFilter = useRemindersStore((s) => s.setContactFilter);
  const upsertReminder = useRemindersStore((s) => s.upsertReminder);
  const removeReminder = useRemindersStore((s) => s.removeReminder);

  const [formMode, setFormMode] = useState<ReminderFormMode | null>(null);
  const [deleting, setDeleting] = useState<ReminderDTO | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const visible = useMemo(
    () => visibleReminderIds(ids, remindersById, stateFilter),
    [ids, remindersById, stateFilter],
  );

  const channels = useMemo(() => Object.values(channelsById), [channelsById]);

  const contactLabel = (reminder: ReminderDTO): string =>
    reminder.contact_id !== null
      ? (contactNames[reminder.contact_id] ?? "Contacto")
      : "Contacto";

  const togglePaused = async (reminder: ReminderDTO) => {
    if (togglingId !== null) return;
    setTogglingId(reminder.id);
    try {
      const fresh = await updateReminder(reminder.id, { is_active: !reminder.is_active });
      upsertReminder(fresh);
      showAlert({
        tone: "success",
        title: fresh.is_active ? "Recordatorio activado" : "Recordatorio pausado",
        open: true,
      });
    } catch (err) {
      showAlert({
        tone: "error",
        title: errorMessage(err, "No se pudo actualizar el recordatorio"),
        open: true,
      });
    } finally {
      setTogglingId(null);
    }
  };

  const confirmDelete = async () => {
    if (deleting === null) return;
    const target = deleting;
    try {
      await deleteReminder(target.id);
      removeReminder(target.id);
      setDeleting(null);
      showAlert({ tone: "success", title: "Recordatorio eliminado", open: true });
    } catch (err) {
      showAlert({
        tone: "error",
        title: errorMessage(err, "No se pudo eliminar el recordatorio"),
        open: true,
      });
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4 md:gap-4 md:p-6">
      {/* Toolbar de filtros */}
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        <SegmentedControl
          value={stateFilter}
          onValueChange={setStateFilter}
          label="Filtro de estado"
          size="sm"
          items={STATE_FILTER_OPTIONS}
        />
        <div className="w-64">
          <ContactPicker value={contactFilter} onChange={setContactFilter} />
        </div>
        {contactFilter !== null && (
          <Button variant="ghost" size="sm" onClick={() => setContactFilter(null)}>
            Limpiar
          </Button>
        )}
        <span className="ml-auto" />
        {canManage && (
          <Button size="sm" onClick={() => setFormMode({ kind: "create" })}>
            <BellRing aria-hidden className="size-4" />
            Nuevo recordatorio
          </Button>
        )}
      </div>

      {error !== null && (
        <div className="flex items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-2.5 text-sm">
          <span className="min-w-0 flex-1">{error}</span>
          <Button variant="outline" size="sm" onClick={() => void fetch()}>
            <RotateCcw aria-hidden className="size-3.5" /> Reintentar
          </Button>
        </div>
      )}

      {/* Tabla */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card">
        {loading && ids.length === 0 ? (
          <div className="space-y-2 p-4" role="status" aria-label="Cargando recordatorios">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
            <GlassGlyph kind="time" tier="sm" />
            <p className="text-sm font-medium">Sin recordatorios</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Los automáticos aparecen solos al agendar citas; los manuales los creas tú para
              cualquier contacto.
            </p>
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5">Contacto</th>
                  <th className="px-4 py-2.5">Mensaje</th>
                  <th className="hidden px-4 py-2.5 lg:table-cell">Canal</th>
                  <th className="hidden px-4 py-2.5 md:table-cell">Recurrencia</th>
                  <th className="px-4 py-2.5">Próximo envío</th>
                  <th className="px-4 py-2.5">Estado</th>
                  <th className="hidden px-4 py-2.5 md:table-cell">Origen</th>
                  {canManage && <th className="px-4 py-2.5 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {visible.map((id) => {
                  const reminder = remindersById[id];
                  if (reminder === undefined) return null;
                  const state = reminderState(reminder);
                  const automatic = isAutomaticReminder(reminder);
                  const tz = timezone ?? reminder.timezone;
                  return (
                    <tr
                      key={reminder.id}
                      className="border-b border-border transition-colors hover:bg-accent/40"
                    >
                      <td className="px-4 py-2.5 font-medium">{contactLabel(reminder)}</td>
                      <td className="max-w-56 truncate px-4 py-2.5 text-muted-foreground">
                        {reminder.message}
                      </td>
                      <td className="hidden px-4 py-2.5 lg:table-cell">
                        {channelsById[reminder.channel_id]?.name ?? "Canal"}
                      </td>
                      <td className="hidden max-w-52 truncate px-4 py-2.5 text-muted-foreground md:table-cell">
                        {scheduleLabel(reminder)}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">
                        {reminder.next_run_at !== null && reminder.is_active
                          ? `${fmtDayMonth(businessDayKey(reminder.next_run_at, tz))}, ${fmtTime(reminder.next_run_at, tz)}`
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge className={REMINDER_STATE_BADGE_CLASSES[state]}>
                          {state === "sent" && reminder.last_run_at !== null
                            ? `Enviado · ${fmtDayMonth(businessDayKey(reminder.last_run_at, tz))}`
                            : REMINDER_STATE_LABELS[state]}
                        </Badge>
                      </td>
                      <td className="hidden px-4 py-2.5 md:table-cell">
                        {automatic ? (
                          <Badge className="border-transparent bg-accent-violet/12 text-accent-violet">
                            <Sparkles aria-hidden className="size-3" /> Automático
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Manual</Badge>
                        )}
                      </td>
                      {canManage && (
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-end gap-2">
                            {automatic ? (
                              <>
                                {reminder.appointment_id !== null && (
                                  <Link
                                    href={`/scheduling/calendar/appointment/${reminder.appointment_id}`}
                                    className="text-xs font-medium text-brand hover:underline"
                                  >
                                    Ver cita
                                  </Link>
                                )}
                                {state !== "sent" && (
                                  <Switch
                                    checked={reminder.is_active}
                                    disabled={togglingId !== null}
                                    onCheckedChange={() => void togglePaused(reminder)}
                                    aria-label={
                                      reminder.is_active
                                        ? "Pausar recordatorio automático"
                                        : "Activar recordatorio automático"
                                    }
                                  />
                                )}
                              </>
                            ) : (
                              <>
                                {state !== "sent" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2.5 text-xs"
                                    onClick={() =>
                                      setFormMode({
                                        kind: "edit",
                                        reminder,
                                        contactLabel: contactLabel(reminder),
                                      })
                                    }
                                  >
                                    Editar
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2.5 text-xs text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() => setDeleting(reminder)}
                                >
                                  Eliminar
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Los recordatorios <b className="text-accent-violet">automáticos</b> los crea el sistema al
        agendar una cita y su mensaje no es editable. Un envío puede saltarse si el canal está
        caído — la serie continúa; por eso el copy es «programado para», nunca «entregado».
      </p>

      {/* Dialog crear/editar (local: sin slot, no amerita deep-link) */}
      {formMode !== null && timezone !== null && (
        <Modal
          open
          onOpenChange={(next) => {
            if (!next) setFormMode(null);
          }}
          config={{
            title: formMode.kind === "create" ? "Nuevo recordatorio" : "Editar recordatorio",
            description: "Se envía al contacto por el canal elegido, en la zona del negocio.",
            className: "sm:max-w-2xl",
            actions: [
              { label: "Cancelar", variant: "outline", asClose: true, id: "reminder-cancel" },
              {
                label: formMode.kind === "create" ? "Crear recordatorio" : "Guardar cambios",
                variant: "default",
                asClose: false,
                id: "reminder-save",
                onClick: () =>
                  (
                    document.getElementById(REMINDER_FORM_ID) as HTMLFormElement | null
                  )?.requestSubmit(),
              },
            ],
          }}
        >
          <ReminderForm
            mode={formMode}
            channels={channels}
            timezone={timezone}
            onSuccess={(fresh) => {
              upsertReminder(fresh);
              setFormMode(null);
              void fetch();
            }}
          />
        </Modal>
      )}

      {/* Confirmación de borrado (destructivo) */}
      {deleting !== null && (
        <Modal
          open
          onOpenChange={(next) => {
            if (!next) setDeleting(null);
          }}
          config={{
            title: "Eliminar recordatorio",
            description: `Se elimina el recordatorio de ${contactLabel(deleting)} de forma permanente. Esta acción no se puede deshacer.`,
            className: "sm:max-w-md",
            actions: [
              { label: "Volver", variant: "outline", asClose: true, id: "reminder-delete-back" },
              {
                label: "Eliminar",
                variant: "destructive",
                asClose: false,
                id: "reminder-delete-confirm",
                onClick: () => void confirmDelete(),
              },
            ],
          }}
        />
      )}
    </div>
  );
}
