"use client";

import { useRef } from "react";
import { ChevronRight, Eye, EyeOff, Pencil, Plus, Sparkles, Store, Tag, Trash2 } from "lucide-react";
import { cn } from "@/core/lib/utils";
import {
  CATEGORY_ORIGIN_LABELS,
  isTaxonomyCategory,
  MAX_CATEGORY_DEPTH,
  type CategoryTreeNodeDTO,
} from "@/modules/catalog/domain/category";

type Row = { node: CategoryTreeNodeDTO; depth: number; hasChildren: boolean; open: boolean };

function visibleRows(nodes: CategoryTreeNodeDTO[], expanded: ReadonlySet<string>, depth = 0): Row[] {
  return nodes.flatMap((node) => {
    const children = (node.children ?? []) as CategoryTreeNodeDTO[];
    const open = expanded.has(node.id);
    const row: Row = { node, depth, hasChildren: children.length > 0, open };
    return open ? [row, ...visibleRows(children, expanded, depth + 1)] : [row];
  });
}

/** Origen: el icono y su nombre (también en la leyenda). Las de la tienda ya no parecen propias (D.1 #23). */
export function CategoryOriginIcon({ node, className }: { node: CategoryTreeNodeDTO; className?: string }) {
  if (!node.is_active) return <EyeOff role="img" aria-label="Oculta" className={cn("text-muted-foreground", className)} />;
  if (node.origin === "platform")
    return <Sparkles role="img" aria-label={CATEGORY_ORIGIN_LABELS.platform} className={cn("text-accent-violet", className)} />;
  if (node.origin === "integration")
    return <Store role="img" aria-label={CATEGORY_ORIGIN_LABELS.integration} className={cn("text-foreground/70", className)} />;
  return <Tag role="img" aria-label={CATEGORY_ORIGIN_LABELS.tenant} className={cn("text-foreground/70", className)} />;
}

const ACTION = "flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring";

/**
 * El árbol de categorías (catálogo premium F4, canvas tablero 8). Una fila por
 * categoría: origen, nombre, sinónimos, productos que la usan y las acciones EN
 * la fila (antes solo aparecían al pasar el ratón). Es un `role="tree"` con
 * foco itinerante: ↑/↓ recorren, → despliega, ← pliega; las acciones de la fila
 * se alcanzan con Tab.
 */
export function CategoryTree({
  nodes,
  expanded,
  onToggle,
  canManage,
  onCreateChild,
  onEdit,
  onRemove,
  onShow,
}: {
  nodes: CategoryTreeNodeDTO[];
  expanded: ReadonlySet<string>;
  onToggle: (id: string) => void;
  canManage: boolean;
  onCreateChild: (node: CategoryTreeNodeDTO) => void;
  onEdit: (node: CategoryTreeNodeDTO) => void;
  /** Ocultar (taxonomía) o eliminar (propia o de la tienda). */
  onRemove: (node: CategoryTreeNodeDTO) => void;
  /** Volver a mostrar una oculta. */
  onShow: (node: CategoryTreeNodeDTO) => void;
}) {
  const rows = visibleRows(nodes, expanded);
  const refs = useRef(new Map<string, HTMLLIElement>());

  const focusRow = (index: number) => {
    const row = rows[Math.max(0, Math.min(rows.length - 1, index))];
    if (row) refs.current.get(row.node.id)?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLLIElement>, index: number, row: Row) => {
    if (event.target !== event.currentTarget) return; // las teclas de un botón de la fila son del botón
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusRow(index + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusRow(index - 1);
    } else if (event.key === "ArrowRight" && row.hasChildren && !row.open) {
      event.preventDefault();
      onToggle(row.node.id);
    } else if (event.key === "ArrowLeft" && row.hasChildren && row.open) {
      event.preventDefault();
      onToggle(row.node.id);
    }
  };

  return (
    <ul role="tree" aria-label="Categorías" className="flex flex-col">
      {rows.map((row, index) => {
        const { node } = row;
        const aliases = node.search_aliases;
        const count = node.product_count;
        const countLabel = count === 1 ? "1 producto" : `${count.toLocaleString("es-CO")} productos`;
        return (
          <li
            key={node.id}
            ref={(element) => {
              if (element) refs.current.set(node.id, element);
              else refs.current.delete(node.id);
            }}
            role="treeitem"
            aria-level={row.depth + 1}
            aria-expanded={row.hasChildren ? row.open : undefined}
            // Árbol de navegación, no de selección: ningún nodo queda «elegido».
            aria-selected={false}
            aria-label={node.name}
            tabIndex={index === 0 ? 0 : -1}
            onKeyDown={(event) => onKeyDown(event, index, row)}
            className="group flex min-h-12 min-w-0 items-center gap-2 rounded-xl px-2 outline-none hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
          >
            {/* Sangría: 1 rem por nivel en el celular, 1,5 rem desde `sm`. */}
            <span aria-hidden="true" className="w-[calc(var(--depth)*1rem)] shrink-0 sm:w-[calc(var(--depth)*1.5rem)]" style={{ "--depth": row.depth } as React.CSSProperties} />
            {row.hasChildren ? (
              <button
                type="button"
                tabIndex={-1}
                onClick={() => onToggle(node.id)}
                aria-label={`${row.open ? "Contraer" : "Expandir"} ${node.name}`}
                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ChevronRight aria-hidden="true" className={cn("size-3.5 transition-transform duration-200", row.open && "rotate-90")} />
              </button>
            ) : (
              <span aria-hidden="true" className="size-7 shrink-0" />
            )}
            <CategoryOriginIcon node={node} className="size-4 shrink-0" />
            {/* En el celular el conteo va bajo el nombre: el nombre no se queda en «Cuid…». */}
            <span className="flex min-w-0 flex-1 flex-col sm:flex-initial">
              <span
                className={cn("truncate text-sm", row.depth === 0 && "font-semibold", !node.is_active && "text-muted-foreground")}
                title={node.name}
              >
                {node.name}
                {!node.is_active ? <span className="font-normal"> · oculta</span> : null}
              </span>
              <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums sm:hidden">{countLabel}</span>
            </span>
            {/* Sinónimos: los primeros 3 y «+N»; en el celular no caben y viven en Editar. */}
            <span className="hidden min-w-0 flex-1 items-center gap-1 overflow-hidden sm:flex" aria-label="Sinónimos">
              {aliases.slice(0, 3).map((alias) => (
                <span key={alias} className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground/80">
                  {alias}
                </span>
              ))}
              {aliases.length > 3 ? <span className="shrink-0 text-[11px] text-muted-foreground">+{aliases.length - 3}</span> : null}
            </span>
            <span className="hidden w-24 shrink-0 text-right text-xs whitespace-nowrap text-muted-foreground tabular-nums sm:block">
              {countLabel}
            </span>
            {canManage ? (
              <span className="flex shrink-0 items-center">
                {row.depth + 1 < MAX_CATEGORY_DEPTH ? (
                  <button type="button" className={ACTION} aria-label={`Crear subcategoría en ${node.name}`} onClick={() => onCreateChild(node)}>
                    <Plus aria-hidden="true" className="size-4" />
                  </button>
                ) : (
                  <span aria-hidden="true" className="size-8" />
                )}
                <button type="button" className={ACTION} aria-label={`Editar ${node.name}`} onClick={() => onEdit(node)}>
                  <Pencil aria-hidden="true" className="size-4" />
                </button>
                {!node.is_active ? (
                  <button type="button" className={ACTION} aria-label={`Mostrar ${node.name}`} onClick={() => onShow(node)}>
                    <Eye aria-hidden="true" className="size-4" />
                  </button>
                ) : isTaxonomyCategory(node) ? (
                  <button type="button" className={ACTION} aria-label={`Ocultar ${node.name}`} onClick={() => onRemove(node)}>
                    <EyeOff aria-hidden="true" className="size-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    className={cn(ACTION, "text-destructive hover:text-destructive")}
                    aria-label={`Eliminar ${node.name}`}
                    onClick={() => onRemove(node)}
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </button>
                )}
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
