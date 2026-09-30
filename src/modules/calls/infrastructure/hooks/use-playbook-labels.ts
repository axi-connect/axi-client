"use client";

import { useEffect, useState } from "react";
import type { PlaybookView } from "@/modules/calls/domain/playbooks";
import { listPlaybooks } from "@/modules/calls/infrastructure/services/calls-service.adapter";

/** `call_type → (clave de etapa → nombre)`: el nombre lo pone el negocio en Marcos. */
export type PlaybookLabels = ReadonlyMap<string, ReadonlyMap<string, string>>;

const TTL_MS = 60_000;
let cache: { at: number; labels: PlaybookLabels } | null = null;
let inflight: Promise<PlaybookLabels> | null = null;

function toLabels(views: readonly PlaybookView[]): PlaybookLabels {
  return new Map(
    views.map((view) => [view.call_type, new Map(view.playbook.stages.map((stage) => [stage.key, stage.label]))]),
  );
}

function load(): Promise<PlaybookLabels> {
  if (cache !== null && Date.now() - cache.at < TTL_MS) return Promise.resolve(cache.labels);
  inflight ??= listPlaybooks()
    .then((views) => {
      cache = { at: Date.now(), labels: toLabels(views) };
      return cache.labels;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/**
 * Nombres de las etapas para listas que solo traen la CLAVE (`last_stage`):
 * UNA lectura de los cinco marcos por pestaña y minuto, compartida por todas
 * las filas. Sin datos (o si falla) devuelve un mapa vacío y la celda muestra
 * la clave: nunca rompe la tabla.
 */
export function usePlaybookLabels(): PlaybookLabels {
  const [labels, setLabels] = useState<PlaybookLabels>(() => cache?.labels ?? new Map());
  useEffect(() => {
    let alive = true;
    load()
      .then((next) => {
        if (alive) setLabels(next);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return labels;
}

/** Vacía la caché (tras guardar un marco en esta pestaña). */
export function invalidatePlaybookLabels(): void {
  cache = null;
}
