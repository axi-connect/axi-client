"use client";

import { create } from "zustand";

import type { CompanyDTO } from "@/modules/companies/domain/company";
import { getMyCompany } from "@/modules/companies/infrastructure/services/company-service.adapter";

type Status = "idle" | "loading" | "ready" | "error";

interface MyCompanyState {
  status: Status;
  company: CompanyDTO | null;
  /** Una sola petición compartida (single-flight); `force` la repite. */
  load: (force?: boolean) => Promise<CompanyDTO>;
  /** Tras mutar la empresa: recarga y todos los suscriptores se repintan. */
  refresh: () => Promise<CompanyDTO>;
  /** Olvida lo cargado sin pedir nada: el próximo consumidor re-fetchea. */
  invalidate: () => void;
}

let inflight: Promise<CompanyDTO> | null = null;

/**
 * La empresa del tenant (`GET /companies/me`) como estado COMPARTIDO y
 * REACTIVO. Antes era una promesa a nivel de módulo (company-cache.ts): una
 * sola petición, sí, pero sin suscriptores — al guardar «Mi empresa» el
 * isotipo y el nombre del sidebar y el banner del dashboard seguían viejos
 * hasta recargar. Con el store, `refresh()` repinta a todos.
 */
export const useMyCompanyStore = create<MyCompanyState>((set, get) => ({
  status: "idle",
  company: null,
  load: (force = false) => {
    const { status, company } = get();
    if (!force && status === "ready" && company !== null) return Promise.resolve(company);
    if (!force && inflight) return inflight;
    set({ status: "loading" });
    inflight = getMyCompany()
      .then((loaded) => {
        set({ company: loaded, status: "ready" });
        return loaded;
      })
      .catch((error: unknown) => {
        set({ status: "error" });
        throw error;
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  },
  refresh: () => get().load(true),
  invalidate: () => {
    inflight = null;
    set({ status: "idle", company: null });
  },
}));

/** Solo para tests. */
export function resetMyCompanyStore(): void {
  inflight = null;
  useMyCompanyStore.setState({ status: "idle", company: null });
}
