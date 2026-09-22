"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { API_ERROR_CODES, isHttpError } from "@/core/api/problem";
import { useAuthContext } from "@/core/providers/auth-provider";
import { errorMessage } from "@/core/lib/error-messages";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { FeatureDisabledState } from "@/shared/components/features/feature-disabled-state/FeatureDisabledState";
import type {
  DocumentTemplateDTO,
  DocumentTypesDTO,
  DocumentsSettingsDTO,
} from "@/modules/documents/domain/template";
import {
  getDocumentsSettings,
  listDocumentTemplates,
  listDocumentTypes,
} from "@/modules/documents/infrastructure/services/documents-service.adapter";
import { DocumentSettingsForm } from "./forms/DocumentSettingsForm";
import {
  DocumentKindTabs,
  SETTINGS_TAB,
} from "./components/templates/DocumentKindTabs";
import { DocumentTemplateEditor } from "./components/templates/DocumentTemplateEditor";

type State =
  | { status: "loading" }
  | { status: "disabled"; code: string }
  | { status: "error"; message: string }
  | {
      status: "ready";
      types: DocumentTypesDTO;
      templates: DocumentTemplateDTO[];
      settings: DocumentsSettingsDTO;
    };

/**
 * Mi empresa › Documentos (F7 Cobros): las plantillas por tipo y el emisor.
 * Autosuficiente: carga catálogo, plantillas y ajustes en una tanda, muestra
 * el 403 de función explicado, y cambia de panel sin cambiar de URL. Vive en
 * Mi empresa y no en Pagos porque los documentos son el papel de la empresa y
 * los consume cualquier proceso.
 */
export const DOCUMENT_TEMPLATES_PERMISSION = "document_templates:manage";

export function DocumentsTab() {
  const { hasPermission } = useAuthContext();
  const canManage = hasPermission(DOCUMENT_TEMPLATES_PERMISSION);
  const [state, setState] = useState<State>({ status: "loading" });
  const [active, setActive] = useState<string>("contract");
  const [pendingSwitch, setPendingSwitch] = useState<string | null>(null);
  const dirtyRef = useRef(false);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const [types, templates, settings] = await Promise.all([
        listDocumentTypes(),
        listDocumentTemplates(),
        getDocumentsSettings(),
      ]);
      setState({
        status: "ready",
        types,
        templates: templates.templates,
        settings,
      });
    } catch (error) {
      if (isHttpError(error) && error.is(API_ERROR_CODES.featureDisabled)) {
        setState({ status: "disabled", code: "documents" });
      } else {
        setState({
          status: "error",
          message: errorMessage(error, "No se pudieron cargar los documentos"),
        });
      }
    }
  }, []);

  useEffect(() => {
    if (canManage) void load();
  }, [load, canManage]);

  // Dos mensajes distintos que llevan a dos sitios distintos: «no tienes la
  // función» (Funciones) y «no tienes el permiso» (quien administra los roles).
  if (!canManage) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-4 py-9 text-center">
        <div className="mb-1 grid size-12 place-items-center rounded-xl bg-secondary text-muted-foreground">
          <ShieldAlert aria-hidden="true" className="size-[22px]" />
        </div>
        <h3 className="text-base font-semibold">
          Las plantillas las configura quien administra
        </h3>
        <p className="max-w-[46ch] text-sm text-muted-foreground">
          Cambiar el texto de un contrato o el emisor de los documentos requiere
          el permiso «Configurar plantillas de documentos», que tienen el dueño
          y los administradores. Pídeselo a quien administra los roles.
        </p>
        <Button asChild variant="ghost" size="sm" className="mt-1.5">
          <Link href="/settings/company">Volver a Mi empresa</Link>
        </Button>
      </div>
    );
  }

  const switchTo = (next: string) => {
    if (next === active) return;
    if (dirtyRef.current) {
      setPendingSwitch(next);
      return;
    }
    setActive(next);
  };

  if (state.status === "loading") {
    return (
      <div role="status" aria-label="Cargando documentos" className="space-y-4">
        <Skeleton className="h-9 w-full max-w-2xl rounded-full" />
        <div className="grid gap-8 lg:grid-cols-[minmax(0,430px)_minmax(0,1fr)]">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-[560px] rounded-2xl" />
        </div>
      </div>
    );
  }
  if (state.status === "disabled") {
    return (
      <FeatureDisabledState
        title="Aquí no hay documentos"
        description="Este negocio no emite contratos ni cuentas de cobro: la función está apagada. Si los necesitas, enciéndela en Funciones."
        code={state.code}
        backHref="/settings/company"
        backLabel="Volver a Mi empresa"
      />
    );
  }
  if (state.status === "error") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-4 py-9 text-center">
        <p className="text-sm text-muted-foreground">{state.message}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void load()}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  const { types, templates, settings } = state;
  const activeType = types.types.find((type) => type.code === active) ?? null;
  const activeTemplate =
    templates.find((template) => template.type_code === active) ?? null;

  return (
    <section className="flex flex-col gap-5" aria-labelledby="documents-title">
      <div>
        <h2
          id="documents-title"
          className="flex items-center gap-2 text-lg font-medium"
        >
          <FileText aria-hidden="true" className="size-[18px]" />
          Documentos
        </h2>
        <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">
          El papel que tu negocio le da a sus clientes: contratos, cotizaciones,
          recibos, estados de cuenta y cuentas de cobro. Lo que escribas aquí se
          rellena con los datos reales al emitir; la hoja de la derecha es
          exactamente lo que va a salir.
        </p>
      </div>

      <DocumentKindTabs
        types={types.types}
        value={active}
        onChange={switchTo}
      />

      {active === SETTINGS_TAB ? (
        <DocumentSettingsForm
          settings={settings}
          types={types.types}
          onSaved={(next) => setState({ ...state, settings: next })}
        />
      ) : activeType !== null && activeTemplate !== null ? (
        <DocumentTemplateEditor
          key={activeType.code}
          type={activeType}
          catalog={types.block_catalog}
          current={activeTemplate}
          dirtyRef={dirtyRef}
          onSaved={(next) =>
            setState({
              ...state,
              templates: templates.map((template) =>
                template.type_code === next.type_code ? next : template,
              ),
            })
          }
        />
      ) : null}

      <Dialog
        open={pendingSwitch !== null}
        onOpenChange={(open) => !open && setPendingSwitch(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Dejas esta plantilla sin guardar?</DialogTitle>
            <DialogDescription>
              Tienes cambios sin guardar. Si cambias de documento ahora se
              pierden; guardarlos crea una versión nueva.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPendingSwitch(null)}
            >
              Seguir editando
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (pendingSwitch !== null) {
                  dirtyRef.current = false;
                  setActive(pendingSwitch);
                }
                setPendingSwitch(null);
              }}
            >
              Descartar y cambiar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
