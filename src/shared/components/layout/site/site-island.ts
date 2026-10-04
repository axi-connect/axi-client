/**
 * Qué dice la isla del nav (plan §18.1). Puro: el header solo lo pinta.
 *
 * - En la home la alimenta `film:chapter` de la película: el capítulo, «Capítulo
 *   n de 4» y el avance de la película en el anillo.
 * - Fuera de la home: el nombre de la página y cuánto se ha leído.
 */
import { SITE_ISLAND } from "@/shared/components/layout/site/site-nav.content";

export type IslandChapter = { chapter: string | null; index: number; total: number; progress: number };

export type IslandText = { title: string; sub: string; /** 0–1, el anillo. */ ring: number };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** El nombre de una ruta pública: la sección de primer nivel (`/casos/x` → «Casos»). */
export function pageName(pathname: string): string {
  const top = "/" + (pathname.split("/").filter(Boolean)[0] ?? "");
  return SITE_ISLAND.pages[top] ?? SITE_ISLAND.fallback;
}

/** La isla en la home, con el último `film:chapter` (o nada aún). */
export function islandOnFilm(c: IslandChapter | null): IslandText {
  if (!c || c.index < 0 || !c.chapter) return { title: SITE_ISLAND.start.title, sub: SITE_ISLAND.start.sub, ring: clamp01(c?.progress ?? 0) };
  return { title: c.chapter, sub: SITE_ISLAND.chapter(c.index + 1, c.total), ring: clamp01(c.progress) };
}

/** Cuánto se ha leído de un contenedor de scroll, de 0 a 1. */
export function readProgress(scrollTop: number, scrollHeight: number, clientHeight: number): number {
  const room = scrollHeight - clientHeight;
  return room > 0 ? clamp01(scrollTop / room) : 1;
}

/** La isla fuera de la home. */
export function islandOnPage(pathname: string, read: number): IslandText {
  const r = clamp01(read);
  return { title: pageName(pathname), sub: SITE_ISLAND.read(Math.round(r * 100)), ring: r };
}

/**
 * Una página fuera de la home puede tomar la isla mientras una escena suya
 * está en pantalla (/productos: «Juega a ser tu cliente · 3 de 7»). `null`
 * la devuelve a lo leído. Los avisos usan `film:activity`, como en la home.
 */
export const PAGE_ISLAND_EVENT = "site:island";
export type PageIslandDetail = IslandText | null;

/** A partir de cuántos px de scroll la barra se vuelve isla (§18.1: «unos 120 px»). */
export const ISLAND_AT = 120;
