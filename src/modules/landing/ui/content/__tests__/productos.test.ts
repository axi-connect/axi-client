import { AGENT_DEMO, AGENT_TOOLS, PRODUCTOS_HERO } from "@/modules/landing/ui/content/productos.content";

/**
 * Invariantes del contenido de `/productos`.
 *
 * La demo de `#agente` no muestra los nombres técnicos de las herramientas
 * —son vocabulario de desarrollador, no de dueño de negocio— pero cada beat
 * declara cuáles lo respaldan. Sin este test esa declaración sería un
 * comentario que nadie verifica: se podría inventar una herramienta que el
 * backend no tiene, o dejar un beat colgado de un mensaje que ya no existe,
 * y la página seguiría compilando y mintiendo.
 */
describe("contenido de /productos", () => {
  describe("beats de la demo del agente", () => {
    it("solo citan herramientas que existen en el registro del backend", () => {
      const real = new Set<string>(AGENT_TOOLS);
      const inventadas = AGENT_DEMO.beats.flatMap((beat) =>
        beat.tools.filter((tool) => !real.has(tool)),
      );
      expect(inventadas).toEqual([]);
    });

    it("apuntan a un mensaje que existe", () => {
      const fuera = AGENT_DEMO.beats.filter(
        (beat) => beat.atMessage < 0 || beat.atMessage >= AGENT_DEMO.messages.length,
      );
      expect(fuera).toEqual([]);
    });

    it("cuelgan de un mensaje del agente o del sistema, nunca del cliente", () => {
      // Un beat sobre una burbuja del cliente afirmaría que el agente hizo algo
      // en un turno en el que no habló.
      const malColgados = AGENT_DEMO.beats
        .map((beat) => ({ beat: beat.id, from: AGENT_DEMO.messages[beat.atMessage]?.from }))
        .filter((entry) => entry.from !== "agent" && entry.from !== "system");
      expect(malColgados).toEqual([]);
    });

    it("avanzan en el mismo orden que la conversación", () => {
      const indices = AGENT_DEMO.beats.map((beat) => beat.atMessage);
      expect(indices).toEqual([...indices].sort((a, b) => a - b));
      expect(new Set(indices).size).toBe(indices.length);
    });
  });

  it("la cifra de herramientas del hero deriva del registro, no está escrita a mano", () => {
    const tools = PRODUCTOS_HERO.stats.find((stat) => stat.id === "tools");
    expect(tools?.value).toBe(AGENT_TOOLS.length);
  });
});
