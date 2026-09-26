"use client";

import { useEffect, useState } from "react";

import type { SetupSources } from "@/modules/companies/domain/cobros-setup";
import {
  getCollectionsSetup,
  getDocumentsSetup,
  getFxSetup,
} from "@/modules/companies/infrastructure/services/cobros-setup.adapter";

/**
 * Lee solo lo que hace falta para las funciones ENCENDIDAS: con la cobranza
 * apagada no se pide su ajuste (respondería 403). Un fallo queda como
 * `"error"` en su fuente — la ficha lo dice, la isla no la cuenta — y nunca
 * tumba la pestaña.
 *
 * `loaded` distingue «aún no sé» de «no está configurada»: la isla no pinta
 * un pendiente que quizá no existe (§9.5: mientras carga el dato que decide
 * la acción, no se pinta).
 */
export function useCobrosSetup(activeCodes: readonly string[]): {
  sources: SetupSources;
  loaded: boolean;
} {
  const key = [...activeCodes].sort().join(",");
  const [state, setState] = useState<{
    key: string | null;
    sources: SetupSources;
  }>({
    key: null,
    sources: { collections: null, fx: null, documents: null },
  });

  useEffect(() => {
    let alive = true;
    const codes = key === "" ? [] : key.split(",");
    const wantsCollections =
      codes.includes("payment_plans") || codes.includes("collections");
    const settle = <T>(
      want: boolean,
      read: () => Promise<T>,
    ): Promise<T | null | "error"> =>
      want ? read().catch(() => "error" as const) : Promise.resolve(null);
    void Promise.all([
      settle(wantsCollections, getCollectionsSetup),
      settle(codes.includes("fx_quotes"), getFxSetup),
      settle(codes.includes("documents"), getDocumentsSetup),
    ]).then(([collections, fx, documents]) => {
      if (alive) setState({ key, sources: { collections, fx, documents } });
    });
    return () => {
      alive = false;
    };
  }, [key]);

  return { sources: state.sources, loaded: state.key === key };
}
