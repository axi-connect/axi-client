import {
  AGENT_TOOLS,
  GAME,
  GAME_ABILITIES,
  GAME_MOVES,
  PIECES,
  PRODUCTOS_ALIASES,
  PRODUCTOS_ANCHORS,
  PRODUCTOS_TRIAL,
} from "@/modules/landing/ui/content/productos.content";
import * as CONTENT from "@/modules/landing/ui/content/productos.content";

/**
 * Invariantes del contenido de `/productos` (plan productos_juego_plan.md).
 *
 * El juego no muestra los nombres técnicos de las herramientas, pero cada
 * habilidad declara cuáles la respaldan. Sin este test esa declaración sería
 * un comentario que nadie verifica, y la página podría enseñar algo que el
 * backend no tiene sin dejar de compilar.
 */

/** Todos los textos del contenido, a cualquier profundidad (funciones aparte). */
function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => strings(v, out));
  return out;
}

describe("contenido de /productos", () => {
  describe("habilidades del juego", () => {
    it("solo citan herramientas que existen en el registro del backend", () => {
      const real = new Set<string>(AGENT_TOOLS);
      const inventadas = GAME_ABILITIES.flatMap((a) => a.tools.filter((t) => !real.has(t)).map((t) => `${a.id}: ${t}`));
      expect(inventadas).toEqual([]);
    });

    it("cada una tiene al menos una herramienta que la respalde", () => {
      expect(GAME_ABILITIES.filter((a) => a.tools.length === 0).map((a) => a.id)).toEqual([]);
    });

    it("cada jugada descubre una habilidad que existe, y solo el CRM se descubre solo", () => {
      const abilities = new Set(GAME_ABILITIES.map((a) => a.id));
      expect(GAME_MOVES.filter((m) => !abilities.has(m.id)).map((m) => m.id)).toEqual([]);
      const sinJugada = GAME_ABILITIES.filter((a) => !GAME_MOVES.some((m) => m.id === a.id)).map((a) => a.id);
      expect(sinJugada).toEqual(["crm"]);
      expect(GAME.crmAfterMoves).toBeLessThanOrEqual(GAME_MOVES.length);
    });
  });

  describe("conversación del juego", () => {
    const all = GAME_MOVES.flatMap((m) => [...m.customer, ...m.reply]);

    it("las notas de voz sirven desde /assets/, que es lo único que el middleware deja pasar", () => {
      // `/audio/` NO está excluido del matcher de `src/middleware.ts`: un
      // visitante sin sesión recibiría un 307 al login en vez del MP3.
      const malUbicadas = all.filter((m) => m.kind === "voice" && !m.audio.src.startsWith("/assets/"));
      expect(malUbicadas).toEqual([]);
    });

    it("las notas de voz traen transcripción", () => {
      expect(all.filter((m) => m.kind === "voice" && m.text.trim() === "")).toEqual([]);
    });

    it("respeta la regla espejo: Axi responde en voz solo a quien le habló en voz", () => {
      const sinDetonante = GAME_MOVES.filter((m) => m.reply.some((r) => r.kind === "voice") && !m.customer.some((c) => c.kind === "voice"));
      expect(sinDetonante.map((m) => m.id)).toEqual([]);
    });

    it("las imágenes salen de /images/, la única carpeta de imágenes pública", () => {
      const imgs = all.flatMap((m) => ("imageSrc" in m && m.imageSrc ? [m.imageSrc] : []));
      expect(imgs.length).toBeGreaterThan(0);
      expect(imgs.filter((src) => !src.startsWith("/images/"))).toEqual([]);
    });

    it("el pago lo verifica una persona: ningún mensaje lo da por confirmado", () => {
      const textos = strings(all).join(" ").toLowerCase();
      expect(textos).toContain("lo verifica tu equipo");
      expect(textos).not.toMatch(/pago (verificado|confirmado)/);
    });
  });

  describe("honestidad", () => {
    // Revisión de cinematic-landing-page (INVENTARIO §2.2): lo que no se promete.
    const vetadas = [
      /pasarela/i,
      /factura/i,
      /en vivo/i,
      /responde de verdad/i,
      /garantiza/i,
      /\bERP\b/,
      /\bQR\b/,
      /cierra (pedidos|la venta) con (talla|variante)/i,
    ];

    it("ningún texto de la página usa una promesa vetada", () => {
      const textos = strings(CONTENT);
      const hallazgos = vetadas.flatMap((re) => textos.filter((t) => re.test(t)).map((t) => `${re} → «${t}»`));
      expect(hallazgos).toEqual([]);
    });

    it("las piezas con cifras llevan la marca de datos de ejemplo", () => {
      const conCifras = ["crm", "llamadas", "cobros", "medicion"];
      expect(PIECES.filter((p) => conCifras.includes(p.id) && !p.sample).map((p) => p.id)).toEqual([]);
    });
  });

  describe("enlaces", () => {
    it("la conversión lleva a la prueba con su origen", () => {
      expect(PRODUCTOS_TRIAL.href).toMatch(/^\/comenzar\?plan=free_trial&origen=productos$/);
    });

    it("anclas, piezas y alias no se pisan entre sí", () => {
      const ids = [...Object.values(PRODUCTOS_ANCHORS), ...PIECES.map((p) => p.id), ...Object.keys(PRODUCTOS_ALIASES)];
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
