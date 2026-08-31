"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Gift,
  Inbox,
  LoaderCircle,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  WandSparkles,
} from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { usePaginatedList } from "@/shared/api/use-paginated-list";
import { DataTable } from "@/shared/components/features/data-table";
import { EmptyState } from "@/shared/components/features/empty-state";
import { TableSkeleton } from "@/shared/components/features/loading";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import {
  FilterChips,
  FilterPanel,
  FilterTrigger,
  clearAll,
  removeFilter,
  type FilterValues,
} from "@/shared/components/features/filter-panel";

import type { LeadRow, ProspectingStatsDTO } from "../domain/lead";
import { canDelete, canEnrich, canPromote } from "../domain/lead";
import {
  countLeads,
  deleteLeads,
  enrichLeads,
  getProspectingStats,
  listLeadIds,
  promoteLeads,
} from "../infrastructure/services/prospecting-service.adapter";
import {
  DeleteResultSheet,
  needsDeleteSheet,
  type DeleteOutcome,
} from "./components/DeleteResultSheet";
import { CaptureFunnel } from "./components/CaptureFunnel";
import { buildLeadColumns, fetchLeads } from "./tables/leads.config";
import {
  LEAD_FILTERS,
  countLeadFilters,
  serializeLeadFilters,
} from "./tables/leads.filters";

/**
 * Tope de la selección «todos los que cumplen». Por encima, la oferta no se
 * pinta: un botón que no puede cumplir lo que dice es peor que no tenerlo.
 *
 * **500 y no 1.000, que es lo que aguanta el endpoint de ids**, para que un
 * lote sea SIEMPRE una sola petición. Trocear en dos deja dos resultados que
 * fusionar y un fallo parcial que no se sabe contar: si la segunda tanda se
 * cae, hay 500 filas actuadas y un diálogo que no puede decir la verdad sobre
 * qué pasó. Con 500, una confirmación es una petición es un resultado, y el
 * `deleted + kept + missing` sigue cuadrando con lo que se mandó.
 */
const SELECT_ALL_LIMIT = 500;
/** Por encima de esto, promover en lote pide confirmación. */
const CONFIRM_ABOVE = 50;

/**
 * La bandeja de captación.
 *
 * Dos decisiones que no son de gusto: el filtro «permite WhatsApp» existe
 * porque es la pregunta que de verdad se hace quien va a promover un lote, y
 * la promoción devuelve resultado POR LEAD — un 200 con «3 de 5» y el motivo
 * de los dos que faltaron, en vez de un error global que obligue a adivinar.
 */
/** Cada cuánto se recarga mientras se buscan datos, y cuándo nos rendimos. */
const POLL_MS = 5_000;
const POLL_TIMEOUT_MS = 90_000;

export function LeadsInboxView({
  initialStats,
}: {
  initialStats: ProspectingStatsDTO;
}) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canPromoteLeads = hasPermission("leads:promote");
  const canManageLeads = hasPermission("leads:manage");
  const canDeleteLeads = hasPermission("leads:delete");
  const { showAlert, showModal } = useAlert();

  const [filters, setFilters] = useState<FilterValues>({});
  const [panelOpen, setPanelOpen] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  /** ¿La selección es «todos los que cumplen» y no solo la página? */
  const [allMatching, setAllMatching] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [stats, setStats] = useState(initialStats);
  const [deleting, setDeleting] = useState(false);
  const [outcome, setOutcome] = useState<DeleteOutcome | null>(null);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Contador de turno: la última petición gana, no la última que llega. */
  const draftTurn = useRef(0);

  // Sin useMemo el hook entra en bucle de fetch: `extraParams` se compara por
  // referencia (mismo gotcha documentado en CampaignDetailView).
  const extraParams = useMemo(() => serializeLeadFilters(filters), [filters]);

  const {
    items,
    total,
    loading,
    error,
    page,
    pageSize,
    setPage,
    setSearch,
    searchValue,
    refresh,
  } = usePaginatedList<LeadRow, "q">({
    fetcher: fetchLeads,
    pageSize: 25,
    searchField: "q",
    extraParams,
  });

  /**
   * Aplicar un filtro hace TRES cosas, y ninguna es opcional.
   *
   * 1. Fija el valor.
   * 2. Vuelve a la página 1 **a mano**: `usePaginatedList` dice en su comentario
   *    que lo hace al cambiar `extraParams` y NO lo hace. El síntoma es feo — en
   *    la página 7, cambias un filtro que deja dos páginas y ves una tabla vacía
   *    que se lee como «no hay resultados».
   * 3. Tira la selección. Es de SEGURIDAD: una selección «todos los que cumplen»
   *    atada a un filtro que el usuario ya cambió es exactamente cómo se
   *    promueven 400 leads que nadie quería.
   */
  const applyFilters = useCallback(
    (next: FilterValues) => {
      setFilters(next);
      setPage(1);
      setSelected(new Set());
      setAllMatching(false);
    },
    [setPage],
  );

  /**
   * Ids con una búsqueda de datos en curso, con el `enriched_at` que tenían al
   * pedirla. Cuando cambia, la pasada terminó.
   *
   * Se compara la MARCA DEL INTENTO y no los datos ganados, que es lo que se
   * hacía antes: una pasada que no encuentra nada es un desenlace legítimo y
   * frecuente, y con el criterio viejo esas filas se quedaban girando los 90 s
   * enteros para rendirse en silencio — el mismo bug que F4c mató en la ficha,
   * sobreviviendo aquí. El backend escribe la columna SIEMPRE desde entonces.
   *
   * Vive en el cliente porque el detalle en vivo va por la sala del lead, y
   * unir la bandeja a cien salas para pintar cien spinners cuesta más que
   * recargar la página cada cinco segundos.
   */
  const [working, setWorking] = useState<Map<string, string | null>>(new Map());
  const [enriching, setEnriching] = useState(false);

  const workingIds = useMemo(() => new Set(working.keys()), [working]);

  // Ya no depende de la selección: la casilla la sintetiza `DataTable`, así que
  // las columnas dejan de reconstruirse en cada clic — que era lo que anulaba
  // el `memo` de las filas.
  const columns = useMemo(() => buildLeadColumns(workingIds), [workingIds]);

  /**
   * Qué filas se pueden marcar.
   *
   * Sirve para ALGUNA de las dos acciones: con permiso de gestión, buscar datos
   * aplica a leads que no se pueden promover — un descartado sigue siendo
   * consultable.
   */
  const isSelectable = useCallback(
    (row: LeadRow) =>
      (canPromoteLeads && canPromote(row)) ||
      (canManageLeads && canEnrich(row)) ||
      (canDeleteLeads && canDelete(row)),
    [canPromoteLeads, canManageLeads, canDeleteLeads],
  );

  /**
   * Sondeo mientras se buscan datos. El tope NO es opcional: si un proveedor se
   * cuelga el trabajo puede no terminar nunca, y un spinner sobre una fila
   * quieta miente igual que un estado sin barrido.
   */
  useEffect(() => {
    if (working.size === 0) return;
    const timer = setInterval(() => refresh(), POLL_MS);
    const giveUp = setTimeout(() => setWorking(new Map()), POLL_TIMEOUT_MS);
    return () => {
      clearInterval(timer);
      clearTimeout(giveUp);
    };
  }, [working, refresh]);

  useEffect(() => {
    if (working.size === 0) return;
    setWorking((previous) => {
      const next = new Map(previous);
      for (const row of items) {
        if (!next.has(row.id)) continue;
        if (row.enriched_at !== next.get(row.id)) next.delete(row.id);
      }
      return next.size === previous.size ? previous : next;
    });
  }, [items, working.size]);

  const activeFilters = useMemo(() => countLeadFilters(filters), [filters]);
  const hasFilters = activeFilters > 0;

  /**
   * El contador del botón «Ver N leads».
   *
   * La hoja NO lo calcula —no sabe nada del servidor—: emite el borrador y aquí
   * se responde. Es `page_size: 1` sobre el mismo listado, así que el número y
   * la lista no pueden discrepar, y no hace falta un endpoint de conteo.
   *
   * Con rebote, porque el borrador cambia con cada pastilla que se pulsa.
   */
  const onDraftChange = useCallback((draft: FilterValues) => {
    setPreviewCount(null);
    const params = serializeLeadFilters(draft);
    if (draftTimer.current !== null) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      const turn = ++draftTurn.current;
      countLeads(params)
        .then((count) => {
          // Una respuesta lenta de hace tres pastillas no puede pisar a la que
          // el usuario está esperando.
          if (turn === draftTurn.current) setPreviewCount(count);
        })
        .catch(() => {
          // Sin número, el botón dice «Ver resultados» en vez de mentir.
          if (turn === draftTurn.current) setPreviewCount(null);
        });
    }, 350);
  }, []);

  /**
   * «Seleccionar los N que cumplen el filtro».
   *
   * Pide los ids REALES al servidor en vez de mandar un filtro a las acciones
   * de lote: así lo que se promueve son ids concretos que quedan en la
   * auditoría, y el usuario actúa sobre el mismo conjunto que vio.
   */
  const onSelectAllMatching = useCallback(async () => {
    try {
      const result = await listLeadIds(serializeLeadFilters(filters));
      setSelected(new Set(result.ids));
      setAllMatching(true);
      if (result.truncated) {
        showAlert({
          tone: "info",
          title: `Seleccionamos los primeros ${String(result.ids.length)}`,
          description: `Cumplen ${String(result.total)}, pero no se pueden seleccionar todos de una vez. Afina el filtro o hazlo por páginas.`,
        });
      }
    } catch (caught) {
      showAlert({
        tone: "error",
        title: "No pudimos seleccionar todos",
        description: errorMessage(caught, "Intenta de nuevo."),
      });
    }
  }, [filters, showAlert]);

  /** Las acciones que ofrece el buscador cuando hay algo escrito. */
  const searchActions = useMemo(
    () =>
      canManageLeads && total > 0
        ? [
            {
              id: "enrich-matching",
              label: `Buscar datos de los ${String(total)} que coinciden`,
              icon: WandSparkles,
              hint: "⏎",
              onSelect: () => void onSelectAllMatching(),
            },
          ]
        : [],
    [canManageLeads, total, onSelectAllMatching],
  );

  const promotable = useMemo(
    () => items.filter((row) => selected.has(row.id) && canPromote(row)),
    [items, selected],
  );

  const enrichable = useMemo(
    () => items.filter((row) => selected.has(row.id) && canEnrich(row)),
    [items, selected],
  );

  /**
   * Buscarle datos a la selección. **No gasta cuota**: el backend fuerza el
   * lote a los proveedores gratuitos, porque cien leads contra proveedores de
   * pago es exactamente cómo se funde el plan de un tenant en un clic.
   */
  const onEnrich = useCallback(async () => {
    if (enrichable.length === 0) return;
    setEnriching(true);
    try {
      const result = await enrichLeads(enrichable.map((row) => row.id));
      const queued = new Set(result.queued);
      setWorking((previous) => {
        const next = new Map(previous);
        for (const row of enrichable) {
          if (queued.has(row.id)) next.set(row.id, row.enriched_at);
        }
        return next;
      });
      setSelected(new Set());
      showAlert({
        tone: "info",
        title: `Buscando datos de ${String(result.queued.length)}`,
        description:
          "Solo usamos las fuentes gratuitas, así que esto no gasta unidades de tu plan.",
      });
    } catch (caught) {
      showAlert({
        tone: "error",
        title: "No se pudo pedir la búsqueda",
        description: errorMessage(caught, "Intenta de nuevo."),
      });
    } finally {
      setEnriching(false);
    }
  }, [enrichable, showAlert]);

  const doPromote = useCallback(async () => {
    if (promotable.length === 0) return;
    setPromoting(true);
    try {
      const result = await promoteLeads(promotable.map((row) => row.id));
      // El 200 puede traer fallos: leerlos es obligatorio, no opcional.
      if (result.failed.length === 0) {
        showAlert({
          tone: "success",
          title: "Leads promovidos",
          description: `${result.promoted.length} ${result.promoted.length === 1 ? "lead ya es un contacto" : "leads ya son contactos"} de tu CRM.`,
        });
      } else {
        showAlert({
          tone: "warning",
          title: `${result.promoted.length} promovidos, ${result.failed.length} no`,
          description: result.failed
            .map((failure) => failure.reason)
            .filter((reason, index, all) => all.indexOf(reason) === index)
            .join(" · "),
        });
      }
      setSelected(new Set());
      refresh();
      setStats((previous) => ({
        ...previous,
        promoted: previous.promoted + result.promoted.length,
        quarantined: Math.max(0, previous.quarantined - result.promoted.length),
      }));
    } catch (caught) {
      showAlert({
        tone: "error",
        title: "No se pudo promover",
        description: errorMessage(caught, "Intenta de nuevo."),
      });
    } finally {
      setPromoting(false);
    }
  }, [promotable, refresh, showAlert]);

  const deletable = useMemo(
    () => items.filter((row) => selected.has(row.id) && canDelete(row)),
    [items, selected],
  );

  const doDelete = useCallback(async () => {
    const ids = allMatching ? [...selected] : deletable.map((row) => row.id);
    if (ids.length === 0) return;
    setDeleting(true);
    try {
      const result = await deleteLeads(ids);
      const byId = new Map(items.map((row) => [row.id, row.name]));
      const next: DeleteOutcome = {
        asked: ids.length,
        deleted: result.deleted,
        kept: result.kept.map((k) => ({
          name: byId.get(k.lead_id) ?? "Un lead de otra página",
          reason: k.reason,
        })),
        missing: result.missing,
      };
      setSelected(new Set());
      setAllMatching(false);
      refresh();
      /**
       * Los `stats` se RECARGAN, no se estiman.
       *
       * Borrar mueve varios pasos del embudo a la vez —cuarentena, calificados,
       * descartados— y restar a mano acabaría en un embudo que no suma. Promover
       * sí se puede estimar porque mueve exactamente dos.
       */
      getProspectingStats()
        .then(setStats)
        .catch(() => undefined);

      // Aviso si salió limpio; panel solo si hay algo que explicar.
      if (needsDeleteSheet(next)) setOutcome(next);
      else
        showAlert({
          tone: "success",
          title: `${String(result.deleted)} ${result.deleted === 1 ? "lead eliminado" : "leads eliminados"}`,
        });
    } catch (caught) {
      showAlert({
        tone: "error",
        title: "No se pudo eliminar",
        description: errorMessage(caught, "Intenta de nuevo."),
      });
    } finally {
      setDeleting(false);
    }
  }, [allMatching, selected, deletable, items, refresh, showAlert]);

  /**
   * La confirmación del borrado: UNA, igual para 1 que para 300.
   *
   * No hay papelera ni deshacer, así que esto es la única barrera que existe. Y
   * es deliberadamente CORTA: el dueño quitó el aviso de que borrar no suprime
   * —el mismo negocio puede volver, y con una fuente de pago se vuelve a
   * pagar—. Se le puso delante con el argumento y eligió la versión breve.
   *
   * En modo «todos los que cumplen» se dice cuántos sobrevivirán, porque ahí sí
   * puede haber promovidos dentro: en la selección de una página no, porque un
   * lead que ya es contacto no se puede ni marcar.
   */
  const onDelete = useCallback(() => {
    const n = allMatching ? selected.size : deletable.length;
    if (n === 0) return;
    const survivors = allMatching ? total - n : 0;
    showModal({
      title: `¿Eliminar ${String(n)} ${n === 1 ? "lead" : "leads"}?`,
      description: "No se puede deshacer.",
      body:
        survivors > 0 ? (
          <p className="border-border-soft bg-muted/60 text-muted-foreground rounded-md border px-3 py-2.5 text-[12.5px] leading-relaxed">
            <span className="text-foreground font-semibold">
              {survivors} {survivors === 1 ? "ya es contacto" : "ya son contactos"} del CRM
            </span>{" "}
            y se {survivors === 1 ? "quedará" : "quedarán"}. Para borrarlos, hazlo desde el CRM.
          </p>
        ) : undefined,
      actions: [
        { label: "Cancelar", variant: "outline", asClose: true },
        { label: `Sí, eliminar ${String(n)}`, variant: "destructive", onClick: () => void doDelete() },
      ],
    });
  }, [allMatching, selected.size, deletable.length, total, doDelete, showModal]);

  /**
   * Promover pide confirmación por encima de un umbral, y no es fricción
   * decorativa.
   *
   * Promover ESCRIBE datos de terceros en el CRM y **no se deshace**. Con la
   * selección de una página (25) el número que hay en pantalla es el que se va a
   * promover y la banda ya lo dice; con «todos los que cumplen» pueden ser
   * cientos, y la distancia entre lo que se leyó y lo que va a pasar es
   * exactamente donde ocurre el accidente.
   *
   * El texto dice el número REAL, no «varios».
   */
  const onPromote = useCallback(() => {
    if (promotable.length <= CONFIRM_ABOVE) {
      void doPromote();
      return;
    }
    showModal({
      title: `¿Promover ${String(promotable.length)} leads al CRM?`,
      description:
        "Se crean como contactos y empiezan a contar en tu CRM. Esto no se puede deshacer.",
      actions: [
        { label: "Cancelar", variant: "outline", asClose: true },
        { label: `Sí, promover ${String(promotable.length)}`, onClick: () => void doPromote() },
      ],
    });
  }, [promotable.length, doPromote, showModal]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Bandeja"
        description="Prospectos descubiertos y a la espera de entrar a tu CRM. Nadie sale de aquí sin que tú lo promuevas."
      />

      <CaptureFunnel stats={stats} />

      {/* La barra vive DENTRO del `DataTable`: el buscador, el botón de filtros
          y los chips de lo activo, que van fuera de la hoja porque el estado no
          se esconde. Un filtro activo invisible es la forma más rápida de que
          alguien no entienda por qué su bandeja trajo cuatro leads. */}
      {loading && items.length === 0 ? (
        <TableSkeleton rows={6} />
      ) : error !== null ? (
        <EmptyState
          icon={TriangleAlert}
          title="No pudimos cargar la bandeja"
          description={errorMessage(
            error,
            "Revisa tu conexión e intenta otra vez.",
          )}
          action={<Button onClick={refresh}>Reintentar</Button>}
        />
      ) : items.length === 0 ? (
        /* Dos estados vacíos y no uno: con un filtro puesto, «todavía no ha
           entrado ningún lead» es MENTIRA — hay 249, es que ninguno cumple. */
        hasFilters || (searchValue ?? "").length > 0 ? (
          <EmptyState
            icon={Inbox}
            title="Ningún lead cumple estos filtros"
            description="Prueba a exigir menos datos, a bajar el índice de calidad o a quitar el texto de búsqueda."
            action={
              <Button variant="outline" onClick={() => { applyFilters(clearAll(LEAD_FILTERS, filters)); setSearch(""); }}>
                Limpiar filtros
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Inbox}
            title="Todavía no ha entrado ningún lead"
            description="Cuando alguien te escriba desde un anuncio o llene un formulario de Facebook o Instagram, aparecerá aquí."
          />
        )
      ) : (
        <DataTable<LeadRow>
          data={items}
          columns={columns}
          pagination={{ page, pageSize, total }}
          onPageChange={setPage}
          searchMode="spotlight"
          searchPlaceholder="Buscar"
          onSearchChange={({ value }) => setSearch(value)}
          // Elegir una coincidencia ABRE ESE LEAD. Es el mismo destino que la
          // celda del nombre, así que buscar y pulsar la fila llevan al mismo
          // sitio — que es lo que se espera de una lista de resultados.
          onSearchSelect={(row) => router.push(`/marketing/leads/${row.id}`)}
          search={{ value: searchValue ?? "" }}
          searchActions={searchActions}
          toolbar={
            <>
              <FilterTrigger count={activeFilters} onClick={() => setPanelOpen(true)} />
              <FilterChips
                schema={LEAD_FILTERS}
                values={filters}
                onRemove={(key) => applyFilters(removeFilter(LEAD_FILTERS, filters, key))}
                onClearAll={() => applyFilters(clearAll(LEAD_FILTERS, filters))}
              />
            </>
          }
          selection={
            canPromoteLeads || canManageLeads || canDeleteLeads
              ? {
                  rowId: (row) => row.id,
                  rowLabel: (row) => row.name,
                  selected,
                  onChange: (next) => {
                    setSelected(next);
                    // Tocar una casilla suelta rompe el modo «todos»: seguir
                    // diciendo 412 después de destildar uno sería mentira.
                    setAllMatching(false);
                  },
                  isSelectable,
                  allMatching: {
                    active: allMatching,
                    count: allMatching ? total : total,
                    limit: SELECT_ALL_LIMIT,
                    onSelectAll: () => void onSelectAllMatching(),
                    onClear: () => setAllMatching(false),
                  },
                  actions: ({ count }) => (
                    <>
                      {canManageLeads && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void onEnrich()}
                          disabled={enriching}
                        >
                          {enriching ? (
                            <LoaderCircle aria-hidden className="size-4 animate-spin" />
                          ) : (
                            <WandSparkles aria-hidden className="size-4" />
                          )}
                          Buscar datos de {count}
                        </Button>
                      )}
                      {canPromoteLeads && (
                        <Button size="sm" onClick={onPromote} disabled={promoting}>
                          <ShieldCheck className="size-4" aria-hidden />
                          Promover {count} al CRM
                        </Button>
                      )}
                      {/* DE CONTORNO, y no relleno.
                          La regla «destructivo ≠ coral» se cumplía —coral de
                          marca contra rojo semántico— y aun así, al lado de
                          «Promover», los dos se leían como el mismo rectángulo
                          rojo. Y una de las dos no se deshace. El relleno rojo
                          se reserva para el botón de CONFIRMAR, donde ya no
                          compite con nada. */}
                      {canDeleteLeads && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={onDelete}
                          disabled={deleting}
                          className="border-destructive/45 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-4" aria-hidden />
                          Eliminar {count}
                        </Button>
                      )}
                    </>
                  ),
                  note: canManageLeads ? (
                    <>
                      <Gift aria-hidden className="size-3" />
                      Buscar datos usa solo las fuentes gratuitas: no gasta unidades de tu plan.
                    </>
                  ) : undefined,
                }
              : undefined
          }
        />
      )}

      <DeleteResultSheet
        open={outcome !== null}
        onOpenChange={(next) => { if (!next) setOutcome(null); }}
        outcome={outcome}
        noun={{ one: "lead", many: "leads" }}
      />

      <FilterPanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        schema={LEAD_FILTERS}
        value={filters}
        onApply={applyFilters}
        onDraftChange={onDraftChange}
        resultCount={previewCount}
        countNoun={{ one: "lead", many: "leads" }}
        subtitle="Se aplican al pulsar el botón. Cerrar descarta los cambios."
      />
    </div>
  );
}
