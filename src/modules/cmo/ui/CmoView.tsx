"use client";

import { useEffect, useState } from "react";
import { LayoutPanelLeft } from "lucide-react";

import { useAuth } from "@/shared/auth/auth.hooks";
import { cn } from "@/core/lib/utils";
import { useCmoSocket } from "@/modules/cmo/infrastructure/realtime/use-cmo-socket";
import { useCmoStore } from "@/modules/cmo/infrastructure/stores/cmo.store";
import { AxelChat } from "./components/AxelChat";
import { CmoBoardRail } from "./components/CmoBoardRail";

/**
 * El despacho de Axel.
 *
 * La distribución es la del mockup aprobado: **la conversación al centro** y el
 * tablero degradado a un rail derecho. No es una preferencia estética — la tesis
 * del módulo es que la disrupción está en la conversación, y por eso las
 * propuestas se leen DENTRO del hilo, no en una pantalla aparte.
 *
 * **Un solo campo.** `axel-field` vive aquí, en el `<main>`, y no en el chat: su
 * fondo (los tres halos y el dot-grid) tiene que quedar detrás del hero, del
 * hilo y del composer a la vez. Cuando el campo empezaba debajo del briefing, la
 * banda de arriba heredaba el degradado `muted` de la superficie del panel y
 * aparecía una costura horizontal de 1px que partía la pantalla en dos. El único
 * corte de superficie legítimo de esta vista es el `border-l` del rail.
 *
 * Vista full-bleed con scroller propio (fuera del grupo `(content)`), igual que
 * el inbox: el chat necesita anclar su composer abajo y el rail su propio scroll.
 */
export function CmoView() {
  const { hasPermission, user } = useAuth();
  const settings = useCmoStore((state) => state.settings);
  const briefing = useCmoStore((state) => state.briefing);
  const proposals = useCmoStore((state) => state.proposals);
  const blocker = useCmoStore((state) => state.blocker);
  const load = useCmoStore((state) => state.load);
  const reloadProposals = useCmoStore((state) => state.reloadProposals);

  const [railOpen, setRailOpen] = useState(false);

  useCmoSocket();

  useEffect(() => {
    void load();
  }, [load]);

  const canManage = hasPermission("cmo:approve");
  const enabled = settings.data?.enabled ?? true;

  /**
   * El bloqueo gana sobre el hilo, pero NO se lleva la pantalla: se pinta dentro
   * del mismo campo y con el mismo rail. Antes devolvía temprano y esa pantalla
   * quedaba sin fondo, como si fuera de otro módulo. Se resuelve con `settings`
   * cargados o con el blocker que devolvió un intento real: mostrar el chat a un
   * tenant apagado solo produce un error al primer mensaje.
   */
  const blocked = blocker ?? (settings.status === "ready" && !enabled ? "disabled" : null);

  const briefingHour = settings.data?.briefing_hour ?? 8;
  const pending = proposals.data ?? [];

  const rail = (
    <CmoBoardRail
      proposals={proposals.data}
      briefing={briefing.data ?? null}
      loading={proposals.status === "loading"}
      briefingLoading={briefing.status === "loading"}
      error={proposals.error}
      onRetry={() => {
        void reloadProposals();
      }}
    />
  );

  return (
    <div className="flex min-h-0 flex-1" data-app-view>
      <main className="axel-field flex min-w-0 flex-1 flex-col">
        <AxelChat
          ownerName={firstName(user?.name ?? null)}
          briefing={briefing.data ?? null}
          briefingLoading={briefing.status === "loading"}
          briefingHour={briefingHour}
          proposals={pending}
          blocked={blocked}
          canManage={canManage}
        />
      </main>

      <div className="hidden xl:flex">{rail}</div>

      {/* Bajo xl el rail entra como panel superpuesto: el tablero no puede
          desaparecer sin dejar forma de llegar a las propuestas. */}
      <button
        type="button"
        onClick={() => {
          setRailOpen((open) => !open);
        }}
        aria-label="Mostrar el tablero"
        className={cn(
          "fixed right-4 bottom-4 z-50 grid size-11 place-items-center rounded-full xl:hidden",
          "border border-border bg-background shadow-overlay",
        )}
      >
        <LayoutPanelLeft className="size-5" aria-hidden="true" />
      </button>
      {railOpen ? (
        <div className="fixed inset-y-0 right-0 z-50 flex shadow-overlay xl:hidden">{rail}</div>
      ) : null}
    </div>
  );
}

/** Solo el nombre de pila: el trato de Axel es cercano, no formal. */
function firstName(fullName: string | null): string | null {
  if (fullName === null) return null;
  const first = fullName.trim().split(/\s+/)[0];
  return first === undefined || first === "" ? null : first;
}
