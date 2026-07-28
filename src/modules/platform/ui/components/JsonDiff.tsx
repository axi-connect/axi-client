/**
 * Diff legible del campo `changes` de auditoría (spec §4): campo → antes →
 * después. Si `diffChanges()` no reconoce la estructura, cae a JSON crudo en
 * mono — el dato siempre es visible, jamás se oculta ni rompe.
 */
import { MoveRight } from "lucide-react";
import { diffChanges } from "../../domain/audit";

export function JsonDiff({ changes }: { changes: unknown }) {
  if (changes === null || changes === undefined) {
    return <p className="text-xs text-muted-foreground">Sin cambios registrados.</p>;
  }

  const rows = diffChanges(changes);

  if (!rows) {
    return (
      <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs">
        {JSON.stringify(changes, null, 2)}
      </pre>
    );
  }

  return (
    <dl className="space-y-1.5">
      {rows.map((row) => (
        <div key={row.field} className="flex flex-wrap items-baseline gap-x-2 text-xs">
          <dt className="w-44 shrink-0 truncate font-mono text-muted-foreground">{row.field}</dt>
          <dd className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            <span className="break-all font-mono text-muted-foreground line-through decoration-border">
              {row.before}
            </span>
            <MoveRight aria-hidden="true" className="size-3 shrink-0 self-center text-muted-foreground" />
            <span className="break-all font-mono font-medium">{row.after}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
