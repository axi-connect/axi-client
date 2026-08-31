"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Gift,
  Inbox,
  LoaderCircle,
  ShieldCheck,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

import type { LeadRow, ProspectingStatsDTO } from "../domain/lead";
import { canEnrich, canPromote } from "../domain/lead";
import {
  enrichLeads,
  promoteLeads,
} from "../infrastructure/services/prospecting-service.adapter";
import { CaptureFunnel } from "./components/CaptureFunnel";
import { buildLeadColumns, fetchLeads } from "./tables/leads.config";

const ANY = "any";

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
  const { hasPermission } = useAuth();
  const canPromoteLeads = hasPermission("leads:promote");
  const canManageLeads = hasPermission("leads:manage");
  const { showAlert } = useAlert();

  const [status, setStatus] = useState<string>(ANY);
  const [source, setSource] = useState<string>(ANY);
  const [allows, setAllows] = useState<string>(ANY);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [promoting, setPromoting] = useState(false);
  const [stats, setStats] = useState(initialStats);

  // Sin useMemo el hook entra en bucle de fetch: `extraParams` se compara por
  // referencia (mismo gotcha documentado en CampaignDetailView).
  const extraParams = useMemo(
    () => ({
      ...(status === ANY ? {} : { status }),
      ...(source === ANY ? {} : { source }),
      ...(allows === ANY ? {} : { allows }),
    }),
    [status, source, allows],
  );

  const { items, total, loading, error, page, pageSize, setPage, refresh } =
    usePaginatedList<LeadRow, "q">({
      fetcher: fetchLeads,
      pageSize: 25,
      searchField: "q",
      extraParams,
    });

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

  const toggle = useCallback((id: string) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const workingIds = useMemo(() => new Set(working.keys()), [working]);

  const columns = useMemo(
    () =>
      buildLeadColumns({
        // La casilla se ofrece si sirve para ALGUNA de las dos acciones. Con
        // permiso de gestión, buscar datos aplica a leads que no se pueden
        // promover — un descartado sigue siendo consultable.
        selectable: canPromoteLeads || canManageLeads,
        selected,
        onToggle: toggle,
        selectableRow: (row) =>
          (canPromoteLeads && canPromote(row)) || (canManageLeads && canEnrich(row)),
        working: workingIds,
      }),
    [canPromoteLeads, canManageLeads, selected, toggle, workingIds],
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

  const onPromote = useCallback(async () => {
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

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Bandeja"
        description="Prospectos descubiertos y a la espera de entrar a tu CRM. Nadie sale de aquí sin que tú lo promuevas."
      />

      <CaptureFunnel stats={stats} />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[190px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Cualquier estado</SelectItem>
            <SelectItem value="new">Nuevos</SelectItem>
            <SelectItem value="qualified">Calificados</SelectItem>
            <SelectItem value="promoted">Ya en el CRM</SelectItem>
            <SelectItem value="suppressed">No contactar</SelectItem>
          </SelectContent>
        </Select>

        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="w-[210px]">
            <SelectValue placeholder="Origen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Todos los orígenes</SelectItem>
            <SelectItem value="ctwa">Click-to-WhatsApp</SelectItem>
            <SelectItem value="meta_lead_ads">Formulario de anuncio</SelectItem>
            <SelectItem value="manual">Cargados a mano</SelectItem>
          </SelectContent>
        </Select>

        <Select value={allows} onValueChange={setAllows}>
          <SelectTrigger className="w-[230px]">
            <SelectValue placeholder="Canal permitido" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Cualquier canal permitido</SelectItem>
            <SelectItem value="whatsapp">Permite WhatsApp</SelectItem>
            <SelectItem value="email">Permite correo</SelectItem>
            <SelectItem value="manual">Solo trabajo manual</SelectItem>
          </SelectContent>
        </Select>

        {/* `ml-auto` solo en el PRIMERO del grupo: en los dos, los botones se
            separarían a los extremos de la barra. */}
        {canManageLeads && enrichable.length > 0 && (
          <Button
            className="ml-auto"
            variant="outline"
            onClick={() => void onEnrich()}
            disabled={enriching}
          >
            {enriching ? (
              <LoaderCircle aria-hidden className="size-4 animate-spin" />
            ) : (
              <WandSparkles aria-hidden className="size-4" />
            )}
            Buscar datos de {enrichable.length}
          </Button>
        )}
        {canPromoteLeads && promotable.length > 0 && (
          <Button
            className={canManageLeads && enrichable.length > 0 ? "" : "ml-auto"}
            onClick={() => void onPromote()}
            disabled={promoting}
          >
            <ShieldCheck className="size-4" aria-hidden />
            Promover {promotable.length} al CRM
          </Button>
        )}
      </div>

      {canManageLeads && enrichable.length > 0 && (
        <p className="text-muted-foreground -mt-6 flex items-center gap-1.5 text-[11.5px]">
          <Gift aria-hidden className="size-3" />
          Buscar datos usa solo las fuentes gratuitas: no gasta unidades de tu plan.
        </p>
      )}

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
        <EmptyState
          icon={Inbox}
          title="Todavía no ha entrado ningún lead"
          description="Cuando alguien te escriba desde un anuncio o llene un formulario de Facebook o Instagram, aparecerá aquí."
        />
      ) : (
        <DataTable
          data={items}
          columns={columns}
          pagination={{ page, pageSize, total }}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
