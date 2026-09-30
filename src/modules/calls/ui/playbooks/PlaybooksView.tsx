"use client";

import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  HandCoins,
  HeartHandshake,
  LoaderCircle,
  Repeat,
  RotateCcw,
  Route,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/core/lib/utils";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { StatePill, type StatePillTone } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  CALL_TYPE_HINTS,
  PLAYBOOK_STATE_LABELS,
  playbookState,
  type PlaybookState,
  type PlaybookView,
  type ProactiveCallType,
} from "@/modules/calls/domain/playbooks";
import { listPlaybooks, proposePlaybooks } from "@/modules/calls/infrastructure/services/calls-service.adapter";
import { CallsPageHeader } from "@/modules/calls/ui/components/CallsPageHeader";
import { PlaybookEditor } from "./PlaybookEditor";

const ICONS: Record<ProactiveCallType, LucideIcon> = {
  appointment_reminder: CalendarCheck,
  sales_followup: Briefcase,
  collections: HandCoins,
  reactivation: HeartHandshake,
  followup: Repeat,
};

const STATE_TONE: Record<PlaybookState, StatePillTone> = {
  base: "neutral",
  customized: "success",
  proposal: "info",
  off: "neutral",
};

/**
 * Llamadas → Marcos (plan de modos §5): el ÚNICO lugar de la plataforma donde
 * se ve y se ajusta cómo lleva el agente cada tipo de llamada proactiva. Los
 * cinco tipos ya traen el marco de axi: el negocio solo cambia lo que quiera.
 * Lectura con `calls:read`; editar, proponer y ver la apertura, `calls:manage`.
 */
export function PlaybooksView() {
  const { hasPermission } = useAuth();
  const { showAlert, showModal, closeModal } = useAlert();
  const canManage = hasPermission("calls:manage");
  const [views, setViews] = useState<PlaybookView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ProactiveCallType>("sales_followup");
  // En el celular se ve la lista O el editor; en escritorio, los dos.
  const [mobileEditing, setMobileEditing] = useState(false);
  const [proposing, setProposing] = useState(false);
  // El editor avisa si hay cambios sin guardar: cambiar de tipo los perdería
  // (el editor se desmonta), así que antes se pregunta (auditoría A2).
  const [dirty, setDirty] = useState(false);

  const guarded = (action: () => void) => {
    if (!dirty) {
      action();
      return;
    }
    showModal({
      title: "Tienes cambios sin guardar",
      description: "Si sigues, se pierden los cambios de este marco.",
      actions: [
        { label: "Seguir editando", variant: "outline", asClose: true, id: "playbook-stay" },
        {
          label: "Descartar cambios",
          variant: "destructive",
          asClose: false,
          id: "playbook-leave",
          onClick: () => {
            closeModal();
            setDirty(false);
            action();
          },
        },
      ],
      className: "sm:max-w-md",
    });
  };

  const load = useCallback(() => {
    setError(null);
    listPlaybooks()
      .then(setViews)
      .catch((err: unknown) => setError(errorMessage(err)));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const replace = (next: PlaybookView) =>
    setViews((current) => current?.map((view) => (view.call_type === next.call_type ? next : view)) ?? current);

  const propose = async () => {
    setProposing(true);
    try {
      const result = await proposePlaybooks();
      const saved = result.results.filter((r) => r.status === "saved").length;
      const same = result.results.filter((r) => r.status === "unchanged").length;
      showAlert(
        saved > 0
          ? {
              tone: "success",
              title: saved === 1 ? "Alba propuso ajustes a 1 marco" : `Alba propuso ajustes a ${String(saved)} marcos`,
              description: "Revísalos: nada cambia en tus llamadas hasta que los apliques.",
            }
          : {
              tone: "info",
              title: same > 0 ? "Alba no encontró nada que ajustar" : "Alba no pudo proponer ahora",
              description:
                same > 0 ? "Tus marcos ya encajan con lo que axi sabe de tu negocio." : "Inténtalo de nuevo en un momento.",
            },
      );
      load();
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err, "Alba no pudo proponer ahora") });
    } finally {
      setProposing(false);
    }
  };

  const header = (
    <CallsPageHeader
      kicker="Llamadas · marcos"
      title="Cómo lleva tu agente cada llamada"
      actions={
        canManage ? (
          <Button
            variant="outline"
            className="rounded-full border-accent-violet/30 text-accent-violet hover:bg-accent-violet/10 hover:text-accent-violet"
            disabled={proposing || views === null}
            // Alba propone sobre lo GUARDADO y su propuesta llega aparte: el
            // borrador no se toca, así que no hay nada que confirmar (B6).
            onClick={() => void propose()}
          >
            {proposing ? <LoaderCircle aria-hidden className="animate-spin" /> : <Sparkles aria-hidden />}
            Proponer con Alba
          </Button>
        ) : undefined
      }
    />
  );

  if (error !== null) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <div role="alert" className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-card py-10 text-center">
          <p className="text-sm font-semibold">No pudimos cargar los marcos</p>
          <p className="max-w-md text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" className="rounded-full" onClick={load}>
            <RotateCcw aria-hidden className="size-3.5" /> Reintentar
          </Button>
        </div>
      </div>
    );
  }

  const current = views?.find((view) => view.call_type === selected) ?? null;

  return (
    <div className="flex flex-col gap-6">
      {header}
      {canManage && dirty && (
        <p role="status" className="-mt-3 text-xs text-muted-foreground sm:text-right">
          Alba propone sobre lo guardado; tus cambios siguen aquí.
        </p>
      )}
      <p className="flex max-w-3xl items-start gap-2.5 rounded-2xl bg-muted/60 px-4 py-3 text-sm">
        <Route aria-hidden className="mt-0.5 size-4 shrink-0 text-accent-violet" />
        <span>
          <span className="font-medium">Cada tipo de llamada ya trae un marco listo.</span>{" "}
          <span className="text-muted-foreground">
            Ajusta solo lo que quieras cambiar; lo que no toques sigue la base de axi y mejora sola.
          </span>
        </span>
      </p>

      <div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <nav aria-label="Tipos de llamada" className={cn("flex flex-col gap-2", mobileEditing && "max-lg:hidden")}>
          {views === null
            ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[76px] rounded-2xl" />)
            : views.map((view) => {
                const Icon = ICONS[view.call_type];
                const state = playbookState(view);
                const active = view.call_type === selected;
                return (
                  <button
                    key={view.call_type}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      if (active) {
                        setMobileEditing(true);
                        return;
                      }
                      guarded(() => {
                        setSelected(view.call_type);
                        setMobileEditing(true);
                      });
                    }}
                    className={cn(
                      "grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border bg-card p-3.5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      active ? "border-brand/50 bg-brand/[0.04]" : "border-border",
                      state === "off" && "opacity-75",
                    )}
                  >
                    <span aria-hidden className="flex size-10 items-center justify-center rounded-xl bg-muted">
                      <Icon className="size-[18px]" />
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm font-medium text-balance">{view.label}</span>
                      <span className="line-clamp-2 text-xs text-muted-foreground">
                        {CALL_TYPE_HINTS[view.call_type]} {view.playbook.stages.length} etapas.
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <StatePill tone={STATE_TONE[state]}>{PLAYBOOK_STATE_LABELS[state]}</StatePill>
                      <ChevronRight aria-hidden className="size-4 text-muted-foreground lg:hidden" />
                    </span>
                  </button>
                );
              })}
        </nav>

        <div className={cn("min-w-0", !mobileEditing && "max-lg:hidden")}>
          <button
            type="button"
            onClick={() => setMobileEditing(false)}
            className="mb-3 inline-flex items-center gap-1 rounded-md text-sm text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring lg:hidden"
          >
            <ChevronLeft aria-hidden className="size-4" />
            Todos los marcos
          </button>
          {current === null ? (
            <Skeleton className="h-[520px] rounded-3xl" />
          ) : (
            <PlaybookEditor
              key={current.call_type}
              view={current}
              canManage={canManage}
              onSaved={replace}
              onDirtyChange={setDirty}
            />
          )}
        </div>
      </div>
    </div>
  );
}
