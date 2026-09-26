"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { BentoTile } from "@/shared/components/features/bento";
import { BrandLoader } from "@/shared/components/ui/brand-loader";
import { Button } from "@/shared/components/ui/button";

import type { IcpDTO, QualitySummaryDTO } from "../domain/lead";
import {
  getIcp,
  getQualitySummary,
  updateIcp,
} from "../infrastructure/services/prospecting-service.adapter";
import { CaptureHeader } from "./components/CaptureHeader";
import { IcpEditor } from "./components/IcpEditor";
import { QualityDistribution } from "./components/QualityDistribution";

/**
 * La pestaña de Calidad.
 *
 * Dos cosas que el dueño tiene que poder ver de un vistazo: **cuántos leads
 * nadie ha puntuado** —el número que importa cuando el motor acaba de
 * encenderse— y qué verificaciones están activas. Un panel que solo mostrara la
 * distribución describiría a 12 leads mientras 300 esperan sin mirar.
 */
export function QualityView() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("leads:manage");
  const { showAlert } = useAlert();

  const [icp, setIcp] = useState<IcpDTO | null>(null);
  const [summary, setSummary] = useState<QualitySummaryDTO | null>(null);
  const [saving, setSaving] = useState(false);
  /** No se pudo leer: antes se quedaba en el cargador para siempre; ahora se dice y se reintenta. */
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [loadedIcp, loadedSummary] = await Promise.all([getIcp(), getQualitySummary()]);
      setIcp(loadedIcp);
      setSummary(loadedSummary);
    } catch (caught) {
      setLoadError(errorMessage(caught, "Revisa tu conexión e intenta otra vez."));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onSave = useCallback(
    async (next: IcpDTO) => {
      setSaving(true);
      try {
        const saved = await updateIcp({
          name: next.name,
          definition: next.definition,
          weights: next.weights,
        });
        setIcp(saved);
        showAlert({
          tone: "success",
          title: "Cliente ideal guardado",
          // Decirlo explícitamente evita la pregunta obvia: cambiar el criterio
          // recalcula lo que ya se sabe, no vuelve a comprar nada.
          description:
            "Tus leads se están volviendo a puntuar. No consume unidades.",
        });
      } catch (caught) {
        showAlert({
          tone: "error",
          title: "No se pudo guardar",
          description: errorMessage(caught, "Intenta de nuevo."),
        });
      } finally {
        setSaving(false);
      }
    },
    [showAlert],
  );

  const header = (
    <CaptureHeader title="Calidad" description="Qué es un buen lead para ti, y qué se sabe de los que ya tienes." />
  );

  if (icp === null || summary === null) {
    return (
      <div className="flex min-w-0 flex-col gap-6">
        {header}
        {loadError === null ? (
          <BrandLoader label="Cargando calidad" />
        ) : (
          <div className="border-border bg-card flex flex-col items-start gap-3 rounded-3xl border p-6">
            <p className="font-heading text-xl font-bold tracking-tight">No pudimos cargar la calidad</p>
            <p className="text-muted-foreground text-sm text-pretty">{loadError}</p>
            <Button variant="outline" className="rounded-full" onClick={() => void load()}>
              Reintentar
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {header}

      <QualityDistribution summary={summary} />

      <IcpEditor
        icp={icp}
        readOnly={!canManage}
        saving={saving}
        onSave={onSave}
        aside={
          <BentoTile label="Qué se verifica hoy">
            <ul className="divide-border divide-y text-sm">
              <VerificationRow label="El correo está bien escrito" active />
              <VerificationRow label="El dominio puede recibir correo" active hint="consulta DNS" />
              <VerificationRow label="No es un correo temporal" active />
              <VerificationRow label="El teléfono es un celular válido" active />
              <VerificationRow label="El sitio web responde" active />
              <VerificationRow label="El buzón existe de verdad" />
              <VerificationRow label="La línea telefónica está activa" />
            </ul>
            <p className="text-muted-foreground text-xs text-pretty">
              Las dos últimas necesitan un proveedor de verificación conectado. Sin él, esas señales quedan{" "}
              <strong className="text-foreground font-semibold">sin medir</strong> — que no es lo mismo que fallidas:
              no bajan el puntaje de nadie.
            </p>
          </BentoTile>
        }
      />
    </div>
  );
}

function VerificationRow({
  label,
  active = false,
  hint,
}: {
  label: string;
  active?: boolean;
  hint?: string;
}) {
  return (
    <li className="flex items-center gap-2.5 py-2.5">
      <span
        className={`size-2 shrink-0 rounded-full ${active ? "bg-success" : "bg-muted-foreground/40"}`}
        aria-hidden
      />
      <span className={active ? "" : "text-muted-foreground"}>{label}</span>
      {hint !== undefined && (
        <span className="text-muted-foreground text-xs">· {hint}</span>
      )}
      {!active && (
        <span className="bg-muted text-muted-foreground ml-auto inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[11px] whitespace-nowrap">
          <Sparkles className="size-3" aria-hidden />
          sin proveedor
        </span>
      )}
    </li>
  );
}
