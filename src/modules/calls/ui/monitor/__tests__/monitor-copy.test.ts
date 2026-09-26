import { minutesOutlook, namesPhrase, nextUpTitle, previousCyclePhrase } from "../monitor-copy";

const DAY = 86_400_000;
const period = { start: "2026-09-01T05:00:00.000Z", end: "2026-10-01T05:00:00.000Z" };
const start = Date.parse(period.start);

describe("textos del Monitoreo (premium F5)", () => {
  it("el ciclo anterior sin porcentajes negativos", () => {
    expect(previousCyclePhrase(148, 130)).toBe("18 más que el ciclo anterior");
    expect(previousCyclePhrase(120, 130)).toBe("el ciclo anterior fueron 130");
    expect(previousCyclePhrase(130, 130)).toBe("igual que el ciclo anterior");
    expect(previousCyclePhrase(10, 0)).toBeNull();
  });

  it("minutos: lo usado, lo que queda y si alcanzan a este ritmo", () => {
    // 10 días, 100 de 300 min → 10 min/día → sobran
    const ok = minutesOutlook({ used_seconds: 6_000, limit_seconds: 18_000 }, period, start + 10 * DAY);
    expect(ok).toMatchObject({ usedMinutes: 100, limitMinutes: 300, remainingMinutes: 200, tone: "success" });
    expect(ok.outlook).toBe("A este ritmo te alcanzan para todo el ciclo.");

    // 10 días, 246 de 300 → se acaban antes del cierre
    const tight = minutesOutlook({ used_seconds: 14_760, limit_seconds: 18_000 }, period, start + 10 * DAY);
    expect(tight.tone).toBe("warning");
    expect(tight.remainingMinutes).toBe(54);
    expect(tight.outlook).toMatch(/^A este ritmo se acaban el .+; el ciclo cierra el .+\.$/);
  });

  it("minutos agotados: pausa dicha con calma; sin tope ni ritmo, sin proyección inventada", () => {
    const done = minutesOutlook({ used_seconds: 18_000, limit_seconds: 18_000 }, period, start + 20 * DAY);
    expect(done).toMatchObject({ remainingMinutes: 0, tone: "destructive" });
    expect(done.outlook).toMatch(/^Las llamadas están en pausa hasta el .+\. El chat sigue igual\.$/);

    expect(minutesOutlook({ used_seconds: 600, limit_seconds: null }, period, start + DAY)).toMatchObject({
      limitMinutes: null,
      pct: null,
      outlook: null,
    });
    // Menos de un día de ciclo: aún no hay ritmo
    expect(minutesOutlook({ used_seconds: 600, limit_seconds: 18_000 }, period, start + DAY / 2).outlook).toBeNull();
  });

  it("titular de «Lo próximo» y nombres", () => {
    expect(nextUpTitle({ callbacks: 3, failed: 2, paused: false })).toBe("3 personas esperan tu llamada");
    expect(nextUpTitle({ callbacks: 1, failed: 0, paused: false })).toBe("Una persona espera tu llamada");
    expect(nextUpTitle({ callbacks: 0, failed: 0, paused: true })).toBe("Las llamadas están en pausa");
    expect(nextUpTitle({ callbacks: 0, failed: 2, paused: false })).toBe("Revisa lo que no salió");
    expect(nextUpTitle({ callbacks: 0, failed: 0, paused: false })).toBe("Todo al día");
    expect(namesPhrase(["Andrés Pardo", "Marta Ruiz"], 3)).toBe("Andrés Pardo, Marta Ruiz y 1 más");
    expect(namesPhrase(["Andrés", "Marta"], 2)).toBe("Andrés y Marta");
    expect(namesPhrase([], 2)).toBe("2 contactos");
  });
});
