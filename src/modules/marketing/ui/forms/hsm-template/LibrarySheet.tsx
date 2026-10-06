"use client";

import { useId, useMemo, useState } from "react";
import { Info, RotateCw, Zap } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { SearchField } from "@/shared/components/ui/search-field";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { HsmLibraryTemplateDTO } from "@/modules/marketing/domain/template-catalog";
import {
  filterLibrary,
  libraryBodyParts,
  libraryTitle,
  libraryTopicLabel,
  libraryTopics,
} from "@/modules/marketing/domain/template-library";
import type { LibraryState } from "./use-hsm-template-draft";

/**
 * La biblioteca de Meta entera, en una hoja lateral (maqueta F0 v4, vista
 * «Biblioteca de Meta»): buscador, casos de uso y una vista de cada plantilla
 * con los ejemplos de Meta resaltados. Elegir una la marca; «Usar esta
 * plantilla» llena el formulario y cierra.
 *
 * Flota sobre la página, así que es cristal (`SheetContent` ya lleva
 * `.glass-overlay`, DESIGN-SYSTEM §5). El filtro va en cliente: son unas 170 y
 * llegan todas de una vez.
 */
export function LibrarySheet({
  open,
  onOpenChange,
  state,
  onRetry,
  onUse,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: LibraryState;
  onRetry: () => void;
  onUse: (template: HsmLibraryTemplateDTO) => void;
}) {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const items = useMemo(() => (state.kind === "ready" ? state.items : []), [state]);
  const topics = useMemo(() => libraryTopics(items), [items]);
  const shown = useMemo(() => filterLibrary(items, query, topic), [items, query, topic]);

  // No se llama `use…`: el linter de hooks lo tomaría por un hook.
  function choose(template: HsmLibraryTemplateDTO) {
    onUse(template);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-[40rem]">
        <SheetHeader className="gap-1 px-6 pt-6 pb-4">
          <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">Empieza desde</p>
          <SheetTitle className="font-heading text-[1.375rem] leading-tight font-bold tracking-tight">Biblioteca de Meta</SheetTitle>
          <SheetDescription className="max-w-[52ch] text-[13px] text-pretty">
            Plantillas de utilidad que Meta ya redactó. Si no cambias su texto fijo, se aprueban al instante; los huecos
            los rellenas tú.
          </SheetDescription>
        </SheetHeader>

        <div className="@container flex flex-col gap-3.5 px-6 pb-6">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Busca: pago, pedido, cita…"
            label="Buscar en la biblioteca de Meta"
            className="h-10"
          />

          {topics.length > 1 && (
            <div role="group" aria-label="Caso de uso" className="flex flex-wrap gap-1.5">
              <TopicChip pressed={topic === null} onClick={() => setTopic(null)}>
                Todas
              </TopicChip>
              {topics.map((key) => (
                <TopicChip key={key} pressed={topic === key} onClick={() => setTopic(key)}>
                  {libraryTopicLabel(key)}
                </TopicChip>
              ))}
            </div>
          )}

          {state.kind === "loading" || state.kind === "off" ? (
            <div aria-busy="true" aria-label="Cargando la biblioteca" className="grid gap-2.5 @lg:grid-cols-2">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="h-40 rounded-[18px]" />
              ))}
            </div>
          ) : state.kind === "error" ? (
            <Alert variant="destructive" className="rounded-2xl">
              <AlertTitle className="line-clamp-none">{state.message}</AlertTitle>
              <AlertDescription>
                <Button variant="outline" size="sm" className="mt-2 rounded-full" onClick={onRetry}>
                  <RotateCw aria-hidden className="size-3.5" />
                  Reintentar
                </Button>
              </AlertDescription>
            </Alert>
          ) : shown.length === 0 ? (
            <p className="text-muted-foreground rounded-2xl border border-dashed px-4 py-8 text-center text-[13px] text-pretty">
              {query.trim() !== ""
                ? `Nada con «${query.trim()}». Prueba con pago, pedido o cita.`
                : "Meta no ofrece plantillas de su biblioteca para este canal."}
            </p>
          ) : (
            <ul aria-label="Plantillas de la biblioteca" className="grid gap-2.5 @lg:grid-cols-2">
              {shown.map((template) => (
                <LibraryCard
                  key={template.name}
                  template={template}
                  selected={selected === template.name}
                  onSelect={() => setSelected(template.name)}
                  onUse={() => choose(template)}
                />
              ))}
            </ul>
          )}

          <p className="text-muted-foreground flex items-center gap-2 text-xs">
            <Info aria-hidden className="size-3.5 shrink-0" />
            La biblioteca no trae plantillas de marketing: para una promoción con imagen, empieza en blanco.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function TopicChip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "h-7.5 rounded-full border px-3 text-[12.5px] font-medium transition-colors",
        "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
        pressed
          ? "bg-foreground text-background border-foreground"
          : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Una plantilla: título, caso de uso y el cuerpo con los ejemplos de Meta
 * resaltados —lo que el negocio rellena—. La tarjeta entera se elige; el botón
 * de usar vive fuera de esa zona para no anidar botones.
 */
function LibraryCard({
  template,
  selected,
  onSelect,
  onUse,
}: {
  template: HsmLibraryTemplateDTO;
  selected: boolean;
  onSelect: () => void;
  onUse: () => void;
}) {
  const bodyId = useId();
  const title = libraryTitle(template);
  return (
    <li
      className={cn(
        "bg-background flex min-w-0 flex-col gap-2 rounded-[18px] border p-3.5 transition-colors",
        selected ? "border-foreground ring-foreground ring-1" : "border-border hover:border-foreground/30",
      )}
    >
      <button
        type="button"
        aria-pressed={selected}
        aria-label={title}
        aria-describedby={bodyId}
        onClick={onSelect}
        className="focus-visible:outline-ring flex min-w-0 flex-col gap-2 rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        <span className="flex items-baseline justify-between gap-2">
          <span className="text-[13.5px] font-semibold">{title}</span>
          <span className="text-muted-foreground shrink-0 text-[11.5px]">{libraryTopicLabel(template.topic)}</span>
        </span>
        <span
          id={bodyId}
          className="bg-secondary line-clamp-5 rounded-xl px-3 py-2.5 text-[12.5px] leading-normal whitespace-pre-line"
        >
          {libraryBodyParts(template.body, template.body_examples).map((part, index) =>
            part.example ? (
              <mark key={index} className="bg-accent-violet/15 rounded px-0.5 text-inherit">
                {part.text}
              </mark>
            ) : (
              <span key={index}>{part.text}</span>
            ),
          )}
        </span>
      </button>
      <div className="flex min-h-8 items-center justify-between gap-2">
        <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[11.5px]">
          <Zap aria-hidden className="text-success size-3" />
          Aprobación inmediata
        </span>
        {selected && (
          <Button type="button" size="sm" className="rounded-full" onClick={onUse}>
            Usar esta plantilla
          </Button>
        )}
      </div>
    </li>
  );
}
