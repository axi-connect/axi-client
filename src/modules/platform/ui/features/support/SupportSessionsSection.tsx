"use client";

/**
 * «Sesiones de soporte» del tenant (entrega F3, N4): quién entró, cuándo, por
 * qué, cuánto duró, cuántas pantallas abrió y cuántos cambios hizo. Se exporta
 * en CSV (el registro que el cliente puede pedir) y las abiertas se cierran
 * desde aquí, lo que invalida el token de soporte al instante.
 */
import { useState } from "react";
import { Download, LifeBuoy, LoaderCircle, XCircle } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { formatDayTime } from "@/core/lib/format";
import { useAlert } from "@/core/providers/alert-provider";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  formatSupportDuration,
  isOpenSupportSession,
  plural,
  SUPPORT_STATUS_LABELS,
  type SupportSession,
} from "../../../domain/support-sessions";
import {
  exportSupportSessionsCsv,
  useRevokeSupportSession,
  useSupportSessionsQuery,
} from "../../../infrastructure/api/hooks/use-support-sessions";
import { ProblemAlert } from "../../components/ProblemAlert";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function SessionRow({ session, tenantId }: { session: SupportSession; tenantId: string }) {
  const { showAlert, showModal } = useAlert();
  const revoke = useRevokeSupportSession(tenantId);
  const open = isOpenSupportSession(session);
  const who = session.platform_user?.name ?? "Admin retirado";

  function confirmRevoke() {
    showModal({
      title: "¿Cerrar la sesión de soporte?",
      description: `La pestaña de ${who} deja de funcionar al instante.`,
      actions: [
        { label: "Cancelar", variant: "outline" },
        {
          label: "Cerrar sesión",
          variant: "destructive",
          onClick: () =>
            void revoke.mutateAsync(session.id).then(
              () => showAlert({ tone: "success", title: "Sesión de soporte cerrada", autoCloseMs: 4000 }),
              (error: unknown) =>
                showAlert({ tone: "error", title: "No pudimos cerrar la sesión", description: errorMessage(error) }),
            ),
        },
      ],
    });
  }

  return (
    <li className="flex flex-wrap items-start gap-x-4 gap-y-2 py-3">
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm">
          <span className="font-medium">{who}</span>
          {" · "}
          {formatSupportDuration(session.duration_s)} · {plural(session.request_count, "pantalla", "pantallas")} ·{" "}
          {plural(session.changes_count, "cambio", "cambios")}
        </p>
        <p className="truncate text-xs text-muted-foreground" title={session.reason}>
          «{session.reason}»{session.ticket_ref ? ` · ${session.ticket_ref}` : ""} · {formatDayTime(session.created_at)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={open ? "secondary" : "outline"}>{SUPPORT_STATUS_LABELS[session.status]}</Badge>
        {open ? (
          <Button type="button" size="sm" variant="outline" onClick={confirmRevoke} disabled={revoke.isPending}>
            {revoke.isPending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <XCircle aria-hidden="true" />}
            Cerrar
          </Button>
        ) : null}
      </div>
    </li>
  );
}

export function SupportSessionsSection({ tenantId }: { tenantId: string }) {
  const { showAlert } = useAlert();
  const { data, isPending, isError, error, refetch } = useSupportSessionsQuery(tenantId);
  const [exporting, setExporting] = useState(false);
  const sessions = data?.data ?? [];

  async function exportCsv() {
    setExporting(true);
    try {
      downloadBlob(await exportSupportSessionsCsv(tenantId), "sesiones-de-soporte.csv");
    } catch (exportError) {
      showAlert({ tone: "error", title: "No pudimos exportar el registro", description: errorMessage(exportError) });
    } finally {
      setExporting(false);
    }
  }

  return (
    <section aria-labelledby="support-sessions-title" className="rounded-2xl border border-border bg-background p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="support-sessions-title" className="flex items-center gap-2 text-sm font-medium">
            <LifeBuoy aria-hidden="true" className="size-4 text-muted-foreground" />
            Sesiones de soporte
          </h2>
          <p className="text-xs text-muted-foreground">
            En el historial del tenant, los cambios hechos en soporte aparecen como «Soporte Axi».
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => void exportCsv()} disabled={exporting}>
          {exporting ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Download aria-hidden="true" />}
          Exportar CSV
        </Button>
      </header>
      {isPending ? (
        <Skeleton className="mt-3 h-16 w-full rounded-xl" />
      ) : isError ? (
        <ProblemAlert className="mt-3" error={error} onRetry={() => void refetch()} />
      ) : sessions.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nadie ha entrado como soporte a esta cuenta.</p>
      ) : (
        <ul className="mt-1 divide-y divide-border">
          {sessions.map((session) => (
            <SessionRow key={session.id} session={session} tenantId={tenantId} />
          ))}
        </ul>
      )}
    </section>
  );
}
