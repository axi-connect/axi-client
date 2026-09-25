import { buildIcs, foldLine } from "../calendar-ics";

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

describe("foldLine", () => {
  it("pliega a 75 octetos contando bytes UTF-8, sin partir caracteres", () => {
    const line = `SUMMARY:${"ñ".repeat(60)}`; // 8 + 120 bytes
    const folded = foldLine(line).split("\r\n");
    const bytes = (text: string) => Buffer.byteLength(text, "utf8");
    expect(folded.length).toBeGreaterThan(1);
    expect(bytes(folded[0]!)).toBeLessThanOrEqual(75);
    for (const rest of folded.slice(1)) {
      expect(rest.startsWith(" ")).toBe(true);
      expect(bytes(rest)).toBeLessThanOrEqual(75);
    }
    expect(folded.map((part, i) => (i === 0 ? part : part.slice(1))).join("")).toBe(line);
  });
  it("una línea corta queda igual", () => {
    expect(foldLine("VERSION:2.0")).toBe("VERSION:2.0");
  });
});
