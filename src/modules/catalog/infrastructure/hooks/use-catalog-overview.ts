"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CatalogSummaryDTO,
  ClassificationStatsDTO,
  EnrichmentStatsDTO,
} from "@/modules/catalog/domain/catalog-summary";
import {
  getCatalogClassificationStats,
  getCatalogEnrichmentStats,
  getCatalogSummary,
} from "@/modules/catalog/infrastructure/services/catalog-summary-service.adapter";

export type OverviewSection<T> = {
  data: T | null;
  status: "loading" | "ready" | "error";
};

const LOADING = { data: null, status: "loading" } as const;

/**
 * Las tres fuentes del bento del listado, cada una con su estado: una ficha
 * cuyo dato no llegó dice «No pudimos leer…» y las demás siguen (DS §9.5: un
 * error nunca se pinta como un cero). Recargar conserva el dato anterior
 * mientras llega el nuevo (la ficha se atenúa, no vuelve a la silueta).
 */
export function useCatalogOverview() {
  const [summary, setSummary] = useState<OverviewSection<CatalogSummaryDTO>>(LOADING);
  const [enrichment, setEnrichment] = useState<OverviewSection<EnrichmentStatsDTO>>(LOADING);
  const [classification, setClassification] = useState<OverviewSection<ClassificationStatsDTO>>(LOADING);
  const [reloading, setReloading] = useState(false);
  const generation = useRef(0);

  const load = useCallback(() => {
    const current = ++generation.current;
    setReloading(true);
    const settle = <T,>(
      promise: Promise<T>,
      set: (updater: (previous: OverviewSection<T>) => OverviewSection<T>) => void,
    ) =>
      promise
        .then((data) => {
          if (current === generation.current) set(() => ({ data, status: "ready" }));
        })
        .catch(() => {
          if (current === generation.current) set((previous) => ({ data: previous.data, status: "error" }));
        });
    void Promise.allSettled([
      settle(getCatalogSummary(), setSummary),
      settle(getCatalogEnrichmentStats(), setEnrichment),
      settle(getCatalogClassificationStats(), setClassification),
    ]).then(() => {
      if (current === generation.current) setReloading(false);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { summary, enrichment, classification, reloading, reload: load };
}
