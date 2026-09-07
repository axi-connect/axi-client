"use client";

import { useEffect } from "react";

import { useSession } from "@/shared/auth/auth.hooks";
import { useMyCompanyStore } from "@/modules/companies/infrastructure/stores/my-company.store";

/**
 * La empresa del tenant, reactiva. Dispara la carga al autenticarse y se
 * repinta cuando cualquier vista llama a `refresh()`. `loading` es true solo
 * hasta la primera respuesta (ok o error): el sidebar y el banner deciden su
 * fallback con eso.
 */
export function useMyCompany() {
  const { status: sessionStatus } = useSession();
  const status = useMyCompanyStore((state) => state.status);
  const company = useMyCompanyStore((state) => state.company);
  const load = useMyCompanyStore((state) => state.load);
  const refresh = useMyCompanyStore((state) => state.refresh);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    load().catch(() => {
      /* El consumidor decide su fallback (marca Axi, skeleton, alerta). */
    });
  }, [sessionStatus, load]);

  return {
    company,
    status,
    loading: sessionStatus === "loading" || status === "idle" || status === "loading",
    refresh,
  };
}
