/**
 * Checks del veredicto: ✓/✗ por criterio con su detail del evaluador.
 * `invalid_criteria` = ESCENARIO ROTO (criterios ilegibles) — warning con
 * copy accionable, nunca se pinta como fallo del agente.
 */
import { Check, TriangleAlert, X } from "lucide-react";
import { CRITERION_KINDS } from "../../../../../../domain/quality";
import {
  isInvalidCriteriaCheck,
  parseChecks,
} from "../../../../../../domain/quality-runs";

const KIND_LABELS: Record<string, string> = Object.fromEntries(
  CRITERION_KINDS.map((kind) => [kind.value, kind.label]),
);

export function ChecksPanel({ checks }: { checks: unknown }) {
  const parsed = parseChecks(checks);

  if (parsed.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin checks evaluados todavía.</p>;
  }

  return (
    <ul className="space-y-2">
      {parsed.map((check, index) => {
        const invalid = isInvalidCriteriaCheck(check);
        return (
          <li key={`${check.kind}-${index}`} className="flex items-start gap-2 text-sm">
            {invalid ? (
              <TriangleAlert aria-label="Criterios ilegibles" className="mt-0.5 size-4 shrink-0 text-warning" />
            ) : check.passed ? (
              <Check aria-label="Aprobado" className="mt-0.5 size-4 shrink-0 text-success" />
            ) : (
              <X aria-label="Fallido" className="mt-0.5 size-4 shrink-0 text-destructive" />
            )}
            <span className="min-w-0">
              <span className={invalid ? "text-warning" : undefined}>
                {invalid ? "Criterios ilegibles" : KIND_LABELS[check.kind] ?? check.kind}
              </span>
              {check.detail && (
                <span className="block text-xs text-muted-foreground">{check.detail}</span>
              )}
              {invalid && (
                <span className="block text-xs text-muted-foreground">
                  Escenario roto: corrige sus criterios — no es un fallo del agente.
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
