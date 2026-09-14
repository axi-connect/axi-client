"use client";

import { useId, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, FileDown, FileSpreadsheet } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { spring } from "@/core/styles/motion";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  CONTACT_IMPORT_COLUMNS,
  IMPORT_MAX_ROWS,
  IMPORT_REQUIREMENT_LABELS,
  type ContactImportColumn,
} from "@/modules/crm/domain/import";

export interface ImportGuideCardProps {
  onDownloadTemplate: () => void;
  /** «Ahora no» (primera vez, cierra) o «Volver» (abierta desde el paso archivo). */
  onSkip: () => void;
  skipLabel?: string;
  /** Recibe si el usuario marcó «No volver a mostrar». */
  onContinue: (dontShowAgain: boolean) => void;
  showDontShowAgain?: boolean;
  /** Título + párrafo propios (la página completa); en el modal los pone la cabecera del diálogo. */
  showIntro?: boolean;
}

/** Las tres fichas que «caen» sobre la hoja: nombre, teléfono y correo. */
const HERO_CHIPS: ReadonlyArray<{ index: string; column: ContactImportColumn; hint: string }> = [
  { index: "01", column: CONTACT_IMPORT_COLUMNS[0]!, hint: "Texto" },
  { index: "03", column: CONTACT_IMPORT_COLUMNS[2]!, hint: "+57 300 123 4567" },
  { index: "04", column: CONTACT_IMPORT_COLUMNS[3]!, hint: "laura@correo.com" },
];

const REQUIREMENT_DOT: Record<ContactImportColumn["requirement"], string> = {
  one_of: "bg-brand",
  recommended: "bg-accent-amber",
  optional: "hidden",
};

/**
 * La tarjeta guía del import (mockup F0 aprobado 2026-09-14): una isla oscura
 * donde tres fichas de columna entran en cascada UNA sola vez (solo transform y
 * opacity, sin loop — DESIGN-SYSTEM §6) sobre una hoja en perspectiva, y debajo
 * la estructura del archivo: formato, columnas con su exigencia, tipo y
 * ejemplo. Las columnas salen del espejo del registro del backend.
 */
export function ImportGuideCard({
  onDownloadTemplate,
  onSkip,
  skipLabel = "Ahora no",
  onContinue,
  showDontShowAgain = true,
  showIntro = false,
}: ImportGuideCardProps) {
  const reduceMotion = useReducedMotion();
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const checkboxId = useId();

  const enter = (delay: number) =>
    reduceMotion ? { duration: 0 } : { ...spring.soft, delay };

  return (
    <div className="space-y-4">
      <div
        className="dark theme-dark-island bg-background text-foreground import-guide-hero relative h-[228px] overflow-hidden rounded-2xl border border-border"
        aria-hidden="true"
      >
        <span className="absolute left-6 top-5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Estructura del archivo
        </span>
        <div className="import-guide-sheet absolute bottom-9 left-1/2 h-[112px] w-[360px] -translate-x-1/2 rounded-lg border border-border" />
        <div className="absolute left-1/2 top-11 h-[150px] w-[400px] -translate-x-1/2 max-sm:scale-[0.82]">
          {HERO_CHIPS.map((chip, position) => (
            <motion.div
              key={chip.index}
              initial={{ opacity: 0, x: -28, y: -34, rotate: -3 }}
              animate={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
              transition={enter(0.05 + position * 0.17)}
              className="absolute grid h-11 w-[270px] grid-cols-[auto_1fr_auto] items-center gap-2.5 rounded-[10px] border border-border bg-secondary/80 pl-2.5 pr-3 font-mono text-[12.5px] shadow-[0_12px_30px_rgb(0_0_0/0.45)]"
              style={{ left: 10 + position * 50, top: position * 38 }}
            >
              <span className="text-[10.5px] text-muted-foreground">{chip.index}</span>
              <span className="min-w-0 font-medium leading-tight">
                {chip.column.header}
                <span className="block truncate font-sans text-[10.5px] font-normal text-muted-foreground">
                  {chip.hint}
                </span>
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 font-sans text-[11px]",
                  chip.column.requirement === "one_of"
                    ? "bg-brand/20 text-brand"
                    : "bg-secondary text-muted-foreground",
                )}
              >
                {chip.column.requirement === "one_of" ? "requerida" : "recomendada"}
              </span>
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={enter(0.85)}
          className="absolute bottom-5 right-6 inline-flex h-7 items-center gap-2 rounded-full border border-brand/40 bg-brand/10 pl-1.5 pr-2.5 text-[11.5px]"
        >
          <span className="grid size-[18px] place-items-center rounded-full bg-brand text-primary-foreground">
            <Check className="size-3" />
          </span>
          {CONTACT_IMPORT_COLUMNS.length} columnas · una fila por contacto
        </motion.div>
      </div>

      <div className="space-y-4">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          <span aria-hidden className="size-1.5 rounded-full bg-brand" />
          Guía de carga
        </p>
        {showIntro && (
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">Prepara tu archivo para empezar</h2>
            <p className="max-w-[56ch] text-sm text-muted-foreground">
              Sube un archivo con estas columnas y leeremos tus contactos sin errores. Si ya
              tienes tu base, solo renombra las cabeceras.
            </p>
          </div>
        )}

        <div className="grid grid-cols-[2.5rem_1fr] items-center gap-3.5 rounded-xl border border-border bg-background px-3.5 py-3">
          <span className="grid size-10 place-items-center rounded-[10px] bg-accent text-brand" aria-hidden>
            <FileSpreadsheet className="size-5" />
          </span>
          <span>
            <span className="block text-sm font-medium">CSV o XLSX</span>
            <span className="block text-xs text-muted-foreground">
              Máximo 10 MB · {IMPORT_MAX_ROWS.toLocaleString("es-CO")} filas · una fila por contacto
            </span>
          </span>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-background">
          <div className="grid grid-cols-[minmax(0,1.5fr)_150px] items-center gap-3 bg-secondary px-3.5 py-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground sm:grid-cols-[minmax(0,1.5fr)_92px_150px]">
            <span>Columnas esperadas</span>
            <span className="max-sm:hidden">Tipo</span>
            <span className="text-right">Ejemplo</span>
          </div>
          <ul className="divide-y divide-border">
            {CONTACT_IMPORT_COLUMNS.map((column) => (
              <li
                key={column.header}
                className="grid grid-cols-[minmax(0,1.5fr)_150px] items-center gap-3 px-3.5 py-2 text-[13px] sm:grid-cols-[minmax(0,1.5fr)_92px_150px]"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <code className="font-mono text-[12.5px] font-medium">{column.header}</code>
                  <Badge variant="secondary" className="gap-1.5 font-medium">
                    <span
                      aria-hidden
                      className={cn("size-1.5 rounded-full", REQUIREMENT_DOT[column.requirement])}
                    />
                    {IMPORT_REQUIREMENT_LABELS[column.requirement]}
                  </Badge>
                </span>
                <span className="text-xs text-muted-foreground max-sm:hidden">{column.type}</span>
                <span
                  className="truncate text-right font-mono text-xs text-muted-foreground"
                  title={column.example}
                >
                  {column.example}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">
          * Basta con una de las dos: teléfono o correo. Los celulares colombianos de 10 dígitos se
          guardan como +57 automáticamente.
        </p>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {showDontShowAgain && (
            <label
              htmlFor={checkboxId}
              className="mr-auto inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground"
            >
              <Checkbox
                id={checkboxId}
                checked={dontShowAgain}
                onChange={(event) => setDontShowAgain(event.target.checked)}
              />
              No volver a mostrar
            </label>
          )}
          <Button variant="outline" size="sm" className="rounded-full" onClick={onDownloadTemplate}>
            <FileDown className="size-4" />
            Descargar plantilla
          </Button>
          <Button variant="ghost" size="sm" className="rounded-full" onClick={onSkip}>
            {skipLabel}
          </Button>
          <Button size="sm" className="rounded-full" onClick={() => onContinue(dontShowAgain)}>
            Entendido
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
