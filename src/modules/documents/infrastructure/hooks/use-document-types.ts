"use client";

import { useEffect, useState } from "react";

import type { DocumentTypeView } from "@/modules/documents/domain/template";
import { listDocumentTypes } from "@/modules/documents/infrastructure/services/documents-service.adapter";

let cached: Promise<DocumentTypeView[]> | null = null;

/**
 * El catálogo de tipos por el wire, pedido UNA vez por sesión de la pestaña:
 * es constante para el tenant y lo consultan el menú «Emitir» de cada rail
 * abierto y la ficha del contacto. Si falla, la promesa se suelta para que el
 * siguiente que lo pida vuelva a intentarlo.
 */
export function useDocumentTypes(enabled = true): {
  types: DocumentTypeView[] | null;
  failed: boolean;
} {
  const [types, setTypes] = useState<DocumentTypeView[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    cached ??= listDocumentTypes().then((catalog) => catalog.types);
    cached
      .then((result) => {
        if (alive) setTypes(result);
      })
      .catch(() => {
        cached = null;
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [enabled]);

  return { types, failed };
}

/** Solo para tests: olvida el catálogo cacheado. */
export function resetDocumentTypesCache(): void {
  cached = null;
}
