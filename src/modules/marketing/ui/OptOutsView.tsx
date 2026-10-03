"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { formatShortDate } from "@/core/lib/format";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import type { ListQuery } from "@/shared/api/query";
import { usePaginatedList } from "@/shared/api/use-paginated-list";
import { StatePill } from "@/shared/components/features/bento";
import { EmptyState } from "@/shared/components/features/empty-state";
import { TableSkeleton } from "@/shared/components/features/loading";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import BasicPagination from "@/shared/components/ui/pagination";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { OPT_OUT_SOURCE_LABELS } from "@/modules/marketing/domain/enums";
import { optOutChannelLabel } from "@/modules/marketing/domain/outreach-policy";
import {
  listOptOuts,
  revokeOptOut,
  type OptOutDTO,
} from "@/modules/marketing/infrastructure/services/opt-outs-service.adapter";
import { LoadError, TableCard, TD, TH } from "@/modules/marketing/ui/components/premium";
import { RegisterOptOutDialog } from "@/modules/marketing/ui/components/RegisterOptOutDialog";

const PAGE_SIZE = 20;

type Scope = "active" | "all";

/**
 * Bajas: quién pidió no recibir promociones.
 *
 * Es el registro LEGAL del módulo, así que revocar no borra nada — la fila se
 * queda con su fecha de revocación. Este listado sí pagina en el backend, a
 * diferencia de promociones y reglas.
 *
 * En el celular la tabla deja solo el contacto y la acción: el motivo y la fecha
 * suben a la primera columna, así que no hace falta scroll lateral.
 */
export function OptOutsView() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("marketing:manage");
  const { showAlert, showModal } = useAlert();

  const [scope, setScope] = useState<Scope>("active");
  const [registering, setRegistering] = useState(false);
  const activeOnly = scope === "active";

  const fetcher = useCallback(
    (params: ListQuery) =>
      listOptOuts({
        active_only: activeOnly,
        page: params.page as number,
        page_size: params.page_size as number,
      }),
    [activeOnly],
  );

  // `usePaginatedList` re-consulta cuando cambia la referencia de `extraParams`:
  // sin memoizar entraría en bucle de fetch.
  const extraParams = useMemo(() => ({}), []);

  const { items, total, loading, error, page, setPage, refresh } = usePaginatedList<OptOutDTO>({
    fetcher,
    pageSize: PAGE_SIZE,
    extraParams,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function revoke(optOut: OptOutDTO, acknowledgeHabeas = false) {
    try {
      await revokeOptOut(optOut.id, { acknowledge_habeas: acknowledgeHabeas });
      await refresh();
      showAlert({ tone: "success", title: "Baja revocada" });
    } catch (err) {
      showAlert({
        tone: "error",
        title: errorMessage(err, "No se pudo revocar la baja"),
      });
    }
  }

  /**
   * Habeas data es un registro legal: volver a incluir exige que el operador
   * declare tener la retractación por escrito. El modal del proveedor es de
   * configuración fija, así que la casilla lo vuelve a abrir con su estado.
   */
  function confirmHabeasRevoke(optOut: OptOutDTO, confirmed: boolean) {
    showModal({
      title: "¿Volver a incluir a este contacto?",
      description:
        "Pidió habeas data: volver a incluirlo reactiva el uso de sus datos para contacto comercial.",
      body: (
        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-pretty">
          <Checkbox
            checked={confirmed}
            onChange={(event) => confirmHabeasRevoke(optOut, event.target.checked)}
            className="mt-0.5"
            touchTarget
          />
          <span>Solo si el titular retiró su solicitud por escrito. Confirmo que la tengo.</span>
        </label>
      ),
      actions: [
        { label: "Cancelar", variant: "outline" },
        {
          label: "Volver a incluir",
          variant: "destructive",
          disabled: !confirmed,
          // La casilla marcada viaja a la API: sin ella el servidor responde 422.
          onClick: () => void revoke(optOut, confirmed),
        },
      ],
    });
  }

  function handleRevoke(optOut: OptOutDTO) {
    if (optOut.source === "habeas_data") {
      confirmHabeasRevoke(optOut, false);
      return;
    }
    showModal({
      title: "¿Volver a incluir a este contacto?",
      description:
        "Volverá a recibir campañas y mensajes de recuperación. Hazlo solo si te lo pidió: la baja quedó registrada con su evidencia.",
      actions: [
        { label: "Cancelar", variant: "outline" },
        { label: "Volver a incluir", variant: "default", onClick: () => void revoke(optOut) },
      ],
    });
  }

  /** «Volver a incluir» o, si ya se revocó, la marca con su fecha. Revocar NO borra: la fila sigue. */
  function revokeControl(row: OptOutDTO) {
    if (row.revoked_at !== null) {
      return (
        <span title={`Revocada el ${formatShortDate(row.revoked_at)}`}>
          <StatePill tone="neutral">Revocada</StatePill>
        </span>
      );
    }
    if (!canManage) return null;
    return (
      <Button size="sm" variant="outline" className="rounded-full" onClick={() => handleRevoke(row)}>
        Volver a incluir
      </Button>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <SegmentedControl
          value={scope}
          onValueChange={(next) => {
            setScope(next);
            setPage(1);
          }}
          label="Qué bajas ver"
          size="sm"
          items={[
            { value: "active", label: "Activas" },
            { value: "all", label: "Todas" },
          ]}
        />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <p className="text-muted-foreground text-xs text-pretty">
            <span className="tabular-nums">
              {total.toLocaleString("es-CO")} {total === 1 ? "registro" : "registros"}
            </span>{" "}
            · nadie en esta lista recibe campañas ni recuperación
          </p>
          {canManage && (
            <Button size="sm" className="rounded-full" onClick={() => setRegistering(true)}>
              <Plus aria-hidden />
              Registrar baja
            </Button>
          )}
        </div>
      </div>
      <RegisterOptOutDialog open={registering} onOpenChange={setRegistering} onRegistered={refresh} />

      {loading && items.length === 0 ? (
        <TableSkeleton rows={5} />
      ) : error ? (
        <LoadError message="No pudimos cargar las bajas." onRetry={refresh} />
      ) : items.length === 0 ? (
        <EmptyState
          glyph="uptodate"
          title={activeOnly ? "Nadie se ha dado de baja" : "Sin registros de baja"}
          description="Cuando un cliente escriba una de tus palabras de baja, aparecerá aquí y quedará fuera de toda audiencia. El historial se conserva aunque revoques una baja."
        />
      ) : (
        <TableCard>
          <Table>
            <caption className="sr-only">Contactos dados de baja</caption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={`${TH} @md:min-w-44`}>Contacto</TableHead>
                <TableHead className={`${TH} hidden min-w-44 @xl:table-cell`}>Motivo</TableHead>
                <TableHead className={`${TH} hidden @3xl:table-cell`}>Cuándo</TableHead>
                <TableHead className={`${TH} hidden @4xl:table-cell`}>Evidencia</TableHead>
                <TableHead className={`${TH} hidden @md:table-cell`}>
                  <span className="sr-only">Estado</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => {
                return (
                  <TableRow key={row.id}>
                    <TableCell className={`${TD} whitespace-normal`}>
                      <span className="block max-w-[16rem] truncate font-medium" title={row.contact.full_name ?? undefined}>
                        {row.contact.full_name ?? "Sin nombre"}
                      </span>
                      {row.contact.phone && (
                        <span className="text-muted-foreground block text-xs whitespace-nowrap tabular-nums">{row.contact.phone}</span>
                      )}
                      {/* Con la tabla estrecha, motivo y fecha van aquí: sin columnas que obliguen a desplazar. */}
                      <span className="text-muted-foreground mt-1 flex flex-wrap gap-x-1 text-xs @3xl:hidden">
                        <span className="whitespace-nowrap @xl:hidden">{OPT_OUT_SOURCE_LABELS[row.source]} ·</span>
                        <span className="whitespace-nowrap">{formatShortDate(row.created_at)}</span>
                      </span>
                      {/* Con la tabla muy estrecha, la acción baja aquí: al lado del nombre no cabe. */}
                      <div className="mt-2 @md:hidden">{revokeControl(row)}</div>
                    </TableCell>
                    <TableCell className={`${TD} hidden text-sm whitespace-normal @xl:table-cell`}>
                      {OPT_OUT_SOURCE_LABELS[row.source]}
                      {row.channel !== null && (
                        <span className="text-muted-foreground block text-xs">Solo este canal: {optOutChannelLabel(row.channel)}</span>
                      )}
                      {row.keyword_text && (
                        <span className="text-muted-foreground ml-1 font-mono text-xs whitespace-nowrap">«{row.keyword_text}»</span>
                      )}
                    </TableCell>
                    <TableCell className={`${TD} text-muted-foreground hidden text-sm @3xl:table-cell`}>
                      {formatShortDate(row.created_at)}
                    </TableCell>
                    <TableCell className={`${TD} hidden @4xl:table-cell`}>
                      {row.conversation_id ? (
                        <Link
                          href={`/workspace/inbox/${row.conversation_id}`}
                          className="inline-flex min-h-6 items-center text-sm font-medium underline-offset-4 hover:underline"
                        >
                          Ver conversación
                        </Link>
                      ) : (
                        <span className="text-muted-foreground text-sm">Sin conversación</span>
                      )}
                    </TableCell>
                    <TableCell className={`${TD} hidden text-right @md:table-cell`}>{revokeControl(row)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
              <p className="text-muted-foreground text-xs tabular-nums">
                Página {page} de {totalPages}
              </p>
              <BasicPagination totalPages={totalPages} page={page} onPageChange={setPage} />
            </div>
          )}
        </TableCard>
      )}
    </div>
  );
}
