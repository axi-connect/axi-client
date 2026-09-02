"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Check } from "lucide-react";

import { GlassGlyph } from "@/shared/components/ui/glyphs";
import type { GlyphKind } from "@/shared/components/ui/glyphs/glyph-geometry";

/**
 * Marco de un paso del onboarding: título que recibe el foco al cambiar de
 * paso (así el lector de pantalla anuncia dónde está), descripción, cuerpo y
 * pie con las acciones. El rail derecho explica «para qué sirve» con un glifo
 * de cristal como ilustración, nunca bajo texto (DESIGN-SYSTEM §7).
 */
export function StepFrame({
  stepNumber,
  total,
  label,
  title,
  lead,
  children,
  footer,
  aside,
}: {
  stepNumber: number;
  total: number;
  label: string;
  title: string;
  lead: string;
  children: ReactNode;
  footer: ReactNode;
  aside: ReactNode;
}) {
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [title]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-8">
      <section aria-label={`Paso ${stepNumber} de ${total}: ${label}`} className="min-w-0">
        <h2 ref={headingRef} tabIndex={-1} className="font-heading text-2xl leading-tight font-bold tracking-tight outline-none">
          {title}
        </h2>
        <p className="text-muted-foreground mt-2 max-w-[44rem] text-sm leading-relaxed">{lead}</p>
        <div className="mt-6">{children}</div>
        <div className="border-border/70 mt-7 flex flex-wrap items-center justify-between gap-3 border-t pt-5">{footer}</div>
      </section>
      {aside}
    </div>
  );
}

export function StepAside({
  glyph,
  title,
  text,
  tips,
}: {
  glyph: GlyphKind;
  title: string;
  text: string;
  tips: readonly string[];
}) {
  return (
    <aside className="glass-flat flex flex-col gap-3.5 rounded-2xl p-6" aria-label={title}>
      <div className="grid place-items-center py-1">
        <GlassGlyph kind={glyph} tier="md" />
      </div>
      <h3 className="text-sm font-semibold tracking-wide">{title}</h3>
      <p className="text-muted-foreground text-[0.8125rem] leading-relaxed">{text}</p>
      <ul className="flex flex-col gap-2">
        {tips.map((tip) => (
          <li key={tip} className="flex gap-2 text-[0.8125rem] leading-relaxed">
            <Check aria-hidden="true" className="text-brand mt-0.5 size-3.5 shrink-0" />
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
