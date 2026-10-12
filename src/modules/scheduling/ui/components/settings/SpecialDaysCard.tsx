"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, RotateCcw } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import {
  addDaysToKey,
  addMonthsToKey,
  monthMatrix,
  monthOfKey,
  todayKey as businessTodayKey,
  weekdayOfKey,
  type DayKey,
} from "@/core/lib/business-time";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  holidayCountryName,
  holidayNote,
  holidayTitle,
  windowsLabel,
  type ClosureDayDTO,
  type ScheduleExceptionDTO,
} from "@/modules/scheduling/domain/schedule-exceptions";
import {
  deleteScheduleException,
  getClosures,
  listScheduleExceptions,
} from "@/modules/scheduling/infrastructure/services/schedule-calendar-service.adapter";
import { SpecialDayDialog } from "./SpecialDayDialog";

const WEEKDAYS_SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MONTHS_LONG = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const LETTERS = ["lu", "ma", "mi", "ju", "vi", "sá", "do"];
/** El calendario mira 92 días (el máximo de /scheduling/closures). */
const HORIZON_DAYS = 91;
/** Festivos que se listan junto a los días especiales. */
const LISTED_HOLIDAYS = 5;

type Row =
  | { kind: "exception"; date: DayKey; exception: ScheduleExceptionDTO; holiday: boolean }
  | { kind: "holiday"; date: DayKey; closes: boolean };

/**
 * «Días especiales» de la agenda (S-05): cierres por fecha u horarios
 * distintos, y los festivos del país del negocio. Mandan sobre el horario de
 * atención y sobre los festivos, para el panel y para el asistente de IA. Los
 * festivos y el horario efectivo de cada fecha los calcula el servidor
 * (`/scheduling/closures`), con la misma regla que la disponibilidad.
 */
export function SpecialDaysCard({
  timezone,
  canManage,
  reloadKey,
}: {
  timezone: string;
  canManage: boolean;
  /** Cambia cuando se guardan las reglas (el interruptor de festivos). */
  reloadKey: number;
}) {
  const { showAlert } = useAlert();
  const today = useMemo(() => businessTodayKey(new Date(), timezone), [timezone]);
  const [exceptions, setExceptions] = useState<ScheduleExceptionDTO[] | null>(null);
  const [days, setDays] = useState<ClosureDayDTO[]>([]);
  const [country, setCountry] = useState<{ closes: boolean; name: string }>({ closes: false, name: "" });
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState<DayKey>(today);
  const [dialog, setDialog] = useState<{
    open: boolean;
    editing: ScheduleExceptionDTO | null;
    preset: { date: DayKey; kind: "closed" | "special" } | null;
  }>({ open: false, editing: null, preset: null });

  const load = useCallback(async () => {
    setError(null);
    try {
      const [list, closures] = await Promise.all([
        listScheduleExceptions(),
        getClosures({ from: today, to: addDaysToKey(today, HORIZON_DAYS) }),
      ]);
      setExceptions(list);
      setDays(closures.days);
      setCountry({
        closes: closures.closes_on_holidays,
        name: closures.holiday_country_name ?? holidayCountryName(closures.holiday_country),
      });
    } catch (err) {
      setError(errorMessage(err, "No se pudieron cargar los días especiales"));
    }
  }, [today]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  const byDate = useMemo(() => new Map(days.map((day) => [day.date, day])), [days]);
  const holidays = useMemo(
    () => new Set(days.filter((day) => day.is_holiday).map((day) => day.date)),
    [days],
  );

  const rows = useMemo<Row[]>(() => {
    const own = (exceptions ?? []).map<Row>((exception) => ({
      kind: "exception",
      date: exception.date,
      exception,
      holiday: holidays.has(exception.date),
    }));
    const taken = new Set(own.map((row) => row.date));
    const upcoming = days
      .filter((day) => day.is_holiday && !taken.has(day.date))
      .slice(0, LISTED_HOLIDAYS)
      .map<Row>((day) => ({ kind: "holiday", date: day.date, closes: day.kind === "holiday" }));
    return [...own, ...upcoming].sort((a, b) => a.date.localeCompare(b.date));
  }, [exceptions, days, holidays]);

  const remove = async (date: DayKey) => {
    try {
      await deleteScheduleException(date);
      showAlert({
        tone: "success",
        title: "Día especial quitado",
        description: "Esa fecha vuelve al horario de siempre.",
      });
      await load();
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err, "No se pudo quitar el día especial") });
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 md:p-6 lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-[1_1_16rem]">
          <h2 className="text-base font-semibold tracking-tight">Días especiales</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Cierres por fecha (inventario, vacaciones) u horarios distintos a los de siempre. Mandan
            sobre el horario de atención y sobre los festivos, para el panel y para el asistente de IA.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setDialog({ open: true, editing: null, preset: null })}>
            <Plus aria-hidden className="size-4" /> Agregar día especial
          </Button>
        )}
      </div>

      {error !== null && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-2.5 text-sm">
          <span className="min-w-0 flex-1">{error}</span>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RotateCcw aria-hidden className="size-3.5" /> Reintentar
          </Button>
        </div>
      )}

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div
          className="axi-scroll max-h-[28rem] overflow-y-auto pr-1.5"
          tabIndex={0}
          aria-label="Próximos días especiales y festivos"
        >
          {exceptions === null && error === null ? (
            <div className="space-y-2" role="status" aria-label="Cargando días especiales">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Sin días especiales ni festivos próximos.
              {canManage && " Usa «Agregar día especial» para cerrar o cambiar el horario de una fecha."}
            </p>
          ) : (
            <ul className="grid gap-2">
              {rows.map((row) => (
                <DayRow
                  key={`${row.kind}-${row.date}`}
                  row={row}
                  effective={byDate.get(row.date)}
                  countryName={country.name}
                  canManage={canManage}
                  onEdit={(exception) => setDialog({ open: true, editing: exception, preset: null })}
                  onOpen={(date) =>
                    setDialog({ open: true, editing: null, preset: { date, kind: "special" } })
                  }
                  onRemove={(date) => void remove(date)}
                />
              ))}
            </ul>
          )}
        </div>

        <MonthView
          month={month}
          today={today}
          byDate={byDate}
          onStep={(delta) => setMonth((current) => addMonthsToKey(current, delta))}
        />
      </div>

      <SpecialDayDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
        editing={dialog.editing}
        preset={dialog.preset}
        todayKey={today}
        timezone={timezone}
        holidays={holidays}
        onSaved={(items) => {
          setExceptions(items);
          showAlert({
            tone: "success",
            title: "Día especial guardado",
            description: "Ya aplica al panel y al asistente de IA.",
          });
          void load();
        }}
      />
    </section>
  );
}

function DateBadge({ date }: { date: DayKey }) {
  const [, month, day] = date.split("-").map(Number);
  return (
    <div className="w-[3.25rem] shrink-0 rounded-lg bg-secondary py-1 text-center">
      <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
        {WEEKDAYS_SHORT[weekdayOfKey(date)]}
      </span>
      <span className="block text-lg leading-tight font-semibold tabular-nums">{day}</span>
      <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
        {MONTHS_SHORT[month - 1]}
      </span>
    </div>
  );
}

function Chip({ tone, children }: { tone: "closed" | "special" | "holiday"; children: string }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[11px] [overflow-wrap:anywhere]",
        tone === "closed" && "border-destructive/35 bg-destructive/8",
        tone === "special" && "border-accent-violet/35 bg-accent-violet/8",
        tone === "holiday" && "border-accent-amber/45 bg-accent-amber/10",
      )}
    >
      {children}
    </span>
  );
}

function DayRow({
  row,
  effective,
  countryName,
  canManage,
  onEdit,
  onOpen,
  onRemove,
}: {
  row: Row;
  effective: ClosureDayDTO | undefined;
  countryName: string;
  canManage: boolean;
  onEdit: (exception: ScheduleExceptionDTO) => void;
  onOpen: (date: DayKey) => void;
  onRemove: (date: DayKey) => void;
}) {
  if (row.kind === "exception") {
    const { exception } = row;
    return (
      <li className="grid grid-cols-[3.25rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 rounded-xl border border-border p-3 sm:grid-cols-[3.25rem_minmax(0,1fr)_auto]">
        <DateBadge date={row.date} />
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {exception.closed ? "Cerrado todo el día" : `Horario especial ${windowsLabel(exception.windows)}`}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Chip tone={exception.closed ? "closed" : "special"}>
              {exception.closed ? "Cerrado" : "Horario especial"}
            </Chip>
            <span className="min-w-0 [overflow-wrap:anywhere]">
              {exception.note ?? holidayNote(row.holiday, exception.closed, effective?.holiday_name ?? null)}
            </span>
          </p>
        </div>
        {canManage && (
          <div className="col-start-2 flex gap-1 sm:col-start-auto">
            <Button variant="ghost" size="sm" onClick={() => onEdit(exception)}>
              Editar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onRemove(row.date)}>
              Quitar
            </Button>
          </div>
        )}
      </li>
    );
  }
  const weekly =
    effective?.windows.length === 0
      ? "cerrado ese día de la semana"
      : (effective?.windows ?? []).map((window) => `${window.opens_at}–${window.closes_at}`).join(", ");
  return (
    <li className="grid grid-cols-[3.25rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 rounded-xl border border-dashed border-border bg-secondary/60 p-3 sm:grid-cols-[3.25rem_minmax(0,1fr)_auto]">
      <DateBadge date={row.date} />
      <div className="min-w-0">
        <p className="text-sm font-medium [overflow-wrap:anywhere]">
          {holidayTitle(effective?.holiday_name ?? null, countryName)}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <Chip tone="holiday">{row.closes ? "Cerrado por festivo" : "Se atiende"}</Chip>
          <span className="min-w-0 [overflow-wrap:anywhere]">
            {row.closes
              ? "No se ofrecen citas. Agrégalo como día especial para abrirlo."
              : `Horario de siempre (${weekly}). Enciende «No atiende en festivos» para cerrarlo.`}
          </span>
        </p>
      </div>
      {canManage && row.closes && (
        <div className="col-start-2 flex sm:col-start-auto">
          <Button variant="ghost" size="sm" onClick={() => onOpen(row.date)}>
            Abrir este día
          </Button>
        </div>
      )}
    </li>
  );
}

function MonthView({
  month,
  today,
  byDate,
  onStep,
}: {
  month: DayKey;
  today: DayKey;
  byDate: ReadonlyMap<DayKey, ClosureDayDTO>;
  onStep: (delta: 1 | -1) => void;
}) {
  const current = monthOfKey(month);
  const matrix = monthMatrix(month);
  const cells = monthOfKey(matrix[35]) !== current ? matrix.slice(0, 35) : matrix;
  const [year, monthNumber] = month.split("-").map(Number);
  return (
    <div aria-label="Vista del mes" className="min-w-0">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          {MONTHS_LONG[monthNumber - 1]} {year}
        </h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" aria-label="Mes anterior" onClick={() => onStep(-1)}>
            <ChevronLeft aria-hidden className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Mes siguiente" onClick={() => onStep(1)}>
            <ChevronRight aria-hidden className="size-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-xs">
        {LETTERS.map((letter) => (
          <span key={letter} className="pb-0.5 text-center text-[10px] uppercase text-muted-foreground">
            {letter}
          </span>
        ))}
        {cells.map((day) => {
          const inMonth = monthOfKey(day) === current;
          const effective = byDate.get(day);
          const closed = effective?.kind === "closed" || effective?.kind === "holiday";
          const special = effective?.kind === "special";
          const holidayOpen = effective?.kind === "weekly" && effective.is_holiday;
          const label = closed
            ? "cerrado"
            : special
              ? "horario especial"
              : holidayOpen
                ? "festivo, se atiende"
                : "";
          return (
            <span
              key={day}
              title={label === "" ? undefined : `${day} · ${label}`}
              className={cn(
                "relative grid aspect-square place-items-center rounded-lg border border-transparent tabular-nums",
                !inMonth && "text-transparent",
                inMonth && closed && "border-destructive/30 bg-[repeating-linear-gradient(135deg,color-mix(in_srgb,var(--color-destructive)_14%,transparent)_0_4px,transparent_4px_8px)]",
                inMonth && special && "border-accent-violet/35 bg-accent-violet/12",
                day === today && "font-semibold outline-2 -outline-offset-2 outline-primary",
              )}
            >
              {Number(day.slice(8))}
              {inMonth && holidayOpen && (
                <span aria-hidden className="absolute bottom-1 size-1.5 rounded-full bg-accent-amber" />
              )}
              {inMonth && label !== "" && <span className="sr-only">{label}</span>}
            </span>
          );
        })}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span aria-hidden className="size-2.5 rounded-sm border border-destructive/30 bg-destructive/15" />
          Cerrado
        </span>
        <span className="inline-flex items-center gap-1">
          <span aria-hidden className="size-2.5 rounded-sm bg-accent-violet/30" />
          Horario especial
        </span>
        <span className="inline-flex items-center gap-1">
          <span aria-hidden className="size-1.5 rounded-full bg-accent-amber" />
          Festivo en que se atiende
        </span>
      </div>
    </div>
  );
}
