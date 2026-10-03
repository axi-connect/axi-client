"use client";

import { Lock } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { hsmStatusLabel } from "@/modules/marketing/domain/meta-template-view";
import type { VersionOption } from "@/modules/marketing/domain/template-name";

/** «Aprobada · en uso», «Reservada hasta 28 oct», «Libre». */
function versionNote(option: VersionOption): string {
  if (option.taken === null) return "Libre";
  if (option.taken.reason === "in_use") return `${hsmStatusLabel(option.taken.status)} · en uso`;
  if (option.taken.until === null) return "Reservada por Meta";
  const until = new Date(option.taken.until).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
  return `Reservada hasta ${until}`;
}

/**
 * El nombre y la versión de una plantilla (maqueta F0 v2, vista «Nombre y
 * versión»). El operador escribe el nombre como lo dice y elige la versión en un
 * selector pegado al campo; debajo, en una línea, cómo lo recibe Meta. Nada de
 * reglas que aprender: el formato se resuelve al escribir.
 *
 * Al editar, Meta no deja cambiar ni el nombre ni la versión: se enseñan fijos.
 */
export function TemplateNameField({
  human,
  onHumanChange,
  version,
  onVersionChange,
  options,
  technicalName,
  locked,
  error,
  inputRef,
}: {
  human: string;
  onHumanChange: (value: string) => void;
  version: number | null;
  onVersionChange: (version: number) => void;
  options: readonly VersionOption[];
  /** El nombre que recibe Meta (`base_vN`), o `null` mientras no hay nada escrito. */
  technicalName: string | null;
  locked: boolean;
  /** Ya con `touched` resuelto: si llega, se pinta. */
  error?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor="hsm-name" className="text-xs font-medium">
        Nombre
      </label>
      <div
        className={cn(
          "border-input flex items-stretch rounded-xl border shadow-xs transition-[box-shadow,border-color]",
          "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
          locked ? "bg-secondary" : "bg-background",
          error !== undefined && "border-destructive",
        )}
      >
        <Input
          ref={inputRef}
          id="hsm-name"
          value={human}
          disabled={locked}
          onChange={(event) => onHumanChange(event.target.value)}
          placeholder="Ej.: Temporada colección"
          autoComplete="off"
          aria-invalid={error !== undefined}
          aria-describedby="hsm-name-meta"
          classNameContainer="min-w-0 flex-1"
          className="h-10 rounded-none rounded-l-xl border-0 bg-transparent shadow-none focus-visible:ring-0 disabled:opacity-100 dark:bg-transparent"
        />
        {locked ? (
          <span className="border-input text-muted-foreground flex items-center gap-1.5 border-l px-3 font-mono text-[13px]">
            {version === null ? "—" : `v${String(version)}`}
            <Lock aria-hidden="true" className="size-3.5" />
            <span className="sr-only">Versión fija</span>
          </span>
        ) : (
          <Select value={version === null ? "" : String(version)} onValueChange={(next) => onVersionChange(Number(next))}>
            <SelectTrigger
              aria-label="Versión"
              className="border-input h-10 w-auto shrink-0 gap-1.5 rounded-none rounded-r-xl border-0 border-l px-3 font-mono text-[13px] shadow-none focus-visible:ring-0 data-[size=default]:h-10 dark:bg-transparent"
            >
              <SelectValue>{version === null ? "v—" : `v${String(version)}`}</SelectValue>
            </SelectTrigger>
            <SelectContent align="end" className="min-w-56">
              {options.map((option) => (
                <SelectItem key={option.version} value={String(option.version)} disabled={option.taken !== null}>
                  <span className="font-mono">v{option.version}</span>
                  <span className="text-muted-foreground text-xs">{versionNote(option)}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <div id="hsm-name-meta" className="space-y-1">
        {technicalName !== null ? (
          <p className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
            En Meta:
            <code className="bg-secondary text-foreground rounded-md px-1.5 py-0.5 font-mono text-xs break-all">
              {technicalName}
            </code>
            {locked ? null : <span>· lo formateamos por ti</span>}
          </p>
        ) : null}
        {error !== undefined ? <p className="text-destructive text-xs">{error}</p> : null}
        {locked ? (
          <p className="text-muted-foreground text-xs">
            Meta no deja cambiar nombre ni versión: para otra, crea una nueva desde la lista.
          </p>
        ) : null}
      </div>
    </div>
  );
}
