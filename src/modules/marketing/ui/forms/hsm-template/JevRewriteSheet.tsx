"use client";

import { AssistantMark } from "@/shared/components/features/assistant";
import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { RewriteState } from "./use-jev-advisor";

/**
 * «Versión de utilidad» (hotfix 131049, maqueta v2): hoja lateral con la
 * propuesta de Jev, lo que quitó y por qué. Nada cambia hasta «Aplicar».
 */
export function JevRewriteSheet({
  state,
  variableCount,
  onApply,
  onClose,
  onRetry,
}: {
  state: RewriteState;
  /** Las variables del texto actual: para decir cuántas quita la propuesta. */
  variableCount: number;
  onApply: () => void;
  onClose: () => void;
  onRetry: () => void;
}) {
  const open = state.kind !== "closed";

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-[32rem]">
        <SheetHeader className="border-border/60 gap-1.5 border-b px-6 pt-6 pb-4">
          <AssistantMark name="Jev propone" size="sm" />
          <SheetTitle className="font-heading text-[1.375rem] leading-tight font-bold tracking-tight">
            Versión de utilidad
          </SheetTitle>
          <SheetDescription className="text-[13px] text-pretty">{description(state, variableCount)}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 px-6 py-5">
          {state.kind === "loading" && (
            <div className="flex flex-col gap-2.5" role="status" aria-label="Jev está escribiendo la propuesta">
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="mt-3 h-4 w-3/5" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          )}

          {state.kind === "ready" && (
            <>
              <p className="text-[14px] leading-7 whitespace-pre-line">{state.proposal.body}</p>
              {state.proposal.footer !== null && (
                <p className="text-muted-foreground text-xs">Pie: {state.proposal.footer}</p>
              )}
              {state.proposal.removed.length > 0 && (
                <div className="border-border/60 flex flex-col gap-2 border-t pt-4">
                  <span className="text-muted-foreground text-[11px] font-semibold tracking-[0.12em] uppercase">
                    Quité
                  </span>
                  <ul className="flex flex-col gap-2">
                    {state.proposal.removed.map((item) => (
                      <li key={item.phrase} className="flex flex-col gap-0.5">
                        <span className="text-muted-foreground decoration-destructive/60 text-[13px] line-through">
                          {item.phrase}
                        </span>
                        <span className="text-muted-foreground text-xs">{item.why}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {state.kind === "empty" && (
            <p className="text-muted-foreground text-sm text-pretty">
              No logré una versión que Meta acepte como utilidad. Quita a mano las frases que Jev marcó y vuelve a
              intentarlo.
            </p>
          )}

          {state.kind === "error" && <p className="text-muted-foreground text-sm text-pretty">{state.message}.</p>}
        </div>

        <SheetFooter className="border-border/60 flex-row gap-2 border-t px-6 py-4">
          {state.kind === "ready" ? (
            <Button type="button" variant="contrast" className="h-11 flex-1 rounded-full" onClick={onApply}>
              Aplicar
            </Button>
          ) : state.kind === "error" || state.kind === "empty" ? (
            <Button type="button" variant="contrast" className="h-11 flex-1 rounded-full" onClick={onRetry}>
              Intentar de nuevo
            </Button>
          ) : null}
          <Button type="button" variant="glass" className="h-11" onClick={onClose}>
            {state.kind === "ready" ? "Descartar" : "Cerrar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function description(state: RewriteState, variableCount: number): string {
  if (state.kind === "loading") return "Jev está escribiendo una versión que cuente solo lo que ya empezó.";
  if (state.kind !== "ready") return "Cuenta solo lo que ya empezó, sin ofertas ni cobros.";
  const dropped = variableCount - state.proposal.variables.length;
  return dropped > 0
    ? `Cuenta lo que ya empezó. Quita ${String(dropped)} ${dropped === 1 ? "variable que ya no hace falta" : "variables que ya no hacen falta"}; las demás conservan sus ejemplos.`
    : "Cuenta lo que ya empezó. Tus variables y sus ejemplos quedan igual.";
}
