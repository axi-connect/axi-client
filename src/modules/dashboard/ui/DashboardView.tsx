"use client";

import { useEffect, useMemo } from "react";
import { useAuth } from "@/shared/auth/auth.hooks";
import {
  useDashboardStore,
  type DashboardPerms,
} from "@/modules/dashboard/infrastructure/stores/dashboard.store";
import { useDashboardRealtime } from "@/modules/dashboard/infrastructure/realtime/use-dashboard-realtime";
import type { DashboardPeriod } from "@/modules/dashboard/domain/dashboard";
import { DashboardBanner } from "@/modules/dashboard/ui/components/DashboardBanner";
import { SalesTiles } from "@/modules/dashboard/ui/components/SalesTiles";
import { AttentionPanel } from "@/modules/dashboard/ui/components/AttentionPanel";
import { SystemHealthPanel } from "@/modules/dashboard/ui/components/SystemHealthPanel";
import { UsagePanel } from "@/modules/dashboard/ui/components/UsagePanel";
import { ConversationsFlowCard } from "@/modules/dashboard/ui/components/ConversationsFlowCard";
import { NewCustomersCard } from "@/modules/dashboard/ui/components/NewCustomersCard";
import { TopProductsCard } from "@/modules/dashboard/ui/components/TopProductsCard";

/**
 * Vista del dashboard. Orquesta el fetch condicional por permiso (RBAC natural,
 * §8) y el tiempo real. La superficie y el centrado los aporta el layout del
 * grupo (content); aquí NO hay contenedores con scroll/alto propios (scroll
 * único del panel privado). Cada sección se muestra solo si el rol la permite.
 */
export function DashboardView() {
  const { hasPermission } = useAuth();

  const perms: DashboardPerms = useMemo(
    () => ({
      orders: hasPermission("orders:read"),
      conversations: hasPermission("conversations:read"),
      contacts: hasPermission("contacts:read"),
      usage: hasPermission("usage:read"),
      channels: hasPermission("channels:read"),
    }),
    [hasPermission],
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

  useEffect(() => {
    void load(perms);
  }, [load, perms]);

  useDashboardRealtime(perms);

  const changePeriod = (next: DashboardPeriod) => setPeriod(next, perms);

  return (
    <div className="space-y-6">
      <DashboardBanner period={period} onPeriodChange={changePeriod} />

      {perms.orders && <SalesTiles section={sales} />}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {perms.conversations && (
          <ConversationsFlowCard section={conversations} period={period} />
        )}
        {perms.conversations && <AttentionPanel section={attention} />}
        {perms.contacts && <NewCustomersCard section={customers} period={period} />}
        {perms.channels && <SystemHealthPanel channels={channels} usage={usage} />}
        {perms.orders && <TopProductsCard section={topProducts} />}
        {perms.usage && <UsagePanel section={usage} />}
      </div>
    </div>
  );
}
