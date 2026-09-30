"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarOff, CircleAlert, Clock, LoaderCircle, Lock, RotateCcw } from "lucide-react";
import Link from "next/link";
import { isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Textarea } from "@/shared/components/ui/textarea";
import { listProducts } from "@/modules/catalog/public";
import { ContactPicker } from "@/modules/crm/public";
import type { CompanySchedule } from "@/modules/companies/public";
import type { AppointmentDTO } from "@/modules/scheduling/domain/appointment";
import {
  buildCreatePayload,
  buildReschedulePayload,
} from "@/modules/scheduling/domain/appointment-payload";
import { firstAvailableDay, monthQueryRange, slotsByDay } from "@/modules/scheduling/domain/month-availability";
import {
  fmtClock,
  hhmmToMinutes,
  isWithinOpenHours,
  minutesToHhmm,
  openHoursLabel,
} from "@/modules/scheduling/domain/time-grid";
import type { AvailabilitySlot } from "@/modules/scheduling/domain/availability";
import {
  addMonthsToKey,
  businessDayKey,
  hhmmFromInstant,
  todayKey as computeTodayKey,
  type DayKey,
} from "@/core/lib/business-time";
import { getAvailability } from "@/modules/scheduling/infrastructure/services/availability-service.adapter";
import {
  createAppointment,
  updateAppointment,
} from "@/modules/scheduling/infrastructure/services/appointments-service.adapter";
import { useCalendarStore } from "@/modules/scheduling/infrastructure/stores/calendar.store";
import { dayHeading } from "../calendar/AppointmentsList";
import { MonthPicker } from "./MonthPicker";
import { ServiceOptions, type ServiceOption } from "./ServiceOptions";

export type ComposerMode =
  | {
      kind: "create";
      /** Hueco tocado en el calendario (F1): día y hora puestos. */
      prefill: { date: DayKey; time: string } | null;
    }
  | { kind: "reschedule"; appointment: AppointmentDTO; contactLabel: string; serviceName: string | null };

type Month =
  | { status: "loading"; key: string }
  | { status: "ready"; key: string; configured: boolean; byDay: Map<DayKey, AvailabilitySlot[]> }
  | { status: "error"; key: string; message: string };

const NOTES_MAX = 1000;

function durationOf(appointment: AppointmentDTO): number {
  return Math.round((new Date(appointment.ends_at).getTime() - new Date(appointment.starts_at).getTime()) / 60_000);
}

/**
 * Crear / reagendar cita (lienzo Agenda premium F2, D1 y D4): quién y qué a la
 * izquierda; cuándo a la derecha, con el mes propio (un punto en los días con
 * horarios libres) y los horarios del día; «Otra hora…» en vez del interruptor.
 * Abajo, la frase de lo que se va a agendar y la acción.
 *
 * 409 `scheduling/slot_unavailable` (el cupo se llenó entre elegir y
 * confirmar): no se cierra — se limpia la hora, se vuelve a consultar el mes y
 * se dice qué pasó.
 */
export function AppointmentComposer({
  mode,
  timezone,
  schedules,
  onCancel,
  onSuccess,
}: {
  mode: ComposerMode;
  timezone: string;
  schedules: CompanySchedule[];
  onCancel: () => void;
  onSuccess: (fresh: AppointmentDTO) => void;
}) {
  const { showAlert } = useAlert();
  const refresh = useCalendarStore((s) => s.refresh);
  const upsertAppointment = useCalendarStore((s) => s.upsertAppointment);
  const today = computeTodayKey(new Date(), timezone);
  const resched = mode.kind === "reschedule" ? mode.appointment : null;

  // Sin hueco tocado, el día lo elige el primer horario libre (también al
  // reagendar: la cita ya tiene su hora, se busca la siguiente disponible).
  const initialDate: DayKey | "" = mode.kind === "create" ? (mode.prefill?.date ?? "") : "";
  const initialTime = mode.kind === "create" ? (mode.prefill?.time ?? "") : "";
  const prefillOutside =
    mode.kind === "create" && mode.prefill !== null
      ? !isWithinOpenHours(schedules, mode.prefill.date, hhmmToMinutes(mode.prefill.time))
      : false;

  const [contact, setContact] = useState<{ id: string; label: string } | null>(
    resched !== null ? { id: resched.contact_id, label: mode.kind === "reschedule" ? mode.contactLabel : "" } : null,
  );
  const [services, setServices] = useState<ServiceOption[] | null>(resched !== null ? [] : null);
  const [productId, setProductId] = useState<string>(resched?.product_id ?? "");
  const [duration, setDuration] = useState<number>(resched !== null ? durationOf(resched) : 30);
  const [anchor, setAnchor] = useState<DayKey>(initialDate === "" ? today : initialDate);
  // Si el mes en curso ya no tiene horarios, se abre el siguiente (una sola vez).
  const [autoAdvanced, setAutoAdvanced] = useState(false);
  const [date, setDate] = useState<DayKey | "">(initialDate);
  const [time, setTime] = useState(initialTime);
  const [custom, setCustom] = useState(prefillOutside);
  const [notes, setNotes] = useState("");
  const [month, setMonth] = useState<Month>({ status: "loading", key: "" });
  const [refreshKey, setRefreshKey] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Catálogo de servicios (solo al crear: al reagendar el servicio no cambia).
  useEffect(() => {
    if (mode.kind !== "create") return;
    let alive = true;
    listProducts({ kind: "service", is_active: true, page_size: 100 })
      .then((res) => {
        if (!alive) return;
        const list = res.data.map((p) => ({ id: p.id, name: p.name, duration_minutes: p.duration_minutes }));
        setServices(list);
        // El primer servicio queda elegido: es el caso de casi todos los negocios.
        if (list.length > 0) {
          setProductId(list[0].id);
          if (list[0].duration_minutes != null) setDuration(list[0].duration_minutes);
        }
      })
      .catch(() => {
        if (alive) setServices([]);
      });
    return () => {
      alive = false;
    };
  }, [mode.kind]);

  // Disponibilidad del mes visible: una consulta por mes, servicio y duración.
  const range = monthQueryRange(anchor, today);
  const monthKey = `${range?.from ?? "-"}|${range?.to ?? "-"}|${productId}|${productId === "" ? duration : ""}|${refreshKey}`;
  useEffect(() => {
    if (range === null) {
      setMonth({ status: "ready", key: monthKey, configured: true, byDay: new Map() });
      return;
    }
    if (mode.kind === "create" && services === null) return; // espera el servicio por defecto
    let alive = true;
    setMonth({ status: "loading", key: monthKey });
    getAvailability({
      date_from: range.from,
      date_to: range.to,
      product_id: productId !== "" ? productId : undefined,
      duration_minutes: productId === "" ? duration : undefined,
    })
      .then((data) => {
        if (alive) setMonth({ status: "ready", key: monthKey, configured: data.schedule_configured, byDay: slotsByDay(data, timezone) });
      })
      .catch((err: unknown) => {
        if (alive) setMonth({ status: "error", key: monthKey, message: errorMessage(err, "No pudimos consultar los horarios") });
      });
    return () => {
      alive = false;
    };
    // `range` se deriva de anchor/today; `monthKey` resume todo lo que cambia la consulta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey, services === null]);

  const ready = month.status === "ready" && month.key === monthKey ? month : null;

  // Sin día elegido: el primer día con horarios libres del mes.
  useEffect(() => {
    if (ready === null || date !== "") return;
    const first = firstAvailableDay(ready.byDay, range?.from ?? today);
    if (first !== null) {
      setDate(first);
    } else if (!autoAdvanced && ready.configured) {
      setAutoAdvanced(true);
      setAnchor(addMonthsToKey(anchor, 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, date]);

  const daySlots = useMemo(
    () => (ready !== null && date !== "" ? (ready.byDay.get(date) ?? []) : []),
    [ready, date],
  );
  const availableDays = useMemo(() => (ready !== null && ready.configured ? new Set(ready.byDay.keys()) : null), [ready]);

  // El hueco tocado que no es un horario sugerido pasa a «Otra hora».
  useEffect(() => {
    if (ready === null || time === "" || custom) return;
    if (!daySlots.some((slot) => hhmmFromInstant(slot.starts_at, timezone) === time)) setCustom(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, date]);

  const pickDay = (day: DayKey) => {
    setDate(day);
    setNotice(null);
    if (!custom) setTime("");
  };
  const stepMonth = (delta: 1 | -1) => {
    setAutoAdvanced(true); // el usuario ya navega: no se le mueve el mes
    setAnchor(addMonthsToKey(anchor, delta));
  };

  const outside =
    custom && date !== "" && time !== "" && !isWithinOpenHours(schedules, date, hhmmToMinutes(time), duration);
  const endTime = time !== "" ? minutesToHhmm((hhmmToMinutes(time) + duration) % 1440) : "";
  const valid = contact !== null && date !== "" && time !== "" && duration >= 5 && duration <= 480;

  const submit = async () => {
    setSubmitted(true);
    if (!valid || saving || contact === null || date === "") return;
    setSaving(true);
    setNotice(null);
    const input = {
      date,
      time,
      productId: productId === "" ? undefined : productId,
      durationMinutes: productId === "" || resched !== null ? duration : undefined,
      notes,
    };
    try {
      const fresh =
        resched === null
          ? await createAppointment(buildCreatePayload(contact.id, input, timezone))
          : await updateAppointment(resched.id, buildReschedulePayload(input, timezone));
      upsertAppointment(fresh);
      void refresh();
      showAlert({
        tone: "success",
        title: resched === null ? "Cita agendada" : "Cita reagendada · los recordatorios se regeneran solos",
      });
      onSuccess(fresh);
    } catch (err) {
      if (isHttpError(err) && err.is("scheduling/slot_unavailable")) {
        setNotice(`Las ${time.replace(/^0/, "")} se acaban de ocupar. Actualizamos los horarios: elige otro.`);
        setTime("");
        setCustom(false);
        setRefreshKey((k) => k + 1);
      } else if (isHttpError(err) && err.is("scheduling/invalid_time_range")) {
        setNotice("La cita no puede quedar en el pasado. Elige otro horario.");
      } else {
        showAlert({
          tone: "error",
          title: errorMessage(err, resched === null ? "No se pudo agendar la cita" : "No se pudo reagendar la cita"),
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const summary =
    date !== "" && time !== "" ? (
      <>
        <span className="font-semibold text-foreground">
          {dayHeading(date, today).replace(/^(Hoy|Mañana) · /, "")} · {time.replace(/^0/, "")} – {endTime.replace(/^0/, "")}
        </span>
        {resched !== null
          ? ` en vez de ${dayHeading(businessDayKey(resched.starts_at, timezone), today).replace(/^(Hoy|Mañana) · /, "").toLowerCase()} · ${fmtClock(resched.starts_at, timezone)}`
          : contact !== null
            ? ` con ${contact.label}`
            : ""}
      </>
    ) : resched !== null ? (
      "Elige el nuevo día y la hora."
    ) : (
      "Elige un contacto y un horario."
    );

  return (
    <div className="flex flex-col">
      <div className="grid border-t border-border md:grid-cols-[minmax(0,1fr)_22.5rem]">
        {/* Quién y qué */}
        <div className="flex min-w-0 flex-col gap-5 px-5 py-5 md:px-7">
          {resched === null ? (
            <>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-foreground/85">Contacto</span>
                <ContactPicker
                  value={contact}
                  onChange={setContact}
                  error={submitted && contact === null ? "Elige un contacto" : undefined}
                />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-foreground/85">Servicio</span>
                {services === null ? (
                  <div className="flex flex-col gap-2" role="status" aria-label="Cargando servicios">
                    <Skeleton className="h-11 w-full rounded-xl" />
                    <Skeleton className="h-11 w-full rounded-xl" />
                  </div>
                ) : (
                  <ServiceOptions
                    services={services}
                    value={productId}
                    durationMinutes={duration}
                    onChange={(id, minutes) => {
                      setProductId(id);
                      if (minutes != null) setDuration(minutes);
                      if (!custom) setTime("");
                    }}
                    onDurationChange={setDuration}
                  />
                )}
              </div>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-foreground/85">
                  Notas <span className="font-normal text-muted-foreground">(opcional)</span>
                </span>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={NOTES_MAX}
                  rows={3}
                  placeholder="Lo que el equipo debe saber de la cita"
                  className="rounded-xl"
                />
              </label>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-foreground/85">Cambia de</span>
                <div className="grid grid-cols-[minmax(0,1fr)_1.5rem_minmax(0,1fr)] items-center gap-2.5">
                  <div className="flex flex-col gap-0.5 rounded-2xl border border-border px-3.5 py-3">
                    <span className="text-xs text-muted-foreground">Ahora</span>
                    <span className="font-heading text-base font-bold text-muted-foreground line-through decoration-[1.5px]">
                      {dayHeading(businessDayKey(resched.starts_at, timezone), today).replace(/^(Hoy|Mañana) · /, "").split(" de ")[0]} · {fmtClock(resched.starts_at, timezone)}
                    </span>
                  </div>
                  <ArrowRight aria-hidden className="size-4 justify-self-center text-muted-foreground" />
                  <div
                    className={cn(
                      "flex flex-col gap-0.5 rounded-2xl border px-3.5 py-3",
                      date !== "" && time !== "" ? "border-transparent ring-[1.5px] ring-foreground" : "border-dashed border-border",
                    )}
                  >
                    <span className="text-xs text-muted-foreground">Nueva</span>
                    <span className="font-heading text-base font-bold">
                      {date !== "" && time !== ""
                        ? `${dayHeading(date, today).replace(/^(Hoy|Mañana) · /, "").split(" de ")[0]} · ${time.replace(/^0/, "")}`
                        : "Elige el horario"}
                    </span>
                  </div>
                </div>
              </div>
              <p className="flex items-start gap-2.5 rounded-xl border border-border bg-background p-3 text-sm text-foreground/80">
                <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span>
                  {mode.kind === "reschedule" && mode.serviceName !== null
                    ? `El servicio no cambia al reagendar: su duración (${duration} min) manda. `
                    : `La duración (${duration} min) se mantiene. `}
                  Axi rehace los recordatorios para la nueva hora.
                </span>
              </p>
            </>
          )}
        </div>

        {/* Cuándo */}
        <div className="flex min-w-0 flex-col gap-4 border-t border-border bg-background px-5 py-5 md:border-t-0 md:border-l md:px-6">
          <MonthPicker
            anchor={anchor}
            todayKey={today}
            selected={date}
            availableDays={availableDays}
            loading={ready === null}
            onPick={pickDay}
            onStepMonth={stepMonth}
          />

          {notice !== null && (
            <p role="alert" className="flex items-start gap-2.5 rounded-xl border border-warning/40 bg-card p-3 text-sm">
              <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
              <span>{notice}</span>
            </p>
          )}

          {month.status === "error" && month.key === monthKey ? (
            <div className="flex flex-col gap-3">
              <p className="flex items-start gap-2.5 rounded-xl border border-border bg-card p-3 text-sm">
                <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span>
                  <span className="font-semibold">{month.message}.</span> Tu cita no se ha guardado.
                </span>
              </p>
              <Button variant="outline" className="self-start rounded-full" onClick={() => setRefreshKey((k) => k + 1)}>
                <RotateCcw aria-hidden className="size-4" /> Reintentar
              </Button>
            </div>
          ) : ready === null ? (
            <div className="flex flex-col gap-2.5" role="status" aria-label="Consultando horarios">
              <Skeleton className="h-4 w-2/5 rounded-full" />
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 8 }, (_, i) => (
                  <Skeleton key={i} className="h-9 rounded-full" />
                ))}
              </div>
            </div>
          ) : !custom ? (
            <div className="flex flex-col gap-2.5">
              {!ready.configured ? (
                <p className="flex items-start gap-2.5 rounded-xl border border-border bg-card p-3 text-sm">
                  <Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span>
                    <span className="font-semibold">Aún no tienes horario de atención.</span> Sin él no hay horarios
                    sugeridos, pero puedes poner la hora a mano.{" "}
                    <Link href="/scheduling/settings" className="font-medium underline underline-offset-2">
                      Configurar el horario
                    </Link>
                  </span>
                </p>
              ) : date !== "" && daySlots.length === 0 ? (
                <p className="flex items-start gap-2.5 rounded-xl border border-border bg-card p-3 text-sm">
                  <CalendarOff aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span>
                    <span className="font-semibold">{dayHeading(date, today).replace(/^(Hoy|Mañana) · /, "")} no tiene cupo.</span>{" "}
                    Elige otro día o pon una hora a mano.
                  </span>
                </p>
              ) : date !== "" ? (
                <>
                  <span className="text-sm font-semibold text-foreground/85">
                    {dayHeading(date, today).replace(/^(Hoy|Mañana) · /, "").split(" de ")[0]} ·{" "}
                    {daySlots.length === 1 ? "1 horario libre" : `${daySlots.length} horarios libres`}
                  </span>
                  <div role="group" aria-label="Horarios libres" className="grid grid-cols-4 gap-2">
                    {daySlots.map((slot) => {
                      const value = hhmmFromInstant(slot.starts_at, timezone);
                      const selected = value === time;
                      return (
                        <button
                          key={slot.starts_at}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => {
                            setTime(value);
                            setNotice(null);
                          }}
                          className={cn(
                            "inline-flex h-9 items-center justify-center rounded-full border text-sm font-medium tabular-nums transition-colors",
                            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                            selected ? "border-transparent bg-foreground text-background" : "border-border bg-card hover:border-foreground/50",
                          )}
                        >
                          {fmtClock(slot.starts_at, timezone)}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Este mes no tiene horarios libres. Mira el siguiente.</p>
              )}
              <button
                type="button"
                onClick={() => {
                  setCustom(true);
                  setTime("");
                }}
                className="inline-flex min-h-7 items-center self-start rounded-full text-sm font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                Otra hora…
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-foreground/85">Otra hora</span>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  classNameContainer="w-36"
                  className="h-10 rounded-xl tabular-nums"
                  aria-label="Hora de la cita"
                />
              </label>
              {outside && (
                <p className="flex items-start gap-2.5 rounded-xl border border-border bg-card p-3 text-sm text-foreground/80">
                  <Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span>
                    <span className="font-semibold text-foreground">{time.replace(/^0/, "")} está fuera de tu horario</span>
                    {date !== "" && openHoursLabel(schedules, date) !== null ? ` (${openHoursLabel(schedules, date)})` : ""}.
                    Puedes agendarla igual: Axi le envía sus recordatorios.
                  </span>
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  setCustom(false);
                  setTime("");
                }}
                className="inline-flex min-h-7 items-center self-start rounded-full text-sm font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                Volver a los horarios libres
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pegado abajo: la acción siempre a la vista, también en el celular. */}
      <div className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-border bg-card px-5 py-4 sm:flex-row sm:items-center md:px-7">
        <p className="min-w-0 flex-1 text-sm text-foreground/80">{summary}</p>
        <div className="flex gap-2 max-sm:flex-col-reverse">
          <Button variant="ghost" className="rounded-full" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button className="h-10 rounded-full px-5" disabled={!valid || saving} onClick={() => void submit()}>
            {saving && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
            {resched === null ? "Agendar cita" : "Reagendar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
