"use client";

import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Database,
  GitBranch,
  Heading1,
  Image as ImageIcon,
  List,
  ListOrdered,
  Lock,
  Minus,
  MoveVertical,
  PanelBottom,
  PenLine,
  Receipt,
  Repeat,
  Scale,
  Sigma,
  Table,
  Text,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  WHEN_PATH_LABELS,
  blockSummary,
  type BlockCatalogView,
  type BlockType,
  type DocumentTypeView,
  type TemplateBlock,
  type TemplateVariableView,
} from "@/modules/documents/domain/template";
import { BlockEditor } from "./blocks/BlockEditor";

/** Icono por tipo de bloque. Exhaustivo: un tipo nuevo no compila sin icono. */
export const BLOCK_ICONS: Record<BlockType, LucideIcon> = {
  heading: Heading1,
  paragraph: Text,
  clauses: ListOrdered,
  key_values: List,
  parties: Users,
  line_items_table: Table,
  totals: Sigma,
  schedule_table: CalendarClock,
  payment_summary: Receipt,
  signatures: PenLine,
  image: ImageIcon,
  legal_notice: Scale,
  page_footer: PanelBottom,
  divider: Minus,
  spacer: MoveVertical,
};

/** Las variables de una plantilla, como el bloque las conoce. */
function unknownIn(block: TemplateBlock, unknown: readonly string[]): boolean {
  const json = JSON.stringify(block);
  return unknown.some(
    (name) =>
      json.includes(`{{${name}}}`) ||
      new RegExp(`\\{\\{\\s*${name}\\s*\\}\\}`).test(json),
  );
}

/**
 * Los bloques en el orden en que se imprimen: el ÍNDICE del papel. Cada fila
 * dice de qué depende («filas desde los datos», «solo si hay plan de pagos»)
 * en vez de esconderlo; los obligatorios llevan candado y no se quitan. Se
 * reordena con botones — sin arrastrar — y el que se está editando se
 * despliega bajo su fila.
 */
export function BlockList({
  blocks,
  type,
  catalog,
  variables,
  unknownVariables,
  openId,
  onOpen,
  onChange,
  onMove,
  onMoveToEdge,
  onRemove,
}: {
  blocks: readonly TemplateBlock[];
  type: DocumentTypeView;
  catalog: readonly BlockCatalogView[];
  variables: readonly TemplateVariableView[];
  unknownVariables: readonly string[];
  openId: string | null;
  onOpen: (id: string | null) => void;
  onChange: (next: TemplateBlock) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onMoveToEdge: (id: string, edge: "start" | "end") => void;
  onRemove: (id: string) => void;
}) {
  const contractOf = (blockType: BlockType) =>
    catalog.find((entry) => entry.type === blockType);
  const requiredCount = (blockType: BlockType) =>
    blocks.filter((block) => block.type === blockType).length;

  return (
    <ol className="overflow-hidden rounded-2xl border border-border bg-card">
      {blocks.map((block, index) => {
        const Icon = BLOCK_ICONS[block.type];
        const contract = contractOf(block.type);
        const isRequired =
          type.required_blocks.includes(block.type) &&
          requiredCount(block.type) === 1;
        const isOpen = openId === block.id;
        const hasUnknown = unknownIn(block, unknownVariables);
        const label = contract?.label ?? block.type;
        return (
          <li
            key={block.id}
            className={`relative grid grid-cols-[34px_minmax(0,1fr)_auto] items-start gap-3 px-3.5 py-3 ${
              index > 0
                ? "before:absolute before:left-[58px] before:right-0 before:top-0 before:h-px before:bg-border/60"
                : ""
            } ${isOpen ? "bg-secondary/50" : ""}`}
          >
            <span
              aria-hidden="true"
              className={`grid size-[34px] place-items-center rounded-[10px] ${
                hasUnknown
                  ? "bg-destructive/10 text-destructive"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              <Icon className="size-4" />
            </span>
            <div className="min-w-0">
              <button
                type="button"
                className="flex w-full flex-wrap items-center gap-2 text-left text-sm font-medium"
                aria-expanded={isOpen}
                aria-controls={`block-editor-${block.id}`}
                onClick={() => onOpen(isOpen ? null : block.id)}
              >
                {label}
              </button>
              {!isOpen && blockSummary(block) !== "" && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {blockSummary(block)}
                </p>
              )}
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {contract?.repeat === "data" && (
                  <Tag tone="info" icon={Database}>
                    filas desde los datos
                  </Tag>
                )}
                {contract?.consumes.includes("schedule") && (
                  <Tag tone="warn" icon={GitBranch}>
                    solo si hay plan de pagos
                  </Tag>
                )}
                {block.type === "totals" && block.show_dual_currency && (
                  <Tag tone="warn" icon={GitBranch}>
                    con conversión si la hay
                  </Tag>
                )}
                {"when" in block && block.when != null && (
                  <Tag tone="warn" icon={GitBranch}>
                    solo si {block.when.is === "absent" ? "NO " : ""}
                    {WHEN_PATH_LABELS[block.when.path]}
                  </Tag>
                )}
                {block.type === "page_footer" && (
                  <Tag tone="neutral" icon={Repeat}>
                    se repite en cada página
                  </Tag>
                )}
                {contract !== undefined && !contract.editable && (
                  <Tag tone="neutral" icon={Lock}>
                    texto fijo del tipo
                  </Tag>
                )}
                {isRequired && (
                  <Tag tone="outline" icon={Lock}>
                    obligatorio en {type.label.toLowerCase()}
                  </Tag>
                )}
              </div>
              {isOpen && (
                <div
                  id={`block-editor-${block.id}`}
                  className="mt-3 flex flex-col gap-3"
                >
                  <BlockEditor
                    block={block}
                    variables={variables}
                    onChange={onChange}
                  />
                  {blocks.length > 2 && (
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground"
                        disabled={index === 0}
                        onClick={() => onMoveToEdge(block.id, "start")}
                      >
                        Mover al principio
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground"
                        disabled={index === blocks.length - 1}
                        onClick={() => onMoveToEdge(block.id, "end")}
                      >
                        Mover al final
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                aria-label={`Subir el bloque ${label} ${String(index + 1)}`}
                disabled={index === 0}
                onClick={() => onMove(block.id, -1)}
              >
                <ChevronUp aria-hidden="true" className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                aria-label={`Bajar el bloque ${label} ${String(index + 1)}`}
                disabled={index === blocks.length - 1}
                onClick={() => onMove(block.id, 1)}
              >
                <ChevronDown aria-hidden="true" className="size-4" />
              </Button>
              {!isRequired && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground"
                  aria-label={`Quitar el bloque ${label} ${String(index + 1)}`}
                  onClick={() => onRemove(block.id)}
                >
                  <X aria-hidden="true" className="size-4" />
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Tag({
  tone,
  icon: Icon,
  children,
}: {
  tone: "info" | "warn" | "neutral" | "outline";
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  const classes = {
    info: "bg-info/10 text-info",
    warn: "bg-warning/15 text-warning",
    neutral: "bg-secondary text-muted-foreground",
    outline: "border border-dashed border-border text-muted-foreground",
  }[tone];
  return (
    <span
      className={`inline-flex h-[22px] items-center gap-1 rounded-full px-2 text-[11.5px] ${classes}`}
    >
      <Icon aria-hidden="true" className="size-[11px]" />
      {children}
    </span>
  );
}
