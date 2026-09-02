"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  SchedulesEditor,
  invalidateMyCompanyCache,
  loadMyCompanyOnce,
  type CompanyDTO,
} from "@/modules/companies/public";
import { StepAside, StepFrame } from "@/modules/onboarding/ui/onboarding/StepFrame";

/**
 * Paso 2 · Horarios. Embebe el editor real del slice `companies` (el mismo de
 * Ajustes y de la Agenda): al guardar, el paso queda hecho. El alta ya sembró
 * Lunes–Sábado 9–18, así que «Mantener este horario» es un cierre válido.
 */
export function BusinessHoursStep({
  saving,
  onBack,
  onSaved,
  onKeep,
  onError,
}: {
  saving: boolean;
  onBack: () => void;
  onSaved: () => void;
  onKeep: () => void;
  onError: (message: string) => void;
}) {
  const [company, setCompany] = useState<CompanyDTO | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadMyCompanyOnce()
      .then((data) => {
        if (!cancelled) setCompany(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError("No pudimos cargar tu horario actual. Puedes continuar y ajustarlo después en Agenda.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <StepFrame
      stepNumber={2}
      total={5}
      label="Horarios"
      title="Tu horario de atención"
      lead="Venía Lunes a Sábado de 9 a 18. Ajústalo a como opera tu negocio y guarda; o mantenlo y sigue."
      footer={
        <>
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft aria-hidden="true" />
            Atrás
          </Button>
          <Button variant="outline" size="lg" className="h-11" disabled={saving} onClick={onKeep}>
            Mantener este horario y continuar
          </Button>
        </>
      }
      aside={
        <StepAside
          glyph="time"
          title="Para qué sirve"
          text="La agenda, los recordatorios y las promesas de entrega del agente usan este horario. Tu agente responde fuera de él, pero solo agenda y promete dentro."
          tips={[`Zona horaria: ${company?.timezone ?? "la de tu empresa"}`, "Varios tramos por día, más adelante en Agenda", "Los festivos se configuran en Agenda"]}
        />
      }
    >
      {company ? (
        <SchedulesEditor
          schedules={company.schedules}
          onSaved={() => {
            invalidateMyCompanyCache();
            onSaved();
          }}
          onError={onError}
        />
      ) : loadError ? (
        <p role="alert" className="border-warning/40 bg-warning/10 rounded-xl border px-4 py-3 text-sm">
          {loadError}
        </p>
      ) : (
        <div className="space-y-2" aria-busy="true" aria-label="Cargando horario">
          {Array.from({ length: 7 }, (_, index) => (
            <Skeleton key={index} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      )}
    </StepFrame>
  );
}
