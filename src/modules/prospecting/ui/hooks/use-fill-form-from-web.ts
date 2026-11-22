"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import {
  getProspectingSettings,
  updateProspectingSettings,
  type ProspectingSettingsDTO,
} from "../../infrastructure/services/prospecting-service.adapter";

export interface FillFormFromWebState {
  /** `hidden`: sin permiso de Captación o sin el módulo; la tarjeta no se pinta. */
  status: "hidden" | "loading" | "ready";
  enabled: boolean;
  /** Puede cambiarlo (`leads:manage`); si no, lo ve deshabilitado. */
  canManage: boolean;
  saving: boolean;
  setEnabled: (next: boolean) => void;
}

/**
 * El ajuste «Completar con la web del negocio» (`settings.prospecting.fill_form_from_web`).
 *
 * Guarda AL INSTANTE: es un ajuste de Captación, no parte del borrador del formulario, así que no
 * entra al «Guardar cambios» de Formularios de captura. El PUT reemplaza la sección entera, por eso
 * se envía lo vigente con la clave cambiada.
 */
export function useFillFormFromWeb(): FillFormFromWebState {
  const { hasPermission, status: authStatus } = useAuth();
  const { showAlert } = useAlert();
  const canRead = hasPermission("leads:read");
  const canManage = hasPermission("leads:manage");

  const [settings, setSettings] = useState<ProspectingSettingsDTO | null>(null);
  const [status, setStatus] = useState<FillFormFromWebState["status"]>("loading");
  const [saving, setSaving] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    if (!canRead) {
      setStatus("hidden");
      return;
    }
    if (loaded.current) return;
    loaded.current = true;
    getProspectingSettings()
      .then((value) => {
        setSettings(value);
        setStatus("ready");
      })
      // Sin Captación en el plan (o sin red): la tarjeta es un extra de esta página, no la rompe.
      .catch(() => setStatus("hidden"));
  }, [authStatus, canRead]);

  const setEnabled = useCallback(
    (next: boolean) => {
      if (settings === null || !canManage || saving) return;
      const previous = settings;
      setSettings({ ...settings, fill_form_from_web: next });
      setSaving(true);
      updateProspectingSettings({ ...previous, fill_form_from_web: next })
        .then((saved) => {
          setSettings(saved);
          showAlert({
            tone: "success",
            title: next
              ? "Listo. Axi completará estos datos con la web de cada negocio que pase a tus contactos."
              : "Listo. Axi ya no leerá la web de los negocios para este formulario.",
          });
        })
        .catch((error: unknown) => {
          setSettings(previous);
          showAlert({ tone: "error", title: errorMessage(error, "No se pudo guardar el ajuste") });
        })
        .finally(() => setSaving(false));
    },
    [settings, canManage, saving, showAlert],
  );

  return {
    status,
    enabled: settings?.fill_form_from_web === true,
    canManage,
    saving,
    setEnabled,
  };
}
