import { buildIcs } from "../calendar-ics";

describe("buildIcs", () => {
  const now = new Date("2026-09-25T06:00:00Z");

  it("arma un VEVENT por cita, en UTC y con CRLF", () => {
    const ics = buildIcs(
      [
        { uid: "d1-day2@axi-connect.co", title: "Llamada del día 2 · La Espiga", startsAt: "2026-09-28T15:00:00Z", minutes: 10 },
        { uid: "d1-day5@axi-connect.co", title: "Reunión del día 5", startsAt: "2026-09-30T20:30:00Z", minutes: 15 },
      ],
      now,
    );
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain("DTSTART:20260928T150000Z\r\nDTEND:20260928T151000Z");
    expect(ics).toContain("DTSTART:20260930T203000Z\r\nDTEND:20260930T204500Z");
    expect(ics).toContain("DTSTAMP:20260925T060000Z");
    expect(ics).toContain("METHOD:PUBLISH");
  });

  it("escapa el texto según RFC 5545", () => {
    const ics = buildIcs(
      [{ uid: "x", title: "Café, pan; y más", startsAt: "2026-09-28T15:00:00Z", minutes: 10, description: "Línea 1\nLínea 2 \\ fin" }],
      now,
    );
    expect(ics).toContain("SUMMARY:Café\\, pan\\; y más");
    expect(ics).toContain("DESCRIPTION:Línea 1\\nLínea 2 \\\\ fin");
  });
});
