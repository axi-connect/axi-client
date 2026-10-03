"use client";

import { useEffect } from "react";

import { PIECES, PIECES_SCENE, PRODUCTOS_ALIASES, PRODUCTOS_ANCHORS } from "@/modules/landing/ui/content/productos.content";
import { GAME_HINT_EVENT } from "./game/game-state";

const PIECE_IDS = new Set<string>(PIECES.map((p) => p.id));

/**
 * Los enlaces del menú caen en su pieza exacta (plan §5.1). Una pestaña de
 * «Pieza por pieza» no es una sección visible por sí sola: el hash lleva a
 * `#piezas` y se pide abrir la pestaña. Un alias (#reconocimiento) lleva a su
 * escena y resalta la jugada. El resto, scroll nativo.
 */
export function resolveHash(hash: string): { scene: string; piece?: string; move?: string } | null {
  const id = decodeURIComponent(hash.replace(/^#/, ""));
  if (!id) return null;
  if (PIECE_IDS.has(id)) return { scene: PRODUCTOS_ANCHORS.pieces, piece: id };
  const alias = PRODUCTOS_ALIASES[id];
  if (alias) return { scene: alias.scene, move: alias.move };
  return null;
}

export function ProductosHashRouter() {
  useEffect(() => {
    const go = (smooth: boolean) => {
      const target = resolveHash(window.location.hash);
      if (!target) return;
      const scene = document.getElementById(target.scene);
      if (!scene) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      scene.scrollIntoView({ behavior: smooth && !reduced ? "smooth" : "auto", block: "start" });
      if (target.piece) window.dispatchEvent(new CustomEvent(PIECES_SCENE.event, { detail: { id: target.piece } }));
      if (target.move) window.dispatchEvent(new CustomEvent(GAME_HINT_EVENT, { detail: { id: target.move } }));
    };
    // Al cargar, tras pintar: las islas ya escuchan sus eventos.
    const raf = requestAnimationFrame(() => go(false));
    const onHash = () => go(true);
    window.addEventListener("hashchange", onHash);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("hashchange", onHash);
    };
  }, []);
  return null;
}
