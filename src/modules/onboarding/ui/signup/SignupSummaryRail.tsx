import Link from "next/link";

import { GlassGlyph } from "@/shared/components/ui/glyphs";
import type { GlyphKind } from "@/shared/components/ui/glyphs/glyph-geometry";
import type { ModuleId } from "@/modules/landing/public";
import { ENTERPRISE_PATH, offerSummary, type OfferSelection } from "@/modules/onboarding/domain/signup-draft";

/** Glifo del rail por oferta: la familia semántica más cercana a la capacidad. */
const MODULE_GLYPHS: Record<ModuleId, GlyphKind> = {
  calls: "conversation",
  leads: "people",
  crm: "metrics",
  scheduling: "time",
};

function glyphFor(selection: OfferSelection | null): GlyphKind {
  if (!selection) return "ai";
  if (selection.kind === "package") return "conversation";
  const [first] = selection.codes;
  return first ? MODULE_GLYPHS[first] : "ai";
}

/**
 * Rail de resumen de `/comenzar`: qué eligió, qué incluye y qué pagaría al
 * terminar la prueba. Superficie `.glass-flat` (no hay tilt, pero tampoco hay
 * nada detrás que difuminar). El glifo va como ilustración, nunca bajo texto
 * (DESIGN-SYSTEM §7).
 */
export function SignupSummaryRail({ selection }: { selection: OfferSelection | null }) {
  const summary = selection ? offerSummary(selection) : null;

  return (
    <aside className="glass-flat flex flex-col gap-4 rounded-2xl p-6 lg:sticky lg:top-6" aria-label="Resumen de tu elección">
      <div className="grid place-items-center py-1">
        <GlassGlyph kind={glyphFor(selection)} tier="md" className="glass-glyph--brand" />
      </div>

      {summary ? (
        <>
          <div>
            <p className="text-muted-foreground text-[0.6875rem] font-semibold tracking-[0.14em] uppercase">{summary.kind}</p>
            <h2 className="font-heading mt-1 text-lg font-bold">{summary.title}</h2>
          </div>
          <dl className="flex flex-col gap-2.5 text-[0.8125rem]">
            {summary.lines.map((line) => (
              <div key={line.label} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{line.label}</dt>
                <dd className="text-right font-medium">{line.value}</dd>
              </div>
            ))}
            {summary.afterTrial ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Después de la prueba</dt>
                <dd className="font-mono text-right font-medium tabular-nums">
                  {summary.approximate ? "Desde " : ""}
                  {summary.afterTrial}
                </dd>
              </div>
            ) : null}
          </dl>
        </>
      ) : (
        <div>
          <h2 className="font-heading text-lg font-bold">Elige cómo empezar</h2>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            Un Paquete trae el producto completo; un Módulo, una sola capacidad con su volumen.
          </p>
        </div>
      )}

      <div className="border-brand/25 bg-brand/8 flex flex-col gap-1 rounded-xl border p-3.5">
        <p className="text-[0.9375rem] font-semibold">7 días gratis, sin tarjeta</p>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Pagas solo si decides seguir. Si no, tus datos quedan intactos.
        </p>
      </div>

      <p className="text-muted-foreground text-xs leading-relaxed">
        ¿Alto volumen o base de datos dedicada?{" "}
        <Link href={ENTERPRISE_PATH} className="text-brand hover:underline">
          Hablemos de Enterprise
        </Link>
        .
      </p>
    </aside>
  );
}
