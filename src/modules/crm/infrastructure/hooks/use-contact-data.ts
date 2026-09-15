"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "@/core/lib/error-messages";
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";
import type { ContactDataDTO, ContactFieldReviewBody } from "@/modules/crm/domain/contact-data";
import {
  getContactData,
  reviewContactField,
} from "@/modules/crm/infrastructure/services/contacts-service.adapter";
import { getTenantUserNames } from "@/modules/crm/infrastructure/services/tenant-users.cache";

/** Cuánto dura el resaltado de una fila que acaba de cambiar por WebSocket. */
export const CHANGED_HIGHLIGHT_MS = 2400;

export interface ContactDataState {
  data: ContactDataDTO | null;
  loading: boolean;
  error: string | null;
  /** `actor_user_id` → nombre visible («Isabel»); vacío si no se pudo resolver. */
  actorNames: Map<string, string>;
  /** `code`s que acaban de cambiar por `contact.updated`; se vacía solo. */
  changedCodes: ReadonlySet<string>;
  reload: () => void;
  /**
   * Revisa un dato y reemplaza `data` con la proyección que devuelve el
   * backend. Propaga el error: quien llama decide cómo avisar.
   */
  review: (code: string, body: ContactFieldReviewBody) => Promise<void>;
}

/**
 * «Datos del cliente» de un contacto, en vivo.
 *
 * - Fetch con guard anti-carrera: solo se aplica la respuesta de la última
 *   consulta (cambiar de contacto en el inbox dispara varias seguidas).
 * - `contact.updated` en `/inbox` → re-consulta y marca las filas cambiadas
 *   para que el panel las resalte sin recargar (vista «En vivo» del mockup).
 * - Los nombres de los operadores salen de la caché compartida de usuarios del
 *   tenant (una petición por sesión); si falla, la UI cae a «Operador».
 */
export function useContactData(contactId: string, conversationId?: string): ContactDataState {
  const [data, setData] = useState<ContactDataDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actorNames, setActorNames] = useState<Map<string, string>>(() => new Map());
  const [changedCodes, setChangedCodes] = useState<ReadonlySet<string>>(() => new Set());
  const requestSeq = useRef(0);
  const [reloadToken, setReloadToken] = useState(0);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const fresh = await getContactData(contactId, conversationId);
        if (seq !== requestSeq.current) return;
        setData(fresh);
        setLoading(false);
      } catch (err) {
        if (seq !== requestSeq.current) return;
        setError(errorMessage(err, "No se pudieron cargar los datos del cliente"));
        setLoading(false);
      }
    })();
  }, [contactId, conversationId, reloadToken]);

  // Nombres de los operadores: una vez, compartido con el resto del CRM.
  useEffect(() => {
    let cancelled = false;
    void getTenantUserNames().then((names) => {
      if (!cancelled) setActorNames(names);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const { socket } = useSocket("inbox");
  useSocketEvent(socket, "contact.updated", (payload) => {
    if (payload.contact_id !== contactId) return;
    setChangedCodes(new Set(payload.changes.map((change) => change.code)));
    if (highlightTimer.current !== null) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setChangedCodes(new Set()), CHANGED_HIGHLIGHT_MS);
    reload();
  });

  useEffect(
    () => () => {
      if (highlightTimer.current !== null) clearTimeout(highlightTimer.current);
    },
    [],
  );

  const review = useCallback(
    async (code: string, body: ContactFieldReviewBody) => {
      const fresh = await reviewContactField(contactId, code, body);
      // La revisión gana a cualquier fetch en vuelo: es lo último que hizo el usuario.
      requestSeq.current += 1;
      setData(fresh);
      setError(null);
      setLoading(false);
    },
    [contactId],
  );

  return { data, loading, error, actorNames, changedCodes, reload, review };
}
