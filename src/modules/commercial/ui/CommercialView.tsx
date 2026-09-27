"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { Lock, Pencil, RotateCcw } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import { goalLead, routeTitle } from "@/modules/commercial/domain/copy";
import { keyResultHref } from "@/modules/commercial/domain/key-result";
import { commercialProposalHref } from "@/modules/commercial/domain/proposals";
import { monthLabel } from "@/modules/commercial/domain/format";
import { isLearning } from "@/modules/commercial/domain/pace";
import { weekChart } from "@/modules/commercial/domain/route-figures";
import { weekProgress } from "@/modules/commercial/domain/weeks";
import { useCommercialRealtime } from "@/modules/commercial/infrastructure/realtime/use-commercial-realtime";
import { useCommercialStore } from "@/modules/commercial/infrastructure/stores/commercial.store";
import { useMyCompany } from "@/modules/companies/public";
import { useAuth } from "@/shared/auth/auth.hooks";
import { useEntitlements } from "@/shared/auth/entitlements.hooks";
import { EmptyState } from "@/shared/components/features/empty-state";
import { Button } from "@/shared/components/ui/button";
import { useApproveAccess } from "./hooks/use-approve-access";
import { CommercialSkeleton } from "./CommercialSkeleton";
import { CommercialBlockedState } from "./components/CommercialBlockedState";
import { GoalEmptyState } from "./components/GoalEmptyState";
import { KeyResultGrid } from "./components/KeyResultGrid";
import { RecommendedActions } from "./components/RecommendedActions";
import { RouteHero } from "./components/RouteHero";
import { TicketTile } from "./components/TicketTile";
import { WeekTile } from "./components/WeekTile";

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

  // Tiempo real (F8): la meta, el plan, el ritmo y las acciones recomendadas se recargan
  // al avisar el servidor, con debounce y sin romper la secuencia del store.
  const { live } = useCommercialRealtime({ enabled: enabled && canRead && blocker === null, proposals: true });

  // Las acciones recomendadas se piden con meta y una vez por montaje: aprobar o rechazar
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
        showAlert({ tone: "error", title: "No se pudo aprobar", description: errorMessage(error) });
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
  const periodKey = current?.period_start ?? pace.data?.today ?? monthKeyFallback();
  const month = monthLabel(periodKey);
  // Sin meta la moneda es la del tenant, no un «COP» fijo.
  const currency = current?.currency ?? company?.currency ?? "COP";
  const kicker = `Comercial · ${month} ${periodKey.slice(0, 4)}`;

  if (current === null) {
    return (
      <div className="@container space-y-5">
        <Header kicker={kicker} title={routeTitle(month)} lead="Sin meta todavía." />
        <GoalEmptyState month={month} seed={goal.data.seed} currency={currency} canManage={canManage} />
      </div>
    );
  }

  const p = pace.data;
  const learning = p !== null && isLearning(p);
  const hasWeek =
    p !== null &&
    !learning &&
    weekProgress(p.series, p.today, p.weekdays, p.period_start) !== null &&
    weekChart(p.series, p.today, p.weekdays, p.period_start, p.period_end) !== null;
  const hasTicket = plan.data?.inputs.avg_ticket_cents != null;
  const tiles = Number(hasWeek) + Number(hasTicket);

  return (
    <div className="@container space-y-5">
      <Header
        kicker={kicker}
        title={routeTitle(month)}
        lead={goalLead(current.target_revenue_cents, currency, current.source, current.updated_at)}
        status={p === null ? null : <Freshness live={live} computedAt={p.computed_at} />}
        action={
          canManage ? (
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/comercial/meta">
                <Pencil aria-hidden className="size-4" />
                Cambiar meta
              </Link>
            </Button>
          ) : null
        }
      />

      {p === null ? (
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
          <RouteHero pace={p} plan={plan.data} />
          {/* El bento (canvas 1): en ancho, las dos fichas arriba, «Lo que hace falta» debajo y la isla a la
              derecha de ambas; en estrecho, la isla primero (canvas 7). */}
          <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_22rem]">
            <RecommendedActions
              className="@2xl:col-span-2 @4xl:col-span-1 @4xl:col-start-3 @4xl:row-span-2 @4xl:row-start-1 @4xl:self-start"
              learning={learning}
              paceStatus={p.status}
              proposals={proposals.data ?? undefined}
              error={proposals.status === "error" ? proposals.error : null}
              onRetry={() => void loadProposals()}
              canApprove={canApprove}
              readOnlyMessage={readOnlyMessage}
              onApprove={onApprove}
              resultIds={resultIds}
            />
            {hasWeek ? (
              <WeekTile
                pace={p}
                href={keyResultHref("sales")}
                className={cn("@4xl:col-start-1 @4xl:row-start-1", tiles === 1 && "@2xl:col-span-2 @4xl:col-end-3")}
              />
            ) : null}
            <TicketTile
              pace={p}
              plan={plan.data}
              href={keyResultHref("avg_ticket")}
              className={cn(tiles === 2 ? "@4xl:col-start-2" : "@2xl:col-span-2 @4xl:col-start-1 @4xl:col-end-3", "@4xl:row-start-1")}
            />
            <div className={cn("min-w-0 @2xl:col-span-2 @4xl:col-start-1 @4xl:col-end-3", tiles === 0 ? "@4xl:row-start-1" : "@4xl:row-start-2")}>
              <KeyResultGrid pace={p} plan={plan.data} learning={learning} detailHref={keyResultHref} />
            </div>
          </div>
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

function Header({
  kicker,
  title,
  lead,
  status,
  action,
}: {
  kicker: string;
  title: string;
  lead: string;
  status?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">{kicker}</p>
        <h1 className="font-heading text-[32px] leading-[1.02] font-bold tracking-[-0.025em] text-balance @xl:text-[44px]">{title}</h1>
        <p className="text-sm text-muted-foreground">{lead}</p>
      </div>
      {status !== undefined || action !== undefined ? (
        <div className="flex flex-wrap items-center gap-3">
          {status}
          {action}
        </div>
      ) : null}
    </header>
  );
}

const TIME = new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit" });

/**
 * «En vivo · 10:42 a. m.» solo cuando el tiempo real escucha de verdad; si no,
 * «Actualizado 10:42 a. m.»: la hora es la del cálculo del ritmo en el
 * servidor, no la del navegador.
 */
function Freshness({ live, computedAt }: { live: boolean; computedAt: string }) {
  const date = new Date(computedAt);
  const time = Number.isNaN(date.getTime()) ? null : TIME.format(date);
  if (!live && time === null) return null;
  return (
    <span className="inline-flex items-center gap-2 text-[12.5px] whitespace-nowrap text-muted-foreground">
      <span aria-hidden className={cn("size-1.5 rounded-full", live ? "bg-success ring-4 ring-success/15" : "bg-muted-foreground")} />
      {live ? (time === null ? "En vivo" : `En vivo · ${time}`) : `Actualizado ${time ?? ""}`}
    </span>
  );
}
