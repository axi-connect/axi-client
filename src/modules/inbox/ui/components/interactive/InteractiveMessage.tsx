"use client"

import { cn } from "@/core/lib/utils"
import { ExternalLink, List, MousePointerClick } from "lucide-react"
import type { InteractivePayload } from "@/modules/inbox/domain/inbox"

/**
 * Mensaje interactivo en el hilo: botones, menú de lista o CTA de URL.
 *
 * Es una VISTA, no un control: el operador ve exactamente lo que se le ofreció
 * al cliente, pero no puede tocarlo. Tocar por él mandaría al backend una
 * respuesta que el cliente no dio — por eso los botones se pintan como
 * `<div>` y no como `<button>`, y el bloque lleva su propia etiqueta.
 *
 * Dispatcher por `kind`, calcado de `media/MediaAttachment.tsx`: el payload ya
 * viene validado en runtime por `extractInteractivePayload`.
 */
export function InteractiveMessage({
  interactive,
  outbound,
}: {
  interactive: InteractivePayload
  outbound: boolean
}) {
  if (interactive.kind === "cta_url") {
    return (
      <InteractiveFrame outbound={outbound} icon={ExternalLink} label="Botón de enlace">
        <a
          href={interactive.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium underline-offset-2 hover:underline",
            outbound ? "bg-white/15 text-white" : "bg-background text-foreground",
          )}
        >
          <ExternalLink className="size-3 shrink-0" aria-hidden />
          {interactive.label}
        </a>
      </InteractiveFrame>
    )
  }

  // Espejo de la degradación del backend: con descripciones o más de 3
  // opciones, el canal lo pinta como menú de lista y no como botones
  const asList =
    interactive.options.length > 3 || interactive.options.some((option) => option.description)

  return (
    <InteractiveFrame
      outbound={outbound}
      icon={asList ? List : MousePointerClick}
      label={asList ? (interactive.menu_label ?? "Menú de opciones") : "Botones"}
    >
      <ul className="flex flex-col gap-1">
        {interactive.options.map((option) => (
          <li
            key={option.id}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs",
              outbound ? "bg-white/15 text-white" : "bg-background text-foreground",
            )}
          >
            <span className="font-medium">{option.title}</span>
            {option.description && (
              <span className={cn("block", outbound ? "text-white/70" : "text-muted-foreground")}>
                {option.description}
              </span>
            )}
          </li>
        ))}
      </ul>
    </InteractiveFrame>
  )
}

/** Marco común: separador, etiqueta de qué vio el cliente y el contenido. */
function InteractiveFrame({
  outbound,
  icon: Icon,
  label,
  children,
}: {
  outbound: boolean
  icon: typeof List
  label: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "mt-2 border-t pt-2",
        outbound ? "border-white/20" : "border-border/60",
      )}
    >
      <div
        className={cn(
          "mb-1.5 flex items-center gap-1 text-[10px] uppercase tracking-wide",
          outbound ? "text-white/70" : "text-muted-foreground",
        )}
      >
        <Icon className="size-3 shrink-0" aria-hidden />
        {label}
      </div>
      {children}
    </div>
  )
}
