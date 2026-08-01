"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "@/core/lib/error-messages";
import type {
  ContactDTO,
  ContactProfileDTO,
  ContactTagDTO,
} from "@/modules/crm/domain/contact";
import {
  getContact,
  getContactProfile,
  getContactTags,
} from "@/modules/crm/infrastructure/services/contacts-service.adapter";
import { getTenantUserNames } from "@/modules/crm/infrastructure/services/tenant-users.cache";

/**
 * Contexto completo de un contacto para paneles de solo lectura (rail del
 * inbox, futuras vistas 360).
 *
 * El backend NO tiene endpoint agregado: contacto, profile (score/owner) y
 * etiquetas viven en tres recursos con permisos distintos — `contacts:read`
 * para el primero y `crm:read` para los otros dos. Por eso el fan-out va con
 * `Promise.allSettled`: un 403 en profile/tags DEGRADA el panel (se oculta el
 * score, las etiquetas y el responsable) en vez de vaciarlo. Solo el fallo del
 * contacto se considera error.
 */

export interface ContactContext {
  contact: ContactDTO | null;
  profile: ContactProfileDTO | null;
  tags: ContactTagDTO[];
  /** Nombre del responsable comercial; null si no hay o no se pudo resolver. */
  ownerName: string | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useContactContext(contactId: string | null, version = 0): ContactContext {
  const [contact, setContact] = useState<ContactDTO | null>(null);
  const [profile, setProfile] = useState<ContactProfileDTO | null>(null);
  const [tags, setTags] = useState<ContactTagDTO[]>([]);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Guard anti-carrera: solo se aplica la respuesta de la última consulta.
  const requestSeq = useRef(0);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    if (contactId === null) {
      setContact(null);
      setProfile(null);
      setTags([]);
      setOwnerName(null);
      setError(null);
      setLoading(false);
      return;
    }

    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);

    void (async () => {
      const [contactRes, profileRes, tagsRes] = await Promise.allSettled([
        getContact(contactId),
        getContactProfile(contactId),
        getContactTags(contactId),
      ]);
      if (seq !== requestSeq.current) return;

      if (contactRes.status === "rejected") {
        setContact(null);
        setError(errorMessage(contactRes.reason, "No se pudo cargar el contacto"));
        setLoading(false);
        return;
      }

      setContact(contactRes.value);
      const nextProfile = profileRes.status === "fulfilled" ? profileRes.value : null;
      setProfile(nextProfile);
      setTags(tagsRes.status === "fulfilled" ? tagsRes.value : []);
      setLoading(false);

      const ownerId = nextProfile?.owner_user_id ?? null;
      if (ownerId === null) {
        setOwnerName(null);
        return;
      }
      const names = await getTenantUserNames();
      if (seq !== requestSeq.current) return;
      setOwnerName(names.get(ownerId) ?? null);
    })();
  }, [contactId, version, reloadToken]);

  return { contact, profile, tags, ownerName, loading, error, reload };
}
