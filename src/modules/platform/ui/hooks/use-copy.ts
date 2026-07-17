"use client";

/**
 * Copia al portapapeles con feedback "copiado" de 2 s. Único punto del panel
 * para este patrón (ProblemAlert, credenciales, IDs) — no duplicar.
 * Si el clipboard no está disponible (permisos/HTTP) falla en silencio:
 * el valor siempre queda visible para copiar a mano.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export function useCopy(): { copied: boolean; copy: (text: string) => Promise<void> } {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sin permiso de clipboard: no romper el flujo.
    }
  }, []);

  return { copied, copy };
}
