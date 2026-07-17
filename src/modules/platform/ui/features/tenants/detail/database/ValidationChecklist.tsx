"use client";

/**
 * Checklist de la última validación (POST /validate, síncrono): ✔ verde /
 * ✘ rojo semántico con remedio accionable y snippet copiable (spec §7).
 */
import { Check, Copy, CircleCheck, CircleX } from "lucide-react";
import type { DbValidationResult } from "../../../../../domain/database";
import { buildChecklist } from "../../../../../domain/database";
import { useCopy } from "../../../../hooks/use-copy";

function Snippet({ code }: { code: string }) {
  const { copied, copy } = useCopy();
  return (
    <button
      type="button"
      onClick={() => void copy(code)}
      aria-label={`Copiar ${code}`}
      className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 font-mono text-xs transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
    >
      {code}
      {copied ? <Check aria-hidden="true" className="size-3 text-success" /> : <Copy aria-hidden="true" className="size-3 text-muted-foreground" />}
    </button>
  );
}

export function ValidationChecklist({ result }: { result: DbValidationResult }) {
  const items = buildChecklist(result);

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.key} className="flex flex-wrap items-center gap-2 text-sm">
          {item.ok ? (
            <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-success" />
          ) : (
            <CircleX aria-hidden="true" className="size-4 shrink-0 text-destructive" />
          )}
          <span className={item.ok ? undefined : "font-medium"}>{item.label}</span>
          {!item.ok && item.remedy && (
            <span className="text-muted-foreground">— {item.remedy}</span>
          )}
          {!item.ok && item.snippet && <Snippet code={item.snippet} />}
        </li>
      ))}
    </ul>
  );
}
