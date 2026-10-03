"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { META_TEMPLATES_HREF, metaTemplatesHref } from "@/core/lib/hsm-copy";
import { errorMessage } from "@/core/lib/error-messages";
import { useUnsavedGuard } from "@/core/hooks/use-unsaved-guard";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { EmptyState } from "@/shared/components/features/empty-state";
import { FormSkeleton } from "@/shared/components/features/loading";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { listChannels } from "@/modules/channels/public";
import type { HsmTemplateDTO } from "@/modules/marketing/domain/template-catalog";
import {
  listHsmTemplates,
  syncHsmTemplates,
} from "@/modules/marketing/infrastructure/services/templates-service.adapter";
import { HsmTemplateForm } from "@/modules/marketing/ui/forms/hsm-template/HsmTemplateForm";

type Loaded =
  | { kind: "loading" }
  | { kind: "no_channel" }
  | { kind: "not_found" }
  | { kind: "error"; message: string }
  | { kind: "ready"; channelId: string; templates: HsmTemplateDTO[]; editing: HsmTemplateDTO | null };

/**
 * La página de una plantilla de Meta, crear o editar (hsm-media F3). Reemplaza
 * la modal: resuelve el canal (`?channel=` o el primer WhatsApp Cloud), carga
 * las plantillas del canal —de ahí salen las versiones usadas y, al editar, la
 * plantilla misma— y protege la salida si hay cambios sin enviar.
 *
 * Al guardar vuelve a la lista señalando la plantilla (`?point=`), que es lo que
 * hacía la modal al cerrarse.
 */
export function HsmTemplatePageView({
  templateId = null,
  channelParam = null,
}: {
  /** La que se edita; `null` para crear. */
  templateId?: string | null;
  channelParam?: string | null;
}) {
  const router = useRouter();
  const guard = useUnsavedGuard();
  const { showAlert } = useAlert();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("marketing:manage");
  const [state, setState] = useState<Loaded>({ kind: "loading" });

  const load = useCallback(async () => {
    try {
      const channels = (await listChannels()).data.filter((channel) => channel.kind === "whatsapp_cloud");
      if (channels.length === 0) {
        setState({ kind: "no_channel" });
        return;
      }
      // Al editar sin `?channel=` (un enlace pegado), se busca la plantilla canal por canal.
      const ordered = [
        ...channels.filter((channel) => channel.id === channelParam),
        ...channels.filter((channel) => channel.id !== channelParam),
      ];
      for (const channel of templateId === null ? ordered.slice(0, 1) : ordered) {
        const templates = await listHsmTemplates({ channel_id: channel.id });
        const editing = templateId === null ? null : (templates.find((template) => template.id === templateId) ?? null);
        if (templateId === null || editing !== null) {
          setState({ kind: "ready", channelId: channel.id, templates, editing });
          return;
        }
      }
      setState({ kind: "not_found" });
    } catch (err) {
      setState({ kind: "error", message: errorMessage(err, "No pudimos cargar las plantillas de Meta") });
    }
  }, [channelParam, templateId]);

  useEffect(() => {
    void load();
  }, [load]);

  const channelId = state.kind === "ready" ? state.channelId : channelParam;
  const editing = state.kind === "ready" ? state.editing : null;
  const listHref = metaTemplatesHref(channelId);

  async function syncAndLeave() {
    if (channelId === null) return;
    try {
      await syncHsmTemplates(channelId);
      showAlert({ tone: "success", title: "Sincronizada con Meta" });
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err, "Meta rechazó la sincronización") });
    }
    guard.leave(listHref);
  }

  const title =
    templateId === null
      ? "Nueva plantilla"
      : editing === null
        ? "Editar plantilla"
        : `${editing.approval_status === "rejected" ? "Corregir" : "Editar"} «${editing.name}»`;
  const lead =
    templateId === null
      ? "Un mensaje fijo con huecos que se rellenan con datos del contacto. Meta lo revisa antes de que puedas usarlo; suele decidir en minutos."
      : "Meta la revisa otra vez. El nombre y el idioma no se pueden cambiar: son suyos desde que la creaste.";

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Link
        href={listHref}
        onClick={(event) => {
          if (!guard.dirty) return;
          event.preventDefault();
          guard.leave(listHref);
        }}
        className="text-muted-foreground hover:text-foreground inline-flex min-h-6 w-fit items-center gap-1.5 text-sm font-medium transition-colors"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Plantillas de Meta
      </Link>

      <header className="flex flex-col gap-1.5">
        <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">Plantillas de Meta</p>
        <h1 className="font-heading text-[1.9rem] leading-[1.05] font-bold tracking-tight text-balance break-words sm:text-[2.5rem]">
          {title}
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm text-pretty">{lead}</p>
      </header>

      {!canManage ? (
        <Alert className="max-w-2xl rounded-2xl">
          <Eye aria-hidden="true" />
          <AlertTitle>Puedes ver las plantillas, pero no cambiarlas</AlertTitle>
          <AlertDescription>Para crear o editar plantillas pide a un administrador el permiso de marketing.</AlertDescription>
        </Alert>
      ) : state.kind === "loading" ? (
        <FormSkeleton fields={8} />
      ) : state.kind === "no_channel" ? (
        <EmptyState
          glyph="connections"
          title="No tienes ningún canal de WhatsApp Cloud"
          description="Las plantillas de Meta viven en la cuenta de WhatsApp Business de un canal Cloud. Conecta uno para poder crearlas."
          action={
            <Button variant="outline" asChild>
              <Link href="/settings/channels">Ir a canales</Link>
            </Button>
          }
        />
      ) : state.kind === "not_found" ? (
        <EmptyState
          glyph="connections"
          title="No encontramos esa plantilla"
          description="Puede que se haya borrado o que Meta la retirara. Vuelve a la lista y sincroniza con Meta."
          action={
            <Button variant="outline" asChild>
              <Link href={META_TEMPLATES_HREF}>Volver a la lista</Link>
            </Button>
          }
        />
      ) : state.kind === "error" ? (
        <Alert variant="destructive" className="max-w-2xl rounded-2xl">
          <AlertTitle>{state.message}</AlertTitle>
          <AlertDescription>
            <Button variant="outline" size="sm" className="mt-2 rounded-full" onClick={() => void load()}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <HsmTemplateForm
          key={state.editing?.id ?? "nueva"}
          channelId={state.channelId}
          templates={state.templates}
          editing={state.editing}
          onSaved={(template) => router.push(metaTemplatesHref(state.channelId, template.id))}
          onViewExisting={(id) => guard.leave(metaTemplatesHref(state.channelId, id))}
          onSync={() => void syncAndLeave()}
          onDirtyChange={guard.track("form")}
          onCancel={() => guard.leave(listHref)}
        />
      )}
    </div>
  );
}
