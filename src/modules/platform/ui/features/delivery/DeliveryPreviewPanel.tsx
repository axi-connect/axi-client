"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle, Monitor, Smartphone } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import type { WelcomeKitData } from "@/modules/welcome-kit/domain/welcome-kit";
import { KIT_PREVIEW_DATA, KIT_PREVIEW_PATH, KIT_PREVIEW_READY } from "../../../domain/delivery";

type PreviewTab = "owner" | "team" | "kit";
type Device = "desktop" | "mobile";

const DEVICE_ITEMS = [
  { value: "desktop", label: "Escritorio", icon: Monitor },
  { value: "mobile", label: "Celular", icon: Smartphone },
] as const;

/** Ancho del lienzo: el del correo (640) y el del kit (900) en escritorio; 390 en celular. */
const WIDTH: Record<PreviewTab, Record<Device, number>> = {
  owner: { desktop: 640, mobile: 390 },
  team: { desktop: 640, mobile: 390 },
  kit: { desktop: 900, mobile: 390 },
};

/**
 * El correo en un iframe `srcDoc` con `sandbox` vacío: sin scripts, sin
 * formularios y con origen propio. Es HTML del servidor, pero la consola no
 * tiene por qué confiarle su sesión.
 */
function MailFrame({ html, title, width }: { html: string; title: string; width: number }) {
  return (
    <iframe
      title={title}
      srcDoc={html}
      sandbox=""
      referrerPolicy="no-referrer"
      className="mx-auto block h-[70vh] min-h-[480px] rounded-xl border-0 bg-background"
      style={{ width: "100%", maxWidth: width }}
    />
  );
}

/**
 * El kit real, en `/bienvenida/vista-previa`: mismo origen, así que no se
 * sandboxea el script (el kit mide su ancho). Al cargar pide los datos y se
 * los reenvía cada vez que cambian.
 */
function KitFrame({ data, width }: { data: WelcomeKitData | null; width: number }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const dataRef = useRef(data);

  const send = useCallback(() => {
    const target = frameRef.current?.contentWindow;
    if (!target || dataRef.current === null) return;
    target.postMessage({ type: KIT_PREVIEW_DATA, data: dataRef.current }, window.location.origin);
  }, []);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.source !== frameRef.current?.contentWindow) return;
      if ((event.data as { type?: unknown } | null)?.type === KIT_PREVIEW_READY) send();
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [send]);

  useEffect(() => {
    dataRef.current = data;
    send();
  }, [data, send]);

  return (
    <iframe
      ref={frameRef}
      title="Vista previa del kit"
      src={KIT_PREVIEW_PATH}
      referrerPolicy="no-referrer"
      className="mx-auto block h-[70vh] min-h-[480px] rounded-xl border-0 bg-background"
      style={{ width: "100%", maxWidth: width }}
    />
  );
}

export function DeliveryPreviewPanel({
  ownerHtml,
  teamHtml,
  kitData,
  subject,
  loading,
  refreshing,
  error,
}: {
  ownerHtml: string | null;
  teamHtml: string | null;
  kitData: WelcomeKitData | null;
  subject: string | null;
  /** Aún no hay ninguna vista previa. */
  loading: boolean;
  /** Hay una y se está pidiendo la siguiente. */
  refreshing: boolean;
  error: string | null;
}) {
  const [tab, setTab] = useState<PreviewTab>("owner");
  const [device, setDevice] = useState<Device>("desktop");
  const width = WIDTH[tab][device];

  const body = (content: React.ReactNode) =>
    loading ? (
      <Skeleton className="h-[70vh] min-h-[480px] w-full rounded-xl" />
    ) : error && !ownerHtml ? (
      <p role="alert" className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
        {error}
      </p>
    ) : (
      content
    );

  return (
    <section aria-label="Vista previa en vivo" className="space-y-3">
      <Tabs value={tab} onValueChange={(next) => setTab(next as PreviewTab)}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList size="sm" surface="inline" aria-label="Qué ver">
            <TabsTrigger value="owner">Correo</TabsTrigger>
            <TabsTrigger value="team">Copia al equipo</TabsTrigger>
            <TabsTrigger value="kit">Kit</TabsTrigger>
          </TabsList>
          <SegmentedControl
            label="Ancho de la vista previa"
            size="sm"
            surface="inline"
            labels="active"
            value={device}
            onValueChange={setDevice}
            items={DEVICE_ITEMS}
          />
        </div>

        <p className="flex min-h-5 items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
          {refreshing ? (
            <>
              <LoaderCircle aria-hidden="true" className="size-3 animate-spin" />
              Actualizando…
            </>
          ) : subject && tab !== "kit" ? (
            <>
              <span className="font-medium text-foreground">Asunto:</span>
              <span className="truncate">{subject}</span>
            </>
          ) : (
            "Se actualiza mientras escribes"
          )}
        </p>

        <div className={cn("rounded-2xl bg-muted/60 p-2 sm:p-3", refreshing && "opacity-90")}>
          <TabsContent value="owner">
            {body(ownerHtml ? <MailFrame html={ownerHtml} title="Vista previa del correo al dueño" width={width} /> : null)}
          </TabsContent>
          <TabsContent value="team">
            {body(teamHtml ? <MailFrame html={teamHtml} title="Vista previa de la copia al equipo" width={width} /> : null)}
          </TabsContent>
          <TabsContent value="kit">{body(<KitFrame data={kitData} width={width} />)}</TabsContent>
        </div>
      </Tabs>
      {tab === "team" ? (
        <p className="text-xs text-muted-foreground">
          La copia va en un envío aparte y sin el enlace de la contraseña: en su lugar dice «El dueño recibió su
          enlace de acceso».
        </p>
      ) : null}
    </section>
  );
}
