"use client";

/**
 * Simulacro interactivo (upgrade quality F1, mockup F0 aprobado): tres
 * columnas —rail de mis sesiones · chat · inspector— en ≥lg; en pantallas
 * menores se apilan. Sin `sessionId` el centro muestra el formulario de
 * nueva sesión (con preselección por query `company`/`agent` para «Nueva
 * sesión igual»). Finalizar pide confirmación simple; purgar exige escribir
 * el nombre del tenant (`ConfirmTyped`, destruye datos del tenant).
 */
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Gauge } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Modal } from "@/shared/components/ui/modal";
import { TableSkeleton } from "@/shared/components/features/loading";
import { usePurgeRun } from "../../../../infrastructure/api/hooks/use-quality-runs";
import { useEndSession, useSessionQuery } from "../../../../infrastructure/api/hooks/use-quality-sessions";
import { ConfirmTyped } from "../../../components/ConfirmTyped";
import { EmptyState } from "../../../components/EmptyState";
import { ProblemAlert } from "../../../components/ProblemAlert";
import { ALL_TENANTS } from "../../../components/TenantSelect";
import { SessionChat } from "./chat/SessionChat";
import { SessionInspector } from "./inspector/SessionInspector";
import { NewSessionForm } from "./rail/NewSessionForm";
import { SessionsRail } from "./rail/SessionsRail";

export function SimulatorView({ sessionId = null }: { sessionId?: string | null }) {
  const [tenantFilter, setTenantFilter] = useState<string>(ALL_TENANTS);
  const searchParams = useSearchParams();
  const initial =
    !sessionId && searchParams.get("company") && searchParams.get("agent")
      ? { companyId: searchParams.get("company") ?? "", agentId: searchParams.get("agent") ?? "" }
      : undefined;

  return (
    <div className="grid min-h-[620px] gap-4 lg:max-xl:grid-cols-[232px_minmax(0,1fr)] lg:max-xl:grid-rows-[640px_auto] xl:h-[calc(100dvh-16rem)] xl:max-[1399px]:grid-cols-[248px_minmax(0,1fr)_340px] xl:grid-rows-none min-[1400px]:grid-cols-[256px_minmax(0,1fr)_360px]">
      <SessionsRail currentId={sessionId} tenantFilter={tenantFilter} onTenantFilterChange={setTenantFilter} />
      {sessionId ? (
        <SessionColumns sessionId={sessionId} />
      ) : (
        <>
          <div className="flex min-h-0 min-w-0 items-start justify-center overflow-y-auto rounded-3xl border border-border bg-card p-4 lg:items-center">
            <NewSessionForm initial={initial} />
          </div>
          <aside className="hidden overflow-hidden rounded-3xl border border-border bg-card xl:block" aria-label="Inspector de la sesión">
            <EmptyState
              icon={Gauge}
              title="Sin sesión activa"
              description="Aquí verás gasto, latencia, intención detectada y la traza de cada turno."
            />
          </aside>
        </>
      )}
    </div>
  );
}

function SessionColumns({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { showAlert } = useAlert();
  const sessionQuery = useSessionQuery(sessionId);
  const endSession = useEndSession();
  const purgeRun = usePurgeRun();
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState(false);

  if (sessionQuery.isPending) {
    return (
      <>
        <div className="rounded-3xl border border-border bg-card p-5">
          <TableSkeleton rows={6} />
        </div>
        <div className="rounded-3xl border border-border bg-card p-5">
          <TableSkeleton rows={4} />
        </div>
      </>
    );
  }
  if (sessionQuery.isError) {
    return (
      <div className="lg:col-span-2">
        <ProblemAlert error={sessionQuery.error} onRetry={() => void sessionQuery.refetch()} />
      </div>
    );
  }
  const session = sessionQuery.data;
  if (!session) return null;

  const onEnd = () => {
    endSession.mutate(sessionId, {
      onSuccess: () => {
        setConfirmEnd(false);
        showAlert({ tone: "success", title: "Sesión finalizada", description: "La conversación quedó cerrada; puedes purgar sus datos cuando quieras." });
      },
      onError: (error) => showAlert({ tone: "error", title: "No se pudo finalizar", description: errorMessage(error) }),
    });
  };
  const onPurge = () => {
    purgeRun.mutate(sessionId, {
      onSuccess: () => {
        setConfirmPurge(false);
        showAlert({ tone: "success", title: "Purga encolada", description: "El contacto y la conversación sintéticos se borran por lotes." });
        router.push("/platform/quality/simulator");
      },
      onError: (error) => showAlert({ tone: "error", title: "No se pudo purgar", description: errorMessage(error) }),
    });
  };

  return (
    <>
      <SessionChat session={session} onEnd={() => setConfirmEnd(true)} ending={endSession.isPending} />
      <SessionInspector
        session={session}
        transcriptLength={session.transcript.length}
        onEnd={() => setConfirmEnd(true)}
        onPurge={() => setConfirmPurge(true)}
        ending={endSession.isPending}
      />

      <Modal
        open={confirmEnd}
        onOpenChange={setConfirmEnd}
        config={{
          title: "Finalizar la sesión",
          description: "La conversación del tenant se cierra y el agente deja de responder. Los datos quedan marcados como simulados hasta que los purgues o pasen 14 días.",
          actions: [
            { label: "Cancelar", variant: "outline" },
            { label: endSession.isPending ? "Finalizando…" : "Finalizar", onClick: onEnd, keepOpen: true },
          ],
        }}
      />
      <ConfirmTyped
        open={confirmPurge}
        onOpenChange={setConfirmPurge}
        title="Purgar los datos de la sesión"
        description={
          <>
            <p>Se borran del tenant el contacto sintético, la conversación y sus mensajes, y las evaluaciones y métricas asociadas.</p>
            <p>El gasto de plataforma se conserva en la contabilidad. No se puede deshacer.</p>
          </>
        }
        confirmText={session.company_name}
        actionLabel="Purgar datos"
        onConfirm={onPurge}
        pending={purgeRun.isPending}
      />
    </>
  );
}
