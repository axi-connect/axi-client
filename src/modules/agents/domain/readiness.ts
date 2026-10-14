import type { Schemas } from "@/core/api/types";

/**
 * «Salud del agente» (F11 del hotfix de partes críticas): lo que la
 * configuración del negocio le impide vender al agente.
 *
 * El servidor decide QUÉ pasa con reglas fijas (`GET /ai-agents/:id/readiness`)
 * y manda código + datos; aquí vive CÓMO se dice y dónde se arregla. Un aviso
 * arreglado desaparece en la siguiente lectura: no hay nada que descartar.
 */
export type ReadinessFindingDTO = Schemas["AgentReadinessDto"]["findings"][number];
export type ReadinessCode = ReadinessFindingDTO["code"];
export type ReadinessSummaryDTO = Schemas["AgentReadinessSummaryDto"]["data"][number];
export type RuleLocation = NonNullable<ReadinessFindingDTO["params"]["location"]>;

/**
 * La única acción de cada aviso:
 * - `link`: la pantalla donde se arregla;
 * - `enrich`: «Enriquecer catálogo», aquí mismo (pide `catalog:manage`);
 * - `rule`: baja a la regla culpable en este mismo estudio.
 */
export type ReadinessAction =
  { kind: "link"; label: string; href: string } | { kind: "enrich"; label: string } | { kind: "rule"; label: string };

export interface ReadinessCopy {
  title: string;
  detail: string;
  action: ReadinessAction;
}

const plural = (count: number, one: string, many: string) =>
  `${count.toLocaleString("es-CO")} ${count === 1 ? one : many}`;

/** Sin permiso de catálogo, el arreglo es ir a la pantalla del enriquecimiento. */
export const ENRICHMENT_SETTINGS_HREF = "/settings/recognition";

export function readinessCopy(finding: ReadinessFindingDTO, options: { canEnrich: boolean }): ReadinessCopy {
  const { count = 0, misses = 0, phrase = "" } = finding.params;
  switch (finding.code) {
    case "delivery_without_zones":
      return {
        title: "Ofrece envíos pero no puede cotizarlos",
        detail:
          "Tus reglas o tus políticas hablan de envíos y no hay zonas de envío activas para el agente: no puede decir cuánto cuesta ni si llega a la ciudad del cliente.",
        action: { kind: "link", label: "Configurar envíos", href: "/settings/shipping" },
      };
    case "branches_missing":
      return {
        title: "Menciona sedes que no están registradas",
        detail:
          "Tus reglas o tus políticas hablan de puntos de venta o de recoger en tienda, y no hay sedes registradas: el agente no tiene direcciones reales que dar.",
        action: { kind: "link", label: "Registrar sedes", href: "/settings/company/sucursales" },
      };
    case "sales_without_payment_methods":
      return {
        title: "Toma pedidos pero no tiene medios de pago",
        detail: "Cuando el cliente pregunte cómo pagar, no tendrá qué responderle.",
        action: { kind: "link", label: "Agregar medios de pago", href: "/settings/payments" },
      };
    case "orders_stuck_on_form":
      return {
        title: `${plural(count, "pedido no se creó", "pedidos no se crearon")} esta semana`,
        detail:
          "Faltaban datos obligatorios del formulario de pedido. Revisa si todos hacen falta para vender o si alguno puede ser opcional.",
        action: { kind: "link", label: "Revisar el formulario", href: "/settings/forms" },
      };
    case "catalog_not_enriched":
      return {
        title: `${plural(count, "producto", "productos")} sin sinónimos de búsqueda`,
        detail:
          "Si el cliente lo pide con otras palabras («forro», «hot dog»), el agente no lo encuentra." +
          (misses > 0 ? ` Esta semana no encontró lo que buscaban ${plural(misses, "vez", "veces")}.` : ""),
        action: options.canEnrich
          ? { kind: "enrich", label: "Generar sinónimos" }
          : { kind: "link", label: "Ir a Reconocimiento", href: ENRICHMENT_SETTINGS_HREF },
      };
    case "prompt_hides_facts":
      return {
        title: "Una regla le pide esconder datos que ya tiene",
        detail: `«${phrase}» lo empuja a inventar o a evadir. El agente ya sabe cuántas unidades quedan: quita esa parte de la regla.`,
        action: { kind: "rule", label: "Ver la regla" },
      };
  }
}

/** Lo que dice el aviso una vez pedido el enriquecimiento. */
export function enrichRequestedText(count: number): string {
  return `Listo: generando sinónimos para ${plural(count, "producto", "productos")}. Tarda unos minutos y no tienes que esperar aquí.`;
}

export interface ReadinessHeadline {
  /** `warn` si algo frena ventas; si solo hay mejoras, tono neutro. */
  tone: "warn" | "neutral";
  title: string;
  /** « · 2 mejoras» cuando además de lo que frena hay mejoras. */
  sub: string;
}

/** La línea de la franja plegada. `null` = nada que avisar (no hay franja). */
export function readinessHeadline(
  agentName: string,
  findings: readonly Pick<ReadinessFindingDTO, "severity">[],
): ReadinessHeadline | null {
  if (findings.length === 0) return null;
  const blockers = findings.filter((finding) => finding.severity === "blocker").length;
  const improvements = findings.length - blockers;
  if (blockers > 0) {
    return {
      tone: "warn",
      title: `${plural(blockers, "cosa frena", "cosas frenan")} las ventas de ${agentName}`,
      sub: improvements > 0 ? ` · ${plural(improvements, "mejora", "mejoras")}` : "",
    };
  }
  return { tone: "neutral", title: `${plural(improvements, "mejora", "mejoras")} para ${agentName}`, sub: "" };
}

/** La pastilla de la rejilla: solo lo que frena ventas llega ahí. */
export function blockersChipLabel(blockers: number): string | null {
  if (blockers <= 0) return null;
  return blockers === 1 ? "1 frena ventas" : `${String(blockers)} frenan ventas`;
}
