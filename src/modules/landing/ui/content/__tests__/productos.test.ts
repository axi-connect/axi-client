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

  describe("notas de voz de la demo", () => {
    const voces = AGENT_DEMO.messages.filter((message) => message.kind === "voice");

    it("hay un intercambio de voz que enseñar", () => {
      expect(voces.length).toBeGreaterThan(0);
    });

    it("sirven desde /assets/, que es lo único que el middleware deja pasar", () => {
      // `/audio/` NO está excluido del matcher de `src/middleware.ts`: en una
      // página pública un visitante sin sesión recibiría un 307 al login en
      // vez del MP3, y el fallo sería mudo.
      const malUbicadas = voces.filter((message) => !message.audio.src.startsWith("/assets/"));
      expect(malUbicadas).toEqual([]);
    });

    it("traen transcripción: la conversación se sigue sin oír nada", () => {
      const sinTexto = voces.filter((message) => message.text.trim() === "");
      expect(sinTexto).toEqual([]);
    });

    it("respetan la regla espejo del producto", () => {
      // El agente responde con nota de voz SOLO cuando el cliente le habla con
      // audio. Una nota de voz suya sin un audio del cliente justo antes
      // anunciaría un comportamiento que el producto no tiene.
      const sinDetonante = AGENT_DEMO.messages
        .map((message, index) => ({ message, previa: AGENT_DEMO.messages[index - 1] }))
        .filter(({ message }) => message.kind === "voice" && message.from === "agent")
        .filter(({ previa }) => previa?.kind !== "voice" || previa.from !== "customer")
        .map(({ message }) => message.id);
      expect(sinDetonante).toEqual([]);
    });
  });

  it("la cifra de herramientas del hero deriva del registro, no está escrita a mano", () => {
    const tools = PRODUCTOS_HERO.stats.find((stat) => stat.id === "tools");
    expect(tools?.value).toBe(AGENT_TOOLS.length);
  });
});
