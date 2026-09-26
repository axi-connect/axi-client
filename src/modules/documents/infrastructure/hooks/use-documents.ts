"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { isHttpError } from "@/core/api/problem";
import type {
  DocumentDTO,
  DocumentSubject,
} from "@/modules/documents/domain/document";
import { sortDocuments } from "@/modules/documents/domain/document";
import { useDocumentsSocket } from "@/modules/documents/infrastructure/realtime/use-documents-socket";
import { listDocuments } from "@/modules/documents/infrastructure/services/documents-service.adapter";

export type DocumentsState = {
  documents: DocumentDTO[];
  loading: boolean;
  /** `gated`: sin la función o sin permiso — la sección no existe para este usuario. */
  error: "gated" | "failed" | null;
  refresh: () => Promise<void>;
  /** Pone o reemplaza un documento en la lista sin esperar al refetch (tras emitir). */
  upsert: (document: DocumentDTO) => void;
};

/**
 * Los documentos de una entidad, vivos: se recargan cuando el worker avisa
 * (`document.issued|failed`) y al reconectar el socket. El WS avisa, no
 * sincroniza — la verdad se vuelve a pedir.
 */
export function useDocuments(
  subject: DocumentSubject,
  enabled = true,
): DocumentsState {
  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<DocumentsState["error"]>(null);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const page = await listDocuments(subject, { page_size: 50 });
      if (!alive.current) return;
      setDocuments(sortDocuments(page.data));
      setError(null);
    } catch (caught: unknown) {
      if (!alive.current) return;
      const status = isHttpError(caught) ? caught.status : 0;
      // 403 (sin función, sin permiso) es silencio para el operador; el resto
      // deja rastro: si no, el fallo es invisible para él y para nosotros.
      setError(status === 403 ? "gated" : "failed");
      if (status !== 403)
        console.error("No se pudieron cargar los documentos", caught);
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [subject.kind, subject.id, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    alive.current = true;
    if (!enabled) return;
    setLoading(true);
    void refresh();
    return () => {
      alive.current = false;
    };
  }, [refresh, enabled]);

  useDocumentsSocket({
    enabled,
    concerns: (event) =>
      subject.kind === "order"
        ? event.order_id === subject.id
        : subject.kind === "payment"
          ? event.payment_id === subject.id
          : event.contact_id === subject.id,
    onChange: refresh,
  });

  const upsert = useCallback((document: DocumentDTO) => {
    setDocuments((current) =>
      sortDocuments([
        ...current.filter((existing) => existing.id !== document.id),
        document,
      ]),
    );
  }, []);

  return { documents, loading, error, refresh, upsert };
}
