"use client";

import { useEffect, useState } from "react";
import { LayoutPanelLeft } from "lucide-react";

import { useAuth } from "@/shared/auth/auth.hooks";
import { cn } from "@/core/lib/utils";
import { useCmoSocket } from "@/modules/cmo/infrastructure/realtime/use-cmo-socket";
import { useCmoStore } from "@/modules/cmo/infrastructure/stores/cmo.store";
import { AxelChat } from "./components/AxelChat";
import { BriefingHero } from "./components/BriefingHero";
import { CmoBlockedState } from "./components/CmoBlockedState";
import { CmoBoardRail } from "./components/CmoBoardRail";
import { ProposalCard } from "./components/ProposalCard";

/**
 * El despacho de Axel.
 *
 * La distribución es la del mockup aprobado: **la conversación al centro** y el
 * tablero degradado a un rail derecho. No es una preferencia estética — la tesis
 * del módulo es que la disrupción está en la conversación, y por eso las
 * propuestas se leen DENTRO del hilo, no en una pantalla aparte.
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
   * El bloqueo gana sobre todo lo demás. Se comprueba con `settings` cargados o
   * con el blocker que devolvió un intento real: mostrar el chat a un tenant
   * apagado solo produce un error al primer mensaje, y eso es peor que decirlo
   * de entrada.
   */
  if (blocker !== null) {
    return <CmoBlockedState blocker={blocker} canManage={canManage} />;
  }
  if (settings.status === "ready" && !enabled) {
    return <CmoBlockedState blocker="disabled" canManage={canManage} />;
  }

  const briefingHour = settings.data?.briefing_hour ?? 8;
  const pending = proposals.data ?? [];

  return (
    <div className="flex min-h-0 flex-1" data-app-view>
      <main className="flex min-w-0 flex-1 flex-col">
        {/* El briefing y las propuestas van ENCIMA del chat y con el mismo ancho
            de columna: se leen como lo primero que Axel te dice hoy, no como un
            panel aparte que compite con la conversación. */}
        <div className="flex-none border-b border-border px-6 pt-5 pb-4">
          <div className="mx-auto flex w-full max-w-[640px] flex-col gap-3">
            <BriefingHero
              briefing={briefing.data ?? null}
              loading={briefing.status === "loading"}
              briefingHour={briefingHour}
            />
            {pending.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                {pending.slice(0, 2).map((proposal) => (
                  <ProposalCard key={proposal.id} proposal={proposal} />
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <AxelChat ownerName={firstName(user?.name ?? null)} />
      </main>

      <div className="hidden xl:flex">
        <CmoBoardRail
          proposals={proposals.data}
          briefing={briefing.data ?? null}
          loading={proposals.status === "loading"}
          error={proposals.error}
          onRetry={() => {
            void reloadProposals();
          }}
        />
      </div>

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
        <div className="fixed inset-y-0 right-0 z-50 flex shadow-overlay xl:hidden">
          <CmoBoardRail
            proposals={proposals.data}
            briefing={briefing.data ?? null}
            loading={proposals.status === "loading"}
            error={proposals.error}
            onRetry={() => {
              void reloadProposals();
            }}
          />
        </div>
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
