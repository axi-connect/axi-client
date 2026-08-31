"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, TriangleAlert } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useSocket } from "@/core/realtime/use-socket";
import { useAuth } from "@/shared/auth/auth.hooks";
import { BrandLoader } from "@/shared/components/ui/brand-loader";
import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/components/layout/page-header";

import { isInFlight, paramsOf, queryOf, type SearchDTO } from "../domain/search";
import type { DiscoveryCategoryDTO, SourceCatalogItemDTO } from "../domain/search";
import {
  cancelSearch,
  deleteSearch,
  listSearches,
  listSources,
  previewSearchDeletion,
  type StartSearchInput,
} from "../infrastructure/services/prospecting-service.adapter";
import { MagnifiedShowcase } from "@/shared/components/features/magnified-showcase";

import {
  DeleteResultSheet,
  needsDeleteSheet,
  type DeleteOutcome,
} from "./components/DeleteResultSheet";
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
  const canDelete = hasPermission("leads:delete");
  const { showAlert, showModal } = useAlert();
  /** Id de la búsqueda cuya previa se está pidiendo. */
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<DeleteOutcome | null>(null);
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

  const doDelete = useCallback(
    async (search: SearchDTO, expected: number) => {
      try {
        const result = await deleteSearch(search.id);
        const next: DeleteOutcome = {
          asked: 1,
          deleted: result.deleted,
          kept: result.kept.map((k) => ({
            name: search.label ?? queryOf(search),
            reason: k.reason,
          })),
          missing: 0,
        };
        await load();
        if (needsDeleteSheet(next)) setOutcome(next);
        else
          showAlert({
            tone: "success",
            title: "Búsqueda eliminada",
            description:
              result.leads_deleted > 0
                ? `Se llevó ${String(result.leads_deleted)} ${result.leads_deleted === 1 ? "lead" : "leads"}.`
                : "No tenía leads que llevarse.",
          });
        // La previa y el resultado tienen que coincidir. Si no, el backend y la
        // pantalla están contando cosas distintas y hay que enterarse.
        if (result.leads_deleted !== expected) {
          console.warn(
            `[prospecting] la previa dijo ${String(expected)} leads y se borraron ${String(result.leads_deleted)}`,
          );
        }
      } catch (caught) {
        showAlert({
          tone: "error",
          title: "No se pudo eliminar la búsqueda",
          description: errorMessage(caught, "Intenta de nuevo."),
        });
      }
    },
    [load, showAlert],
  );

  /**
   * Borrar una búsqueda: la previa PRIMERO, y el diálogo con el número cargado.
   *
   * El contador de la tarjeta dice lo que la búsqueda TRAJO y es histórico: no se
   * ajusta cuando se promueven o se borran leads. Enseñarlo en una confirmación
   * irreversible y que el resultado diga otra cifra se lee como que se perdió
   * algo, así que se pide el número exacto y **el diálogo no abre hasta
   * tenerlo**. Si la previa falla no se ofrece borrar a ciegas: se dice.
   */
  const askDelete = useCallback(
    async (search: SearchDTO) => {
      setPreviewing(search.id);
      let preview;
      try {
        preview = await previewSearchDeletion([search.id]);
      } catch (caught) {
        showAlert({
          tone: "error",
          title: "No pudimos calcular qué se llevaría",
          description: errorMessage(caught, "Sin ese número no ofrecemos borrar."),
        });
        return;
      } finally {
        setPreviewing(null);
      }

      const live = isInFlight(search);
      showModal({
        title: "¿Eliminar esta búsqueda?",
        description: search.label ?? queryOf(search),
        body: (
          <div className="flex flex-col gap-3">
            <p className="text-[13.5px] leading-relaxed">
              Se llevará{" "}
              <span className="font-semibold tabular-nums">
                {preview.leads_to_delete.toLocaleString("es-CO")} leads
              </span>{" "}
              y su informe. No se puede deshacer.
            </p>
            {preview.leads_kept > 0 && (
              <p className="border-border-soft bg-muted/60 text-muted-foreground rounded-md border px-3 py-2.5 text-[12.5px] leading-relaxed">
                <span className="text-foreground font-semibold">
                  {preview.leads_kept}{" "}
                  {preview.leads_kept === 1 ? "ya es contacto" : "ya son contactos"} del CRM
                </span>{" "}
                y se {preview.leads_kept === 1 ? "quedará" : "quedarán"} en tu bandeja, sin la
                búsqueda que los trajo.
              </p>
            )}
            {live && (
              // Ámbar y no rojo: es un efecto colateral que hay que saber, no un
              // peligro. Y no se obliga a cancelar antes: se dice y se hace.
              <p className="border-warning/25 bg-warning/10 text-warning flex items-start gap-2 rounded-md border px-3 py-2.5 text-[12px]">
                <TriangleAlert aria-hidden="true" className="mt-px size-3.5 shrink-0" />
                <span>Está corriendo ahora mismo: al borrarla se detiene.</span>
              </p>
            )}
          </div>
        ),
        actions: [
          { label: "Cancelar", variant: "outline", asClose: true },
          {
            label: "Sí, eliminar",
            variant: "destructive",
            onClick: () => void doDelete(search, preview.leads_to_delete),
          },
        ],
      });
    },
    [showAlert, showModal, doDelete],
  );

  if (searches === null) return <BrandLoader />;

  return (
    <div className="flex flex-col gap-8">
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
              onDelete={canDelete ? (run) => void askDelete(run) : undefined}
              deleting={previewing === search.id}
            />
          ))}
        </div>
      )}

      <DeleteResultSheet
        open={outcome !== null}
        onOpenChange={(next) => { if (!next) setOutcome(null); }}
        outcome={outcome}
        noun={{ one: "búsqueda", many: "búsquedas" }}
      />

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
    </div>
  );
}
