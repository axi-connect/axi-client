"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAlert } from "@/core/providers/alert-provider";

/**
 * Cambios sin guardar en la ficha (catálogo premium F3, inventario D.1 #14).
 * Cada sección guarda por su cuenta y avisa si está sucia; el hook junta esas
 * señales y protege las dos salidas:
 * - cerrar o recargar la pestaña: lo pregunta el navegador (`beforeunload`);
 * - el enlace de vuelta de la vista: confirmación antes de navegar.
 *
 * Antes no había ningún aviso y los cambios de Información se perdían en
 * silencio.
 */
export function useUnsavedGuard() {
  const router = useRouter();
  const { showModal, closeModal } = useAlert();
  const [dirtySections, setDirtySections] = useState<ReadonlySet<string>>(new Set());
  const setters = useRef(new Map<string, (dirty: boolean) => void>());
  const dirty = dirtySections.size > 0;

  /** Un `onDirtyChange` estable por sección (las secciones lo ponen en sus efectos). */
  const track = useCallback((section: string) => {
    let setter = setters.current.get(section);
    if (setter === undefined) {
      setter = (sectionDirty: boolean) =>
        setDirtySections((previous) => {
          if (previous.has(section) === sectionDirty) return previous;
          const next = new Set(previous);
          if (sectionDirty) next.add(section);
          else next.delete(section);
          return next;
        });
      setters.current.set(section, setter);
    }
    return setter;
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /** Navegar desde la vista: con cambios, se pregunta primero. */
  const leave = useCallback(
    (href: string) => {
      if (!dirty) {
        router.push(href);
        return;
      }
      showModal({
        title: "¿Salir sin guardar?",
        description: "Tienes cambios sin guardar en esta ficha. Si sales ahora, se pierden.",
        className: "sm:max-w-md",
        actions: [
          { label: "Seguir editando", variant: "outline", id: "unsaved-stay" },
          {
            label: "Salir sin guardar",
            variant: "destructive",
            keepOpen: true,
            id: "unsaved-leave",
            onClick: () => {
              closeModal();
              router.push(href);
            },
          },
        ],
      });
    },
    [closeModal, dirty, router, showModal],
  );

  return { dirty, track, leave };
}
