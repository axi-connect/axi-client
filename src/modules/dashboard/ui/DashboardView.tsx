"use client";

import { useEffect, useMemo } from "react";
import { useAuth } from "@/shared/auth/auth.hooks";
import {
  useDashboardStore,
  type DashboardPerms,
} from "@/modules/dashboard/infrastructure/stores/dashboard.store";
import { useDashboardRealtime } from "@/modules/dashboard/infrastructure/realtime/use-dashboard-realtime";
import type { DashboardPeriod } from "@/modules/dashboard/domain/dashboard";
import { DashboardHeader } from "@/modules/dashboard/ui/components/DashboardHeader";
import { NextUpIsland } from "@/modules/dashboard/ui/components/NextUpIsland";
import { SalesTiles } from "@/modules/dashboard/ui/components/SalesTiles";
import { SystemHealthPanel } from "@/modules/dashboard/ui/components/SystemHealthPanel";
import { UsagePanel } from "@/modules/dashboard/ui/components/UsagePanel";
import { ConversationsFlowCard } from "@/modules/dashboard/ui/components/ConversationsFlowCard";
import { NewCustomersCard } from "@/modules/dashboard/ui/components/NewCustomersCard";
import { TopProductsCard } from "@/modules/dashboard/ui/components/TopProductsCard";
import { GoalProgressBlock } from "@/modules/commercial/public";
import { useMyCompany } from "@/modules/companies/public";
import type { NextUpSource } from "@/modules/dashboard/domain/next-up";
import { useEntitlements } from "@/shared/auth/entitlements.hooks";

/**
 * La rejilla del bento (DESIGN-SYSTEM §9.5): dos columnas en `md`, tres en
 * `xl`. La isla se ancla arriba a la derecha y el resto fluye con
 * `grid-flow-dense`, así una ficha que el rol no ve no deja hueco. Filas
 * `auto`, nunca en px. En el celular la isla va primero (orden del DOM).
 */
const GRID = "grid gap-4 md:grid-cols-2 xl:grid-flow-dense xl:grid-cols-3 [&>*]:min-w-0";
const WIDE = "md:col-span-2";
const ISLAND = "md:col-span-2 xl:col-span-1 xl:col-start-3 xl:row-span-2 xl:row-start-1";

/**
 * Vista del Panel. Orquesta el fetch condicional por permiso (RBAC natural,
 * §8) y el tiempo real. La superficie y el centrado los aporta el layout del
 * grupo (content); aquí NO hay contenedores con scroll/alto propios (scroll
 * único del panel privado). Cada ficha se muestra solo si el rol la permite.
 */
export function DashboardView() {
  const { hasPermission } = useAuth();
  const { hasCapability, loaded: entitlementsLoaded } = useEntitlements();

  const perms: DashboardPerms = useMemo(
    () => ({
      // Permiso del rol Y capacidad del plan: un tenant del módulo Llamadas no
      // tiene catálogo ni pedidos, y sin esto las tarjetas de ventas pedirían
      // /orders/stats para recibir un 403 (auditoría 2026-09-03, Fase 4).
      orders: hasPermission("orders:read") && entitlementsLoaded && hasCapability("sales"),
      conversations: hasPermission("conversations:read"),
      contacts: hasPermission("contacts:read"),
      usage: hasPermission("usage:read"),
      channels: hasPermission("channels:read"),
    }),
    [hasPermission, hasCapability, entitlementsLoaded],
  );

  const period = useDashboardStore((state) => state.period);
  const sales = useDashboardStore((state) => state.sales);
  const attention = useDashboardStore((state) => state.attention);
  const conversations = useDashboardStore((state) => state.conversations);
  const customers = useDashboardStore((state) => state.customers);
  const topProducts = useDashboardStore((state) => state.topProducts);
  const usage = useDashboardStore((state) => state.usage);
  const channels = useDashboardStore((state) => state.channels);
  const load = useDashboardStore((state) => state.load);
  const setPeriod = useDashboardStore((state) => state.setPeriod);
  const refreshSales = useDashboardStore((state) => state.refreshSales);
  const refreshConversations = useDashboardStore((state) => state.refreshConversations);
  const refreshCustomers = useDashboardStore((state) => state.refreshCustomers);
  const refreshTopProducts = useDashboardStore((state) => state.refreshTopProducts);
  const refreshUsage = useDashboardStore((state) => state.refreshUsage);
  const refreshChannels = useDashboardStore((state) => state.refreshChannels);
  const refreshAttention = useDashboardStore((state) => state.refreshAttention);
  // Las fechas de las fichas (horas de «Hoy», ciclo del consumo) en la zona del negocio.
  const timeZone = useMyCompany().company?.timezone || undefined;

  const retryNextUp = async (failed: NextUpSource[]) => {
    const refresh: Record<NextUpSource, () => Promise<void>> = {
      attention: refreshAttention,
      sales: refreshSales,
      channels: refreshChannels,
      usage: refreshUsage,
    };
    await Promise.all(failed.map((source) => refresh[source]()));
  };

  useEffect(() => {
    void load(perms);
  }, [load, perms]);

  const { live } = useDashboardRealtime(perms);

  const changePeriod = (next: DashboardPeriod) => setPeriod(next, perms);

  return (
    <div className="flex flex-col gap-7">
      <DashboardHeader period={period} onPeriodChange={changePeriod} live={live} />

      <div className={GRID}>
        <NextUpIsland
          perms={perms}
          attention={attention}
          sales={sales}
          channels={channels}
          usage={usage}
          onRetry={retryNextUp}
          className={ISLAND}
        />
        {/* La meta del mes: autosuficiente; sin capacidad, permiso o meta que mostrar no pinta nada. */}
        <GoalProgressBlock className={WIDE} />
        {perms.orders && <SalesTiles section={sales} onRetry={refreshSales} />}
        {perms.conversations && (
          <ConversationsFlowCard section={conversations} period={period} timeZone={timeZone} onRetry={refreshConversations} className={WIDE} />
        )}
        {perms.channels && <SystemHealthPanel channels={channels} usage={usage} onRetry={refreshChannels} />}
        {perms.contacts && <NewCustomersCard section={customers} period={period} onRetry={refreshCustomers} />}
        {perms.orders && <TopProductsCard section={topProducts} period={period} onRetry={refreshTopProducts} />}
        {perms.usage && <UsagePanel section={usage} timeZone={timeZone} onRetry={refreshUsage} />}
      </div>
    </div>
  );
}
