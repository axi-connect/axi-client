import { GAME, GAME_MOVES } from "@/modules/landing/ui/content/productos.content";
import { TOTAL_ABILITIES, crmDue, initialGame, isDone, play, reply, unlockCrm } from "../game/game-state";

/** El juego de #agente: qué cambia con cada jugada (los tiempos los pone el componente). */
describe("estado del juego", () => {
  it("una jugada escribe lo del cliente y espera; la respuesta descubre su habilidad", () => {
    const jugada = play(initialGame, "foto");
    expect(jugada.pending).toBe("foto");
    expect(jugada.got).toEqual([]);
    expect(jugada.log.length).toBe(1 + GAME_MOVES[0].customer.length);

    const respondida = reply(jugada);
    expect(respondida.pending).toBeNull();
    expect(respondida.got).toEqual(["foto"]);
    expect(respondida.log.length).toBe(jugada.log.length + GAME_MOVES[0].reply.length);
  });

  it("no se repite una jugada ni se hace otra mientras Axi escribe", () => {
    const esperando = play(initialGame, "foto");
    expect(play(esperando, "voz")).toBe(esperando);
    const hecha = reply(esperando);
    expect(play(hecha, "foto")).toBe(hecha);
  });

  it("el CRM llega solo tras las jugadas acordadas, ni antes ni dos veces", () => {
    let s = initialGame;
    for (const move of GAME_MOVES.slice(0, GAME.crmAfterMoves - 1)) s = reply(play(s, move.id));
    expect(crmDue(s)).toBe(false);
    expect(unlockCrm(s)).toBe(s);

    s = reply(play(s, GAME_MOVES[GAME.crmAfterMoves - 1].id));
    expect(crmDue(s)).toBe(true);
    s = unlockCrm(s);
    expect(s.got).toContain("crm");
    expect(crmDue(s)).toBe(false);
    expect(unlockCrm(s).got.filter((g) => g === "crm")).toHaveLength(1);
  });

  it("las seis jugadas más el CRM completan el juego", () => {
    let s = initialGame;
    for (const move of GAME_MOVES) s = unlockCrm(reply(play(s, move.id)));
    expect(s.got).toHaveLength(TOTAL_ABILITIES);
    expect(isDone(s)).toBe(true);
    expect(isDone(initialGame)).toBe(false);
  });

  it("las claves del registro no se repiten (React las usa)", () => {
    let s = initialGame;
    for (const move of GAME_MOVES) s = reply(play(s, move.id));
    const keys = s.log.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
