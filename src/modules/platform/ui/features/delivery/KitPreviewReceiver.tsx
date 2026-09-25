"use client";

import { useEffect, useState } from "react";
import { buildKitView, type KitView } from "@/modules/welcome-kit/domain/kit-view";
import type { WelcomeKitData } from "@/modules/welcome-kit/domain/welcome-kit";
import { WelcomeKitView } from "@/modules/welcome-kit/ui/WelcomeKitView";
import { KIT_PREVIEW_DATA, KIT_PREVIEW_READY } from "../../../domain/delivery";

type PreviewMessage = { type: typeof KIT_PREVIEW_DATA; data: WelcomeKitData };

function isPreviewMessage(value: unknown): value is PreviewMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === KIT_PREVIEW_DATA &&
    typeof (value as { data?: unknown }).data === "object"
  );
}

/**
 * El lado del iframe de la vista previa del kit. Solo acepta mensajes de la
 * ventana que lo contiene y de su mismo origen: una página ajena que lo
 * incruste no puede pintarle nada.
 */
export function KitPreviewReceiver() {
  const [view, setView] = useState<KitView | null>(null);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    if (window.parent === window) return;
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      if (!isPreviewMessage(event.data)) return;
      try {
        setView(buildKitView(event.data.data));
        setBroken(false);
      } catch {
        // Un dato imposible (una fecha mal formada) no tumba la vista previa.
        setBroken(true);
      }
    }
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: KIT_PREVIEW_READY }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (view === null) {
    return (
      <p role="status" className="p-8 text-center text-sm">
        {broken ? "El kit no se puede mostrar con estos datos." : "Preparando la vista previa…"}
      </p>
    );
  }
  return <WelcomeKitView view={view} />;
}
