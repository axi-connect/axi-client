import type { ReactNode } from "react";

export type LegalSection = {
  heading: string;
  /** Cada entrada es un párrafo; `string[]` anidado se renderiza como lista. */
  body: readonly (string | readonly string[])[];
};

/**
 * Presentación de un documento legal: título, fecha de vigencia y secciones
 * numeradas.
 *
 * No se usa `@tailwindcss/typography` (`prose`) porque no está instalado y
 * añadirlo por dos páginas traería su propia escala tipográfica, que
 * competiría con la del design system. Aquí las clases son explícitas y salen
 * de DESIGN-SYSTEM §3.2.
 */
export function LegalDocument({
  title,
  updatedAt,
  intro,
  sections,
}: {
  title: string;
  /** Texto legible, no fecha ISO: lo lee una persona, no una máquina. */
  updatedAt: string;
  intro?: ReactNode;
  sections: readonly LegalSection[];
}) {
  return (
    <article>
      <h1 className="font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl">
        {title}
      </h1>
      <p className="text-muted-foreground mt-4 text-sm">Última actualización: {updatedAt}</p>

      {intro ? (
        <p className="text-muted-foreground mt-8 text-base leading-relaxed text-pretty">{intro}</p>
      ) : null}

      <div className="mt-10 space-y-10">
        {sections.map((section, index) => (
          <section key={section.heading}>
            <h2 className="text-lg font-semibold tracking-tight">
              <span className="text-muted-foreground mr-2 font-mono text-sm tabular-nums">
                {index + 1}.
              </span>
              {section.heading}
            </h2>
            <div className="mt-3 space-y-3">
              {section.body.map((block, blockIndex) =>
                Array.isArray(block) ? (
                  <ul
                    key={blockIndex}
                    className="text-muted-foreground list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed"
                  >
                    {block.map((listItem) => (
                      <li key={listItem}>{listItem}</li>
                    ))}
                  </ul>
                ) : (
                  <p
                    key={blockIndex}
                    className="text-muted-foreground text-[15px] leading-relaxed text-pretty"
                  >
                    {block}
                  </p>
                ),
              )}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
