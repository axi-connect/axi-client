"use client";

import { useEffect, useRef } from "react";
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";
import type {
  AnalyticsAlertEvent,
  AnalyticsEvaluationCompletedEvent,
} from "@/core/realtime/events";
import { useAnalyticsStore } from "@/modules/analytics/infrastructure/stores/analytics.store";

/**
 * Tiempo real de Analíticas (namespace `/inbox`, debounce 600 ms):
 * - `analytics.alert` → badge/banner al instante + callback (floating-alert)
 *   + re-fetch debounced de la lista si el tab Alertas ya está cargado.
 * - `analytics.evaluation_completed` → re-fetch debounced de Calidad si está
 *   cargada + callback (Sheet abierto / aviso de evaluación crítica).
 * El tab Conversión NO escucha WS (es un agregado del período).
 */
export function useAnalyticsRealtime({
  enabled,
  onAlert,
  onEvaluationCompleted,
}: {
  /** `analytics:read` — sin permiso no se suscribe nada. */
  enabled: boolean;
  onAlert?: (payload: AnalyticsAlertEvent) => void;
  onEvaluationCompleted?: (payload: AnalyticsEvaluationCompletedEvent) => void;
}) {
  const { socket } = useSocket("inbox");
  const store = useAnalyticsStore;

  // Debounce por familia: colapsa ráfagas en una recarga.
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of Object.values(pending)) clearTimeout(timer);
    };
  }, []);

  const debounce = (key: string, fn: () => void, ms = 600) => {
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(fn, ms);
  };

  useSocketEvent(socket, "analytics.alert", (payload) => {
    if (!enabled) return;
    store.getState().onAlertTriggered();
    onAlert?.(payload);
    if (store.getState().alerts.status !== "idle") {
      debounce("alerts", () => void store.getState().loadAlerts());
    }
  });

  useSocketEvent(socket, "analytics.evaluation_completed", (payload) => {
    if (!enabled) return;
    store.getState().onEvaluationCompleted(payload);
    debounce("quality", () => void store.getState().refreshQuality());
    onEvaluationCompleted?.(payload);
  });
}
