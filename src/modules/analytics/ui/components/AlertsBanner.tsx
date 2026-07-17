"use client";

import { TriangleAlert } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { fade } from "@/core/styles/motion";
import { Button } from "@/shared/components/ui/button";
import { useAnalyticsStore } from "@/modules/analytics/infrastructure/stores/analytics.store";

/**
 * Banner de alertas activas (glass — superficie flotante sancionada). Visible
 * en los tres tabs mientras haya alertas `triggered`; navega al tab Alertas.
 */
export function AlertsBanner({ onGoToAlerts }: { onGoToAlerts: () => void }) {
  const reduced = useReducedMotion() ?? false;
  const triggeredCount = useAnalyticsStore((state) => state.triggeredCount);

  if (!triggeredCount || triggeredCount <= 0) return null;

  const label =
    triggeredCount === 1
      ? "1 alerta activa requiere tu atención"
      : `${triggeredCount.toLocaleString("es-CO")} alertas activas requieren tu atención`;

  return (
    <motion.div
      role="status"
      initial={reduced ? false : { opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={fade.fast}
      className="glass flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
    >
      <span className="flex items-center gap-2 text-sm font-medium">
        <TriangleAlert aria-hidden className="size-4 text-warning" />
        {label}
      </span>
      <Button variant="ghost" size="sm" onClick={onGoToAlerts}>
        Ver alertas →
      </Button>
    </motion.div>
  );
}
