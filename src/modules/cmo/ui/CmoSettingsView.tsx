"use client";

import { useEffect, useState } from "react";
import { BookOpen, Plus, Power, RotateCcw, Trash2 } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { cn } from "@/core/lib/utils";
import type { CmoSettingsDTO, DirectiveDTO } from "@/modules/cmo/domain/cmo";
import {
  createDirective,
  deactivateDirective,
  getCmoSettings,
  listDirectives,
  reactivateDirective,
  saveCmoSettings,
} from "@/modules/cmo/infrastructure/services/cmo-service.adapter";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";

/** Origen de la directriz, en palabras del dueño. */
const ORIGIN_LABELS: Record<string, string> = {
  chat: "Se la dictaste en el chat",
  rejection: "Salió de una propuesta que descartaste",
  system: "La puso el sistema",
};

/**
 * Configuración de Axel: el interruptor, sus topes y sus directrices.
 *
 * La pantalla dice explícitamente la distinción que sostiene el diseño del
 * módulo, porque confundirla es el error de lectura más fácil: **los topes son
 * límites que el servidor verifica; las directrices son criterio que Axel
 * respeta**. Un dueño que crea que "nunca descuentos sobre 15%" escrito como
 * directriz es un candado, va a llevarse una sorpresa.
 */
export function CmoSettingsView() {
  const { hasPermission } = useAuth();
  const { showAlert } = useAlert();
  const canManage = hasPermission("cmo:approve");

  const [settings, setSettings] = useState<CmoSettingsDTO | null>(null);
  const [directives, setDirectives] = useState<DirectiveDTO[] | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void Promise.all([getCmoSettings(), listDirectives()])
      .then(([loadedSettings, loadedDirectives]) => {
        setSettings(loadedSettings);
        setDirectives(loadedDirectives);
      })
      .catch((error: unknown) => {
        showAlert({ tone: "error", title: errorMessage(error) });
      });
  }, [showAlert]);

  const patch = async (next: CmoSettingsDTO) => {
    setBusy(true);
    try {
      // El PUT es de sección COMPLETA (el backend reemplaza, no hace merge), así
      // que se manda todo el objeto y se guarda lo que el servidor devuelve —
      // que puede haber acotado algún valor.
      setSettings(await saveCmoSettings(next));
    } catch (error) {
      showAlert({ tone: "error", title: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const addDirective = async () => {
    const body = draft.trim();
    if (body.length < 8) return;
    setBusy(true);
    try {
      await createDirective({ body });
      setDirectives(await listDirectives());
      setDraft("");
    } catch (error) {
      showAlert({ tone: "error", title: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const toggleDirective = async (directive: DirectiveDTO) => {
    setBusy(true);
    try {
      if (directive.is_active) await deactivateDirective(directive.id);
      else await reactivateDirective(directive.id);
      setDirectives(await listDirectives());
    } catch (error) {
      showAlert({ tone: "error", title: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  if (settings === null || directives === null) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const active = directives.filter((item) => item.is_active);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-border bg-background p-5">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-base">Axel, tu director de mercadeo</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {settings.enabled
                ? `Revisa tus números todos los días a las ${formatHour(settings.briefing_hour)} y te deja propuestas listas para decidir.`
                : "Está apagado. Al encenderlo empieza a revisar tus números a diario y a dejarte propuestas."}
            </p>
          </div>
          <Button
            variant={settings.enabled ? "outline" : "default"}
            disabled={!canManage || busy}
            onClick={() => {
              void patch({ ...settings, enabled: !settings.enabled });
            }}
          >
            <Power className="size-4" aria-hidden="true" />
            {settings.enabled ? "Apagar" : "Encender"}
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-background p-5">
        <h2 className="font-heading text-base">Topes del negocio</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Estos números los <b>verifica el servidor</b>: Axel no puede pasarse de ellos ni
          aunque se lo pidas. Son el candado de verdad.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <NumberField
            label="Descuento máximo"
            suffix="%"
            value={settings.limits.max_discount_percent}
            disabled={!canManage || busy}
            onCommit={(value) => {
              void patch({
                ...settings,
                limits: { ...settings.limits, max_discount_percent: value },
              });
            }}
          />
          <NumberField
            label="Audiencia máxima"
            suffix="contactos"
            value={settings.limits.max_audience}
            disabled={!canManage || busy}
            onCommit={(value) => {
              void patch({ ...settings, limits: { ...settings.limits, max_audience: value } });
            }}
          />
          <NumberField
            label="Propuestas a la vez"
            suffix="máx."
            value={settings.proposal_cap}
            disabled={!canManage || busy}
            onCommit={(value) => {
              void patch({ ...settings, proposal_cap: value });
            }}
          />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-background p-5">
        <div className="flex items-center gap-2">
          <BookOpen className="size-4 text-accent-violet" aria-hidden="true" />
          <h2 className="font-heading text-base">Tus directrices</h2>
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {active.length} activas
          </span>
        </div>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Reglas en tus palabras que Axel respeta y cita cuando descarta una idea. A diferencia
          de los topes de arriba, son <b>criterio</b>, no un candado del sistema.
        </p>

        {canManage ? (
          <div className="mt-4 flex gap-2">
            <input
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") void addDirective();
              }}
              maxLength={300}
              placeholder="Ej: Prefiero regalar el flete antes que descontar el producto."
              aria-label="Nueva directriz"
              className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-accent-violet"
            />
            <Button
              disabled={busy || draft.trim().length < 8}
              onClick={() => {
                void addDirective();
              }}
            >
              <Plus className="size-4" aria-hidden="true" />
              Agregar
            </Button>
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-2">
          {directives.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no le has dado ninguna. Cuando descartes una propuesta puedes guardar el
              motivo como directriz de un clic, y Axel deja de proponerte eso.
            </p>
          ) : (
            directives.map((directive) => (
              <div
                key={directive.id}
                className={cn(
                  "flex items-start gap-3 rounded-md border border-border p-3",
                  !directive.is_active && "opacity-50",
                )}
              >
                <BookOpen
                  className="mt-0.5 size-4 flex-none text-accent-violet"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] leading-relaxed">{directive.body}</p>
                  <p className="mt-1 text-[10.5px] text-muted-foreground/70">
                    {ORIGIN_LABELS[directive.origin] ?? directive.origin}
                  </p>
                </div>
                {canManage ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={busy}
                    aria-label={directive.is_active ? "Desactivar" : "Reactivar"}
                    onClick={() => {
                      void toggleDirective(directive);
                    }}
                  >
                    {directive.is_active ? (
                      <Trash2 className="size-4" aria-hidden="true" />
                    ) : (
                      <RotateCcw className="size-4" aria-hidden="true" />
                    )}
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

/**
 * Campo numérico que **confirma al salir del foco**, no en cada tecla: cada
 * cambio es un PUT de la sección completa, y guardar por pulsación produciría
 * una ráfaga de peticiones y estados intermedios absurdos (un tope de "1" al
 * teclear "15").
 */
function NumberField({
  label,
  suffix,
  value,
  disabled,
  onCommit,
}: {
  label: string;
  suffix: string;
  value: number;
  disabled: boolean;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
          }}
          onBlur={() => {
            const parsed = Number(draft);
            if (!Number.isFinite(parsed) || parsed === value) {
              setDraft(String(value));
              return;
            }
            onCommit(Math.max(0, Math.round(parsed)));
          }}
          disabled={disabled}
          inputMode="numeric"
          className="w-24 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm tabular-nums outline-none focus:border-accent-violet disabled:opacity-60"
        />
        <span className="text-xs text-muted-foreground">{suffix}</span>
      </span>
    </label>
  );
}

function formatHour(hour: number): string {
  const suffix = hour < 12 ? "a.m." : "p.m.";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(twelve)}:00 ${suffix}`;
}
