import { siteUrl } from "@/core/config/env";

/**
 * Las tarjetas de enlace del sitio (plan §26, dirección A «La película»): el
 * titular de cada página sobre el marco del video con la luz del hero tocando
 * su filo. Solo textos que ya están en la página; nada nuevo.
 *
 * La de inicio es `src/app/opengraph-image.tsx`; las demás las sirve
 * `src/app/og/[card]/route.tsx`. Las dos pintan estos datos con
 * `src/app/_og/film-card.tsx`. Las rutas sin tarjeta propia usan la de inicio.
 */
export type OgCard = {
  /** Antetítulo en mayúsculas sobre el titular; la home no lleva. */
  kicker?: string;
  /** El titular en dos líneas: la primera en Nexa Heavy, la segunda en ExtraLight. */
  lines: readonly [string, string];
  /** Tamaño del titular en px: los titulares largos bajan para caber en 1080. */
  size: number;
  /** La línea bajo el titular. */
  sub: string;
  /** Dentro del marco: el chat (home) o una frase de la página. */
  frame: { kind: "chat" } | { kind: "line"; text: string };
  /** Texto alternativo: describe lo que se ve, no repite el título. */
  alt: string;
};

export const OG_CARDS = {
  "/": {
    lines: ["Vende en", "cada conversación."],
    size: 84,
    sub: "Prueba 7 días gratis · Sin tarjeta",
    frame: { kind: "chat" },
    alt: "Axi Connect: «Vende en cada conversación», sobre un marco de video con un anillo de luz y el chat de un cliente que pide un domicilio.",
  },
  "/precios": {
    kicker: "Precios",
    lines: ["Eliges las funciones", "y el volumen por separado."],
    size: 64,
    sub: "Empieza con 7 días gratis, sin tarjeta.",
    frame: { kind: "line", text: "Y te avisamos antes de que te sorprenda." },
    alt: "Precios de Axi Connect: «Eliges las funciones y el volumen por separado», sobre un marco de video con un anillo de luz.",
  },
  "/productos": {
    kicker: "Productos",
    lines: ["Escríbele.", "Mira cómo vende."],
    size: 84,
    sub: "Juega a ser tu cliente · Prueba 7 días gratis",
    frame: { kind: "chat" },
    alt: "Productos de Axi Connect: «Escríbele. Mira cómo vende.», sobre un marco de video con un anillo de luz y el chat de un cliente.",
  },
  "/contacto": {
    kicker: "Agenda tu demo",
    lines: ["Míralo funcionando con", "un negocio como el tuyo."],
    size: 64,
    sub: "30 minutos. Sin compromiso y sin diapositivas.",
    frame: {
      kind: "line",
      text: "Una venta completa, del «hola» al pago verificado, y el embudo que dice cuánto produjo.",
    },
    alt: "Demo de Axi Connect: «Míralo funcionando con un negocio como el tuyo», sobre un marco de video con un anillo de luz.",
  },
} as const satisfies Record<string, OgCard>;

export type OgCardPath = keyof typeof OG_CARDS;

export const OG_SIZE = { width: 1200, height: 630 } as const;

/**
 * La imagen de la tarjeta de una ruta, declarada de forma explícita en su
 * metadata (ver `OG_IMAGE` en `site.ts`: sin esto, una página con `openGraph`
 * propio se queda sin `og:image`). La de inicio vive en `/opengraph-image`; las
 * demás, en `/og/<ruta>` (`src/app/og/[card]/route.tsx`).
 */
export function ogImageFor(path: OgCardPath) {
  return {
    url: siteUrl(path === "/" ? "/opengraph-image" : `/og${path}`),
    ...OG_SIZE,
    alt: OG_CARDS[path].alt,
  };
}
