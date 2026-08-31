"use client";

import { useCallback, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { formatShortDate } from "@/core/lib/format";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import type { ListQuery } from "@/shared/api/query";
import { usePaginatedList } from "@/shared/api/use-paginated-list";
import { EmptyState } from "@/shared/components/features/empty-state";
import { TableSkeleton } from "@/shared/components/features/loading";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import BasicPagination from "@/shared/components/ui/pagination";
import { OPT_OUT_SOURCE_LABELS } from "@/modules/marketing/domain/enums";
import {
  listOptOuts,
  revokeOptOut,
  type OptOutDTO,
} from "@/modules/marketing/infrastructure/services/opt-outs-service.adapter";

const PAGE_SIZE = 20;

/**
 * Bajas: quién pidió no recibir promociones.
 *
 * Es el registro LEGAL del módulo, así que revocar no borra nada — la fila se
 * queda con su fecha de revocación. Este listado sí pagina en el backend, a
 * diferencia de promociones y reglas.
 */
export function OptOutsView() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("marketing:manage");
  const { showAlert, showModal, closeModal } = useAlert();

  const [activeOnly, setActiveOnly] = useState(true);

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

  function handleRevoke(optOut: OptOutDTO) {
    showModal({
      title: "¿Volver a incluir a este contacto?",
      description:
        "Volverá a recibir campañas y mensajes de recuperación. Hazlo solo si te lo pidió: la baja quedó registrada con su evidencia.",
      actions: [
        { label: "Cancelar", variant: "outline", asClose: true },
        {
          label: "Volver a incluir",
          variant: "default",
          onClick: () => {
            closeModal();
            void (async () => {
              try {
                await revokeOptOut(optOut.id);
                await refresh();
                showAlert({ tone: "success", title: "Baja revocada", open: true });
              } catch (err) {
                showAlert({
                  tone: "error",
                  title: errorMessage(err, "No se pudo revocar la baja"),
                  open: true,
                });
              }
            })();
          },
        },
      ],
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent/60">
          <input
            type="checkbox"
            className="accent-primary"
            checked={activeOnly}
            onChange={(e) => {
              setActiveOnly(e.target.checked);
              setPage(1);
            }}
          />
          Solo bajas activas
        </label>
        <span className="text-xs tabular-nums text-muted-foreground">
          {total.toLocaleString("es-CO")} {total === 1 ? "registro" : "registros"}
        </span>
      </div>

      {loading && items.length === 0 ? (
        <TableSkeleton rows={5} />
      ) : error ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-destructive/35 bg-destructive/5 px-4 py-3">
          <p className="flex-1 text-sm text-muted-foreground">
            No pudimos cargar las bajas.
          </p>
          <Button size="sm" variant="outline" onClick={() => void refresh()}>
            Reintentar
          </Button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          glyph="uptodate"
          title={activeOnly ? "Nadie se ha dado de baja" : "Sin registros de baja"}
          description="Cuando un cliente escriba una de tus palabras de baja, aparecerá aquí y quedará fuera de toda audiencia."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border bg-background">
            <table className="w-full text-sm">
              <caption className="sr-only">Contactos dados de baja</caption>
              <thead>
                <tr className="border-b border-border/60 bg-foreground/[0.02]">
                  <Th>Contacto</Th>
                  <Th>Motivo</Th>
                  <Th>Cuándo</Th>
                  <Th>Evidencia</Th>
                  <Th>{""}</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const revoked = row.revoked_at !== null;
                  return (
                    <tr key={row.id} className="border-b border-border/60 last:border-none">
                      <td className="px-4 py-2.5">
                        <span className="font-medium">
                          {row.contact.full_name ?? "Sin nombre"}
                        </span>
                        {row.contact.phone && (
                          <span className="block text-xs tabular-nums text-muted-foreground">
                            {row.contact.phone}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        {OPT_OUT_SOURCE_LABELS[row.source]}
                        {row.keyword_text && (
                          <span className="ml-1 font-mono text-muted-foreground">
                            «{row.keyword_text}»
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {formatShortDate(row.created_at)}
                      </td>
                      <td className="px-4 py-2.5">
                        {row.conversation_id ? (
                          <Button size="sm" variant="ghost" asChild>
                            <a href={`/workspace/inbox/${row.conversation_id}`}>Ver conversación</a>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {revoked ? (
                          // Revocar NO borra: la fila sigue, con su fecha.
                          <Badge variant="outline" title={formatShortDate(row.revoked_at!)}>
                            Revocada
                          </Badge>
                        ) : (
                          canManage && (
                            <Button size="sm" variant="outline" onClick={() => handleRevoke(row)}>
                              Volver a incluir
                            </Button>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs tabular-nums text-muted-foreground">
                Página {page} de {totalPages}
              </p>
              <BasicPagination totalPages={totalPages} page={page} onPageChange={setPage} />
            </div>
          )}
        </>
      )}

      <p className="flex gap-2.5 rounded-xl border border-info/25 bg-info/5 px-4 py-3 text-sm text-muted-foreground">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-info" />
        <span>
          Quien está aquí queda fuera de{" "}
          <strong className="font-medium text-foreground">toda</strong> audiencia: ninguna campaña
          ni regla puede escribirle. El historial se conserva aunque revoques la baja.
        </span>
      </p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="px-4 py-2.5 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground"
    >
      {children}
    </th>
  );
}
