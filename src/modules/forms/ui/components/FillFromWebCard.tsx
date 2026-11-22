"use client";

import { useId, useState } from "react";
import { Gauge, Globe, Lock, Plus, Quote, ShieldCheck } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { AiBadge } from "@/shared/components/features/timeline";
import { splitWebFillable, type FillFormFromWebState } from "@/modules/prospecting/public";
import type { FormFieldType } from "@/modules/forms/domain/form";
import { FieldTypeIcon } from "./FieldTypeIcon";

interface CardField {
  key: string;
  code: string;
  label: string;
  type: FormFieldType;
}

/**
 * «Completar con la web del negocio» (enriquecimiento al contacto, Fase 2; mockup aprobado
 * `docs/design/mockups/forms-fill-from-web.*`). Solo en «Datos del cliente».
 *
 * El interruptor guarda al instante (ajuste de Captación, ver `useFillFormFromWeb`): no entra al
 * borrador del formulario. Qué datos se pueden leer en una web sale de la MISMA regla que usa el
 * servidor (`splitWebFillable`), así que la tarjeta no promete lo que no va a pasar.
 */
export function FillFromWebCard({
  fields,
  state,
  canEditForm,
  onAddField,
}: {
  fields: readonly CardField[];
  state: FillFormFromWebState;
  canEditForm: boolean;
  onAddField: () => void;
}) {
  const titleId = useId();
  const switchId = useId();
  const detailsId = useId();
  const [expanded, setExpanded] = useState(false);

  if (state.status !== "ready" || fields.length === 0) return null;

  const named = fields.map((field) => ({ ...field, label: field.label.trim() || "Dato sin nombre" }));
  const { web, personal } = splitWebFillable(named);
  const on = state.enabled;
  const showBody = on || expanded;

  return (
    <section aria-labelledby={titleId} className="rounded-3xl border border-border bg-card p-4 md:p-5">
      <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3.5 gap-y-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto]">
        <div
          className={cn(
            "grid size-10 place-items-center rounded-xl transition-colors",
            on ? "bg-accent-violet/12 text-accent-violet" : "bg-muted text-foreground",
          )}
          aria-hidden
        >
          <Globe className="size-5" />
        </div>
        <div className="min-w-0">
          <h2 id={titleId} className="flex flex-wrap items-center gap-2 text-[15px] font-semibold">
            Completar con la web del negocio
            <AiBadge />
          </h2>
          <p className="mt-0.5 max-w-3xl text-sm text-pretty text-muted-foreground">
            Cuando Captación pasa un negocio a tus contactos, Axi lee su página web y llena los datos
            de este formulario que la web diga con claridad.
          </p>
          {!state.canManage && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="size-3.5" aria-hidden />
              Solo quien administra Captación puede cambiarlo.
            </p>
          )}
        </div>
        <div className="col-span-2 flex items-center gap-2 sm:col-span-1 sm:pt-1">
          <Switch
            id={switchId}
            checked={on}
            disabled={!state.canManage || state.saving}
            onCheckedChange={state.setEnabled}
          />
          <Label htmlFor={switchId} className="cursor-pointer text-sm text-muted-foreground">
            {on ? "Encendido" : "Apagado"}
          </Label>
        </div>
      </div>

      {!on && (
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground sm:ml-[3.375rem]">
          <Globe className="size-3.5 shrink-0" aria-hidden />
          <span>
            <b className="font-semibold text-foreground">
              {web.length} de tus {fields.length} datos
            </b>{" "}
            se pueden leer en una web.
            {personal.length > 0 &&
              ` ${personal.length} ${personal.length === 1 ? "solo lo da" : "solo los da"} el cliente.`}
          </span>
          <button
            type="button"
            className="rounded-sm text-foreground underline decoration-border underline-offset-[3px] hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-ring"
            aria-expanded={expanded}
            aria-controls={detailsId}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Ocultar" : "Ver cuáles"}
          </button>
        </p>
      )}

      {showBody && (
        <div id={detailsId} className="mt-4 grid gap-4 sm:ml-[3.375rem]">
          {web.length === 0 && on && (
            <Alert variant="info">
              <Globe aria-hidden="true" />
              <AlertTitle>Ninguno de estos datos se puede leer en una web</AlertTitle>
              <AlertDescription>
                <p>
                  Son de la persona que te escribe. Añade datos de su negocio —tipo de negocio,
                  número de sedes, si vende en línea— y Axi los completará con su web.
                </p>
                {canEditForm && fields.length < 8 && (
                  <Button type="button" variant="outline" size="sm" className="mt-2" onClick={onAddField}>
                    <Plus className="size-4" aria-hidden />
                    Añadir un dato
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            {web.length > 0 && (
              <FieldGroup title={`Puede leerlos en su web · ${web.length}`}>
                {web.map((field) => (
                  <li key={field.key} className={CHIP}>
                    <FieldTypeIcon type={field.type} className="size-3.5" />
                    <span className="truncate" title={field.label}>
                      {field.label}
                    </span>
                  </li>
                ))}
              </FieldGroup>
            )}
            {personal.length > 0 && (
              <FieldGroup title={`Siempre los da el cliente · ${personal.length}`}>
                {personal.map((field) => (
                  <li key={field.key} className={cn(CHIP, "border-dashed bg-transparent text-muted-foreground")}>
                    <Lock className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate" title={field.label}>
                      {field.label}
                    </span>
                  </li>
                ))}
              </FieldGroup>
            )}
          </div>
          {on && web.length > 0 && <Promises />}
        </div>
      )}
    </section>
  );
}

const CHIP =
  "inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[13px]";

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
      <ul className="flex flex-wrap gap-1.5">{children}</ul>
    </div>
  );
}

function Promises() {
  const items = [
    {
      icon: ShieldCheck,
      text: (
        <>
          Solo llena datos <b className="font-semibold text-foreground">vacíos</b>: nunca cambia lo que
          dijo el cliente, lo que anotó tu agente o lo que escribió tu equipo.
        </>
      ),
    },
    {
      icon: Quote,
      text: (
        <>
          Cada dato guarda la <b className="font-semibold text-foreground">frase de su web</b> de donde
          salió. Si la web no lo dice con claridad, se queda vacío y tu agente lo pregunta.
        </>
      ),
    },
    {
      icon: Gauge,
      text: "Una consulta pequeña de IA por negocio (lee su portada y «nosotros»), como mucho una vez al mes. Cuenta en tu consumo de IA.",
    },
  ];
  return (
    <ul className="grid gap-1.5 border-t border-border pt-3">
      {items.map(({ icon: Icon, text }, index) => (
        <li key={index} className="grid grid-cols-[1.125rem_minmax(0,1fr)] gap-2 text-[13px] text-pretty text-muted-foreground">
          <Icon className="mt-px size-4 text-foreground" aria-hidden />
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * La línea del panel del dato: «Axi lo completa con la web…». Solo con el ajuste encendido y en un
 * dato que la web puede decir.
 */
export function WebFillNote({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p className="mb-4 flex items-start gap-2 text-[13px] text-muted-foreground">
      <Globe className="mt-px size-4 shrink-0 text-accent-violet" aria-hidden />
      <span>Axi lo completa con la web del negocio cuando la web lo dice. Si no, tu agente lo pregunta.</span>
    </p>
  );
}
