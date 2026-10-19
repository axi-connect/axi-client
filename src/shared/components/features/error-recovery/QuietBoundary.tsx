"use client";

import { Component, type ReactNode } from "react";

import { isChunkLoadError } from "@/core/lib/chunk-recovery";
import { reportClientError } from "@/core/lib/report-client-error";

type Props = {
  /** Nombre para la telemetría (`quiet:<name>`). */
  name: string;
  children: ReactNode;
  /** Lo que queda en su lugar si falla. Por defecto, nada. */
  fallback?: ReactNode;
};

/**
 * Frontera para piezas ACCESORIAS cargadas en diferido: el visor de avisos y el
 * Modal del layout raíz, las fibras del hero. Si su chunk no carga (red
 * cortada, HTML de una versión anterior) o lanzan, desaparecen en silencio en
 * lugar de tumbar la página entera: viven por encima de cualquier `error.tsx`,
 * así que sin esto su fallo solo lo atrapaba `global-error` (hotfix
 * «Application error», docs/plans/hotfix_application_error_plan.md).
 *
 * No recarga: si era un chunk viejo, ya recarga el script en línea del <head>.
 */
export class QuietBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    reportClientError({
      kind: isChunkLoadError(error) ? "chunk" : "boundary",
      error,
      boundary: `quiet:${this.props.name}`,
    });
  }

  render(): ReactNode {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}
