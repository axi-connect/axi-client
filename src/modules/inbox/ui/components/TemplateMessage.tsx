"use client"

import { FileText } from "lucide-react"
import { cn } from "@/core/lib/utils"
import { readTemplatePieces, renderHsmPreview, TemplateMediaHeader, type HsmTemplateDTO } from "@/modules/marketing/public"
import type { SentTemplate } from "@/modules/inbox/domain/template-message"

/**
 * El contenido de una plantilla de Meta ya enviada (lienzo del hotfix del
 * 2026-09-29, artboards 1 y 2): el texto del catálogo con los datos con que
 * salió en negrita. Si la plantilla ya no está en el catálogo, se dice y se
 * muestran esos datos — nunca «(sin contenido)».
 *
 * `catalog`: `undefined` mientras carga, `null` si ya no está.
 */
export function TemplateContent({
  sent,
  catalog,
}: {
  sent: SentTemplate
  catalog: HsmTemplateDTO | null | undefined
}) {
  const pieces = catalog ? readTemplatePieces(catalog.components) : null
  const params = [...sent.headerParams, ...sent.bodyParams]

  return (
    <div>
      <p className="mb-1 flex items-center gap-1.5 text-[11px] opacity-75">
        <FileText aria-hidden className="size-3" />
        <span>Plantilla · {sent.name}</span>
      </p>

      {catalog === undefined ? (
        <span className="block py-1" aria-label="Cargando el texto de la plantilla">
          <span className="block h-3 w-56 max-w-full rounded bg-current opacity-15" />
          <span className="mt-1.5 block h-3 w-40 max-w-full rounded bg-current opacity-15" />
        </span>
      ) : catalog === null ? (
        <>
          <p className="opacity-80">Ya no está en tus plantillas de Meta: su texto no se puede mostrar.</p>
          {params.length > 0 ? (
            <>
              <p className="mt-1 text-xs opacity-80">Se envió con:</p>
              <ul className="mt-1 flex flex-wrap gap-1" aria-label="Datos con que se envió">
                {params.map((value, index) => (
                  <li key={index} className="rounded-full bg-current/15 px-2 py-0.5 text-[11px]">
                    <span className="text-inherit">{value}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-1 text-xs opacity-80">Se envió sin datos propios.</p>
          )}
        </>
      ) : (
        <>
          {sent.headerMedia || pieces?.headerIsMedia ? (
            // La de la plantilla (su copia de axi): es la que salió, salvo que se reemplazara después.
            <TemplateMediaHeader
              kind={pieces?.headerMedia?.kind ?? "image"}
              media={catalog.header_media}
              className="-mx-1 mb-2 w-[calc(100%+0.5rem)]"
            />
          ) : (
            pieces?.header && (
              <p className="mb-1 font-semibold">
                <Segments text={pieces.header} values={sent.headerParams} />
              </p>
            )
          )}
          <p className="whitespace-pre-wrap break-words">
            <Segments text={catalog.body} values={sent.bodyParams} />
          </p>
          {pieces?.footer && <p className="mt-1.5 text-[11px] opacity-65">{pieces.footer}</p>}
        </>
      )}
    </div>
  )
}

function Segments({ text, values }: { text: string; values: string[] }) {
  return (
    <>
      {renderHsmPreview(text, (index) => values[index - 1] ?? null).map((segment, index) =>
        segment.variable ? (
          <span key={index} className="font-semibold">
            {segment.text}
          </span>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  )
}

/** Los botones de la plantilla, debajo de la burbuja, como los ve el contacto. */
export function TemplateButtons({ catalog, muted }: { catalog: HsmTemplateDTO | null | undefined; muted: boolean }) {
  if (!catalog) return null
  const { buttons } = readTemplatePieces(catalog.components)
  if (buttons.length === 0) return null
  return (
    <ul className={cn("mt-1 flex w-full max-w-[min(75%,34rem)] flex-col gap-1", muted && "opacity-60")} aria-label="Botones de la plantilla">
      {buttons.map((button, index) => (
        <li
          key={index}
          className="flex h-8 items-center justify-center rounded-xl border border-border bg-card px-3 text-xs font-medium text-foreground"
        >
          {button.type === "copy_code" ? "Copiar código" : button.text}
        </li>
      ))}
    </ul>
  )
}
