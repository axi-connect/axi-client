"use client";

import { useEffect, useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  SchedulesEditor,
  invalidateMyCompanyCache,
  loadMyCompanyOnce,
  type CompanyDTO,
} from "@/modules/companies/public";
import { FlowActions, FlowBackButton } from "@/modules/onboarding/ui/flow/FlowActions";
import { FlowScreen } from "@/modules/onboarding/ui/flow/FlowScreen";

/**
 * Paso 2 · Horarios. Embebe el editor real del slice `companies` (el mismo de
 * Ajustes y de la Agenda) **intacto**, en una hoja sólida: es un formulario y
 * los formularios no van sobre cristal (DESIGN-SYSTEM §5.2). Al guardar, el
 * paso queda hecho. El alta ya sembró Lunes–Sábado 9–18, así que «Mantener
 * este horario» es un cierre válido y es la única acción del pie: el CTA de
 * guardar es el del editor.
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
    <FlowScreen
      focusHeading
      title="¿Cuándo atiende tu negocio?"
      lead="Venía Lunes a Sábado de 9 a 18. Ajústalo a como opera tu negocio y guarda; o mantenlo y sigue."
    >
      <div className="bg-background border-border w-full max-w-[640px] rounded-2xl border p-4 text-left shadow-[0_12px_40px_rgb(0_0_0/.06)] sm:p-5">
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
          <p role="alert" className="text-muted-foreground text-sm leading-relaxed">
            {loadError}
          </p>
        ) : (
          <div className="space-y-2" aria-busy="true" aria-label="Cargando horario">
            {Array.from({ length: 7 }, (_, index) => (
              <Skeleton key={index} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        )}
      </div>
      <FlowActions
        secondary={
          <Button type="button" variant="ghost" disabled={saving} onClick={onKeep}>
            Mantener este horario y continuar
          </Button>
        }
        microcopy={`Tu agente atiende en este horario y fuera de él avisa · zona horaria ${company?.timezone ?? "de tu empresa"}`}
        back={<FlowBackButton onClick={onBack} />}
        className="mt-2"
      />
    </FlowScreen>
  );
}
