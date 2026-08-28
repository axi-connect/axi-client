"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldOff, Sparkles } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { PageHeader } from "@/shared/components/layout/page-header";
import { BrandLoader } from "@/shared/components/ui/brand-loader";

import {
  QUALITY_AXES,
  type IcpDTO,
  type QualitySummaryDTO,
} from "../domain/lead";
import {
  getIcp,
  getQualitySummary,
  updateIcp,
} from "../infrastructure/services/prospecting-service.adapter";
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

  const load = useCallback(async () => {
    try {
      const [loadedIcp, loadedSummary] = await Promise.all([
        getIcp(),
        getQualitySummary(),
      ]);
      setIcp(loadedIcp);
      setSummary(loadedSummary);
    } catch (caught) {
      showAlert({
        tone: "error",
        title: "No pudimos cargar la calidad",
        description: errorMessage(caught, "Intenta de nuevo."),
      });
    }
  }, [showAlert]);

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

  if (icp === null || summary === null)
    return <BrandLoader label="Cargando calidad" />;

  return (
    <div>
      <PageHeader
        title="Calidad"
        description="Qué es un buen lead para ti, y qué se sabe de los que ya tienes."
      />

      <QualityDistribution summary={summary} />

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="border-border shadow-float bg-background rounded-lg border p-5">
          <IcpEditor
            icp={icp}
            readOnly={!canManage}
            saving={saving}
            onSave={onSave}
          />
        </section>

        <section className="border-border shadow-float bg-background rounded-lg border p-5">
          <p className="text-muted-foreground mb-3 text-[10.5px] font-semibold tracking-wider uppercase">
            Qué se verifica hoy
          </p>
          <ul className="divide-border-soft divide-y text-sm">
            <VerificationRow label="El correo está bien escrito" active />
            <VerificationRow
              label="El dominio puede recibir correo"
              active
              hint="consulta DNS"
            />
            <VerificationRow label="No es un correo temporal" active />
            <VerificationRow label="El teléfono es un celular válido" active />
            <VerificationRow label="El sitio web responde" active />
            <VerificationRow label="El buzón existe de verdad" />
            <VerificationRow label="La línea telefónica está activa" />
          </ul>
          <p className="text-muted-foreground mt-3 flex items-start gap-2 text-xs">
            <ShieldOff className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Las dos últimas necesitan un proveedor de verificación conectado.
            Sin él, esas señales quedan{" "}
            <strong className="font-semibold">sin medir</strong> — que no es lo
            mismo que fallidas: no bajan el puntaje de nadie.
          </p>
        </section>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        {QUALITY_AXES.map((axis) => (
          <p key={axis.key} className="text-muted-foreground text-xs">
            <strong className="text-foreground font-semibold">
              {axis.label}
            </strong>{" "}
            — {axis.question}
          </p>
        ))}
      </div>
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
    <li className="flex items-center gap-2 py-2">
      <span
        className={`size-1.5 shrink-0 rounded-full ${active ? "bg-success" : "bg-foreground/20"}`}
        aria-hidden
      />
      <span className={active ? "" : "text-muted-foreground"}>{label}</span>
      {hint !== undefined && (
        <span className="text-muted-foreground text-xs">· {hint}</span>
      )}
      {!active && (
        <span className="text-muted-foreground ml-auto flex items-center gap-1 text-[11px]">
          <Sparkles className="size-3" aria-hidden />
          sin proveedor
        </span>
      )}
    </li>
  );
}
