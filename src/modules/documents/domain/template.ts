import type { Schemas } from "@/core/api/types";

/**
 * Dominio del slice `documents` (F7 Cobros): tipos como ALIAS del contrato
 * generado y las operaciones puras del editor de bloques.
 *
 * El cliente no tiene catálogos propios: tipos, bloques permitidos y variables
 * llegan por el wire (`GET /document-types`) y aquí solo se leen. Un espejo a
 * mano se desincroniza en las dos direcciones y las dos hacen daño (F5).
 */
export type DocumentTypesDTO = Schemas["DocumentTypesDto"];
export type DocumentTypeView = DocumentTypesDTO["types"][number];
export type BlockCatalogView = DocumentTypesDTO["block_catalog"][number];
export type TemplateVariableView = DocumentTypeView["variables"][number];
export type DocumentTemplateDTO = Schemas["DocumentTemplateDto"];
export type TemplateDocument = DocumentTemplateDTO["template"];
export type TemplateBlock = TemplateDocument["blocks"][number];
export type BlockType = TemplateBlock["type"];
export type WhenCondition = NonNullable<TemplateBlock["when"]>;
export type WhenPath = WhenCondition["path"];
export type DocumentsSettingsDTO = Schemas["DocumentsSettingsDto"];
export type UpdateDocumentsSettingsDTO = Schemas["UpdateDocumentsSettingsDto"];
export type DocumentPreviewDTO = Schemas["DocumentPreviewDto"];

/** Lo que el servidor admite para condicionar un bloque, con su lectura humana. */
export const WHEN_PATH_LABELS: Record<WhenPath, string> = {
  counterparty: "hay cliente",
  commerce: "hay pedido o venta",
  "commerce.service_date": "hay fecha del servicio",
  "commerce.valid_until": "hay fecha de validez",
  fx: "hay conversión de moneda",
  schedule: "hay plan de pagos",
  payment: "hay un pago",
  payments: "hay pagos registrados",
  "issuer.logo": "el negocio tiene logo",
};

/**
 * TODO lo que va entre `{{ }}`, calce o no el formato de una variable (QA
 * real de F7): «{{Cliente}}», «{{cliente.mascota}}» o «{{ }}» no son
 * variables, pero quien las escribió creyó que sí, y si no se le dice antes
 * de guardar salen tal cual en la hoja. El servidor juzga con el mismo patrón.
 */
const VARIABLE_HOLE_PATTERN = /\{\{([^{}]*)\}\}/g;

/** Los textos con variables que lleva un bloque, en orden. */
export function blockTexts(block: TemplateBlock): string[] {
  switch (block.type) {
    case "heading":
    case "paragraph":
    case "page_footer":
      return [block.text];
    case "clauses":
      return block.items.flatMap((item) =>
        item.title === null ? [item.body] : [item.title, item.body],
      );
    case "key_values":
      return block.pairs.flatMap((pair) => [pair.label, pair.value]);
    case "parties":
    case "signatures":
      return [block.issuer_label, block.counterparty_label];
    case "line_items_table":
    case "totals":
    case "schedule_table":
    case "payment_summary":
    case "image":
    case "legal_notice":
    case "divider":
    case "spacer":
      return [];
  }
}

export function extractVariableNames(text: string): string[] {
  const names: string[] = [];
  for (const match of text.matchAll(VARIABLE_HOLE_PATTERN)) {
    const name = (match[1] ?? "").trim();
    if (!names.includes(name)) names.push(name);
  }
  return names;
}

/**
 * Variables que la plantilla usa y este tipo NO tiene, sin repetir. La lista
 * de disponibles viene del servidor; el cliente no sabe qué existe.
 */
export function unknownTemplateVariables(
  template: TemplateDocument,
  available: readonly TemplateVariableView[],
): string[] {
  const known = new Set(available.map((variable) => variable.name));
  const unknown: string[] = [];
  for (const block of template.blocks) {
    for (const text of blockTexts(block)) {
      for (const name of extractVariableNames(text)) {
        const shown = name === "" ? "{{ }}" : name;
        if (!known.has(name) && !unknown.includes(shown)) unknown.push(shown);
      }
    }
  }
  return unknown;
}

export interface CautionedVariable {
  name: string;
  reason: string;
  use_instead: string;
}

/**
 * Variables válidas que la plantilla usa y que el servidor marca con cautela
 * (QA real R3-05: `deposit_amount` sale vacío sin anticipo, `installments_count`
 * dice «1 cuotas»). La cautela viaja en el catálogo: el cliente no sabe qué
 * variables son frágiles, solo lo pinta. No bloquea ni guardar ni la vista
 * previa: la frase puede ser correcta para este negocio.
 */
export function cautionedTemplateVariables(
  template: TemplateDocument,
  available: readonly TemplateVariableView[],
): CautionedVariable[] {
  const byName = new Map(
    available.map((variable) => [variable.name, variable]),
  );
  const found: CautionedVariable[] = [];
  for (const block of template.blocks) {
    for (const text of blockTexts(block)) {
      for (const name of extractVariableNames(text)) {
        const caution = byName.get(name)?.caution;
        if (caution && !found.some((one) => one.name === name)) {
          found.push({ name, ...caution });
        }
      }
    }
  }
  return found;
}

/** Huella estable de la plantilla: si no cambia, la vista previa no se pide. */
export function templateHash(template: TemplateDocument): string {
  return JSON.stringify(template);
}

/* ───────── Operaciones del editor (puras) ───────── */

export function moveBlock(
  template: TemplateDocument,
  id: string,
  direction: -1 | 1,
): TemplateDocument {
  const index = template.blocks.findIndex((block) => block.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= template.blocks.length)
    return template;
  const blocks = [...template.blocks];
  const [moved] = blocks.splice(index, 1);
  if (moved === undefined) return template;
  blocks.splice(target, 0, moved);
  return { ...template, blocks };
}

/** Mover el bloque 12 a la posición 2 no pueden ser diez clics: al principio o al final de una vez. */
export function moveBlockToEdge(
  template: TemplateDocument,
  id: string,
  edge: "start" | "end",
): TemplateDocument {
  const block = template.blocks.find((row) => row.id === id);
  if (block === undefined) return template;
  const rest = template.blocks.filter((row) => row.id !== id);
  return {
    ...template,
    blocks: edge === "start" ? [block, ...rest] : [...rest, block],
  };
}

export function removeBlock(
  template: TemplateDocument,
  id: string,
): TemplateDocument {
  return {
    ...template,
    blocks: template.blocks.filter((block) => block.id !== id),
  };
}

export function updateBlock(
  template: TemplateDocument,
  next: TemplateBlock,
): TemplateDocument {
  return {
    ...template,
    blocks: template.blocks.map((block) =>
      block.id === next.id ? next : block,
    ),
  };
}

export function appendBlock(
  template: TemplateDocument,
  block: TemplateBlock,
): TemplateDocument {
  return { ...template, blocks: [...template.blocks, block] };
}

/** Id estable y legible: `paragraph_k3f9a`. Único dentro de la plantilla. */
export function newBlockId(
  type: BlockType,
  existing: readonly TemplateBlock[],
): string {
  const taken = new Set(existing.map((block) => block.id));
  for (;;) {
    const id = `${type}_${Math.random().toString(36).slice(2, 7)}`;
    if (!taken.has(id)) return id;
  }
}

/** El bloque vacío de cada tipo, tal como lo añade la paleta. */
export function newBlock(type: BlockType, id: string): TemplateBlock {
  switch (type) {
    case "heading":
      return { id, type, text: "Título" };
    case "paragraph":
      return { id, type, text: "" };
    case "clauses":
      return { id, type, numbered: true, items: [{ title: null, body: "" }] };
    case "key_values":
      return { id, type, pairs: [{ label: "", value: "" }] };
    case "parties":
      return {
        id,
        type,
        show: "both",
        issuer_label: "Emite",
        counterparty_label: "Para",
      };
    case "line_items_table":
      return { id, type, show_quantity: true, show_unit_price: true };
    case "totals":
      return { id, type, show_dual_currency: true };
    case "schedule_table":
      return { id, type, show_paid: true };
    case "payment_summary":
      return { id, type };
    case "signatures":
      return {
        id,
        type,
        issuer_label: "Por el negocio",
        counterparty_label: "El cliente",
        show_date: true,
      };
    case "image":
      return { id, type, source: "issuer_logo", align: "left" };
    case "legal_notice":
      return { id, type };
    case "page_footer":
      return {
        id,
        type,
        text: "{{company_name}} · {{company_address}} {{company_city}} · {{company_phone}}",
      };
    case "divider":
      return { id, type };
    case "spacer":
      return { id, type, size: "md" };
  }
}

/** Una línea de lo que dice el bloque, para la fila del índice. */
export function blockSummary(block: TemplateBlock): string {
  switch (block.type) {
    case "heading":
    case "paragraph":
    case "page_footer":
      return block.text;
    case "clauses":
      return `${String(block.items.length)} ${block.items.length === 1 ? "cláusula" : "cláusulas"}${
        block.items.length > 0
          ? " · " +
            block.items.map((item) => item.title ?? "Sin título").join(", ")
          : ""
      }`;
    case "key_values":
      return block.pairs
        .map((pair) => pair.label)
        .filter((label) => label !== "")
        .join(" · ");
    case "parties":
      return block.show === "both"
        ? `${block.issuer_label} · ${block.counterparty_label}`
        : block.show === "issuer"
          ? block.issuer_label
          : block.counterparty_label;
    case "line_items_table":
      return [
        "Descripción",
        block.show_quantity ? "Cant." : null,
        block.show_unit_price ? "Precio unitario" : null,
        "Total",
      ]
        .filter((column) => column !== null)
        .join(" · ");
    case "totals":
      return block.show_dual_currency
        ? "Total · con la moneda de origen si la hay"
        : "Total";
    case "schedule_table":
      return block.show_paid
        ? "N.º · Concepto · Vence · Valor · Pagado · Estado"
        : "N.º · Concepto · Vence · Valor · Estado";
    case "payment_summary":
      return "Valor · Fecha · Medio · Referencia · Saldo después";
    case "signatures":
      return `${block.issuer_label} · ${block.counterparty_label}${block.show_date ? " · con fecha" : ""}`;
    case "image":
      return `El isotipo del negocio, ${block.align === "left" ? "a la izquierda" : block.align === "center" ? "centrado" : "a la derecha"}`;
    case "legal_notice":
      return "Texto fijo del tipo de documento";
    case "divider":
      return "Una línea";
    case "spacer":
      return block.size === "sm"
        ? "Pequeño"
        : block.size === "md"
          ? "Mediano"
          : "Grande";
  }
}
