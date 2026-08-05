"use client";

import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LoaderCircle } from "lucide-react";
import { spring } from "@/core/styles/motion";
import { Button } from "@/shared/components/ui/button";

/**
 * Isla de acciones del borrador. Glass legítimo: es una superficie flotante
 * sobre el contenido (DESIGN-SYSTEM §5.2).
 *
 * No se muestra un contador de cambios a propósito: reordenar marca como
 * "sucios" casi todos los campos del array, así que cualquier número sería
 * engañoso.
 */
export function DirtyActionBar({
  saving,
  onSave,
  onDiscard,
  onPreview,
}: {
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onPreview: () => void;
}) {
  const reduceMotion = useReducedMotion();

  // ⌘S / Ctrl+S guarda sin salir del editor.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (!saving) onSave();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onSave, saving]);

  return (
    <motion.div
      initial={reduceMotion ? false : { y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={reduceMotion ? { duration: 0 } : spring.soft}
      className="glass sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 shadow-float"
    >
      <span className="flex items-center gap-2 text-sm" aria-live="polite">
        <span className="size-1.5 rounded-full bg-primary" aria-hidden />
        Cambios sin guardar
      </span>

      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" disabled={saving} onClick={onPreview}>
          Ver conversación
        </Button>
        <Button type="button" variant="ghost" disabled={saving} onClick={onDiscard}>
          Descartar
        </Button>
        <Button type="button" disabled={saving} onClick={onSave}>
          {saving ? (
            <>
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
              Guardando…
            </>
          ) : (
            <>
              Guardar
              <span className="ml-1 text-xs opacity-60">⌘S</span>
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
