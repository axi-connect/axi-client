"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * El ancho de un elemento, al vuelo (ResizeObserver). `0` = aún no medido
 * (primer render o jsdom): quien lo usa decide qué suponer entonces.
 */
export function useElementWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const node = ref.current;
    if (node === null || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}
