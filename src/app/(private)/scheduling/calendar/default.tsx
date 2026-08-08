import { CalendarView } from "@/modules/scheduling/ui/CalendarView";

/**
 * Fallback del slot children: al interceptar /scheduling/calendar/appointment/[id]
 * desde OTRO segmento, el calendario se monta detrás del rail en vez de 404.
 */
export default function SchedulingCalendarDefault() {
  return <CalendarView />;
}
