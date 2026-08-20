"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowUp, BarChart3, Flame, Megaphone, Plus, RotateCcw, Sparkles } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { useCmoStore, type UiMessage } from "@/modules/cmo/infrastructure/stores/cmo.store";
import { Button } from "@/shared/components/ui/button";
import { AxelOrb } from "./AxelOrb";
import { AxelThinking } from "./AxelThinking";

/**
 * Sugerencias del estado vacío. Son las tres cosas que Axel hace de verdad, en
 * el orden en que un dueño las pediría: primero entender, luego a quién tocar,
 * luego qué armar. Cada una es una frase que él mismo diría — no un comando.
 */
const STARTERS = [
  { icon: BarChart3, label: "¿Cómo vamos?", prompt: "¿Cómo vamos este mes?" },
  {
    icon: Flame,
    label: "Clientes calientes",
    prompt: "¿Quiénes son mis clientes más calientes y por qué?",
  },
  {
    icon: Megaphone,
    label: "Ármame algo",
    prompt: "Ármame una campaña para lo que veas más urgente.",
  },
] as const;

/**
 * La conversación con Axel — la columna vertebral de la pantalla.
 *
 * Dos decisiones que vienen del diseño y no del componente:
 *
 * - **El mensaje propio se pinta antes de la respuesta.** El turno tarda
 *   decenas de segundos; sin eco inmediato el usuario escribe dos veces.
 * - **Un turno que falla no pierde el texto.** La burbuja se queda con el
 *   mensaje y un botón de reintentar: volver a teclear una pregunta larga
 *   porque la red falló es la peor forma de perder a alguien.
 */
export function AxelChat({ ownerName }: { ownerName: string | null }) {
  const thread = useCmoStore((state) => state.thread);
  const ask = useCmoStore((state) => state.ask);
  const retryLast = useCmoStore((state) => state.retryLast);
  const newThread = useCmoStore((state) => state.newThread);

  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Autoscroll al fondo en cada mensaje nuevo y al empezar a pensar: si no, la
  // respuesta aparece fuera de la vista y parece que no pasó nada.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [thread.messages.length, thread.thinking]);

  const submit = (text: string) => {
    if (text.trim() === "" || thread.thinking) return;
    setDraft("");
    if (textareaRef.current !== null) textareaRef.current.style.height = "auto";
    void ask(text);
  };

  const isEmpty = thread.messages.length === 0;

  return (
    <div className="axel-field flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-6 pt-8 pb-2" data-app-scroll>
        <div className="mx-auto flex w-full max-w-[640px] flex-col">
          {isEmpty ? (
            <div className="flex flex-col items-center text-center">
              <AxelOrb busy={thread.thinking} />
              <p className="mt-5 text-[13px] text-muted-foreground">
                {ownerName === null ? "Buen día" : `Buen día, ${ownerName}`}
              </p>
              <h1 className="font-heading mt-1.5 max-w-[17ch] text-[34px] leading-[1.18] font-extralight tracking-tight text-foreground/30">
                Soy Axel, tu <b className="font-bold text-foreground">director de mercadeo</b>.
              </h1>
              <p className="mt-3.5 max-w-[46ch] text-[13px] text-muted-foreground">
                Miro tus números todos los días y te dejo propuestas listas para decidir.
                Nada se envía a un cliente sin que tú lo apruebes.
              </p>

              <div className="mt-8 grid w-full gap-2.5 sm:grid-cols-3">
                {STARTERS.map((starter) => (
                  <button
                    key={starter.label}
                    type="button"
                    onClick={() => {
                      submit(starter.prompt);
                    }}
                    disabled={thread.thinking}
                    className={cn(
                      "group flex flex-col gap-2 rounded-lg border border-border p-3.5 text-left",
                      "bg-background/80 backdrop-blur transition-all",
                      "hover:-translate-y-0.5 hover:border-accent-violet/30 hover:shadow-float",
                      "disabled:pointer-events-none disabled:opacity-50",
                    )}
                  >
                    <span className="grid size-[30px] place-items-center rounded-full border border-border/60 bg-secondary text-muted-foreground group-hover:border-accent-violet/30 group-hover:bg-accent-violet/10 group-hover:text-accent-violet">
                      <starter.icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="font-heading text-[13.5px] font-bold">{starter.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {thread.messages.map((message) => (
                <MessageBubble key={message.id} message={message} onRetry={retryLast} />
              ))}
              {thread.thinking ? <AxelThinking /> : null}
            </div>
          )}
          <div ref={bottomRef} className="h-2" />
        </div>
      </div>

      <div className="flex-none px-6 pt-3 pb-5">
        <div className="mx-auto w-full max-w-[640px]">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submit(draft);
            }}
            className={cn(
              "rounded-xl border border-border bg-background/90 p-3.5 shadow-float backdrop-blur",
              "focus-within:border-accent-violet/30",
            )}
          >
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                const el = event.target;
                el.style.height = "auto";
                el.style.height = `${String(Math.min(el.scrollHeight, 120))}px`;
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit(draft);
                }
              }}
              rows={1}
              placeholder="Pregúntale a Axel o dile qué armar…"
              aria-label="Mensaje para Axel"
              disabled={thread.thinking}
              className="max-h-[120px] min-h-[42px] w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 disabled:opacity-60"
            />
            <div className="mt-1 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void newThread();
                }}
                disabled={thread.thinking || isEmpty}
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Nueva
              </Button>
              <Button
                type="submit"
                size="icon"
                disabled={draft.trim() === "" || thread.thinking}
                className="bg-brand-gradient ml-auto size-9 rounded-full text-primary-foreground"
                aria-label="Enviar"
              >
                <ArrowUp className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </form>
          <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[10.5px] text-muted-foreground/70">
            <Sparkles className="size-3" aria-hidden="true" />
            Axel propone; tú apruebas. Nunca envía nada por su cuenta.
          </p>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, onRetry }: { message: UiMessage; onRetry: () => void }) {
  if (message.role === "owner") {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <div
          className={cn(
            "max-w-[84%] rounded-lg rounded-br-sm border border-border bg-background px-3.5 py-2.5",
            "text-[13.5px] leading-relaxed shadow-float",
            message.pending === true && "opacity-60",
            message.failed !== undefined && "border-destructive/40",
          )}
        >
          {message.body}
        </div>
        {message.failed !== undefined ? (
          <div className="flex items-center gap-2 text-[11px] text-destructive">
            <AlertTriangle className="size-3.5" aria-hidden="true" />
            <span>{message.failed}</span>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 font-semibold underline underline-offset-2"
            >
              <RotateCcw className="size-3" aria-hidden="true" />
              Reintentar
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  /**
   * Los mensajes `system` son avisos del módulo (cuota agotada, propuesta
   * vencida), no diálogo: se pintan sin la identidad de Axel para que nadie
   * atribuya al director algo que dijo el sistema.
   */
  if (message.role === "system") {
    return (
      <p className="self-center rounded-full border border-border bg-secondary px-3 py-1 text-[11px] text-muted-foreground">
        {message.body}
      </p>
    );
  }

  return (
    <div className="self-stretch overflow-hidden rounded-lg border border-border bg-background shadow-float">
      <div className="flex items-center gap-2 px-4 pt-3">
        <Sparkles className="size-3.5 text-accent-violet" aria-hidden="true" />
        <span className="text-[11.5px] font-bold tracking-wide text-accent-violet">Axel</span>
      </div>
      <div className="px-4 pt-2 pb-3.5 text-[13.5px] leading-relaxed whitespace-pre-line text-muted-foreground">
        {message.body}
      </div>
      {message.tool_calls !== null && message.tool_calls.length > 0 ? (
        <div className="border-t border-border/50 px-4 py-2">
          <p className="text-[10.5px] text-muted-foreground/70">
            Consultó {message.tool_calls.length}{" "}
            {message.tool_calls.length === 1 ? "fuente" : "fuentes"} de tus datos
          </p>
        </div>
      ) : null}
    </div>
  );
}
