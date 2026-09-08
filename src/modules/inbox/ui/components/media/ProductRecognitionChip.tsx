"use client"

import { Receipt, ScanSearch } from "lucide-react"
import { cn } from "@/core/lib/utils"
import type { ProductRecognition } from "@/modules/inbox/domain/inbox"

/** Ventana en la que una foto sin análisis todavía puede estar «analizándose»
 * (la barrera del turno espera 10 s; aquí se da margen para la cola). */
const ANALYZING_WINDOW_MS = 20_000

const CONFIDENCE_LABEL: Record<"high" | "medium" | "low", string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
}

/**
 * Análisis de la foto bajo la imagen entrante (reconocimiento de producto),
 * simétrico a la transcripción bajo el audio. Estados:
 * - sin `recognition` y foto reciente → «Analizando la foto…» (pulso).
 * - `done` producto/captura → descripción + hasta tres coincidencias con
 *   similitud y confianza; sin coincidencias, lo dice.
 * - `done` comprobante → se etiqueta como comprobante (report_payment lo toma).
 * - `skipped` / `failed` / `other` sin descripción → no renderiza nada.
 *
 * Es lectura para el operador: los precios vienen ya formateados del backend
 * como centavos y aquí se pintan en es-CO; nadie edita nada desde aquí.
 */
export function ProductRecognitionChip({
  recognition,
  createdAt,
  subject = "foto",
}: {
  recognition: ProductRecognition | null
  createdAt: string
  /** «reel» cuando lo analizado es el fotograma de un reel compartido. */
  subject?: "foto" | "reel"
}) {
  if (recognition === null) {
    const ageMs = Date.now() - new Date(createdAt).getTime()
    if (Number.isNaN(ageMs) || ageMs > ANALYZING_WINDOW_MS) return null
    const label = subject === "reel" ? "Analizando el reel" : "Analizando la foto"
    return (
      <div
        className="flex w-fit items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground"
        role="status"
        aria-label={label}
      >
        <ScanSearch className="size-3 shrink-0 animate-pulse text-accent-violet" aria-hidden />
        <span className="animate-pulse">{label}…</span>
      </div>
    )
  }

  if (recognition.status !== "done" || !recognition.description) return null

  if (recognition.kind === "receipt") {
    return (
      <div className="w-full max-w-xs rounded-xl border border-border bg-background text-xs">
        <Header icon={<Receipt className="size-3 text-accent-violet" aria-hidden />} label="Comprobante de pago" />
        <p className="px-2.5 pb-2 pt-1.5 text-foreground">{recognition.description}</p>
      </div>
    )
  }

  if (recognition.kind !== "product" && recognition.kind !== "screenshot_of_post") return null

  const candidates = (recognition.candidates ?? []).slice(0, 3)
  return (
    <div className="w-full max-w-xs rounded-xl border border-border bg-background text-xs">
      <Header icon={<ScanSearch className="size-3 text-accent-violet" aria-hidden />} label="Producto reconocido" />
      <p className="px-2.5 pb-1 pt-1.5 text-foreground">{recognition.description}</p>
      {candidates.length === 0 ? (
        <p className="border-t border-border/60 px-2.5 py-1.5 text-muted-foreground">
          Sin coincidencias en el catálogo. El agente pide la referencia.
        </p>
      ) : (
        <ol className="flex flex-col gap-0.5 px-1.5 pb-2 pt-1">
          {candidates.map((candidate) => {
            const pct = Math.round(Math.max(0, Math.min(1, candidate.score)) * 100)
            return (
              <li key={candidate.product_id} className="grid grid-cols-[1fr_auto] items-center gap-x-2.5 gap-y-1 rounded-lg px-1.5 py-1.5">
                <span className="font-medium text-foreground">
                  {candidate.name}
                  <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">{candidate.sku}</span>
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {formatPrice(candidate.price_cents, candidate.currency)}
                </span>
                <div className="col-span-2 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div className="h-full rounded-full bg-accent-violet" style={{ width: `${String(pct)}%` }} />
                  </div>
                  {/* Estado en Badge neutro + punto de color: el tinte al 10 % con
                      texto del mismo color no pasa AA en claro (verde 2,9:1). */}
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-secondary px-1.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground"
                    aria-label={`Confianza ${CONFIDENCE_LABEL[candidate.confidence].toLowerCase()}, similitud ${String(pct)} %`}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        candidate.confidence === "high" && "bg-success",
                        candidate.confidence === "medium" && "bg-warning",
                        candidate.confidence === "low" && "bg-muted-foreground",
                      )}
                      aria-hidden
                    />
                    {CONFIDENCE_LABEL[candidate.confidence]} · {(pct / 100).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    {candidate.available ? "" : " · agotado"}
                  </span>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

function Header({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 border-b border-border/60 px-2.5 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
      {icon}
      <span>{label}</span>
    </div>
  )
}

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}
