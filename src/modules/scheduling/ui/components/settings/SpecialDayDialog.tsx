"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { addDaysToKey, instantFromBusiness, type DayKey } from "@/core/lib/business-time";
import { Modal } from "@/shared/components/ui/modal";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import {
  windowIssues,
  type ScheduleExceptionDTO,
  type TimeWindow,
} from "@/modules/scheduling/domain/schedule-exceptions";
import { listAppointments } from "@/modules/scheduling/infrastructure/services/appointments-service.adapter";
import { putScheduleException } from "@/modules/scheduling/infrastructure/services/schedule-calendar-service.adapter";
import { DateField } from "./DateField";
import { TimeField } from "./TimeField";

type Kind = "closed" | "special";

const KIND_ITEMS = [
  { value: "closed", label: "Cerrado" },
  { value: "special", label: "Horario especial" },
] as const;

const DEFAULT_WINDOW: TimeWindow = { opens_at: "10:00", closes_at: "14:00" };
const MAX_WINDOWS = 6;

/**
 * Agregar o editar un día especial (S-05). Un PUT por fecha reemplaza lo que
 * hubiera ese día. Avisa si ya hay citas ese día: no se cancelan solas.
 */
export function SpecialDayDialog({
  open,
  onOpenChange,
  editing,
  preset,
  todayKey,
  timezone,
  holidays,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** El día especial que se edita (su fecha no cambia), o null para uno nuevo. */
  editing: ScheduleExceptionDTO | null;
  /** Abrir un festivo: la fecha y el tipo ya elegidos. */
  preset: { date: DayKey; kind: Kind } | null;
  todayKey: DayKey;
  timezone: string;
  holidays: ReadonlySet<DayKey>;
  onSaved: (items: ScheduleExceptionDTO[], date: DayKey) => void;
}) {
  const [date, setDate] = useState<DayKey | "">("");
  const [kind, setKind] = useState<Kind>("closed");
  const [windows, setWindows] = useState<TimeWindow[]>([DEFAULT_WINDOW]);
  const [note, setNote] = useState("");
  const [booked, setBooked] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing !== null) {
      setDate(editing.date);
      setKind(editing.closed ? "closed" : "special");
      setWindows(editing.windows.length > 0 ? editing.windows : [DEFAULT_WINDOW]);
      setNote(editing.note ?? "");
    } else {
      setDate(preset?.date ?? "");
      setKind(preset?.kind ?? "closed");
      setWindows([DEFAULT_WINDOW]);
      setNote("");
    }
  }, [open, editing, preset]);

  // Las citas que ya hay ese día (no se cancelan: el aviso es para el equipo)
  useEffect(() => {
    if (!open || date === "") {
      setBooked(null);
      return;
    }
    let alive = true;
    listAppointments({
      from: instantFromBusiness(date, "00:00", timezone),
      to: instantFromBusiness(addDaysToKey(date, 1), "00:00", timezone),
    })
      .then((items) => {
        if (alive) {
          setBooked(
            items.filter((item) => item.status === "scheduled" || item.status === "confirmed").length,
          );
        }
      })
      .catch(() => {
        if (alive) setBooked(null);
      });
    return () => {
      alive = false;
    };
  }, [open, date, timezone]);

  const issues = useMemo(
    () => (kind === "special" ? windowIssues(windows) : []),
    [kind, windows],
  );
  const canSave = date !== "" && issues.length === 0 && !saving;

  const save = async () => {
    if (!canSave || date === "") return;
    setSaving(true);
    setError(null);
    try {
      const items = await putScheduleException(date, {
        closed: kind === "closed",
        windows: kind === "closed" ? [] : windows,
        note: note.trim() === "" ? null : note.trim(),
      });
      onSaved(items, date);
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err, "No se pudo guardar el día especial"));
    } finally {
      setSaving(false);
    }
  };

  const setWindow = (index: number, patch: Partial<TimeWindow>) =>
    setWindows((current) =>
      current.map((window, at) => (at === index ? { ...window, ...patch } : window)),
    );

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      config={{
        title: editing === null ? "Agregar día especial" : "Editar día especial",
        description: "Reemplaza el horario de esa fecha. Las citas ya agendadas ese día no se mueven.",
        className: "sm:max-w-md",
        actions: [
          { label: "Cancelar", variant: "outline" },
          {
            label: saving ? "Guardando…" : "Guardar día",
            onClick: () => void save(),
            disabled: !canSave,
            keepOpen: true,
          },
        ],
        body: (
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <span className="text-sm font-medium">Fecha</span>
              <DateField
                value={date}
                onChange={setDate}
                todayKey={todayKey}
                holidays={holidays}
                label="Fecha"
                disabled={editing !== null}
              />
            </div>

            <SegmentedControl
              value={kind}
              onValueChange={setKind}
              items={KIND_ITEMS}
              label="Tipo de día"
              className="w-full"
            />

            {kind === "special" && (
              <div className="grid gap-2">
                {windows.map((window, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <TimeField
                        value={window.opens_at}
                        onChange={(next) => setWindow(index, { opens_at: next })}
                        label="Abre"
                      />
                    </div>
                    <span aria-hidden className="text-muted-foreground">
                      –
                    </span>
                    <div className="min-w-0 flex-1">
                      <TimeField
                        value={window.closes_at}
                        onChange={(next) => setWindow(index, { closes_at: next })}
                        label="Cierra"
                      />
                    </div>
                    {windows.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Quitar franja"
                        onClick={() => setWindows((current) => current.filter((_, at) => at !== index))}
                      >
                        <Trash2 aria-hidden className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {windows.length < MAX_WINDOWS && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="justify-self-start"
                    onClick={() =>
                      setWindows((current) => [...current, { opens_at: "15:00", closes_at: "17:00" }])
                    }
                  >
                    <Plus aria-hidden className="size-3.5" /> Otra franja
                  </Button>
                )}
                {issues.length > 0 && (
                  <p className="text-xs text-destructive">{issues.join(" · ")}</p>
                )}
              </div>
            )}

            <div className="grid gap-1.5">
              <label htmlFor="special-day-note" className="text-sm font-medium">
                Nota (opcional)
              </label>
              <Input
                id="special-day-note"
                maxLength={120}
                value={note}
                placeholder="Ej.: Inventario anual"
                onChange={(event) => setNote(event.target.value)}
              />
              <span className="text-xs text-muted-foreground">Solo la ve tu equipo.</span>
            </div>

            {booked !== null && booked > 0 && (
              <p className="text-xs text-warning">
                Ya {booked === 1 ? "hay 1 cita agendada" : `hay ${booked} citas agendadas`} ese día:{" "}
                no se cancelan; avísale a esos clientes si cierras o cambias el horario.
              </p>
            )}
            {error !== null && <p className="text-sm text-destructive">{error}</p>}
          </div>
        ),
      }}
    />
  );
}
