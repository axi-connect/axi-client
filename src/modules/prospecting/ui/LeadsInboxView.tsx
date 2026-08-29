"use client";

import { useCallback, useMemo, useState } from "react";
import { Inbox, ShieldCheck, TriangleAlert } from "lucide-react";

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
import { canPromote } from "../domain/lead";
import { promoteLeads } from "../infrastructure/services/prospecting-service.adapter";
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
export function LeadsInboxView({
  initialStats,
}: {
  initialStats: ProspectingStatsDTO;
}) {
  const { hasPermission } = useAuth();
  const canPromoteLeads = hasPermission("leads:promote");
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

  const toggle = useCallback((id: string) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const columns = useMemo(
    () =>
      buildLeadColumns({
        selectable: canPromoteLeads,
        selected,
        onToggle: toggle,
      }),
    [canPromoteLeads, selected, toggle],
  );

  const promotable = useMemo(
    () => items.filter((row) => selected.has(row.id) && canPromote(row)),
    [items, selected],
  );

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

        {canPromoteLeads && promotable.length > 0 && (
          <Button
            className="ml-auto"
            onClick={() => void onPromote()}
            disabled={promoting}
          >
            <ShieldCheck className="size-4" aria-hidden />
            Promover {promotable.length} al CRM
          </Button>
        )}
      </div>

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
