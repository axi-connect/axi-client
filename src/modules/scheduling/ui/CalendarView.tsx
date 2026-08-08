"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Button } from "@/shared/components/ui/button";
import { StatusAlert } from "@/shared/components/ui/notice";
import {
  groupSegmentsByDay,
  type AppointmentSegment,
} from "@/modules/scheduling/domain/appointment";
import {
  fmtDayLong,
  fmtMonthTitle,
  fmtWeekTitle,
  monthMatrix,
  monthOfKey,
  todayKey as computeTodayKey,
  weekDays,
  type DayKey,
} from "@/modules/scheduling/domain/business-time";
import { useCompanySchedule } from "@/modules/scheduling/infrastructure/hooks/use-company-schedule";
import { useCalendarStore } from "@/modules/scheduling/infrastructure/stores/calendar.store";
import { CalendarSkeleton } from "./components/calendar/CalendarSkeleton";
import { CalendarToolbar } from "./components/calendar/CalendarToolbar";
import { MonthGrid } from "./components/calendar/MonthGrid";
import { AppointmentsList } from "./components/calendar/AppointmentsList";
import { ScheduleUnconfiguredBanner } from "./components/calendar/ScheduleUnconfiguredBanner";
import { TimeGrid } from "./components/calendar/TimeGrid";

/** Orquestador de la vista Calendario: toolbar + vista activa + estados. */
export function CalendarView() {
  const router = useRouter();
  const company = useCompanySchedule();
  const { hasPermission } = useAuth();

  const view = useCalendarStore((s) => s.view);
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

  const monthDays = useMemo(
    () => (anchor === "" ? [] : monthMatrix(anchor)),
    [anchor],
  );

  if (company.error !== null) {
    return (
      <div className="p-4 md:p-6">
        <StatusAlert
          tone="error"
          title="No se pudo cargar la empresa"
          description={company.error}
        />
      </div>
    );
  }

  if (timezone === null || anchor === "" || (loading && loadedRange === null)) {
    return <CalendarSkeleton />;
  }

  const today = computeTodayKey(new Date(), timezone);
  const title =
    view === "month"
      ? fmtMonthTitle(anchor)
      : view === "week"
        ? fmtWeekTitle(weekDays(anchor))
        : view === "day"
          ? fmtDayLong(anchor)
          : "Citas por rango";

  const openAppointment = (id: string) => {
    router.push(`/scheduling/calendar/appointment/${id}`);
  };
  const selectDay = (day: DayKey) => {
    setAnchor(day);
    setView("day");
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3 p-4 md:gap-4 md:p-6">
      <CalendarToolbar
        title={title}
        view={view}
        statusFilter={statusFilter}
        timezone={timezone}
        canManage={hasPermission("scheduling:manage")}
        onToday={goToday}
        onStep={step}
        onViewChange={setView}
        onStatusChange={setStatusFilter}
        onCreate={() => router.push("/scheduling/calendar/create")}
      />

      {!company.loading && !company.scheduleConfigured && <ScheduleUnconfiguredBanner />}

      {error !== null && (
        <div className="flex items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-2.5 text-sm">
          <span className="min-w-0 flex-1">{error}</span>
          <Button variant="outline" size="sm" onClick={() => void refresh()}>
            <RotateCcw aria-hidden className="size-3.5" /> Reintentar
          </Button>
        </div>
      )}

      {view === "month" && (
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
      )}
      {(view === "week" || view === "day") && (
        <TimeGrid
          days={view === "week" ? weekDays(anchor) : [anchor]}
          timezone={timezone}
          todayKey={today}
          schedules={company.schedules}
          segmentsByDay={segmentsByDay}
          contactNames={contactNames}
          onOpen={openAppointment}
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
