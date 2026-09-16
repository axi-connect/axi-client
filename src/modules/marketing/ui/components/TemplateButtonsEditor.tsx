"use client";

import { CornerUpLeft, Copy, Link2, Phone, Plus, X } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import {
  BUTTON_LABEL_MAX,
  BUTTON_LABELS,
  COPY_CODE_MAX,
  PHONE_MAX,
  canAddButton,
  emptyButton,
  type ButtonKind,
  type TemplateButton,
} from "@/modules/marketing/domain/template-pieces";

const ICONS: Record<ButtonKind, React.ComponentType<{ className?: string }>> = {
  quick_reply: CornerUpLeft,
  url: Link2,
  phone_number: Phone,
  copy_code: Copy,
};

/**
 * Los botones de una plantilla, **en dos grupos**.
 *
 * No es una decisión de presentación: Meta exige que las respuestas rápidas
 * vayan juntas y «rápida, enlace, rápida» es lo que su API llama «invalid
 * combination». Con dos grupos separados esa combinación no se puede ni
 * construir, que es mejor que validarla y avisar después.
 *
 * Y los topes por tipo apagan el botón de añadir con el motivo al lado, en vez
 * de dejar llenar el formulario para que Meta lo rechace un minuto después.
 */
export function TemplateButtonsEditor({
  buttons,
  onChange,
}: {
  buttons: readonly TemplateButton[];
  onChange: (buttons: TemplateButton[]) => void;
}) {
  const quick = buttons.filter((button) => button.type === "quick_reply");
  const actions = buttons.filter((button) => button.type !== "quick_reply");

  function add(kind: ButtonKind) {
    onChange([...buttons, emptyButton(kind)]);
  }
  function patch(index: number, next: TemplateButton) {
    onChange(buttons.map((button, position) => (position === index ? next : button)));
  }
  function remove(index: number) {
    onChange(buttons.filter((_, position) => position !== index));
  }

  function row(button: TemplateButton) {
    const index = buttons.indexOf(button);
    const Icon = ICONS[button.type];
    return (
      <div
        key={index}
        className="flex flex-wrap items-center gap-2 border-b border-border/50 px-3 py-2 last:border-b-0"
      >
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          <Icon aria-hidden className="size-3" />
          {BUTTON_LABELS[button.type]}
        </span>
        {button.type === "copy_code" ? (
          <Input
            className="h-8 min-w-28 flex-1 font-mono"
            aria-label="Código a copiar"
            placeholder="TEMP30"
            maxLength={COPY_CODE_MAX}
            value={button.example}
            onChange={(event) => patch(index, { ...button, example: event.target.value })}
          />
        ) : (
          <>
            <Input
              className="h-8 min-w-28 flex-1"
              aria-label={`Texto del botón ${String(index + 1)}`}
              placeholder="Lo que dice el botón"
              maxLength={BUTTON_LABEL_MAX}
              value={button.text}
              onChange={(event) => patch(index, { ...button, text: event.target.value })}
            />
            {button.type === "url" && (
              <Input
                className="h-8 min-w-36 flex-1 font-mono"
                aria-label={`Dirección del botón ${String(index + 1)}`}
                placeholder="savage.co/temporada"
                value={button.url}
                onChange={(event) => patch(index, { ...button, url: event.target.value })}
              />
            )}
            {button.type === "phone_number" && (
              <Input
                className="h-8 min-w-32 flex-1 font-mono"
                aria-label={`Teléfono del botón ${String(index + 1)}`}
                placeholder="573001112233"
                maxLength={PHONE_MAX}
                value={button.phone_number}
                onChange={(event) => patch(index, { ...button, phone_number: event.target.value })}
              />
            )}
          </>
        )}
        <button
          type="button"
          aria-label={`Quitar botón ${String(index + 1)}`}
          onClick={() => remove(index)}
          className="ml-auto grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X aria-hidden className="size-3.5" />
        </button>
      </div>
    );
  }

  function adder(kind: ButtonKind) {
    const Icon = ICONS[kind];
    const allowed = canAddButton(buttons, kind);
    return (
      <button
        key={kind}
        type="button"
        disabled={!allowed}
        title={allowed ? undefined : `Meta admite ${String(limitOf(kind))} como mucho`}
        onClick={() => add(kind)}
        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-dashed border-border px-3 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent"
      >
        <Icon aria-hidden className="size-3.5" />
        {BUTTON_LABELS[kind]}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-clip rounded-lg border border-border">
        <p className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <CornerUpLeft aria-hidden className="size-3" />
          Respuestas rápidas
          <span className="ml-auto tabular-nums">{quick.length} de 10</span>
        </p>
        {quick.map(row)}
        <div className="px-3 py-2">{adder("quick_reply")}</div>
      </div>

      <div className="overflow-clip rounded-lg border border-border">
        <p className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <Link2 aria-hidden className="size-3" />
          Acciones
          <span className="ml-auto tabular-nums">{actions.length} de 4</span>
        </p>
        {actions.map(row)}
        <div className="flex flex-wrap gap-2 px-3 py-2">
          {adder("url")}
          {adder("phone_number")}
          {adder("copy_code")}
          <span className="sr-only">
            <Plus aria-hidden />
          </span>
        </div>
      </div>
    </div>
  );
}

function limitOf(kind: ButtonKind): number {
  return kind === "quick_reply" ? 10 : kind === "url" ? 2 : 1;
}
