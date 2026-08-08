"use client";

import { useEffect, useState } from "react";
import { errorMessage } from "@/core/lib/error-messages";
import {
  loadMyCompanyOnce,
  type CompanyDTO,
  type CompanySchedule,
} from "@/modules/companies/public";

/**
 * Zona horaria y horario de atención del negocio (vía cache por sesión de
 * `/companies/me`). El calendario NO usa la zona del navegador: todo se pinta
 * en `timezone`.
 */
export function useCompanySchedule(): {
  loading: boolean;
  error: string | null;
  timezone: string | null;
  schedules: CompanySchedule[];
  /** `false` = sin franjas → empty state "configura tu horario", nunca "sin cupo". */
  scheduleConfigured: boolean;
} {
  const [company, setCompany] = useState<CompanyDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadMyCompanyOnce()
      .then((data) => {
        if (alive) setCompany(data);
      })
      .catch((err: unknown) => {
        if (alive) setError(errorMessage(err, "No se pudo cargar la empresa"));
      });
    return () => {
      alive = false;
    };
  }, []);

  return {
    loading: company === null && error === null,
    error,
    timezone: company?.timezone ?? null,
    schedules: company?.schedules ?? [],
    scheduleConfigured: (company?.schedules.length ?? 0) > 0,
  };
}
