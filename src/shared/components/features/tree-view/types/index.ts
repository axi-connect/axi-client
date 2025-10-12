export type TreeNode<T = unknown> = {
  id: string
  label: string
  children?: TreeNode<T>[]
  isLeaf?: boolean
  disabled?: boolean
  meta?: T & { count?: number, priority?: 'low' | 'medium' | 'high'}
}

export type VisibleNode<T = unknown> = {
  node: TreeNode<T>
  depth: number
  parentId?: string
}

export type TreeViewProps<T = unknown> = {
  data: T[]
  mapToNode: (item: T) => TreeNode<T>
  initialExpanded?: string[]
  controlledExpanded?: string[]
  onExpandedChange?: (ids: string[]) => void
  selectedId?: string
  onSelect?: (node: TreeNode<T> | undefined) => void
  title?: React.ReactNode
  header?: React.ReactNode | ((ctx: { expandAll: () => void; collapseAll: () => void; viewSettings: () => void }) => React.ReactNode)
  renderLabel?: (node: TreeNode<T>) => React.ReactNode
  renderActions?: (node: TreeNode<T>) => React.ReactNode
  renderDescription?: (node: TreeNode<T>) => React.ReactNode
  getIcon?: (node: TreeNode<T>) => React.ReactNode
  showPriority?: boolean
  showCounts?: boolean
  compact?: boolean
  search?: string
  onCreate?: (parentNode?: TreeNode<T>, newLabel?: string) => Promise<void>
  onEdit?: (node: TreeNode<T>, newLabel?: string) => Promise<void>
  onDelete?: (node: TreeNode<T>) => Promise<void>
  onExpandAll?: () => void
  onCollapseAll?: () => void
  onViewSettings?: () => void
  className?: string
  styles?: Record<string, string>
  loadChildren?: (node: TreeNode<T>) => Promise<TreeNode<T>[]>
}