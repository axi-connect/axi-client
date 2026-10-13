"use client"

import { cn } from "@/core/lib/utils"
import { CalendarDays, ExternalLink, List, MapPin, MousePointerClick, Phone, Smartphone } from "lucide-react"
import type { ThreadInteractive, ThreadInteractiveOption } from "@/modules/inbox/domain/inbox"

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
  interactive: ThreadInteractive
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
            outbound ? "bg-background/15 text-background" : "bg-background text-foreground",
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
  if (interactive.kind === "request") {
    // Telegram: un botón nativo que comparte el dato con un toque. Se pinta
    // como lo que vio el cliente, no como una opción que el operador pueda tocar
    const phone = interactive.request === "phone"
    return (
      <InteractiveFrame
        outbound={outbound}
        icon={phone ? Smartphone : MapPin}
        label={phone ? "Pidió compartir su teléfono" : "Pidió compartir su ubicación"}
      >
        <div
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium",
            outbound ? "bg-background/15 text-background" : "bg-background text-foreground",
          )}
        >
          {phone ? <Phone className="size-3 shrink-0" aria-hidden /> : <MapPin className="size-3 shrink-0" aria-hidden />}
          {phone ? "Compartir mi número" : "Enviar mi ubicación"}
        </div>
      </InteractiveFrame>
    )
  }

  const sections = groupBySection(interactive.options)
  if (sections !== null) {
    // Horarios por día: así los vio el cliente (lista por secciones en
    // WhatsApp, calendario de dos pasos en Telegram)
    return (
      <InteractiveFrame outbound={outbound} icon={CalendarDays} label="Opciones por día">
        <div className="flex flex-col gap-2">
          {sections.map((section) => (
            <div key={section.title} className="flex flex-col gap-1">
              <span className={cn("text-[10.5px] font-medium", outbound ? "text-background/70" : "text-muted-foreground")}>
                {section.title}
              </span>
              <ul className="flex flex-wrap gap-1">
                {section.options.map((option) => (
                  <li
                    key={option.id}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium",
                      outbound ? "bg-background/15 text-background" : "bg-background text-foreground",
                    )}
                  >
                    {option.title}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </InteractiveFrame>
    )
  }

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
              outbound ? "bg-background/15 text-background" : "bg-background text-foreground",
            )}
          >
            <span className="font-medium">{option.title}</span>
            {option.description && (
              <span className={cn("block", outbound ? "text-background/70" : "text-muted-foreground")}>
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
        outbound ? "border-background/20" : "border-border/60",
      )}
    >
      <div
        className={cn(
          "mb-1.5 flex items-center gap-1 text-[10px] uppercase tracking-wide",
          outbound ? "text-background/70" : "text-muted-foreground",
        )}
      >
        <Icon className="size-3 shrink-0" aria-hidden />
        {label}
      </div>
      {children}
    </div>
  )
}

/** Grupos por `section`, en el orden en que aparecen; `null` si no hay al menos dos. */
function groupBySection(
  options: readonly ThreadInteractiveOption[],
): { title: string; options: ThreadInteractiveOption[] }[] | null {
  if (options.some((option) => option.section === undefined)) return null
  const groups = new Map<string, ThreadInteractiveOption[]>()
  for (const option of options) {
    const key = option.section as string
    groups.set(key, [...(groups.get(key) ?? []), option])
  }
  if (groups.size < 2) return null
  return [...groups.entries()].map(([title, members]) => ({ title, options: members }))
}
