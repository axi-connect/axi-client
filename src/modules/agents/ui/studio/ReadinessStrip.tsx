"use client";

import {
  ArrowRight,
  ChevronDown,
  CircleCheck,
  ClipboardList,
  EyeOff,
  Lightbulb,
  Loader2,
  Search,
  Sparkles,
  TriangleAlert,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";

import { errorMessage } from "@/core/lib/error-messages";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import {
  enrichRequestedText,
  readinessCopy,
  readinessHeadline,
  type ReadinessCode,
  type ReadinessFindingDTO,
  type RuleLocation,
} from "@/modules/agents/domain/readiness";
import { requestEnrichmentBackfill } from "@/modules/agents/infrastructure/services/recognition-service.adapter";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Button } from "@/shared/components/ui/button";

const ICONS: Record<ReadinessCode, LucideIcon> = {
  delivery_without_zones: Truck,
  sales_without_payment_methods: Wallet,
  orders_stuck_on_form: ClipboardList,
  catalog_not_enriched: Search,
  prompt_hides_facts: EyeOff,
};

/** Cuánto dura el resaltado de la regla a la que se baja. */
const RULE_FLASH_MS = 2600;
const FLASH_CLASSES = ["ring-2", "ring-warning", "rounded-lg"];

/**
 * Baja a la regla que pide esconder datos y la resalta. Las listas del brief
 * llevan `data-rule-list` (RulesPanel); la regla se busca por su frase —la
 * posición del servidor es la de lo GUARDADO y el dueño pudo reordenar sin
 * guardar— y, si no aparece, por esa posición.
 */
function revealRule(location: RuleLocation | undefined, phrase: string) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const behavior: ScrollBehavior = reduced ? "auto" : "smooth";
  if (location === undefined) return;
  if (location.field === "goal" || location.field === "system_prompt") {
    const field = document.getElementById(location.field === "goal" ? "studio-goal" : "studio-prompt");
    field?.scrollIntoView({ behavior, block: "center" });
    field?.focus({ preventScroll: true });
    return;
  }
  const items = Array.from(document.querySelectorAll<HTMLLIElement>(`[data-rule-list="${location.field}"] li`));
  const needle = phrase.toLocaleLowerCase("es-CO");
  const item =
    items.find((li) => (li.textContent ?? "").toLocaleLowerCase("es-CO").includes(needle)) ??
    items[location.index ?? -1];
  if (item === undefined) return;
  item.scrollIntoView({ behavior, block: "center" });
  item.classList.add(...FLASH_CLASSES);
  item.querySelector<HTMLButtonElement>('button[aria-label^="Editar la regla"]')?.focus({ preventScroll: true });
  window.setTimeout(() => item.classList.remove(...FLASH_CLASSES), RULE_FLASH_MS);
}

/**
 * «Salud del agente» (F11 partes críticas): una franja entre el encabezado y
 * el estudio, SOLO si hay algo que decir. Plegada es una línea; abierta, un
 * aviso por fila con UNA acción. Tonos de `ui/callout`: ámbar si algo frena
 * ventas, neutro si solo hay mejoras. Sin avisos no se pinta nada (el
 * encabezado muestra «Listo para vender»).
 */
export function ReadinessStrip({
  agentName,
  findings,
  onAllResolved,
}: {
  agentName: string;
  findings: ReadinessFindingDTO[];
  /** Se arregló aquí lo último que quedaba: el encabezado pasa a «Listo para vender». */
  onAllResolved?: () => void;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [requested, setRequested] = useState<ReadonlySet<ReadinessCode>>(new Set());
  const [busy, setBusy] = useState(false);
  const { hasPermission } = useAuth();
  const { showAlert } = useAlert();
  const canEnrich = hasPermission("catalog:manage");

  const pending = findings.filter((finding) => !requested.has(finding.code));
  const headline = readinessHeadline(agentName, pending);
  if (headline === null) return null;

  const enrich = async (finding: ReadinessFindingDTO) => {
    if (busy) return;
    setBusy(true);
    try {
      await requestEnrichmentBackfill();
      const next = new Set(requested).add(finding.code);
      setRequested(next);
      if (findings.every((item) => next.has(item.code))) onAllResolved?.();
    } catch (error) {
      showAlert({ tone: "error", title: errorMessage(error, "No pudimos pedir los sinónimos") });
    } finally {
      setBusy(false);
    }
  };

  const warn = headline.tone === "warn";
  const HeadIcon = warn ? TriangleAlert : Lightbulb;

  return (
    <section
      aria-label="Salud del agente"
      className={cn(
        "overflow-hidden rounded-2xl border",
        warn ? "border-warning/35 bg-warning/5" : "border-border bg-muted/40",
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2.5 px-3.5 py-[11px] text-left text-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <HeadIcon className={cn("size-4 shrink-0", warn ? "text-warning" : "text-muted-foreground")} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="font-semibold">{headline.title}</span>
          <span className="hidden text-[13px] text-muted-foreground sm:inline">{headline.sub}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium">
          {open ? "Ocultar" : "Ver"}
          <ChevronDown
            className={cn("size-[15px] transition-transform motion-reduce:transition-none", open && "rotate-180")}
            aria-hidden
          />
        </span>
      </button>

      <ul id={listId} hidden={!open} className="m-0 list-none border-t border-border/50 p-0">
        {findings.map((finding) => {
          if (requested.has(finding.code)) {
            return (
              <li
                key={finding.code}
                className="grid grid-cols-[18px_minmax(0,1fr)] gap-x-3 border-t border-border/50 px-3.5 py-3 first:border-t-0"
              >
                <CircleCheck className="mt-0.5 size-4 text-success" aria-hidden />
                <p className="text-sm">{enrichRequestedText(finding.params.count ?? 0)}</p>
              </li>
            );
          }
          const copy = readinessCopy(finding, { canEnrich });
          const Icon = ICONS[finding.code];
          const blocker = finding.severity === "blocker";
          return (
            <li
              key={finding.code}
              className="grid grid-cols-[18px_minmax(0,1fr)] items-start gap-x-3 gap-y-1 border-t border-border/50 px-3.5 py-3 first:border-t-0 sm:grid-cols-[18px_minmax(0,1fr)_auto]"
            >
              <Icon className={cn("mt-0.5 size-4", blocker ? "text-warning" : "text-muted-foreground")} aria-hidden />
              <p className="text-sm leading-snug font-medium">
                {copy.title}
                <span
                  className={cn(
                    "ml-1.5 inline-flex h-5 items-center rounded-full px-[7px] align-[1px] text-[11.5px] font-medium",
                    blocker ? "bg-warning/15 text-foreground" : "bg-secondary text-muted-foreground",
                  )}
                >
                  {blocker ? "Frena ventas" : "Mejora"}
                </span>
              </p>
              <p className="col-start-2 max-w-[72ch] text-[13px] leading-relaxed text-pretty text-muted-foreground">
                {copy.detail}
              </p>
              <div className="col-start-2 mt-1.5 sm:col-start-3 sm:row-span-2 sm:row-start-1 sm:mt-0 sm:self-center">
                {copy.action.kind === "link" ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={copy.action.href}>
                      {copy.action.label}
                      <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  </Button>
                ) : copy.action.kind === "enrich" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => void enrich(finding)}
                  >
                    {busy ? (
                      <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
                    ) : (
                      <Sparkles className="size-3.5" aria-hidden />
                    )}
                    {busy ? "Generando…" : copy.action.label}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => revealRule(finding.params.location, finding.params.phrase ?? "")}
                  >
                    {copy.action.label}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** La marca discreta del encabezado cuando nada frena ni hay mejoras. */
export function ReadyBadge() {
  return (
    <span
      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-[13px] font-medium"
      title="Nada frena sus ventas"
    >
      <span aria-hidden className="size-[7px] rounded-full bg-success" />
      Listo para vender
    </span>
  );
}
