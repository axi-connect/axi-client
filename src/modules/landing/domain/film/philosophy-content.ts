/**
 * «Vendemos progreso» (lienzo aprobado por la dueña el 2026-10-01, tableros
 * Philosophy y PhilosophyMobile): la filosofía de Axi en tres pilares, uno por
 * cinta del isotipo. Textos tal cual del lienzo.
 *
 * La pieza de cada pilar es la cinta del isotipo de su color (`ribbon`), con el
 * path EXACTO de BRAND_RIBBONS, escala uniforme y sin rotar (plan §18).
 */

export type PhilosophyRibbon = "coral" | "amber" | "violet";

export type PhilosophyPillar = {
  n: string;
  name: string;
  ribbon: PhilosophyRibbon;
  /** Nombre del tono, como lo rotula la pieza. */
  tone: string;
  strong: string;
  thin: string;
  body: string;
  modules: readonly string[];
  /** «Ver «…»»: adónde lleva dentro de la película. */
  intent: string;
  href: string;
};

export const PHILOSOPHY = {
  eyebrow: "Lo que hace Axi",
  strong: ["Vendemos", "progreso."],
  thin: "Y se nota en tres lugares.",
  lead: "En tu cuenta, en tu marca y en tu día. Cada parte de Axi trabaja para uno de los tres.",
  splitCaption: "Tres piezas · un solo sistema",
  mobileHint: "Desliza para ver los tres",
  pillars: [
    {
      n: "01",
      name: "Prosperidad",
      ribbon: "coral",
      tone: "Coral",
      strong: "Vende más.",
      thin: "Gasta menos.",
      body: "Tu agente cotiza con tus precios reales, cierra dentro del chat y cobra sin perseguir a nadie. Más ventas en cada conversación y menos horas de tu equipo en cada una.",
      modules: ["Agente vendedor", "Cobros y documentos", "Catálogo y pedidos"],
      intent: "Vender y cobrar",
      href: "#vender",
    },
    {
      n: "02",
      name: "Crecimiento",
      ribbon: "amber",
      tone: "Ámbar",
      strong: "Que te encuentren.",
      thin: "Que vuelvan.",
      body: "Axel propone cada mañana qué hacer, el radar te trae a quien sí te va a comprar y mides en pesos qué funcionó. Tu marca deja de depender de la suerte.",
      modules: ["Axel", "Captación de leads", "Medición en pesos"],
      intent: "Crecer",
      href: "#crecer",
    },
    {
      n: "03",
      name: "Libertad",
      ribbon: "violet",
      tone: "Violeta",
      strong: "Tu tiempo",
      thin: "vuelve a ser tuyo.",
      body: "WhatsApp, Instagram, llamadas y agenda se atienden de día y de noche. Tu equipo entra cuando hace falta criterio, no para responder lo mismo cien veces.",
      modules: ["Inbox compartido", "Llamadas", "Agenda y citas"],
      intent: "Atender",
      href: "#equipo",
    },
  ] satisfies readonly PhilosophyPillar[],
} as const;

/**
 * La pista horizontal en escritorio (px): la intro ocupa la ventana y cada pilar
 * 1100 px. Las capas se mueven a velocidades distintas: palabras al 0,6x, texto
 * al 1x, la pieza de la intro al 0,8x y las piezas de los pilares al 1,22x.
 */
export const PHILOSOPHY_TRACK = { pillar: 1100, words: 0.6, text: 1, introPiece: 0.8, pieces: 1.22 } as const;

/**
 * Cuánto recorre la pista para una ventana de ancho `vw`: hasta que el último
 * pilar queda centrado.
 */
export function philosophyTravel(vw: number, pillars = PHILOSOPHY.pillars.length): number {
  const last = vw + (pillars - 1) * PHILOSOPHY_TRACK.pillar;
  return Math.max(0, last - (vw - PHILOSOPHY_TRACK.pillar) / 2);
}
