/**
 * Diagnóstico de `/overview`: el vendedor marca con el cliente lo que le pasa, y las láminas que responden a eso
 * quedan señaladas («tu caso») en la ruta y en el índice. Va en la URL (`?caso=tarde,excel`) para que el vendedor
 * pueda mandar el enlace ya marcado después de la llamada, sin backend ni sesión.
 */
import { SLIDES, type Slide } from "./slides";

export type CaseTag = "tarde" | "disperso" | "excel" | "seguimiento" | "sistemas" | "control" | "clientes" | "meta";

export const CASES: readonly { readonly tag: CaseTag; readonly label: string }[] = [
  { tag: "tarde", label: "Respondo tarde o fuera de horario" },
  { tag: "disperso", label: "Pedidos por WhatsApp, redes y la tienda, cada uno por su lado" },
  { tag: "excel", label: "Mis clientes están en un Excel o un cuaderno" },
  { tag: "seguimiento", label: "Nadie hace seguimiento a las cotizaciones" },
  { tag: "sistemas", label: "Mi tienda, mi ERP y mis pagos no se hablan" },
  { tag: "control", label: "Me da miedo que una IA invente precios" },
  { tag: "clientes", label: "Necesito clientes nuevos" },
  { tag: "meta", label: "No sé si voy a llegar a la meta del mes" },
];

const VALID = new Set<string>(CASES.map((c) => c.tag));

/** Parámetro `caso` de la URL → casos válidos, sin repetidos y en el orden de `CASES`. Lo desconocido se ignora. */
export function parseCases(raw: string | null | undefined): CaseTag[] {
  if (!raw) return [];
  const wanted = new Set(raw.split(",").map((s) => s.trim().toLowerCase()).filter((s) => VALID.has(s)));
  return CASES.map((c) => c.tag).filter((tag) => wanted.has(tag));
}

/** Casos → valor del parámetro `caso` (vacío si no hay ninguno). */
export function serializeCases(cases: readonly CaseTag[]): string {
  return parseCases(cases.join(",")).join(",");
}

export function toggleCase(cases: readonly CaseTag[], tag: CaseTag): CaseTag[] {
  return cases.includes(tag) ? cases.filter((c) => c !== tag) : parseCases([...cases, tag].join(","));
}

export function respondsTo(slide: Slide, cases: readonly CaseTag[]): boolean {
  return (slide.tags ?? []).some((tag) => cases.includes(tag));
}

/** Cuántas láminas responden a lo marcado (el pie del diagnóstico lo cuenta). */
export function markedSlideCount(cases: readonly CaseTag[], slides: readonly Slide[] = SLIDES): number {
  return slides.filter((slide) => respondsTo(slide, cases)).length;
}
