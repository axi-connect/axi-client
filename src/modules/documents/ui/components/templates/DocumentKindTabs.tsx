"use client";

import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import type { DocumentTypeView } from "@/modules/documents/domain/template";

/** Panel aparte, no un tipo: emisor y numeración. */
export const SETTINGS_TAB = "__settings__";
/** Panel aparte: lo que se emite y se envía solo (F9). */
export const AUTOMATION_TAB = "__automation__";

/**
 * Pastillas de tipo: cambian el panel, no la URL (DESIGN-SYSTEM §9.3), así
 * que son `Tabs` y no `NavTabs`. Solo los tipos emitibles se ofrecen; el
 * punto dice cuáles ya llevan TU versión (sin punto, sale el modelo de Axi).
 * Al final, separadas, emisor y numeración y lo que sale solo.
 */
export function DocumentKindTabs({
  types,
  customized,
  value,
  onChange,
}: {
  types: readonly DocumentTypeView[];
  /** Los tipos con plantilla propia del negocio. */
  customized: ReadonlySet<string>;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <Tabs value={value} onValueChange={onChange}>
      <TabsList
        variant="pill"
        size="sm"
        surface="inline"
        aria-label="Tipo de documento"
      >
        {types
          .filter((type) => type.issuable)
          .map((type) => {
            // Sin iconos: ocho pastillas con glifo no caben a 1280, y el punto
            // de «tu versión» ya es la marca que importa.
            return (
              <TabsTrigger key={type.code} value={type.code}>
                {type.label}
                {customized.has(type.code) ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="size-1.5 rounded-full bg-info"
                    />
                    <span className="sr-only"> · tu versión</span>
                  </>
                ) : null}
              </TabsTrigger>
            );
          })}
        <span
          aria-hidden="true"
          className="mx-1 h-5 w-px self-center bg-border"
        />
        <TabsTrigger value={SETTINGS_TAB}>Emisor y numeración</TabsTrigger>
        <TabsTrigger value={AUTOMATION_TAB}>Automáticos</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
