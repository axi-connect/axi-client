"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, RotateCcw } from "lucide-react";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import {
  groupSegmentsByDay,
  type AppointmentSegment,
} from "@/modules/scheduling/domain/appointment";
import { createAtHref, fmtWeekRangeShort } from "@/modules/scheduling/domain/time-grid";
import {
  addDaysToKey,
  fmtDayLong,
  fmtMonthTitle,
  monthMatrix,
  monthOfKey,
  todayKey as computeTodayKey,
  weekDays,
  type DayKey,
} from "@/core/lib/business-time";
import { useCompanySchedule } from "@/modules/scheduling/infrastructure/hooks/use-company-schedule";
import { useIsDesktop } from "@/modules/scheduling/infrastructure/hooks/use-is-desktop";
import { useCalendarStore } from "@/modules/scheduling/infrastructure/stores/calendar.store";
import { CalendarSkeleton } from "./components/calendar/CalendarSkeleton";
import { CalendarToolbar } from "./components/calendar/CalendarToolbar";
import { MonthGrid } from "./components/calendar/MonthGrid";
import { MobileMonth } from "./components/calendar/MobileMonth";
import { AppointmentsList } from "./components/calendar/AppointmentsList";
import { ScheduleUnconfiguredBanner } from "./components/calendar/ScheduleUnconfiguredBanner";
import { TimeGrid } from "./components/calendar/TimeGrid";
import { WeekStrip } from "./components/calendar/WeekStrip";
import { DayHeading } from "./components/calendar/DayHeading";

/**
 * Orquestador de la vista Calendario (lienzo Agenda premium F1): barra, vista
 * activa y estados. En el celular no hay Semana (no cabe): la preferencia
 * «semana» se muestra como Día con la tira de la semana encima.
 */
export function CalendarView() {
  const router = useRouter();
  const company = useCompanySchedule();
  const { hasPermission } = useAuth();
  const isDesktop = useIsDesktop();
  const canManage = hasPermission("scheduling:manage");

  const storedView = useCalendarStore((s) => s.view);
  const anchor = useCalendarStore((s) => s.anchor);
  const listRange = useCalendarStore((s) => s.listRange);
  const statusFilter = useCalendarStore((s) => s.statusFilter);
  const timezone = useCalendarStore((s) => s.timezone);
  const appointmentsById = useCalendarStore((s) => s.appointmentsById);
  const rangeIds = useCalendarStore((s) => s.rangeIds);
  const loadedRange = useCalendarStore((s) => s.loadedRange);
  const loading = useCalendarStore((s) => s.loading);
  const error = useCalendarStore((s) => s.error);
  const contactNames = useCalendarStore((s) => s.contactNames);
  const productNames = useCalendarStore((s) => s.productNames);

  const init = useCalendarStore((s) => s.init);
  const setView = useCalendarStore((s) => s.setView);
  const setAnchor = useCalendarStore((s) => s.setAnchor);
  const goToday = useCalendarStore((s) => s.goToday);
  const step = useCalendarStore((s) => s.step);
  const setListRange = useCalendarStore((s) => s.setListRange);
  const setStatusFilter = useCalendarStore((s) => s.setStatusFilter);
  const refresh = useCalendarStore((s) => s.refresh);

  // El Día carga su semana entera, así que el rango de «semana» ya lo cubre:
  // no hace falta tocar la preferencia guardada (que sigue siendo del computador).
  const view = !isDesktop && storedView === "week" ? "day" : storedView;

  useEffect(() => {
    if (company.timezone !== null) init(company.timezone);
  }, [company.timezone, init]);

  const visibleAppointments = useMemo(() => {
    const all = rangeIds.map((id) => appointmentsById[id]).filter((a) => a !== undefined);
    if (statusFilter === "all") return all;
    return all.filter((a) => a.status === statusFilter);
  }, [rangeIds, appointmentsById, statusFilter]);

  const segmentsByDay = useMemo<Map<DayKey, AppointmentSegment[]>>(
    () => (timezone === null ? new Map() : groupSegmentsByDay(visibleAppointments, timezone)),
    [visibleAppointments, timezone],
  );

  const monthDays = useMemo(() => (anchor === "" ? [] : monthMatrix(anchor)), [anchor]);

  if (company.error !== null) {
    return (
      <div className="p-4 md:p-6">
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>No se pudo cargar la empresa</AlertTitle>
          <AlertDescription>{company.error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (timezone === null || anchor === "" || (loading && loadedRange === null)) {
    return <CalendarSkeleton />;
  }

  const today = computeTodayKey(new Date(), timezone);
  const title =
    view === "month"
      ? fmtMonthTitle(anchor).replace(" de ", " ")
      : view === "week"
        ? fmtWeekRangeShort(weekDays(anchor))
        : view === "day"
          ? fmtDayLong(anchor).replace(", ", " ").replace(/ de \d{4}$/, "")
          : "Próximas citas";

  const openAppointment = (id: string) => {
    router.push(`/scheduling/calendar/appointment/${id}`);
  };
  const selectDay = (day: DayKey) => {
    setAnchor(day);
    setView("day");
  };
  const createAt = canManage
    ? (day: DayKey, minutes: number) => router.push(createAtHref(day, minutes))
    : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pt-3 pb-4 md:gap-4 md:px-8 md:pt-5 md:pb-6">
      <CalendarToolbar
        title={title}
        view={view}
        isDesktop={isDesktop}
        statusFilter={statusFilter}
        canManage={canManage}
        onToday={goToday}
        onStep={step}
        onViewChange={setView}
        onStatusChange={setStatusFilter}
        onCreate={() => router.push("/scheduling/calendar/create")}
      />

      {!company.loading && !company.scheduleConfigured && <ScheduleUnconfiguredBanner />}

      {error !== null && (
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-2.5 text-sm">
          <CircleAlert aria-hidden className="size-4 shrink-0 text-destructive" />
          <span className="min-w-0 flex-1">{error}</span>
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => void refresh()}>
            <RotateCcw aria-hidden className="size-3.5" /> Reintentar
          </Button>
        </div>
      )}

      {view === "day" && !isDesktop && (
        <div className="-mx-2 flex flex-col gap-2">
          <WeekStrip
            anchor={anchor}
            todayKey={today}
            segmentsByDay={segmentsByDay}
            onSelectDay={setAnchor}
            onStepWeek={(delta) => setAnchor(addDaysToKey(anchor, delta * 7))}
          />
          <DayHeading
            day={anchor}
            todayKey={today}
            segments={segmentsByDay.get(anchor) ?? []}
            onToday={goToday}
          />
        </div>
      )}

      {view === "month" &&
        (isDesktop ? (
          <MonthGrid
            days={monthDays}
            anchorMonth={monthOfKey(anchor)}
            todayKey={today}
            timezone={timezone}
            segmentsByDay={segmentsByDay}
            contactNames={contactNames}
            onOpen={openAppointment}
            onSelectDay={selectDay}
          />
        ) : (
          <MobileMonth
            days={monthDays}
            anchor={anchor}
            todayKey={today}
            timezone={timezone}
            segmentsByDay={segmentsByDay}
            contactNames={contactNames}
            productNames={productNames}
            onPickDay={setAnchor}
            onStepMonth={step}
            onOpenDay={selectDay}
            onOpen={openAppointment}
          />
        ))}
      {(view === "week" || view === "day") && (
        <TimeGrid
          days={view === "week" ? weekDays(anchor) : [anchor]}
          timezone={timezone}
          todayKey={today}
          schedules={company.schedules}
          segmentsByDay={segmentsByDay}
          statusFilter={statusFilter}
          contactNames={contactNames}
          serviceNames={productNames}
          onOpen={openAppointment}
          onCreateAt={createAt}
          compact={!isDesktop}
          onCreate={canManage ? () => router.push("/scheduling/calendar/create") : null}
        />
      )}
      {view === "list" && (
        <AppointmentsList
          appointments={visibleAppointments}
          timezone={timezone}
          todayKey={today}
          listRange={listRange}
          contactNames={contactNames}
          productNames={productNames}
          onRangeChange={setListRange}
          onOpen={openAppointment}
        />
      )}
    </div>
  );
}
