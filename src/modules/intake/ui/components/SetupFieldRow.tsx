"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight, X } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { AssistantMark } from "@/shared/components/features/assistant";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  handoffNote,
  isEditableInline,
  isStructuredList,
  sourceLabel,
  toListItems,
  type IntakeField,
} from "@/modules/intake/domain/intake";
import { SetupListEditor } from "./SetupListEditor";

/**
 * Una fila de la ficha, con la forma de una fila de Contactos: la etiqueta
 * pequeña y muda arriba, el valor en el tamaño de lectura debajo, y a la
 * derecha o un chevron (se puede tocar para corregir) o el botón cápsula de
 * confirmar.
 *
 * **Esta fila es la mitad del diseño que la investigación exigía.** Un formato
 * de una pregunta a la vez tiene cuatro defectos documentados —no hay panorama,
 * no se puede editar lo anterior, no se puede saltar, y hay gente que rebota
 * ante los chats— y los cuatro se arreglan con lo mismo: que la conversación
 * sea un método de entrada para un documento, no un sustituto del documento.
 *
 * El matiz de procedencia solo aparece cuando aporta: lo que la persona dijo no
 * lleva sello —es lo normal— y lo que la IA dedujo de su web va en violeta con
 * la chispa, porque ahí sí cambia lo que hay que hacer con el dato. Y ese dato
 * trae el botón «Así es»: la cápsula tintada del App Store, un toque y listo.
 */
export function SetupFieldRow({
  field,
  saving,
  onSave,
  onConfirm,
  onAskAbout,
}: {
  field: IntakeField;
  saving: boolean;
  onSave: (value: unknown) => Promise<boolean>;
  /** Confirmar una deducción tal cual está: un toque y deja de estar pendiente. */
  onConfirm: () => void;
  /** Llevar la duda al chat cuando el dato no se puede teclear en una fila. */
  onAskAbout: (field: IntakeField) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const editable = isEditableInline(field.kind);
  const badge = sourceLabel(field.source);
  const proposed = field.source === "proposed";
  // Una lista con contenido se corrige elemento a elemento; una caja de texto
  // con comas obligaría a releer y reescribir la propuesta entera.
  const structured = isStructuredList(field.kind) && toListItems(field.value).length > 0;

  function start(): void {
    if (!editable) {
      onAskAbout(field);
      return;
    }
    setDraft(toDraft(field));
    setError(null);
    setEditing(true);
  }

  async function commit(): Promise<void> {
    const value = fromDraft(field, draft);
    if (value === null) {
      setError("No pude entender ese valor");
      return;
    }
    const ok = await onSave(value);
    if (ok) setEditing(false);
    else setError("No se pudo guardar. Inténtalo de nuevo.");
  }

  // La propuesta abierta ocupa la fila entera: es una lista que se reordena, no
  // un valor que se teclea, y meterla en la fila normal la dejaría sin sitio.
  if (editing && structured) {
    return (
      <SetupListEditor
        label={field.label}
        items={toListItems(field.value)}
        saving={saving}
        note={handoffNote(field.kind, field.help)}
        onCancel={() => {
          setEditing(false);
        }}
        onDone={(items) => {
          // Sin cambios sobre la propuesta basta confirmarla: así no se
          // reescribe en el tenant algo que ya vale lo mismo.
          if (items === null) {
            onConfirm();
            setEditing(false);
            return;
          }
          void onSave(items).then((ok) => {
            if (ok) setEditing(false);
          });
        }}
      />
    );
  }

  return (
    <li
      className={cn(
        "grouped-row group",
        field.needs_confirmation &&
          (proposed
            ? "bg-gradient-to-r from-brand/7 to-transparent to-70%"
            : "bg-gradient-to-r from-accent-violet/8 to-transparent to-70%"),
      )}
    >
      {editing ? (
        <div className="flex items-start gap-3 py-2.5 pr-3 pl-4">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-muted-foreground">{field.label}</p>
            <FieldEditor
              field={field}
              draft={draft}
              setDraft={setDraft}
              inputRef={inputRef}
              onCommit={() => void commit()}
            />
            {error === null ? null : <p className="mt-1.5 text-[12px] text-destructive">{error}</p>}
          </div>
          <div className="flex flex-none items-center gap-1 pt-4">
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.08]"
              aria-label="Cancelar"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void commit()}
              className="assistant-send flex size-8 items-center justify-center rounded-full transition-transform active:scale-[.92] disabled:opacity-50"
              aria-label="Guardar"
            >
              <Check className="size-4 [stroke-width:2.6]" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : (
        // Dos botones HERMANOS, no uno dentro del otro: un botón no puede
        // contener contenido interactivo, y «Así es» tiene que ser pulsable por
        // sí solo (y con su propio foco de teclado).
        <div className="flex items-center gap-3 pr-3.5 md:hover:bg-foreground/[0.04]">
          <button
            type="button"
            onClick={start}
            disabled={saving}
            className="flex min-w-0 flex-1 items-center gap-3 py-[11px] pl-4 text-left transition-colors active:bg-foreground/[0.08]"
            aria-label={`Corregir ${field.label}`}
          >
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                {field.label}
                {field.required && field.value === null ? (
                  <span className="size-[5px] rounded-full bg-accent-amber" title="Hace falta" />
                ) : null}
              </span>
              <span
                className={cn(
                  "mt-0.5 block text-[15px] leading-[1.4] tracking-[-0.005em] wrap-anywhere",
                  field.display === null ? "text-muted-foreground/50" : "text-foreground",
                )}
              >
                {field.display ?? "Sin contestar"}
              </span>
              {badge !== null ? (
                <span
                  className={cn(
                    "mt-[3px] inline-flex items-center gap-1 text-[11.5px]",
                    !field.needs_confirmation
                      ? "text-muted-foreground/60"
                      : proposed
                        ? "text-brand"
                        : "text-accent-violet",
                  )}
                >
                  {field.needs_confirmation ? <AssistantMark size="sm" /> : null}
                  {badge}
                </span>
              ) : null}
            </span>
            {field.needs_confirmation ? null : (
              <ChevronRight
                className="size-4 flex-none text-muted-foreground/50 transition-opacity md:opacity-0 md:group-hover:opacity-100"
                aria-hidden="true"
              />
            )}
          </button>

          {field.needs_confirmation ? (
            // «Revisar» y no «Así es» cuando lo propuesto es una lista: cuatro
            // etapas de embudo no se aprueban de un vistazo como se aprueba una
            // ciudad, y un toque que las aplique todas sin verlas es la clase de
            // atajo que acaba en un tablero de trabajo que nadie pidió.
            <button
              type="button"
              onClick={
                proposed && structured
                  ? () => {
                      setEditing(true);
                    }
                  : onConfirm
              }
              disabled={saving}
              className={cn(
                "flex-none rounded-full px-[13px] py-1.5 text-[12.5px] font-semibold transition-[background-color,transform] active:scale-[.95] disabled:opacity-50",
                proposed
                  ? "bg-brand/10 text-brand hover:bg-brand/16"
                  : "bg-accent-violet/10 text-accent-violet hover:bg-accent-violet/16",
              )}
            >
              {proposed && structured ? "Revisar" : "Así es"}
            </button>
          ) : null}
        </div>
      )}
    </li>
  );
}

function FieldEditor({
  field,
  draft,
  setDraft,
  inputRef,
  onCommit,
}: {
  field: IntakeField;
  draft: string;
  setDraft: (value: string) => void;
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  onCommit: () => void;
}) {
  if (field.kind === "choice" && field.options !== null) {
    return (
      <div className="mt-2 flex flex-wrap gap-1.5">
        {field.options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              setDraft(option);
            }}
            className={cn(
              "rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-[background-color,color,transform] active:scale-[.96]",
              draft === option
                ? "assistant-send"
                : "bg-foreground/[0.06] text-foreground hover:bg-foreground/[0.12]",
            )}
          >
            {option}
          </button>
        ))}
      </div>
    );
  }

  if (field.kind === "long_text" || field.kind === "list" || field.kind === "multi_choice") {
    return (
      <Textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
        rows={3}
        className="mt-2 rounded-xl border-foreground/[0.14] bg-foreground/[0.04] text-[15px]"
        placeholder={field.kind === "long_text" ? "Cuéntalo con tus palabras" : "Sepáralos con comas"}
      />
    );
  }

  return (
    <Input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      value={draft}
      onChange={(event) => {
        setDraft(event.target.value);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onCommit();
        }
      }}
      className="mt-2 h-9 rounded-xl border-foreground/[0.14] bg-foreground/[0.04] text-[15px]"
    />
  );
}

/** El valor actual, en texto editable. */
function toDraft(field: IntakeField): string {
  if (field.value === null || field.value === undefined) return "";
  if (Array.isArray(field.value)) return field.value.map((item) => String(item)).join(", ");
  if (typeof field.value === "boolean") return field.value ? "sí" : "no";
  return String(field.value);
}

/**
 * El texto editado, de vuelta al tipo del campo.
 *
 * `null` = no se pudo interpretar. La validación de verdad la hace el backend,
 * con el mismo normalizador que usa el asistente; esto solo evita mandar una
 * lista vacía o un texto en blanco.
 */
function fromDraft(field: IntakeField, draft: string): unknown {
  const trimmed = draft.trim();
  if (trimmed === "") return null;

  switch (field.kind) {
    case "list":
    case "multi_choice":
      return trimmed
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item !== "");
    case "boolean":
      return ["sí", "si", "true", "1"].includes(trimmed.toLowerCase());
    default:
      return trimmed;
  }
}
