"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { flowStage } from "@/core/styles/motion";

/**
 * El escenario del onboarding «Flow» (2026-09-05): el suelo es el layout
 * (`.flow-ground`) y los `children` son lo que vive sobre él; el campo coral es
 * una **capa encima** que contiene la bienvenida y que, al empezar, **se hunde**
 * (`translateY(100%)`, solo transform) descubriendo el suelo ya pintado debajo.
 *
 * La capa tiene que CONTENER la bienvenida, no ir detrás: `.signup-field`
 * re-deriva los tokens semánticos por descendencia, y un fondo hermano dejaría
 * el texto de la bienvenida oscuro sobre coral. Es absoluta contra el scroller
 * del layout (`relative isolate`), así cubre también la cabecera del suelo.
 *
 * Con reduced-motion no hay hundimiento: la capa desaparece en seco.
 */
export function FlowStage({
  field,
  fieldContent,
  children,
}: {
  /** `true` mientras el campo (la bienvenida) está encima del suelo. */
  field: boolean;
  fieldContent: ReactNode;
  children: ReactNode;
}) {
  const reduced = useReducedMotion() ?? false;
  return (
    <>
      {children}
      <AnimatePresence initial={false}>
        {field ? (
          <motion.div
            key="field"
            data-testid="flow-field"
            className="signup-field sidebar-scroll absolute inset-0 z-10 isolate flex flex-col overflow-x-hidden overflow-y-auto will-change-transform"
            exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { y: "100%", transition: flowStage.drain }}
          >
            <div aria-hidden="true" className="signup-grain pointer-events-none absolute inset-0 -z-10" />
            {fieldContent}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
