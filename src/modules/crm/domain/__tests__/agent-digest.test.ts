import type { AgentDigestCounts } from "@/modules/crm/domain/agent-digest";
import {
  agentDigestFigures,
  agentDigestTeaser,
  hasDigestNews,
  hasTeaserNews,
} from "@/modules/crm/domain/agent-digest";

function counts(over: Partial<AgentDigestCounts> = {}): AgentDigestCounts {
  return { reached: 0, replied: 0, converted: 0, calls_connected: 0, failed: 0, ...over };
}

describe("agentDigestFigures", () => {
  it("lo que acabó en compra va PRIMERO: es la única que dice si esto da dinero", () => {
    const figures = agentDigestFigures(counts({ reached: 12, replied: 4, converted: 2 }));
    expect(figures.map((figure) => figure.key)).toEqual(["converted", "reached", "replied"]);
    expect(figures[0]?.good).toBe(true);
  });

  it("una cifra en cero se cae de la línea", () => {
    // «0 respondieron» no es información, es ruido en una línea de resultados.
    const figures = agentDigestFigures(counts({ reached: 12 }));
    expect(figures.map((figure) => figure.key)).toEqual(["reached"]);
  });

  it("un cero nunca se pinta en verde", () => {
    expect(agentDigestFigures(counts({ reached: 3 })).some((f) => f.good === true)).toBe(false);
  });

  it("singular y plural, porque se lee como una frase", () => {
    expect(agentDigestFigures(counts({ reached: 1 }))[0]?.label).toBe("seguimiento");
    expect(agentDigestFigures(counts({ reached: 2 }))[0]?.label).toBe("seguimientos");
    expect(agentDigestFigures(counts({ replied: 1 }))[0]?.label).toBe("respondió");
    expect(agentDigestFigures(counts({ calls_connected: 1 }))[0]?.label).toBe("llamada atendida");
  });
});

describe("el resumen de la bandeja mezclada", () => {
  it("solo trae cuánto trabajo hizo y qué salió de ahí", () => {
    const figures = agentDigestTeaser(counts({ reached: 12, replied: 4, converted: 2 }));
    expect(figures.map((figure) => figure.key)).toEqual(["converted", "reached"]);
  });

  it("no se pinta por haber trabajado: hace falta un resultado o un fallo", () => {
    // Encima de una lista mayoritariamente humana, «12 seguimientos» sin
    // desenlace no justifica ocupar una línea.
    expect(hasTeaserNews(counts({ reached: 12 }))).toBe(false);
    expect(hasTeaserNews(counts({ reached: 12, converted: 1 }))).toBe(true);
    expect(hasTeaserNews(counts({ failed: 1 }))).toBe(true);
  });
});

describe("hasDigestNews", () => {
  it("un día sin nada no ocupa sitio", () => {
    expect(hasDigestNews(counts())).toBe(false);
  });

  it("un fallo SÍ es noticia aunque no haya salido nada", () => {
    expect(hasDigestNews(counts({ failed: 2 }))).toBe(true);
  });
});
