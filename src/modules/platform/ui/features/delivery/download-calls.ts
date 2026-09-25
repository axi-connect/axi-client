import { buildIcs } from "../../../domain/calendar-ics";
import { CALL_DAY2_MINUTES, CALL_DAY2_TITLE, CALL_DAY5_MINUTES, CALL_DAY5_TITLE } from "../../../domain/trial-journey";

type CallsSource = {
  id: string;
  call_day2_at: string;
  call_day5_at: string;
};

/**
 * Descarga las dos citas del recorrido como un .ics para el calendario del
 * asesor. El `uid` va atado a la entrega: importarlo otra vez actualiza las
 * citas en vez de duplicarlas.
 */
export function downloadCallsIcs(delivery: CallsSource, businessName: string): void {
  const ics = buildIcs([
    {
      uid: `${delivery.id}-day2@axi-connect.co`,
      title: `${CALL_DAY2_TITLE} · ${businessName}`,
      startsAt: delivery.call_day2_at,
      minutes: CALL_DAY2_MINUTES,
      description: "Seguimiento de la prueba de Axi Connect.",
    },
    {
      uid: `${delivery.id}-day5@axi-connect.co`,
      title: `${CALL_DAY5_TITLE} · ${businessName}`,
      startsAt: delivery.call_day5_at,
      minutes: CALL_DAY5_MINUTES,
      description: "Resultados de la prueba de Axi Connect.",
    },
  ]);
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "citas-de-la-prueba.ics";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
