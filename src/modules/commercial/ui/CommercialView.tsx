"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { Lock, Pencil, RotateCcw } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { goalLead, routeTitle } from "@/modules/commercial/domain/copy";
import { keyResultHref } from "@/modules/commercial/domain/key-result";
import { commercialProposalHref } from "@/modules/commercial/domain/proposals";
import { monthLabel } from "@/modules/commercial/domain/format";
import { isLearning } from "@/modules/commercial/domain/pace";
import { useCommercialRealtime } from "@/modules/commercial/infrastructure/realtime/use-commercial-realtime";
import { useCommercialStore } from "@/modules/commercial/infrastructure/stores/commercial.store";
import { useMyCompany } from "@/modules/companies/public";
import { useAuth } from "@/shared/auth/auth.hooks";
import { useEntitlements } from "@/shared/auth/entitlements.hooks";
import { EmptyState } from "@/shared/components/features/empty-state";
import { Button } from "@/shared/components/ui/button";
import { useApproveAccess } from "./hooks/use-approve-access";
import { CommercialSkeleton } from "./CommercialSkeleton";
import { ActionList } from "./components/ActionList";
import { CommercialBlockedState } from "./components/CommercialBlockedState";
import { GoalEmptyState } from "./components/GoalEmptyState";
import { KeyResultList } from "./components/KeyResultList";
import { LearningNotice } from "./components/LearningNotice";
import { PaceLine } from "./components/PaceLine";
import { RouteHero } from "./components/RouteHero";

/**
 * `/comercial`: la ruta del mes. Orquesta los estados —sin permiso, bloqueado
 * por el plan, cargando, error, sin meta, aprendiendo, con meta— y deja a los
 * componentes el dibujo.
 *
 * El gate de capacidad es `crm` (el módulo no vende capacidad propia en v1):
 * mientras `useEntitlements` carga NO se pinta el bloqueado, porque una
 * pantalla que aparece bloqueada y luego se desbloquea dice lo contrario de lo
 * que pasó. El 403 que llegue del servidor manda igual (`blocker`).
 */
export function CommercialView() {
  const { hasPermission } = useAuth();
  const { loaded, hasCapability } = useEntitlements();
  const { company } = useMyCompany();
  const goal = useCommercialStore((state) => state.goal);
  const plan = useCommercialStore((state) => state.plan);
  const pace = useCommercialStore((state) => state.pace);
  const blocker = useCommercialStore((state) => state.blocker);
  const load = useCommercialStore((state) => state.load);
  const reloadPace = useCommercialStore((state) => state.reloadPace);
  const proposals = useCommercialStore((state) => state.proposals);
  const loadProposals = useCommercialStore((state) => state.loadProposals);
  const approveProposal = useCommercialStore((state) => state.approveProposal);
  const approvals = useCommercialStore((state) => state.approvals);
  // Solo las aprobadas de verdad ofrecen «Ver qué quedó» (V3).
  const resultIds = useMemo(
    () => new Set(Object.entries(approvals).filter(([, result]) => result.status === "approved").map(([id]) => id)),
    [approvals],
  );
  const router = useRouter();
  const { showAlert } = useAlert();

  const canRead = hasPermission("commercial:read");
  const canManage = hasPermission("commercial:manage");
  const { canApprove, readOnlyMessage } = useApproveAccess();
  const enabled = !loaded || hasCapability("crm");

  // Solo la primera vez: guardar la meta ya recarga plan y ritmo, y el Panel
  // pudo haber cargado antes. Un `load()` por montaje pisaba esas respuestas.
  useEffect(() => {
    if (enabled && canRead && goal.status === "idle") void load();
  }, [enabled, canRead, goal.status, load]);

  // Al salir de la ruta no queda un reintento de ritmo caducado en vuelo (V4).
  const cancelStaleRetry = useCommercialStore((state) => state.cancelStaleRetry);
  useEffect(() => cancelStaleRetry, [cancelStaleRetry]);

  // Tiempo real (F8): la meta, el plan, el ritmo y «Axi propone» se recargan
  // al avisar el servidor, con debounce y sin romper la secuencia del store.
  useCommercialRealtime({ enabled: enabled && canRead && blocker === null, proposals: true });

  // «Axi propone» se pide con meta y una vez por montaje: aprobar o rechazar
  // actualiza la lista en el store, y al volver de otra pantalla puede haber
  // propuestas que llegaron mientras no se escuchaba.
  const hasGoal = goal.data?.goal != null;
  useEffect(() => {
    if (enabled && canRead && hasGoal) void loadProposals();
  }, [enabled, canRead, hasGoal, loadProposals]);

  // Aprobar desde la lista abre el detalle, que pinta lo que quedó.
  const onApprove = useCallback(
    async (id: string) => {
      try {
        await approveProposal(id);
        router.push(commercialProposalHref(id));
      } catch (error: unknown) {
        showAlert({ tone: "error", title: errorMessage(error) });
      }
    },
    [approveProposal, router, showAlert],
  );

  if (!canRead) {
    return (
      <EmptyState
        icon={Lock}
        accent="muted"
        title="No tienes acceso a Comercial"
        description="Pídele a un administrador el permiso de lectura del módulo."
      />
    );
  }

  if (!enabled || blocker === "no_plan") return <CommercialBlockedState />;

  if (goal.data === null) {
    if (goal.status === "error") {
      return (
        <EmptyState
          icon={RotateCcw}
          accent="muted"
          variant="solid"
          title="No pude cargar la ruta"
          description={goal.error ?? undefined}
          action={
            <Button variant="outline" onClick={() => void load()}>
              Reintentar
            </Button>
          }
        />
      );
    }
    return <CommercialSkeleton />;
  }

  const current = goal.data.goal;
  const month = monthLabel(current?.period_start ?? pace.data?.today ?? monthKeyFallback());
  // Sin meta la moneda es la del tenant, no un «COP» fijo.
  const currency = current?.currency ?? company?.currency ?? "COP";

  if (current === null) {
    return (
      <div className="space-y-5">
        <Header title={routeTitle(month)} lead="Sin meta todavía." />
        <GoalEmptyState month={month} seed={goal.data.seed} currency={currency} canManage={canManage} />
      </div>
    );
  }

  const learning = pace.data !== null && isLearning(pace.data);

  return (
    <div className="space-y-5">
      <Header
        title={routeTitle(month)}
        lead={goalLead(current.target_revenue_cents, currency, current.source, current.updated_at)}
        action={
          canManage ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/comercial/meta">
                <Pencil aria-hidden className="size-4" />
                Cambiar meta
              </Link>
            </Button>
          ) : null
        }
      />

      {pace.data === null ? (
        pace.status === "error" ? (
          <EmptyState
            icon={RotateCcw}
            accent="muted"
            variant="solid"
            title="No pude leer el ritmo"
            description={pace.error ?? undefined}
            action={
              <Button variant="outline" onClick={() => void reloadPace()}>
                Reintentar
              </Button>
            }
          />
        ) : (
          <CommercialSkeleton withHeader={false} />
        )
      ) : (
        <>
          <RouteHero pace={pace.data} plan={plan.data} />
          {learning ? (
            <LearningNotice daysElapsed={pace.data.business_days_elapsed} />
          ) : (
            <PaceLine pace={pace.data} href={keyResultHref("sales")} />
          )}
          <KeyResultList pace={pace.data} plan={plan.data} learning={learning} detailHref={keyResultHref} />
          <ActionList
            learning={learning}
            paceStatus={pace.data.status}
            proposals={proposals.data ?? undefined}
            error={proposals.status === "error" ? proposals.error : null}
            onRetry={() => void loadProposals()}
            canApprove={canApprove}
            readOnlyMessage={readOnlyMessage}
            onApprove={onApprove}
            resultIds={resultIds}
          />
        </>
      )}
    </div>
  );
}

/**
 * Sin meta y sin ritmo no hay `today` del servidor: el título del vacío usa
 * el mes del navegador solo para nombrarlo («Ponle una meta a septiembre»);
 * ninguna cifra sale de aquí.
 */
function monthKeyFallback(): string {
  const now = new Date();
  return `${String(now.getFullYear())}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function Header({ title, lead, action }: { title: string; lead: string; action?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{lead}</p>
      </div>
      {action}
    </header>
  );
}
