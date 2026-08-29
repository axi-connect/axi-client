"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useSocket } from "@/core/realtime/use-socket";
import { useAuth } from "@/shared/auth/auth.hooks";
import { BrandLoader } from "@/shared/components/ui/brand-loader";
import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/components/layout/page-header";

import { isInFlight, paramsOf, type SearchDTO } from "../domain/search";
import type { DiscoveryCategoryDTO, SourceCatalogItemDTO } from "../domain/search";
import {
  cancelSearch,
  listSearches,
  listSources,
  type StartSearchInput,
} from "../infrastructure/services/prospecting-service.adapter";
import { MagnifiedShowcase } from "@/shared/components/features/magnified-showcase";

import { SearchRun } from "./components/SearchRun";
import { StartSearchSheet } from "./components/StartSearchSheet";

/**
 * Cada cuánto se refresca mientras algo está en vuelo.
 *
 * Es el RESPALDO del WebSocket, no el mecanismo: si el socket llega, la barra
 * se mueve sola. Esto existe porque la verdad vive en la fila y quien recarga
 * la pestaña, o entra desde otro dispositivo, tiene que ver lo mismo.
 */
const POLL_MS = 5_000;

/** Si el catálogo no cargó, el bloque enseña algo en vez de quedarse vacío. */
const FALLBACK_TAGS = [
  { id: "restaurante", label: "Restaurantes" },
  { id: "hotel", label: "Hoteles" },
  { id: "ferreteria", label: "Ferreterías" },
  { id: "panaderia", label: "Panaderías" },
  { id: "clinica", label: "Clínicas" },
  { id: "taller", label: "Talleres" },
];

/**
 * La pestaña de Búsquedas.
 *
 * Lo primero que se ve es lo que está pasando ahora, no un formulario: quien
 * abre esta pantalla con una búsqueda corriendo viene a mirarla.
 */
export function SearchesView() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("leads:manage");
  const { showAlert } = useAlert();
  const { socket } = useSocket("inbox");

  const [searches, setSearches] = useState<SearchDTO[] | null>(null);
  const [sources, setSources] = useState<SourceCatalogItemDTO[]>([]);
  const [categories, setCategories] = useState<DiscoveryCategoryDTO[]>([]);
  const [sheet, setSheet] = useState<Partial<StartSearchInput> | null>(null);

  const load = useCallback(async () => {
    try {
      const [runs, catalog] = await Promise.all([listSearches(), listSources()]);
      setSearches(runs.items);
      setSources(catalog.items);
      setCategories(catalog.categories);
    } catch (caught) {
      showAlert({ tone: "error", title: errorMessage(caught) });
      setSearches([]);
    }
  }, [showAlert]);

  useEffect(() => {
    void load();
  }, [load]);

  const live = searches?.some(isInFlight) ?? false;

  // Polling SOLO mientras algo está en vuelo: una pestaña con el historial
  // quieto no tiene por qué preguntar cada cinco segundos.
  useEffect(() => {
    if (!live) return;
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [live, load]);

  // El WS actualiza los contadores en el sitio, sin volver a pedir la lista:
  // una búsqueda de 500 negocios serían cien peticiones para mover una barra.
  useEffect(() => {
    if (socket === null) return;
    const onProgress = (payload: {
      search_id: string;
      found_count: number;
      new_count: number;
      duplicate_count: number;
      rejected_count: number;
      units_spent: number;
      estimated_total: number | null;
    }) => {
      setSearches((current) =>
        current?.map((search) =>
          search.id === payload.search_id ? { ...search, ...payload } : search,
        ) ?? current,
      );
    };
    // Al terminar sí se recarga: cambian el estado, la fecha y el aviso de
    // parcial, y ese es el momento en que el usuario decide si repetir.
    const onCompleted = () => void load();

    socket.on("prospecting.search_progress", onProgress);
    socket.on("prospecting.search_completed", onCompleted);
    return () => {
      socket.off("prospecting.search_progress", onProgress);
      socket.off("prospecting.search_completed", onCompleted);
    };
  }, [socket, load]);

  async function stop(search: SearchDTO) {
    try {
      await cancelSearch(search.id);
      showAlert({ tone: "success", title: "Búsqueda detenida" });
      await load();
    } catch (caught) {
      showAlert({ tone: "error", title: errorMessage(caught) });
    }
  }

  if (searches === null) return <BrandLoader />;

  return (
    <>
      <PageHeader
        title="Búsquedas"
        description="Sal a buscar negocios que todavía no te conocen."
        actions={
          canManage && sources.some((source) => source.available) ? (
            <Button onClick={() => setSheet({})}>
              <Search aria-hidden="true" />
              Nueva búsqueda
            </Button>
          ) : null
        }
      />

      {searches.length === 0 ? (
        // El bloque magnificado en vez de un cartel: quien llega aquí todavía no
        // sabe qué puede pedirle al módulo, y las etiquetas que desfilan bajo la
        // lupa son exactamente el catálogo de lo que sí se puede buscar.
        <MagnifiedShowcase
          title="Sal a buscar negocios que todavía no te conocen"
          description={
            canManage
              ? "Elige una categoría y un punto del mapa, y los negocios de esa zona entran a tu bandeja con su calidad ya medida."
              : "Cuando alguien de tu equipo lance una búsqueda, aparecerá aquí."
          }
          tags={
            categories.length > 0
              ? categories.map((category) => ({ id: category.id, label: category.label }))
              : FALLBACK_TAGS
          }
        />
      ) : (
        <div className="border-border bg-card rounded-lg border px-5">
          {searches.map((search) => (
            <SearchRun
              key={search.id}
              search={search}
              onRepeat={canManage ? (run) => setSheet(paramsOf(run)) : undefined}
              onCancel={canManage ? (run) => void stop(run) : undefined}
            />
          ))}
        </div>
      )}

      {sheet !== null && (
        <StartSearchSheet
          open
          sources={sources}
          categories={categories}
          initial={sheet}
          onOpenChange={(open) => !open && setSheet(null)}
          onStarted={() => void load()}
        />
      )}
    </>
  );
}
