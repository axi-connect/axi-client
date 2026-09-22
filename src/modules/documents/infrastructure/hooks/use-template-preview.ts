"use client";

import { useEffect, useRef, useState } from "react";

import { errorMessage } from "@/core/lib/error-messages";
import { previewDocumentTemplate } from "@/modules/documents/infrastructure/services/documents-service.adapter";
import {
  templateHash,
  type DocumentsSettingsDTO,
  type TemplateDocument,
} from "@/modules/documents/domain/template";

export type PreviewStatus = "idle" | "loading" | "ready" | "error" | "blocked";

export interface TemplatePreview {
  /** El ÚLTIMO HTML bueno: nunca desaparece mientras se actualiza o falla. */
  html: string | null;
  status: PreviewStatus;
  error: string | null;
  retry: () => void;
}

export const PREVIEW_DEBOUNCE_MS = 500;

/**
 * La vista previa del documento, pedida al servidor con disciplina (F7 Cobros):
 * debounce de 500 ms tras el último cambio, aborto de la petición en vuelo,
 * salto si la plantilla no cambió (huella) y NINGUNA llamada mientras haya
 * variables desconocidas (`blocked`): ese 422 ya lo conoce el cliente. La
 * previa es la misma cadena que el PDF, así que lo que se ve es lo que sale.
 */
export function useTemplatePreview(input: {
  type: string;
  template: TemplateDocument | null;
  issuer?: Partial<DocumentsSettingsDTO["issuer"]>;
  blocked: boolean;
  enabled: boolean;
}): TemplatePreview {
  const { type, template, issuer, blocked, enabled } = input;
  const [html, setHtml] = useState<string | null>(null);
  const [status, setStatus] = useState<PreviewStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const lastHash = useRef<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  const hash =
    template === null
      ? null
      : `${type}|${templateHash(template)}|${JSON.stringify(issuer ?? null)}`;

  useEffect(() => {
    if (!enabled || template === null || hash === null) return;
    if (blocked) {
      setStatus("blocked");
      return;
    }
    if (hash === lastHash.current && status === "ready") return;

    const timer = window.setTimeout(() => {
      controller.current?.abort();
      const own = new AbortController();
      controller.current = own;
      setStatus("loading");
      previewDocumentTemplate(
        type,
        issuer === undefined ? { template } : { template, issuer },
        own.signal,
      )
        .then((result) => {
          if (own.signal.aborted) return;
          lastHash.current = hash;
          setHtml(result.html);
          setError(null);
          setStatus("ready");
        })
        .catch((cause: unknown) => {
          if (own.signal.aborted) return;
          setError(
            errorMessage(cause, "No se pudo actualizar la vista previa"),
          );
          setStatus("error");
        });
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
    // `status` a propósito fuera: cambiarlo no debe re-pedir la previa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, blocked, enabled, attempt, type]);

  useEffect(() => () => controller.current?.abort(), []);

  return { html, status, error, retry: () => setAttempt((value) => value + 1) };
}
