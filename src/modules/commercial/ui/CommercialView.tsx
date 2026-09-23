"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Lock, Pencil, RotateCcw } from "lucide-react";

import { goalLead, routeTitle } from "@/modules/commercial/domain/copy";
import { monthLabel } from "@/modules/commercial/domain/format";
import { toIsoDate } from "@/modules/commercial/domain/weeks";
import { useCommercialStore } from "@/modules/commercial/infrastructure/stores/commercial.store";
import { useAuth } from "@/shared/auth/auth.hooks";
import { useEntitlements } from "@/shared/auth/entitlements.hooks";
import { EmptyState } from "@/shared/components/features/empty-state";
import { Button } from "@/shared/components/ui/button";
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
  const goal = useCommercialStore((state) => state.goal);
  const plan = useCommercialStore((state) => state.plan);
  const pace = useCommercialStore((state) => state.pace);
  const blocker = useCommercialStore((state) => state.blocker);
  const load = useCommercialStore((state) => state.load);
  const reloadPace = useCommercialStore((state) => state.reloadPace);

  const canRead = hasPermission("commercial:read");
  const canManage = hasPermission("commercial:manage");
  const enabled = !loaded || hasCapability("crm");

  useEffect(() => {
    if (enabled && canRead) void load();
  }, [enabled, canRead, load]);

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

  const today = toIsoDate(new Date());
  const current = goal.data.goal;
  const month = monthLabel(current?.period_start ?? today);
  const currency = current?.currency ?? "COP";

  if (current === null) {
    return (
      <div className="space-y-5">
        <Header title={routeTitle(month)} lead="Sin meta todavía." />
        <GoalEmptyState month={month} seed={goal.data.seed} currency={currency} canManage={canManage} />
      </div>
    );
  }

  const learning = pace.data?.data_sufficiency !== "ok";

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
          <CommercialSkeleton />
        )
      ) : (
        <>
          <RouteHero pace={pace.data} plan={plan.data} />
          {learning ? <LearningNotice daysElapsed={pace.data.business_days_elapsed} /> : <PaceLine series={pace.data.series} today={today} />}
          <KeyResultList pace={pace.data} plan={plan.data} learning={learning} />
          <ActionList proposals={[]} learning={learning} />
        </>
      )}
    </div>
  );
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
