import type { CmoThreadDTO } from "@/modules/cmo/domain/cmo";
import { groupThreadsByDay, threadTitle, threadWhen } from "../thread-labels";

/**
 * La agrupación del conmutador es por DÍA de calendario local, no por
 * antigüedad: un hilo de las 23:50 de ayer es de ayer aunque hayan pasado diez
 * minutos. Las fechas se construyen con el constructor local, como en
 * `expiryLabel`, para que el test no dependa del huso de la máquina.
 */
const at = (y: number, m: number, d: number, h = 10, min = 0) => new Date(y, m - 1, d, h, min).toISOString();

const thread = (id: string, last: string, title: string | null = `Hilo ${id}`): CmoThreadDTO => ({
  id,
  title,
  last_message_at: last,
  created_at: last,
});

const NOW = new Date(2026, 8, 15, 12, 0);

describe("threadTitle", () => {
  it("usa el título del servidor y, si falta, la fecha de creación", () => {
    expect(threadTitle(thread("a", at(2026, 9, 8)))).toBe("Hilo a");
    expect(threadTitle(thread("b", at(2026, 9, 8), null))).toBe("Conversación del 8 sept");
    expect(threadTitle(thread("c", at(2026, 9, 8), "   "))).toBe("Conversación del 8 sept");
  });
});

describe("threadWhen", () => {
  it("hora si fue hoy, fecha corta si no", () => {
    expect(threadWhen(thread("a", at(2026, 9, 15, 10, 42)), NOW)).toMatch(/10:42/);
    expect(threadWhen(thread("b", at(2026, 9, 8)), NOW)).toBe("8 sept");
  });
});

describe("groupThreadsByDay", () => {
  it("separa hoy, ayer y antes por día local y ordena del más reciente al más antiguo", () => {
    const groups = groupThreadsByDay(
      [
        thread("old", at(2026, 9, 8)),
        thread("late-yesterday", at(2026, 9, 14, 23, 50)),
        thread("early-today", at(2026, 9, 15, 0, 5)),
        thread("today", at(2026, 9, 15, 9, 30)),
      ],
      NOW,
    );
    expect(groups.today.map((t) => t.id)).toEqual(["today", "early-today"]);
    expect(groups.yesterday.map((t) => t.id)).toEqual(["late-yesterday"]);
    expect(groups.earlier.map((t) => t.id)).toEqual(["old"]);
  });

  it("con la lista vacía devuelve tres grupos vacíos", () => {
    expect(groupThreadsByDay([], NOW)).toEqual({ today: [], yesterday: [], earlier: [] });
  });
});
