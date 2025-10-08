"use client"

import type { TreeNode, VisibleNode } from "../types"
import { useCallback, useMemo, useRef, useState } from "react"

type UseTreeStateParams<T> = {
  roots: TreeNode<T>[]
  initialExpanded?: string[]
  controlledExpanded?: string[]
  onExpandedChange?: (ids: string[]) => void
  search?: string
  loadChildren?: (node: TreeNode<T>) => Promise<TreeNode<T>[]>
}

export function useTreeState<T>({
  roots,
  initialExpanded,
  controlledExpanded,
  onExpandedChange,
  search,
  loadChildren,
}: UseTreeStateParams<T>) {
  const isControlled = controlledExpanded !== undefined
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState<string[]>(initialExpanded || [])
  const expanded = isControlled ? controlledExpanded! : uncontrolledExpanded

  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
  const cacheRef = useRef<Map<string, TreeNode<T>[]>>(new Map())

  const setExpanded = useCallback(
    (next: string[] | ((prev: string[]) => string[])) => {
      if (isControlled) {
        const value = typeof next === "function" ? next(expanded) : next
        onExpandedChange?.(value)
      } else {
        setUncontrolledExpanded((prev) => {
          const value = typeof next === "function" ? next(prev) : next
          onExpandedChange?.(value)
          return value
        })
      }
    },
    [isControlled, expanded, onExpandedChange]
  )

  const toggle = useCallback(
    async (node: TreeNode<T>) => {
      const isOpen = expanded.includes(node.id)
      if (isOpen) {
        setExpanded(expanded.filter((id) => id !== node.id))
        return
      }
      // expand
      setExpanded([...expanded, node.id])
      if (!node.isLeaf && loadChildren && !cacheRef.current.has(node.id)) {
        setLoadingIds((s) => new Set(s).add(node.id))
        try {
          const children = await loadChildren(node)
          cacheRef.current.set(node.id, children)
        } finally {
          setLoadingIds((s) => {
            const n = new Set(s)
            n.delete(node.id)
            return n
          })
        }
      }
    },
    [expanded, loadChildren, setExpanded]
  )

  const visible = useMemo<VisibleNode<T>[]>(() => {
    const results: VisibleNode<T>[] = []
    const visited = new Set<string>()
    const q = roots

    const pushNode = (
      node: TreeNode<T>,
      depth: number,
      parentId?: string
    ) => {
      if (visited.has(node.id)) return // evita ciclos
      visited.add(node.id)
      results.push({ node, depth, parentId })
      const isOpen = expanded.includes(node.id)
      if (!isOpen) return
      const children = node.children ?? cacheRef.current.get(node.id)
      if (!children) return
      for (const child of children) pushNode(child, depth + 1, node.id)
    }

    for (const r of q) pushNode(r, 0)

    if (!search) return results
    const s = search.toLowerCase()
    return results.filter(({ node }) => node.label.toLowerCase().includes(s))
  }, [roots, expanded, search])

  const isLoading = useCallback(
    (id: string) => loadingIds.has(id),
    [loadingIds]
  )

  return { expanded, setExpanded, toggle, visible, isLoading, cacheRef }
}