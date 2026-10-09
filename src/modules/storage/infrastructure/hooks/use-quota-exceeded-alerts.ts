"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { quotaBatchNotice } from "@/modules/storage/domain/quota";
import { STORAGE_READ_PERMISSION, STORAGE_SETTINGS_PATH } from "@/modules/storage/domain/storage";
import {
  STORAGE_QUOTA_EXCEEDED_EVENT,
  type QuotaExceededSignal,
} from "@/modules/storage/infrastructure/notices/report-quota-exceeded";

/**
 * Convierte las señales del 507 en UNA píldora de tinta por lote (C-3): las
 * que llegan dentro de una ventana corta se juntan («No subimos 4
 * archivos»), y durante un rato no se repite. «Ver espacio» solo para quien
 * tiene `storage:read`.
 */
const GATHER_MS = 700;
const QUIET_MS = 15_000;

export function useQuotaExceededAlerts(): void {
  const { showAlert } = useAlert();
  const { hasPermission } = useAuth();
  const router = useRouter();

  const batch = useRef<QuotaExceededSignal[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quietUntil = useRef(0);

  useEffect(() => {
    const flush = () => {
      timer.current = null;
      const signals = batch.current;
      batch.current = [];
      if (signals.length === 0) return;
      quietUntil.current = Date.now() + QUIET_MS;
      const notice = quotaBatchNotice(
        signals[0].details,
        signals.map((signal) => signal.fileName),
        hasPermission(STORAGE_READ_PERMISSION),
      );
      showAlert({
        tone: "error",
        title: notice.title,
        description: notice.description,
        actions: notice.showSeeStorage
          ? [{ label: "Ver espacio", onClick: () => router.push(STORAGE_SETTINGS_PATH) }]
          : undefined,
      });
    };
    const onSignal = (event: Event) => {
      const signal = (event as CustomEvent<QuotaExceededSignal>).detail;
      if (!signal) return;
      // Mismo lote que ya se avisó: el estado vivo ya apagó las subidas
      if (Date.now() < quietUntil.current) return;
      batch.current.push(signal);
      timer.current ??= setTimeout(flush, GATHER_MS);
    };
    window.addEventListener(STORAGE_QUOTA_EXCEEDED_EVENT, onSignal);
    return () => {
      window.removeEventListener(STORAGE_QUOTA_EXCEEDED_EVENT, onSignal);
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, [hasPermission, router, showAlert]);
}
