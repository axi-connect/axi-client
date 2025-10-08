"use client"

import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useTreeState } from "./hooks/use-tree-state"
import { Separator } from "@/components/ui/separator"
import type { TreeNode, TreeViewProps, VisibleNode } from "./types"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronRight, Folder, MoreVertical, Settings2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

function Indent({ depth }: { depth: number }) {
  return (
    <div aria-hidden className="flex items-stretch" style={{ width: depth * 16 }}>
      {Array.from({ length: depth }).map((_, i) => (
        <div key={i} className="w-4 border-l border-border/50" />
      ))}
    </div>
  )
}

function NodeRow<T>({
  item,
  selectedId,
  onSelect,
  onToggle,
  isLoading,
  renderLabel,
  renderDescription,
  getIcon,
  showPriority,
  renderActions,
  compact,
  styles,
  isOpen,
  index,
  setRef,
  onMove,
  showCounts,
}: {
  item: VisibleNode<T>
  selectedId?: string
  onSelect?: (n: TreeNode<T>) => void
  onToggle: (n: TreeNode<T>) => void
  isLoading: boolean
  renderLabel?: (n: TreeNode<T>) => React.ReactNode
  renderActions?: (n: TreeNode<T>) => React.ReactNode
  renderDescription?: (n: TreeNode<T>) => React.ReactNode
  getIcon?: (n: TreeNode<T>) => React.ReactNode
  showPriority?: boolean
  compact?: boolean
  styles?: Record<string, string>
  isOpen: boolean
  index: number
  setRef: (id: string, el: HTMLDivElement | null) => void
  onMove: (delta: number) => void
  showCounts?: boolean
}) {
  const open = isOpen
  const { node, depth } = item
  const hasChildren = !!node.children || !node.isLeaf
  const selected = selectedId === node.id

  return (
    <div
      role="treeitem"
      aria-level={depth + 1}
      aria-selected={selected}
      aria-expanded={hasChildren ? open : undefined}
      className={cn(
        "group relative flex items-center gap-2 rounded-md px-2 py-1.5 outline-none",
        selected ? "bg-accent text-foreground" : "hover:bg-accent/60",
        compact && "py-1",
        styles?.row
      )}
      ref={(el) => setRef(node.id, el)}
      onClick={(e) => {
        e.stopPropagation()
        onSelect?.(node)
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect?.(node)
        if (e.key === "ArrowRight" && hasChildren) onToggle(node)
        if (e.key === "ArrowLeft" && hasChildren) onToggle(node)
        if (e.key === "ArrowDown") onMove(1)
        if (e.key === "ArrowUp") onMove(-1)
      }}
    >
      <Indent depth={depth} />
      <button
        aria-label={hasChildren ? "Toggle" : "Empty"}
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded hover:bg-accent/50 cursor-pointer",
          !hasChildren && "opacity-0 pointer-events-none"
        )}
        onClick={(e) => {
          e.stopPropagation()
          if (hasChildren) onToggle(node)
        }}
      >
        <ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90")} />
      </button>
      {getIcon ? (
        <div className="h-4 w-4 flex items-center justify-center text-muted-foreground">{getIcon(node)}</div>
      ) : node.isLeaf ? (
        <div className="h-5 w-5 rounded-sm bg-muted" />
      ) : (
        <Folder className="h-4 w-4 text-muted-foreground" />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{renderLabel ? renderLabel(node) : node.label}</div>
        {renderDescription && (
          <div className="truncate text-xs text-muted-foreground">{renderDescription(node)}</div>
        )}
      </div>
      {node.isLeaf && showPriority && (
        <span 
          className={cn(
            "ml-2 text-white rounded-full border px-1.5 py-0.5 text-xs select-none",
            {
              low: "bg-gradient-to-r from-emerald-500 to-emerald-600",
              medium: "bg-gradient-to-r from-amber-500 to-amber-600",
              high: "bg-gradient-to-r from-red-500 to-red-600",
            }[node.meta?.priority || "low"]
          )}
        >
          {node.meta?.priority}
        </span>
      )}
      {!node.isLeaf && showCounts && typeof node.meta?.count === "number" && (
        <span className="ml-2 rounded-full border px-1.5 py-0.5 text-xs text-muted-foreground select-none">
          {node.meta.count}
        </span>
      )}
      {isLoading && <span className="text-xs text-muted-foreground">Cargando…</span>}
      <div className={cn("opacity-0 transition-opacity group-hover:opacity-100", (selected && node.isLeaf) && "opacity-100")}>{node.isLeaf ?renderActions?.(node) : null}</div>
    </div>
  )
}

export function TreeView<T>({
  data,
  mapToNode,
  initialExpanded,
  controlledExpanded,
  onExpandedChange,
  selectedId,
  onSelect,
  title,
  renderLabel,
  renderDescription,
  getIcon,
  showPriority,
  renderActions,
  showCounts,
  compact,
  search,
  onCreate,
  onEdit,
  onDelete,
  onExpandAll,
  onCollapseAll,
  onViewSettings,
  className,
  styles,
  loadChildren,
  header,
}: TreeViewProps<T>) {
  const roots = useMemo(() => data.map(mapToNode), [data, mapToNode])

  const { expanded, setExpanded, toggle, visible, isLoading } = useTreeState<T>({
    roots,
    initialExpanded,
    controlledExpanded,
    onExpandedChange,
    search,
    loadChildren,
  })

  const containerRef = useRef<HTMLDivElement | null>(null)
  const rows = visible

  // roving tabindex
  const [focusIndex, setFocusIndex] = useState(0)
  useEffect(() => {
    if (focusIndex > (rows.length - 1)) setFocusIndex(rows.length - 1)
  }, [rows.length, focusIndex])
  const nodeRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())
  const setNodeRef = (id: string, el: HTMLDivElement | null) => {
    nodeRefs.current.set(id, el)
  }
  useEffect(() => {
    const current = rows[focusIndex]
    if (current) nodeRefs.current.get(current.node.id)?.focus()
  }, [focusIndex, rows])

  // aria-live
  const [liveMessage, setLiveMessage] = useState("")

  const handleToggle = useCallback(
    (n: TreeNode<T>) => {
      const willOpen = !expanded.includes(n.id)
      setLiveMessage(willOpen ? `${n.label} expandido` : `${n.label} colapsado`)
      toggle(n)
    },
    [expanded, toggle]
  )

  // default actions menu
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [targetNode, setTargetNode] = useState<TreeNode<T> | undefined>()
  const [deleting, setDeleting] = useState(false)

  const requestDelete = (n: TreeNode<T>) => {
    setTargetNode(n)
    setConfirmOpen(true)
  }
  const confirmDelete = async () => {
    if (!targetNode) return
    try {
      setDeleting(true)
      await onDelete?.(targetNode)
      setLiveMessage(`${targetNode.label} eliminado`)
    } finally {
      setDeleting(false)
      setConfirmOpen(false)
      setTargetNode(undefined)
    }
  }

  const defaultActions = (n: TreeNode<T>) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onCreate && (
          <DropdownMenuItem onClick={() => { setTargetNode(n); setInputValue(""); setCreateOpen(true) }}>Crear</DropdownMenuItem>
        )}
        {onEdit && (
          <DropdownMenuItem onClick={() => { setTargetNode(n); setInputValue(n.label); setEditOpen(true) }}>Editar</DropdownMenuItem>
        )}
        {onDelete && (
          <DropdownMenuItem className="text-red-600" onClick={() => requestDelete(n)}>
            Eliminar
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          // expand all nodes (ids) a partir de roots
          const ids: string[] = []
          const visit = (n: TreeNode<T>) => {
            ids.push(n.id)
            const children = n.children
            if (children) children.forEach(visit)
          }
          roots.forEach(visit)
          setExpanded(ids)
          onExpandAll?.()
        }}
      >
        Expand all
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setExpanded([])
          onCollapseAll?.()
        }}
      >
        Collapse all
      </Button>
      <Button variant="outline" size="sm" onClick={() => onViewSettings?.()}>
        <Settings2 className="mr-1 h-4 w-4" /> View settings
      </Button>
    </div>
  )

  const headerNode = typeof header === "function"
    ? header({
        expandAll: () => {
          const ids: string[] = []
          const visit = (n: TreeNode<T>) => {
            ids.push(n.id)
            const children = n.children
            if (children) children.forEach(visit)
          }
          roots.forEach(visit)
          setExpanded(ids)
          onExpandAll?.()
        },
        collapseAll: () => {
          setExpanded([])
          onCollapseAll?.()
        },
        viewSettings: () => onViewSettings?.(),
      })
    : header

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="flex items-center justify-between px-2 py-2">
        <h3 className="text-base font-semibold">{title}</h3>
        {headerNode ?? headerActions}
      </div>
      <Separator />
      <div
        ref={containerRef}
        role="tree"
        aria-label="Tree"
        className={cn("relative min-h-0 flex-1 overflow-auto p-1")}
      >
          {rows.map((v, i) => (
              <NodeRow
                key={v.node.id}
                item={v}
                selectedId={selectedId}
                onSelect={(n) => onSelect?.(n)}
                onToggle={handleToggle}
                isLoading={isLoading(v.node.id)}
                renderLabel={renderLabel}
                renderDescription={renderDescription}
                getIcon={getIcon}
                showPriority={showPriority}
                renderActions={renderActions ?? defaultActions}
                compact={compact}
                styles={styles}
                isOpen={expanded.includes(v.node.id)}
                index={i}
                setRef={setNodeRef}
                onMove={(delta) => setFocusIndex((idx) => Math.max(0, Math.min(rows.length - 1, idx + delta)))}
                showCounts={showCounts}
              />
          ))}
      </div>

      {/* aria-live region */}
      <div className="sr-only" aria-live="polite" role="status">{liveMessage}</div>

      {/* Confirm delete dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar elemento</DialogTitle>
            <DialogDescription>
              ¿Seguro que deseas eliminar "{targetNode?.label}"? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={deleting}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>{deleting ? "Eliminando…" : "Eliminar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar elemento</DialogTitle>
            <DialogDescription>Actualiza el nombre del elemento.</DialogDescription>
          </DialogHeader>
          <div>
            <input
              className="w-full rounded border bg-background px-3 py-2 text-sm"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={async () => { if (targetNode) { await onEdit?.(targetNode, inputValue); setEditOpen(false); setLiveMessage(`${targetNode.label} actualizado`) } }}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear elemento</DialogTitle>
            <DialogDescription>Ingresa el nombre del nuevo elemento.</DialogDescription>
          </DialogHeader>
          <div>
            <input
              className="w-full rounded border bg-background px-3 py-2 text-sm"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={async () => { await onCreate?.(targetNode, inputValue); setCreateOpen(false); setLiveMessage(`Elemento creado`) }}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TreeView