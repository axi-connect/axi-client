/**
 * Textos fijos de foto, llamada, bóveda y equipo (plan §13). Lo que cambia por
 * nicho vive en `film-content.ts`; aquí solo lo que no estaba escrito en otro
 * sitio. El cupón impreso de la bóveda se DERIVA de `vault.answer` de cada
 * nicho (un test exige que su total aparezca literal en esa frase).
 */
import type { FilmNiche } from "./niches";

export const FILM_PHOTO = {
  eyebrow: "Vender",
  title: "Una foto",
  titleThin: "basta.",
  lead: "Tu cliente manda una captura y Axi encuentra el producto exacto en tu catálogo.",
  source: "publicación",
  caption: "Captura enviada por el cliente",
  recognized: "Reconocido",
  /** «iPhone 17 · 256 GB · similitud 0,93». */
  match: (name: string, similarity: string) => `${name} · similitud ${similarity}`,
  similarity: (similarity: string) => `Similitud ${similarity}`,
  time: "8:51 p. m.",
} as const;

export const FILM_VAULT = {
  eyebrow: "Vender, con reglas",
  title: "Nunca inventa",
  titleThin: "un precio.",
  lead: "Precios, cupones y totales salen de tu sistema, no de la IA. Y ningún pago se da por hecho sin tu equipo.",
  rules: [
    ["Precio", "de tu catálogo"],
    ["Descuento", "solo con un cupón válido"],
    ["Total", "lo calcula el sistema"],
    ["Pago", "lo confirma tu equipo"],
  ],
  answerNote: "precio y total del sistema",
} as const;

/** El cupón que se imprime bajo la etiqueta: lo mismo que dice la respuesta de Axi. */
export type VaultReceipt = { line: string; note: string; totalLabel: string; total: string };

export const VAULT_RECEIPTS: Record<FilmNiche, VaultReceipt> = {
  restaurants: { line: "Cupón VIERNES10", note: "−10 %", totalLabel: "Total del sistema", total: "$ 35.010" },
  tech: { line: "Cupón OCTUBRE10", note: "−10 %", totalLabel: "Total del sistema", total: "$ 4.409.100" },
  beauty: { line: "Cupón PRIMERAVEZ", note: "primera cita", totalLabel: "Total del sistema", total: "$ 162.000" },
  b2b: { line: "Precio por volumen", note: "desde 500 cajas", totalLabel: "Para 200 cajas, por caja", total: "$ 24.500" },
};

export const FILM_TEAM = {
  eyebrow: "Vender, en equipo",
  title: "Cuando hace falta una persona,",
  titleThin: "entra tu equipo.",
  lead: "El cliente no nota el cambio. Cuando se la devuelves, Axi sigue donde quedó.",
  modes: ["Axi atiende", "En cola · 1 min", "Contigo"],
  modesLabel: "Quién atiende la conversación",
  inbox: "Bandeja",
  /** Las otras conversaciones de la bandeja: Axi las sigue atendiendo. */
  others: ["Valeria Ríos", "Camilo Díaz", "Luisa Mejía"],
  othersLast: "Axi: listo, va en camino",
  handoff: "Axi te la pasó: el cliente pidió hablar con una persona · hace 1 min",
  handoffShort: "Axi te la pasó · hace 1 min",
  back: "Volvió a Axi: sigue donde quedó",
  returnTo: "Devolver a Axi",
  /** «Escribe como Laura…». */
  composer: (operator: string) => `Escribe como ${operator}…`,
  askTime: "10:31 a. m.",
  replyTime: "10:32 a. m.",
} as const;
