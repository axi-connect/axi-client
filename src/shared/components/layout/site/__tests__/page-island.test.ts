import { nextPageIsland, type PageIslandDetail } from "@/shared/components/layout/site/site-island";

/** La isla de página: al cruzar entre escenas, el orden de los mensajes no puede dejarla en «% leído». */
const game: PageIslandDetail = { source: "game", text: { title: "Juega a ser tu cliente", sub: "3 de 7", ring: 3 / 7 } };
const pieces: PageIslandDetail = { source: "pieces", text: { title: "Pieza por pieza", sub: "Cobros · 6 de 7", ring: 6 / 7 } };

describe("nextPageIsland", () => {
  it("una escena que entra toma la isla", () => {
    expect(nextPageIsland(null, game)).toBe(game);
    expect(nextPageIsland(game, pieces)).toBe(pieces);
  });

  it("la que sale la suelta solo si es suya: el orden del cruce no importa", () => {
    // Entra la nueva y luego sale la vieja (orden natural).
    expect(nextPageIsland(nextPageIsland(game, pieces), { source: "game", text: null })).toBe(pieces);
    // Sale la vieja y luego entra la nueva.
    expect(nextPageIsland(nextPageIsland(game, { source: "game", text: null }), pieces)).toBe(pieces);
  });

  it("al salir de la última escena, la isla vuelve a la página", () => {
    expect(nextPageIsland(pieces, { source: "pieces", text: null })).toBeNull();
  });
});
