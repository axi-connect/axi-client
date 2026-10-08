"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { quotaNotice } from "@/modules/storage/domain/quota";
import { STORAGE_READ_PERMISSION, STORAGE_SETTINGS_PATH } from "@/modules/storage/domain/storage";
import {
  STORAGE_QUOTA_EXCEEDED_EVENT,
  type QuotaExceededSignal,
} from "@/modules/storage/infrastructure/notices/report-quota-exceeded";

/**
 * Convierte la señal del 507 en la píldora de tinta (DESIGN-SYSTEM §9.4):
 * «No subimos «promo.jpg»» + qué hacer, y «Ver espacio» solo para quien
 * tiene `storage:read`. Dos subidas que chocan a la vez con el mismo archivo
 * no avisan dos veces (`notify` deduplica por texto).
 */
export function useQuotaExceededAlerts(): void {
  const { showAlert } = useAlert();
  const { hasPermission } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const onSignal = (event: Event) => {
      const signal = (event as CustomEvent<QuotaExceededSignal>).detail;
      if (!signal) return;
      const notice = quotaNotice(signal.details, signal.fileName, hasPermission(STORAGE_READ_PERMISSION));
      showAlert({
        tone: "error",
        title: notice.title,
        description: notice.description,
        actions: notice.showSeeStorage
          ? [{ label: "Ver espacio", onClick: () => router.push(STORAGE_SETTINGS_PATH) }]
          : undefined,
      });
    };
    window.addEventListener(STORAGE_QUOTA_EXCEEDED_EVENT, onSignal);
    return () => window.removeEventListener(STORAGE_QUOTA_EXCEEDED_EVENT, onSignal);
  }, [hasPermission, router, showAlert]);
}
