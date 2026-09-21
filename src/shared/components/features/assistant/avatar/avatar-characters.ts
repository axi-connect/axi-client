/**
 * Los personajes del kit: la geometría que distingue a uno de otro.
 *
 * TypeScript puro (sin React, sin DOM), como `avatar-rig.ts`. El rig —poses,
 * párpados, boca, mirada, gestos— es el mismo para todos; lo que cambia por
 * personaje es la silueta del cuerpo, la forma del ojo, su inclinación y el
 * ancho de la boca. Los **landmarks son fijos**: los ojos viven en `cy 47` y el
 * labio en `y 60` porque los `transform-origin` del CSS (`globals.css`, bloque
 * `.assistant-avatar`) están cableados a esos puntos; un personaje que moviera
 * los ojos rompería el parpadeo y la boca «viajaría» al hablar.
 *
 * `lumo` es la cara de Axel y Alba y son, literal, los números que ya estaban
 * en `AssistantAvatar.tsx`: hay un test que lo fija bit a bit. Los otros tres
 * (`cloudee`, `nova`, `strobi`) son los personajes de plataforma para los
 * agentes IA, reautorados aquí desde cero (mockup `agent-studio.html`,
 * aprobado 2026-09-21). No hay ni un byte de Avatar Lab: es AGPL.
 */

export type AssistantCharacter = "lumo" | "cloudee" | "nova" | "strobi";

export const ASSISTANT_CHARACTERS: readonly AssistantCharacter[] = ["lumo", "cloudee", "nova", "strobi"];

export function isAssistantCharacter(value: unknown): value is AssistantCharacter {
  return typeof value === "string" && (ASSISTANT_CHARACTERS as readonly string[]).includes(value);
}

/**
 * El color del cuerpo, por código. El material (los hex) vive en `globals.css`
 * bajo `.assistant-avatar[data-color=…]`; aquí solo el vocabulario. Se guarda el
 * código, nunca un hex: si un tono cambia, cambian todos los agentes.
 */
export type AssistantAvatarColor = "white" | "cloud" | "coral" | "amber" | "violet" | "mint" | "sky" | "rose";

export const ASSISTANT_AVATAR_COLORS: readonly AssistantAvatarColor[] = [
  "white",
  "cloud",
  "coral",
  "amber",
  "violet",
  "mint",
  "sky",
  "rose",
];

export function isAssistantAvatarColor(value: unknown): value is AssistantAvatarColor {
  return typeof value === "string" && (ASSISTANT_AVATAR_COLORS as readonly string[]).includes(value);
}

/** Una pieza del cuerpo. Varias piezas se pintan con el MISMO gradiente en espacio de usuario, así que se leen como una sola. */
export type BodyShape =
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number }
  | { kind: "circle"; cx: number; cy: number; r: number }
  | { kind: "path"; d: string };

export interface CharacterGeometry {
  body: readonly BodyShape[];
  eye: {
    rx: number;
    ry: number;
    /** Inclinación del ojo en grados, espejada entre los dos (0 = vertical). */
    cant: number;
    /** Dónde cae el brillo respecto al centro del ojo. */
    glintDx: number;
    glintDy: number;
  };
  mouth: {
    /** Medio ancho del arco, desde x=50. */
    halfW: number;
    /** Profundidad del arco (positivo = sonrisa; la expresión lo escala). */
    depth: number;
    openRx: number;
    openRy: number;
  };
  /** Solo Lumo lleva la diadema: es lo que distingue a Alba de Axel. */
  headset: boolean;
}

/** Línea del labio y apertura: fijas para todo personaje (ver cabecera). */
export const AVATAR_EYE_CY = 47;
export const AVATAR_LIP_Y = 60;

export const CHARACTER_GEOMETRY: Readonly<Record<AssistantCharacter, CharacterGeometry>> = {
  // Arcilla blanca mate, familia de Lumo. Cifras de `AssistantAvatar.tsx` del 2026-09-15.
  lumo: {
    body: [{ kind: "ellipse", cx: 50, cy: 50, rx: 37, ry: 34.5 }],
    eye: { rx: 4.3, ry: 5.8, cant: 0, glintDx: -1.4, glintDy: -2.6 },
    mouth: { halfW: 7, depth: 7, openRx: 3.2, openRy: 2.1 },
    headset: true,
  },
  // Nube de cuatro lóbulos: base ancha y tres bultos (el del centro más alto), ojos de píldora, boca corta.
  cloudee: {
    body: [
      { kind: "ellipse", cx: 50, cy: 58, rx: 36, ry: 20 },
      { kind: "circle", cx: 31, cy: 46, r: 15 },
      { kind: "circle", cx: 53, cy: 38, r: 19 },
      { kind: "circle", cx: 72, cy: 46, r: 14 },
    ],
    eye: { rx: 3.4, ry: 6.6, cant: 0, glintDx: -1.1, glintDy: -3 },
    mouth: { halfW: 4.6, depth: 4.4, openRx: 2.4, openRy: 1.6 },
    headset: false,
  },
  // Huevo: más estrecho arriba, ojos altos y ligeramente inclinados hacia dentro.
  nova: {
    body: [{ kind: "path", d: "M50 11 C68 11 84 32 84 56 C84 77 69 90 50 90 C31 90 16 77 16 56 C16 32 32 11 50 11 Z" }],
    eye: { rx: 4.2, ry: 7.4, cant: 7, glintDx: -1.4, glintDy: -3.3 },
    mouth: { halfW: 6, depth: 6, openRx: 3, openRy: 2 },
    headset: false,
  },
  // Esfera: ojos algo más redondos y anchos.
  strobi: {
    body: [{ kind: "circle", cx: 50, cy: 50, r: 36 }],
    eye: { rx: 4.6, ry: 6.2, cant: 0, glintDx: -1.5, glintDy: -2.8 },
    mouth: { halfW: 6.5, depth: 6.5, openRx: 3.1, openRy: 2 },
    headset: false,
  },
};

/** El arco de la boca en reposo; la expresión lo escala por `scaleY` desde el labio. */
export function mouthPath(mouth: CharacterGeometry["mouth"]): string {
  return `M${String(50 - mouth.halfW)} ${String(AVATAR_LIP_Y)} Q50 ${String(AVATAR_LIP_Y + mouth.depth)} ${String(50 + mouth.halfW)} ${String(AVATAR_LIP_Y)}`;
}

/** Centro de la apertura: crece hacia abajo desde el labio, detrás del trazo. */
export function mouthOpenCy(mouth: CharacterGeometry["mouth"]): number {
  return Math.round((AVATAR_LIP_Y + mouth.openRy + 0.2) * 10) / 10;
}
