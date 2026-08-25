"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BarChart3, ShieldCheck, TriangleAlert, type LucideIcon } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { useAuth } from "@/shared/auth/auth.hooks";
import { useAlert } from "@/core/providers/alert-provider";
import {
  ANALYTICS_PERIODS,
  ANALYTICS_TABS,
  TAB_LABELS,
  type AnalyticsPeriod,
  type AnalyticsTab,
} from "@/modules/analytics/domain/analytics";
import { alertRuleLabel } from "@/modules/analytics/domain/labels";
import { useAnalyticsStore } from "@/modules/analytics/infrastructure/stores/analytics.store";
import { useAnalyticsRealtime } from "@/modules/analytics/infrastructure/realtime/use-analytics-realtime";
import { AnalyticsPeriodSelector } from "./components/AnalyticsPeriodSelector";
import { AlertsBanner } from "./components/AlertsBanner";
import { ConversionTab } from "./components/conversion/ConversionTab";
import { QualityTab } from "./components/quality/QualityTab";
import { AlertsTab } from "./components/alerts/AlertsTab";

/** Icono por pestaña. Vive aquí y no en `domain/`, que es TypeScript puro. */
const TAB_ICONS: Record<AnalyticsTab, LucideIcon> = {
  conversion: BarChart3,
  calidad: ShieldCheck,
  alertas: TriangleAlert,
};

function parseTab(value: string | null): AnalyticsTab {
  return (ANALYTICS_TABS as string[]).includes(value ?? "")
    ? (value as AnalyticsTab)
    : "conversion";
}

function parsePeriod(value: string | null): AnalyticsPeriod {
  return (ANALYTICS_PERIODS as string[]).includes(value ?? "")
    ? (value as AnalyticsPeriod)
    : "30d";
}

/**
 * Vista de Analíticas: UNA página con 3 tabs sincronizados a la URL
 * (`?tab=conversion|calidad|alertas&period=7d|30d|90d`) — deep-linking gratis
 * y el back del navegador funciona. Cada tab carga lazy en su primer montaje
 * (cache por sección en el store); el período es único para los tres.
 */
export function AnalyticsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { hasPermission } = useAuth();
  const { showAlert } = useAlert();

  const canRead = hasPermission("analytics:read");

  const tab = parseTab(searchParams.get("tab"));
  const period = parsePeriod(searchParams.get("period"));

  const storePeriod = useAnalyticsStore((state) => state.period);
  const setPeriod = useAnalyticsStore((state) => state.setPeriod);
  const loadConversion = useAnalyticsStore((state) => state.loadConversion);
  const loadVoice = useAnalyticsStore((state) => state.loadVoice);
  const loadQuality = useAnalyticsStore((state) => state.loadQuality);
  const loadAlertsBadge = useAnalyticsStore((state) => state.loadAlertsBadge);
  const triggeredCount = useAnalyticsStore((state) => state.triggeredCount);

  const replaceParams = useCallback(
    (next: { tab?: AnalyticsTab; period?: AnalyticsPeriod }) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", next.tab ?? tab);
      params.set("period", next.period ?? period);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams, tab, period],
  );

  // El período de la URL manda: sincroniza el store (re-fetch selectivo).
  useEffect(() => {
    if (canRead && period !== storePeriod) setPeriod(period);
  }, [canRead, period, storePeriod, setPeriod]);

  // El badge de alertas es visible en los tres tabs → se pide al montar.
  useEffect(() => {
    if (canRead) void loadAlertsBadge();
  }, [canRead, loadAlertsBadge]);

  // Carga lazy por tab (con cache: volver no re-fetchea).
  useEffect(() => {
    if (!canRead) return;
    if (tab === "conversion") {
      void loadConversion();
      // La tarjeta Voz es por CICLO: carga aparte y el período no la re-fetchea
      void loadVoice();
    }
    if (tab === "calidad") void loadQuality();
  }, [canRead, tab, loadConversion, loadVoice, loadQuality]);

  const goToTabRef = useCallback(
    (next: AnalyticsTab) => replaceParams({ tab: next }),
    [replaceParams],
  );

  // Tiempo real: alertas en vivo (floating-alert + badge) y evaluaciones
  // completadas (aviso si es crítica; el Sheet/lista los maneja QualityTab).
  useAnalyticsRealtime({
    enabled: canRead,
    onAlert: (payload) => {
      showAlert({
        tone: "error",
        title: `Nueva alerta: ${alertRuleLabel(payload.rule)}`,
        open: true,
        actions: [{ label: "Ver", onClick: () => goToTabRef("alertas") }],
      });
    },
    onEvaluationCompleted: (payload) => {
      const critical =
        (payload.overall_score !== null && payload.overall_score < 50) ||
        payload.hallucination_severity === "major";
      if (!critical) return;
      showAlert({
        tone: "warning",
        title: `Nueva evaluación crítica${
          payload.overall_score !== null ? ` (${Math.round(payload.overall_score)}/100)` : ""
        }`,
        open: true,
        actions: [{ label: "Ver", onClick: () => goToTabRef("calidad") }],
      });
    },
  });

  // RBAC natural: un deep-link sin permiso no rompe ni provoca 403.
  if (!canRead) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-background px-6 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          No tienes acceso a las analíticas de tu empresa.
        </p>
      </div>
    );
  }

  const goToTab = goToTabRef;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Analíticas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cómo venden y qué tan bien atienden tus agentes IA
          </p>
        </div>
        <AnalyticsPeriodSelector
          value={period}
          onChange={(next) => replaceParams({ period: next })}
        />
      </header>

      {tab !== "alertas" && <AlertsBanner onGoToAlerts={() => goToTab("alertas")} />}

      <Tabs value={tab} onValueChange={(value) => goToTab(value as AnalyticsTab)}>
        <TabsList aria-label="Secciones de analíticas">
          {ANALYTICS_TABS.map((key) => {
            const Icon = TAB_ICONS[key];
            return (
            <TabsTrigger key={key} value={key}>
              <Icon aria-hidden="true" />
              {TAB_LABELS[key]}
              {key === "alertas" && triggeredCount !== null && triggeredCount > 0 && (
                <Badge variant="destructive" className="ml-1 px-1.5 tabular-nums">
                  {triggeredCount}
                </Badge>
              )}
            </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="conversion" className="pt-2">
          <ConversionTab onGoToQuality={() => goToTab("calidad")} />
        </TabsContent>

        <TabsContent value="calidad" className="pt-2">
          <QualityTab
            initialIssueCode={searchParams.get("issue")}
            initialEvalConversationId={searchParams.get("eval")}
          />
        </TabsContent>

        <TabsContent value="alertas" className="pt-2">
          <AlertsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
