"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { fade } from "@/core/styles/motion";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ackAlert } from "@/modules/analytics/infrastructure/services/analytics-service.adapter";
import { useAnalyticsStore } from "@/modules/analytics/infrastructure/stores/analytics.store";
import { ALERT_STATUS_LABELS } from "@/modules/analytics/domain/labels";
import type { AlertStatus } from "@/modules/analytics/domain/analytics";
import { SectionError } from "../conversion/section-states";
import { AlertRow } from "./AlertRow";

const STATUSES: AlertStatus[] = ["triggered", "acknowledged", "resolved"];

const EMPTY_BY_STATUS: Record<AlertStatus, string> = {
  triggered:
    "Todo en orden. Te avisaremos aquí (y en vivo) si algo necesita tu atención.",
  acknowledged: "No tienes alertas atendidas en este estado.",
  resolved: "No hay alertas resueltas todavía.",
};

/**
 * Tab Alertas: anomalías del sistema en frases naturales, filtradas por
 * estado. Ack optimista (fila sale con `fade.fast` + colapso); si el PATCH
 * falla, se recarga la lista para restaurar la verdad del servidor.
 */
export function AlertsTab() {
  const reduced = useReducedMotion() ?? false;
  const { hasPermission } = useAuth();
  const { showAlert } = useAlert();
  const canManage = hasPermission("analytics:manage");

  const alerts = useAnalyticsStore((state) => state.alerts);
  const alertsStatus = useAnalyticsStore((state) => state.alertsStatus);
  const triggeredCount = useAnalyticsStore((state) => state.triggeredCount);
  const performance = useAnalyticsStore((state) => state.performance);
  const loadAlerts = useAnalyticsStore((state) => state.loadAlerts);
  const removeAlert = useAnalyticsStore((state) => state.removeAlert);

  // Primer montaje del tab: carga el estado activo (lazy, §6 del plan).
  useEffect(() => {
    if (useAnalyticsStore.getState().alerts.status === "idle") void loadAlerts();
  }, [loadAlerts]);

  const agentNameOf = (subjectType: string, subjectId: string | null): string | null => {
    if (subjectType !== "agent" || !subjectId) return null;
    return (
      performance.data?.agents.find((agent) => agent.agent_id === subjectId)?.name ?? null
    );
  };

  const handleAck = async (alertId: string) => {
    try {
      await ackAlert(alertId);
      removeAlert(alertId);
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err), open: true });
      void loadAlerts();
    }
  };

  return (
    <div className="space-y-4">
      <SegmentedControl
        value={alertsStatus}
        onValueChange={(status) => void loadAlerts(status)}
        label="Estado de las alertas"
        size="sm"
        surface="inline"
        items={STATUSES.map((status) => ({
          value: status,
          label: ALERT_STATUS_LABELS[status],
          count:
            status === "triggered" && triggeredCount !== null && triggeredCount > 0
              ? triggeredCount
              : null,
        }))}
      />

      {alerts.status === "error" ? (
        <div className="rounded-2xl border border-border bg-background p-5">
          <SectionError message={alerts.error} onRetry={() => void loadAlerts()} />
        </div>
      ) : alerts.data === null ? (
        <div role="status" aria-label="Cargando alertas" className="space-y-2">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      ) : alerts.data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-background px-6 py-16 text-center">
          <ShieldCheck aria-hidden className="size-8 text-success" />
          <p className="max-w-md text-sm text-muted-foreground">
            {EMPTY_BY_STATUS[alertsStatus]}
          </p>
        </div>
      ) : (
        <div
          className={cn(
            "divide-y divide-border rounded-2xl border border-border bg-background",
            alerts.status === "loading" && "opacity-60",
          )}
        >
          <AnimatePresence initial={false}>
            {alerts.data.map((alert) => (
              <motion.div
                key={alert.id}
                exit={
                  reduced ? undefined : { opacity: 0, height: 0, overflow: "hidden" }
                }
                transition={fade.fast}
              >
                <AlertRow
                  alert={alert}
                  agentName={agentNameOf(alert.subject_type, alert.subject_id)}
                  canManage={canManage}
                  onAck={handleAck}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
