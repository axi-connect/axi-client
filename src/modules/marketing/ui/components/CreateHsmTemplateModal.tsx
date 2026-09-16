"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, CircleDollarSign, CircleX, Hourglass, MessageCircle, Sparkles, Zap } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import { Modal } from "@/shared/components/ui/modal";
import { Input } from "@/shared/components/ui/input";
import type { HsmTemplateDTO } from "@/modules/marketing/domain/template-catalog";
import {
  formatTemplateCost,
  inspectTemplateVariables,
  SUGGESTED_OPENING_TEMPLATES,
  TEMPLATE_VARIABLE_MESSAGES,
} from "@/modules/marketing/domain/template-catalog";
import {
  createHsmTemplate,
  updateHsmTemplate,
} from "@/modules/marketing/infrastructure/services/templates-service.adapter";

type Category = HsmTemplateDTO["category"];

const CATEGORIES: ReadonlyArray<{
  value: Category;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}> = [
  {
    value: "utility",
    label: "Utility",
    description: "Seguimiento de algo que el cliente inició (cotización, pedido, cita). Aprobación rápida.",
    icon: BadgeCheck,
  },
  {
    value: "marketing",
    label: "Marketing",
    description: "Promociones y ofertas. Revisión más estricta y unas 25 veces más cara.",
    icon: Zap,
  },
  {
    value: "authentication",
    label: "Autenticación",
    description: "Solo códigos de verificación. No sirve para abrir una conversación.",
    icon: CircleX,
    disabled: true,
  },
];

const NAME_REGEX = /^[a-z0-9_]{3,120}$/;
const BODY_MAX = 1024;

/**
 * Alta guiada de una plantilla de Meta (F2 del seguimiento autónomo). Meta la
 * revisa y decide; lo que este modal hace es que llegue BIEN a esa revisión:
 * categoría elegida por lo que es (con su costo), variables en orden y con
 * ejemplos —que Meta exige—, y la expectativa honesta de cuánto tarda.
 */
export function CreateHsmTemplateModal({
  open,
  channelId,
  editing = null,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  channelId: string;
  /**
   * La plantilla que se edita, o `null` para crear una nueva. El mismo modal
   * porque es el mismo formulario: lo que cambia es que Meta no deja tocar el
   * nombre ni el idioma, y la categoría solo si no está aprobada.
   *
   * El consumidor le pasa una `key` distinta para forzar el remontaje, que es
   * lo que carga los valores sin un efecto que sincronice estado con props.
   */
  editing?: HsmTemplateDTO | null;
  onOpenChange: (open: boolean) => void;
  onCreated: (template: HsmTemplateDTO) => void;
}) {
  const { showAlert } = useAlert();
  const isEditing = editing !== null;
  const [name, setName] = useState(editing?.name ?? "");
  const [language, setLanguage] = useState(editing?.language ?? "es_CO");
  const [category, setCategory] = useState<Category>(editing?.category ?? "utility");
  const [body, setBody] = useState(editing?.body ?? "");
  const [examples, setExamples] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const verdict = useMemo(() => inspectTemplateVariables(body), [body]);
  const variableCount = verdict.ok ? verdict.count : 0;

  const errors = {
    name: !NAME_REGEX.test(name) ? "Minúsculas, números y guion bajo (3 a 120)" : undefined,
    body:
      body.trim().length < 10
        ? "Escribe al menos 10 caracteres"
        : body.length > BODY_MAX
          ? `Máximo ${String(BODY_MAX)} caracteres`
          : !verdict.ok
            ? TEMPLATE_VARIABLE_MESSAGES[verdict.reason]
            : undefined,
    examples:
      variableCount > 0 && examples.slice(0, variableCount).some((example) => !example?.trim())
        ? "Meta exige un ejemplo por cada variable"
        : undefined,
  };
  const invalid = Object.values(errors).some((error) => error !== undefined);

  function applySuggestion(key: string) {
    const suggestion = SUGGESTED_OPENING_TEMPLATES.find((item) => item.key === key);
    if (suggestion === undefined) return;
    setName(suggestion.name);
    setBody(suggestion.body);
    setCategory("utility");
    setExamples([...suggestion.examples]);
  }

  function insertVariable() {
    const next = variableCount + 1;
    setBody((prev) => `${prev}${prev.endsWith(" ") || prev === "" ? "" : " "}{{${String(next)}}}`);
  }

  async function submit() {
    setTouched(true);
    if (invalid) return;
    setSubmitting(true);
    try {
      const params = {
        body,
        ...(variableCount > 0 ? { examples: examples.slice(0, variableCount) } : {}),
      };
      const created = isEditing
        ? await updateHsmTemplate(editing.id, {
            ...params,
            // La categoría solo viaja si de verdad cambió Y Meta lo permite:
            // sobre una aprobada es un 409 nuestro antes de gastar la llamada.
            ...(editing.approval_status !== "approved" && category !== editing.category
              ? { category }
              : {}),
          })
        : await createHsmTemplate({ channel_id: channelId, name, language, category, ...params });
      showAlert({
        tone: "success",
        title: isEditing ? "Enviada de nuevo a revisión" : "Enviada a revisión de Meta",
        description:
          "Suele decidir en minutos; puede tardar hasta 48 h. Mientras haya alguna en revisión, la pantalla se refresca sola.",
        open: true,
      });
      onCreated(created);
      onOpenChange(false);
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err, "Meta rechazó la plantilla"), open: true });
    } finally {
      setSubmitting(false);
    }
  }

  const preview = renderPreview(body, examples);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      config={{
        title: isEditing ? `Editar «${editing.name}»` : "Nueva plantilla de Meta",
        description: isEditing
          ? "Meta la revisa otra vez. El nombre y el idioma no se pueden cambiar: son suyos desde que la creaste."
          : "Un texto fijo con huecos que se rellenan con datos del contacto. Meta la revisa antes de que puedas usarla.",
        className: "sm:max-w-2xl",
        actions: [
          { label: "Cancelar", variant: "outline", asClose: true },
          {
            label: submitting
              ? "Enviando…"
              : isEditing
                ? "Guardar y reenviar a revisión"
                : "Enviar a revisión de Meta",
            variant: "default",
            asClose: false,
            onClick: () => void submit(),
          },
        ],
      }}
    >
      <div className="space-y-5">
        <section className="space-y-2" hidden={isEditing}>
          <p className="text-xs font-medium">Empieza con una sugerida</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {SUGGESTED_OPENING_TEMPLATES.map((suggestion) => (
              <button
                key={suggestion.key}
                type="button"
                onClick={() => applySuggestion(suggestion.key)}
                className="grid gap-1 rounded-xl border border-border bg-background p-3 text-left transition-colors hover:bg-secondary/60"
              >
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <Sparkles aria-hidden className="size-3.5 text-accent-violet" />
                  {suggestion.title}
                </span>
                <span className="line-clamp-2 text-xs text-muted-foreground">«{suggestion.body}»</span>
              </button>
            ))}
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="hsm-name" className="text-xs font-medium">
              Nombre interno
            </label>
            <Input
              id="hsm-name"
              value={name}
              disabled={isEditing}
              onChange={(event) => setName(event.target.value.toLowerCase())}
              placeholder="seguimiento_v1"
              aria-invalid={touched && Boolean(errors.name)}
            />
            <p className="text-xs text-muted-foreground">
              {isEditing ? (
                "Meta no deja cambiarlo: para otro nombre, crea una plantilla nueva."
              ) : touched && errors.name ? (
                <span className="text-destructive">{errors.name}</span>
              ) : (
                "Minúsculas, números y guion bajo. Meta bloquea 30 días un nombre rechazado."
              )}
            </p>
          </div>
          <div className="space-y-1">
            <label htmlFor="hsm-language" className="text-xs font-medium">
              Idioma
            </label>
            <select
              id="hsm-language"
              value={language}
              disabled={isEditing}
              onChange={(event) => setLanguage(event.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm"
            >
              <option value="es_CO">Español (Colombia) · es_CO</option>
              <option value="es_MX">Español (México) · es_MX</option>
              <option value="es">Español · es</option>
              <option value="en_US">English (US) · en_US</option>
            </select>
          </div>
        </div>

        <section className="space-y-2">
          <p className="text-xs font-medium">Categoría</p>
          <div role="radiogroup" aria-label="Categoría" className="grid gap-2 sm:grid-cols-3">
            {CATEGORIES.map((option) => {
              const Icon = option.icon;
              const checked = category === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  aria-disabled={option.disabled}
                  disabled={option.disabled}
                  onClick={() => !option.disabled && setCategory(option.value)}
                  className={cn(
                    "grid grid-cols-[auto_1fr] items-start gap-x-2.5 gap-y-1 rounded-xl border px-3 py-2.5 text-left transition-colors",
                    checked ? "border-brand bg-accent" : "border-border bg-background hover:bg-secondary/60",
                    option.disabled && "cursor-not-allowed opacity-55",
                  )}
                >
                  <Icon aria-hidden className={cn("row-span-2 mt-0.5 size-4", checked ? "text-accent-violet" : "text-muted-foreground")} />
                  <span className="flex items-center justify-between gap-2 text-sm font-medium">
                    {option.label}
                    {!option.disabled && (
                      <span className="font-mono text-[11px] font-normal text-muted-foreground">
                        {formatTemplateCost(option.value)}
                      </span>
                    )}
                  </span>
                  <span className="text-xs leading-snug text-muted-foreground">{option.description}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-2">
          <label htmlFor="hsm-body" className="text-xs font-medium">
            Texto
          </label>
          <textarea
            id="hsm-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={3}
            aria-invalid={touched && Boolean(errors.body)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm leading-relaxed"
            placeholder="Hola {{1}}, te escribo por {{2}}. ¿Seguimos?"
          />
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={insertVariable}
              className="rounded-full border border-border px-2.5 py-1 font-mono text-[11px] transition-colors hover:border-foreground hover:text-foreground"
            >
              + {"{{"}
              {String(variableCount + 1)}
              {"}}"} insertar variable
            </button>
            <span className="ml-auto tabular-nums">
              {variableCount} {variableCount === 1 ? "variable" : "variables"} · {body.length} / {BODY_MAX}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {touched && errors.body ? (
              <span className="text-destructive">{errors.body}</span>
            ) : (
              "Reglas de Meta: las variables van en orden ({{1}}, {{2}}…), nunca abren ni cierran el mensaje, y no van pegadas."
            )}
          </p>
        </section>

        {variableCount > 0 && (
          <section className="space-y-2">
            <p className="text-xs font-medium">
              Un ejemplo por variable <span className="font-normal text-muted-foreground">(Meta lo exige para aprobar)</span>
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {Array.from({ length: variableCount }, (_, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {"{{"}
                    {String(index + 1)}
                    {"}}"}
                  </span>
                  <Input
                    aria-label={`Ejemplo de la variable ${String(index + 1)}`}
                    value={examples[index] ?? ""}
                    onChange={(event) => {
                      const next = [...examples];
                      next[index] = event.target.value;
                      setExamples(next);
                    }}
                    placeholder={index === 0 ? "Ana" : "la cotización del plan anual"}
                  />
                </div>
              ))}
            </div>
            {touched && errors.examples && <p className="text-xs text-destructive">{errors.examples}</p>}
          </section>
        )}

        {body.trim().length > 0 && (
          <div className="rounded-2xl border border-border bg-muted/60 p-3.5">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <MessageCircle aria-hidden className="size-3.5" />
              Así se verá
            </p>
            <div className="max-w-md rounded-[14px_14px_14px_4px] border border-border bg-background px-3 py-2.5 text-sm leading-relaxed shadow-float">
              {preview.map((segment, index) =>
                segment.variable ? (
                  <mark key={String(index)} className="rounded bg-accent px-0.5 text-foreground">
                    {segment.text}
                  </mark>
                ) : (
                  <span key={String(index)}>{segment.text}</span>
                ),
              )}
            </div>
          </div>
        )}

        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-background px-3 py-2.5 text-xs leading-relaxed">
          <Hourglass aria-hidden className="mt-0.5 size-4 shrink-0 text-info" />
          <p>
            <strong className="font-medium text-foreground">Qué pasa al enviar:</strong> queda «Pendiente». Meta suele decidir en
            minutos y puede tardar hasta 48 h; el estado se actualiza solo. Mientras, las tareas que la elijan esperan.
          </p>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CircleDollarSign aria-hidden className="size-3.5" />
          {CATEGORIES.find((option) => option.value === category)?.label} · {formatTemplateCost(category)} por mensaje entregado en
          Colombia.
        </p>
      </div>
    </Modal>
  );
}

function renderPreview(body: string, examples: readonly string[]): Array<{ text: string; variable: boolean }> {
  const segments: Array<{ text: string; variable: boolean }> = [];
  let cursor = 0;
  for (const match of body.matchAll(/\{\{(\d+)\}\}/g)) {
    if (match.index > cursor) segments.push({ text: body.slice(cursor, match.index), variable: false });
    const example = examples[Number(match[1]) - 1]?.trim();
    segments.push({ text: example ? example : match[0], variable: true });
    cursor = match.index + match[0].length;
  }
  if (cursor < body.length) segments.push({ text: body.slice(cursor), variable: false });
  return segments;
}
